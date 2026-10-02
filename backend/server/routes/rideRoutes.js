const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Ride = require("../models/rideModel");
const Driver = require("../models/driverModel");
const { rideCreateValidation, rideUpdateValidation } = require("../models/rideValidator");
const { requireAuth, requireRole } = require("../middleware/auth");
const { sendAssignmentSms } = require("../utilities/smsNotifier");
const { TOKEN_EXPIRY_MS, generateToken, hashToken } = require("../utilities/confirmationToken");
const { BLOCKING_RIDE_STATUSES, hasScheduleConflict } = require("../utilities/driverSchedule");
const { geocodeAddress } = require("../utilities/geocoding");
const { calculatePointToPoint, calculateHourly, pricingErrorResponse } = require("../utilities/pricingEngine");
const Vehicle = require("../models/vehiculeModel");

const FINAL_STATUSES = ["completed", "cancelled"];
const ASSIGNED_DRIVER_FIELDS = "name phone licenseNumber status";
const { INACTIVE_STATUSES } = Vehicle;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:8096";

// A failed/not-yet-run geocode is stored as { lat: null, lng: null } (the
// Mongoose subdocument's own defaults), not null itself - same convention
// documented on rideModel.js's pickupCoordinates/dropoffCoordinates.
const hasValidCoordinates = (c) => !!c && Number.isFinite(c.lat) && Number.isFinite(c.lng);

// A driver's Driver.status is a snapshot, not the source of truth for
// scheduling - after a ride stops blocking them (cancelled/declined/
// completed), they should only flip back to "available" if they have no
// OTHER currently-blocking ride. excludeRideId is the ride that just
// stopped blocking (already saved with its new status by the caller, or
// about to be), so it's excluded from the "do they still have one" check
// rather than relying on write-visibility ordering.
const recomputeDriverStatusIfFree = async (driverId, companyId, excludeRideId) => {
  const stillBlocked = await Ride.exists({
    companyId,
    assignedDriver: driverId,
    status: { $in: BLOCKING_RIDE_STATUSES },
    _id: { $ne: excludeRideId },
  });
  if (!stillBlocked) {
    await Driver.updateOne({ _id: driverId, companyId, status: "assigned" }, { status: "available" });
  }
};

// Create a ride request - Managers may also create rides (e.g. while viewing
// the Dispatcher portal in Dispatcher Mode); they always retain their actual
// "manager" role for authorization purposes, this only affects what actions
// their token is permitted to perform.
router.post("/", requireAuth, requireRole("dispatcher", "manager"), async (req, res) => {
  const { success, data, error } = rideCreateValidation(req.body);
  if (!success) return res.status(400).send({ message: error.errors[0].message });

  // pricingType is optional (no current UI sends it yet) - when present,
  // the ride is priced through the SAME engine POST /pricing/calculate
  // uses, authoritatively, from the company's own rates (never a price the
  // frontend could have supplied itself). Omitted entirely, ride creation
  // behaves exactly as it did before this field existed. vehicleId is only
  // a pricing-lookup input, not a Ride field - the ride's own free-text
  // vehicleType (below, part of rideFields) is unrelated and unaffected.
  const { pricingType, durationHours, vehicleId, ...rideFields } = data;

  try {
    let pricing = null;
    if (pricingType) {
      const vehicle = await Vehicle.findOne({ _id: vehicleId, companyId: req.user.companyId });
      if (!vehicle) return res.status(404).send({ message: "Vehicle not found" });
      if (INACTIVE_STATUSES.includes(vehicle.status)) return res.status(400).send({ message: "This vehicle has been deleted and is no longer available for pricing" });

      const result =
        pricingType === "point-to-point"
          ? await calculatePointToPoint({
              companyId: req.user.companyId,
              vehicleId,
              // Pickup, then every stop in order, then drop-off - already-
              // resolved coordinates from the address autocomplete the
              // dispatcher used (rideCreateValidation guarantees pickup/
              // dropoffCoordinates are present for point-to-point rides).
              // OSRM sums the whole multi-leg route in one request (see
              // utilities/routing.js), so the price reflects every leg, not
              // just pickup->dropoff.
              waypoints: [
                rideFields.pickupCoordinates,
                ...(rideFields.stops || []).map((s) => s.coordinates),
                rideFields.dropoffCoordinates,
              ],
            })
          : await calculateHourly({ companyId: req.user.companyId, vehicleId, durationHours });

      if (result.error) {
        const mapped = pricingErrorResponse(result.error);
        return res.status(mapped.status).send({ message: mapped.message });
      }
      pricing = result;
    }

    const ride = new Ride({
      ...rideFields,
      companyId: req.user.companyId,
      companyName: req.user.companyName,
      companySlug: req.user.companySlug,
      createdBy: req.user.id,
      ...(pricing && {
        pricingType: pricing.pricingType,
        pricingRate: pricing.rate,
        vehicleId,
        price: pricing.price,
        distance: pricing.distanceMiles ?? 0,
        // An explicit estimatedDurationMinutes on the ride itself always
        // wins (the dispatcher's own override); otherwise the calculated
        // duration (OSRM's travel time, or the client's chosen hours) feeds
        // the existing driver-scheduling logic directly - see
        // utilities/driverSchedule.js's resolveDurationMinutes.
        estimatedDurationMinutes: rideFields.estimatedDurationMinutes ?? pricing.durationMinutes,
      }),
    });
    const savedRide = await ride.save();
    res.status(201).json(savedRide);
  } catch (error) {
    res.status(400).json({ message: "Could not create ride request" });
  }
});

// List rides for the dispatcher/manager's own company, optionally filtered
// by status (?status=requested) and/or a rideDate range (?startDate=<ISO>,
// inclusive, &endDate=<ISO>, exclusive). The date range is intentionally
// generic (just "between these two instants") rather than baking in
// "today"/"this week" semantics here - the frontend (which knows the
// dispatcher's local timezone) computes the actual boundaries; see
// dispatcherRideRequestsPage.js's getDateRangeParams. This is what lets the
// Ride Requests page narrow a large ride history down to a specific day/
// week server-side instead of fetching everything and filtering in the browser.
router.get("/", requireAuth, requireRole("dispatcher", "manager"), async (req, res) => {
  const { status, startDate, endDate } = req.query;

  if (status && !Ride.schema.path("status").enumValues.includes(status)) {
    return res.status(400).send({ message: "Invalid ride status filter" });
  }

  let rideDateFilter;
  if (startDate || endDate) {
    rideDateFilter = {};
    if (startDate) {
      const parsedStart = new Date(startDate);
      if (Number.isNaN(parsedStart.getTime())) return res.status(400).send({ message: "Invalid startDate" });
      rideDateFilter.$gte = parsedStart;
    }
    if (endDate) {
      const parsedEnd = new Date(endDate);
      if (Number.isNaN(parsedEnd.getTime())) return res.status(400).send({ message: "Invalid endDate" });
      rideDateFilter.$lt = parsedEnd;
    }
  }

  try {
    const filter = {
      companyId: req.user.companyId,
      ...(status ? { status } : {}),
      ...(rideDateFilter ? { rideDate: rideDateFilter } : {}),
    };
    const rides = await Ride.find(filter).populate("assignedDriver", ASSIGNED_DRIVER_FIELDS).sort({ rideDate: -1 });
    res.json(rides);
  } catch (error) {
    res.status(500).send({ message: "Could not retrieve rides" });
  }
});

// Retrieve a single ride belonging to the caller's company
router.get("/:id", requireAuth, requireRole("dispatcher", "manager"), async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).send({ message: "Invalid ride id" });
  }

  try {
    const ride = await Ride.findOne({ _id: req.params.id, companyId: req.user.companyId }).populate(
      "assignedDriver",
      ASSIGNED_DRIVER_FIELDS
    );
    if (!ride) return res.status(404).send({ message: "Ride not found" });
    res.json(ride);
  } catch (error) {
    res.status(500).send({ message: "Could not retrieve ride" });
  }
});

// Update a ride's details (pickup/dropoff/date/passenger info/vehicle type only)
router.put("/:id", requireAuth, requireRole("dispatcher", "manager"), async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).send({ message: "Invalid ride id" });
  }

  const { success, data, error } = rideUpdateValidation(req.body);
  if (!success) return res.status(400).send({ message: error.errors[0].message });

  try {
    const existingRide = await Ride.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!existingRide) return res.status(404).send({ message: "Ride not found" });

    if (FINAL_STATUSES.includes(existingRide.status)) {
      return res.status(409).send({ message: `Cannot update a ride that is already ${existingRide.status}` });
    }

    Object.assign(existingRide, data);

    if (existingRide.pickupLocation.toLowerCase() === existingRide.dropoffLocation.toLowerCase()) {
      return res.status(400).send({ message: 'Pickup and dropoff locations cannot be the same' });
    }

    const updatedRide = await existingRide.save();
    res.json(updatedRide);
  } catch (error) {
    res.status(400).json({ message: "Could not update ride" });
  }
});

// Offer a ride to a driver. The dispatcher always chooses the driver
// manually from the available list shown by the frontend - nothing here
// picks a driver automatically (by proximity, workload, or any other rule).
//
// This does NOT assign the ride - it OFFERS it. The ride becomes "pending"
// and the driver is reserved (status "assigned") so they can't be double-
// offered a second ride, but the ride only becomes "assigned" once the
// driver actually confirms via the one-time link sent by SMS (see
// /confirm/:token and /decline/:token below).
router.patch("/:id/assign", requireAuth, requireRole("dispatcher", "manager"), async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).send({ message: "Invalid ride id" });
  }

  const { driverId } = req.body;
  if (!driverId || !mongoose.Types.ObjectId.isValid(driverId)) {
    return res.status(400).send({ message: "A valid driver must be selected" });
  }

  // The core invariant here - "no two blocking rides for the same driver
  // may have overlapping occupied windows" - spans multiple documents
  // (the ride being offered, the driver, and every other ride already on
  // that driver's schedule), so a single atomic findOneAndUpdate can't
  // enforce it by itself the way the rest of this file's single-document
  // atomics do. Two concurrent offers for the SAME driver at CONFLICTING
  // times both need to read the driver's schedule, decide, and write - and
  // without real transactional isolation, it's possible for both to read
  // before either writes, each conclude "no conflict yet", and both
  // commit (double-booking), or for both to run a naive "verify after
  // write" step and both see each other's write and both back off (leaving
  // neither ride assigned, also wrong). A MongoDB transaction closes this
  // properly: MongoDB's own write-conflict detection aborts and retries
  // whichever of the two transactions loses the race, so exactly one
  // commits and the other cleanly observes the committed state as a
  // conflict on retry.
  const session = await mongoose.startSession();
  let outcome = null;

  try {
    await session.withTransaction(async () => {
      const rideCheck = await Ride.findOne({ _id: req.params.id, companyId: req.user.companyId }).session(session);
      if (!rideCheck) {
        outcome = { status: 404, body: { message: "Ride not found" } };
        return;
      }
      if (rideCheck.status !== "requested") {
        outcome = { status: 409, body: { message: `Cannot offer a driver a ride that is already ${rideCheck.status}` } };
        return;
      }

      const driverDoc = await Driver.findOne({ _id: driverId, companyId: req.user.companyId }).session(session);
      if (!driverDoc) {
        outcome = { status: 404, body: { message: "Driver not found" } };
        return;
      }
      if (driverDoc.status === "unavailable") {
        outcome = { status: 409, body: { message: "This driver is marked unavailable" } };
        return;
      }

      const existingRides = await Ride.find({
        companyId: req.user.companyId,
        assignedDriver: driverId,
        status: { $in: BLOCKING_RIDE_STATUSES },
      })
        .select("rideDate estimatedDurationMinutes")
        .session(session);

      if (hasScheduleConflict(rideCheck, existingRides)) {
        outcome = { status: 409, body: { message: "This driver is not available at the requested ride's scheduled time" } };
        return;
      }

      const token = generateToken();

      await Driver.updateOne({ _id: driverDoc._id }, { status: "assigned" }).session(session);

      const updatedRide = await Ride.findOneAndUpdate(
        { _id: req.params.id, companyId: req.user.companyId, status: "requested" },
        {
          assignedDriver: driverDoc._id,
          status: "pending",
          driverConfirmationTokenHash: hashToken(token),
          driverConfirmationTokenExpires: new Date(Date.now() + TOKEN_EXPIRY_MS),
        },
        { new: true, session }
      ).populate("assignedDriver", ASSIGNED_DRIVER_FIELDS);

      outcome = { status: 200, ride: updatedRide, token };
    });
  } catch (error) {
    session.endSession();
    return res.status(500).send({ message: "Could not offer the ride to this driver" });
  }
  session.endSession();

  if (outcome.status !== 200) {
    return res.status(outcome.status).send(outcome.body);
  }

  const { ride: updatedRide, token } = outcome;

  // The offer is now durably saved (transaction committed). Everything from
  // here is best-effort - an SMS provider failure must never undo it.
  let smsStatus = "sent";
  try {
    const confirmUrl = `${FRONTEND_URL}/driver/confirm/${token}`;
    await sendAssignmentSms(updatedRide, updatedRide.assignedDriver, confirmUrl);
  } catch (smsErr) {
    console.error("Failed to send driver assignment SMS:", smsErr.message);
    smsStatus = "failed";
  }

  res.json({ ride: updatedRide, smsStatus });
});

// Public (no requireAuth) - drivers have no RideFlow login, so the token
// itself, sent only to the driver's phone via SMS, is the authentication.
// It is single-use, scoped to this exact ride, and expires; it's cleared
// the instant the ride leaves "pending" (confirmed/declined/cancelled/
// reassigned), so a stale or already-used link can never work again.
router.get("/confirm/:token", async (req, res) => {
  try {
    const ride = await Ride.findOne({
      driverConfirmationTokenHash: hashToken(req.params.token),
      status: "pending",
      driverConfirmationTokenExpires: { $gt: new Date() },
    }).populate("assignedDriver", "name");

    if (!ride) return res.status(404).send({ message: "This confirmation link is invalid, expired, or already used" });

    res.json({
      passengerName: ride.passengerName,
      pickupLocation: ride.pickupLocation,
      dropoffLocation: ride.dropoffLocation,
      rideDate: ride.rideDate,
      status: ride.status,
      driverName: ride.assignedDriver?.name || "",
    });
  } catch (error) {
    res.status(500).send({ message: "Could not load this ride" });
  }
});

router.post("/confirm/:token", async (req, res) => {
  try {
    // Session token is generated up front (cheap) so it's ready to attach
    // in the same atomic update as the status change - it must never exist
    // without the ride actually being confirmed.
    const sessionToken = generateToken();

    // Atomic - re-checks status:"pending" in the same filter, so two
    // near-simultaneous clicks on the same link (or a retried request)
    // can only ever have one winner.
    const ride = await Ride.findOneAndUpdate(
      {
        driverConfirmationTokenHash: hashToken(req.params.token),
        status: "pending",
        driverConfirmationTokenExpires: { $gt: new Date() },
      },
      {
        status: "assigned",
        driverConfirmationTokenHash: null,
        driverConfirmationTokenExpires: null,
        driverSessionTokenHash: hashToken(sessionToken),
        driverSessionTokenExpires: new Date(Date.now() + TOKEN_EXPIRY_MS),
      },
      { new: true }
    ).populate("assignedDriver", ASSIGNED_DRIVER_FIELDS);

    if (!ride) return res.status(404).send({ message: "This confirmation link is invalid, expired, or already used" });

    // Best-effort, same non-destructive pattern as the assignment SMS - a
    // geocoding failure must never undo the confirmation that already
    // succeeded. Only runs for whichever of pickup/dropoff DON'T already
    // have valid coordinates - a ride created through the address-
    // autocomplete flow (see routes/geocodeRoutes.js) already resolved
    // both at creation time, so this is a no-op for it; this fallback only
    // does real work for rides created the older way (plain address text,
    // no pricingType), geocoding them once, here, rather than never.
    const needsPickupGeocode = !hasValidCoordinates(ride.pickupCoordinates);
    const needsDropoffGeocode = !hasValidCoordinates(ride.dropoffCoordinates);
    try {
      if (needsPickupGeocode || needsDropoffGeocode) {
        const [pickupCoordinates, dropoffCoordinates] = await Promise.all([
          needsPickupGeocode ? geocodeAddress(ride.pickupLocation) : Promise.resolve(ride.pickupCoordinates),
          needsDropoffGeocode ? geocodeAddress(ride.dropoffLocation) : Promise.resolve(ride.dropoffCoordinates),
        ]);
        ride.pickupCoordinates = pickupCoordinates || undefined;
        ride.dropoffCoordinates = dropoffCoordinates || undefined;
        await ride.save();
      }
    } catch (geoErr) {
      console.error("Failed to geocode ride addresses:", geoErr.message);
    }

    // Driver was already "assigned" internally to reserve them while
    // pending - confirming just makes that reservation permanent, no
    // driver-side update needed.
    res.json({ message: "Ride confirmed.", status: ride.status, sessionToken });
  } catch (error) {
    res.status(500).send({ message: "Could not confirm this ride" });
  }
});

router.post("/decline/:token", async (req, res) => {
  try {
    // { new: false } (the default) returns the PRE-update document, which
    // is what we need to know which driver to release back to "available".
    const ride = await Ride.findOneAndUpdate(
      {
        driverConfirmationTokenHash: hashToken(req.params.token),
        status: "pending",
        driverConfirmationTokenExpires: { $gt: new Date() },
      },
      {
        status: "requested",
        assignedDriver: null,
        driverConfirmationTokenHash: null,
        driverConfirmationTokenExpires: null,
      }
    );

    if (!ride) return res.status(404).send({ message: "This confirmation link is invalid, expired, or already used" });

    if (ride.assignedDriver) {
      await recomputeDriverStatusIfFree(ride.assignedDriver, ride.companyId, ride._id);
    }

    res.json({ message: "Ride declined." });
  } catch (error) {
    res.status(500).send({ message: "Could not decline this ride" });
  }
});

// ===== Driver tracking session (all public, all token-authorized) =====
// The session token generated at confirm time (see POST /confirm/:token
// above) is the sole credential for these - drivers still have no
// RideFlow login. Each handler re-checks the token hash, expiry, AND the
// ride's current status in the same atomic filter, so a stale tab, an
// already-finished ride, or a guessed/reused token can never succeed.

// Token-only lookup (no ride id required) so the driver's tracking page -
// which only ever receives a session token, same as /driver/confirm/:token -
// can resolve the ride it belongs to. Returns just what that page needs to
// render; never trusts anything the driver's browser might supply.
router.get("/session/:sessionToken", async (req, res) => {
  try {
    const ride = await Ride.findOne({
      driverSessionTokenHash: hashToken(req.params.sessionToken),
      driverSessionTokenExpires: { $gt: new Date() },
    })
      .populate("assignedDriver", "name")
      .select(
        "status passengerName pickupLocation dropoffLocation pickupCoordinates dropoffCoordinates driverLocation assignedDriver"
      );
    if (!ride) return res.status(404).send({ message: "This tracking link is invalid or has expired" });
    res.json(ride);
  } catch (error) {
    res.status(500).send({ message: "Could not load this ride" });
  }
});

router.post("/:id/start/:sessionToken", async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).send({ message: "Invalid ride id" });
  }
  try {
    const ride = await Ride.findOneAndUpdate(
      {
        _id: req.params.id,
        driverSessionTokenHash: hashToken(req.params.sessionToken),
        driverSessionTokenExpires: { $gt: new Date() },
        status: "assigned",
      },
      { status: "in-progress" },
      { new: true }
    );
    if (!ride) return res.status(404).send({ message: "This ride cannot be started - the link may be invalid, expired, or already used" });
    res.json({ message: "Ride started.", status: ride.status });
  } catch (error) {
    res.status(500).send({ message: "Could not start this ride" });
  }
});

router.post("/:id/location/:sessionToken", async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).send({ message: "Invalid ride id" });
  }
  const lat = Number(req.body.lat);
  const lng = Number(req.body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return res.status(400).send({ message: "Invalid coordinates" });
  }
  try {
    const ride = await Ride.findOneAndUpdate(
      {
        _id: req.params.id,
        driverSessionTokenHash: hashToken(req.params.sessionToken),
        driverSessionTokenExpires: { $gt: new Date() },
        status: "in-progress",
      },
      { driverLocation: { lat, lng, updatedAt: new Date() } },
      { new: true }
    ).select("status");
    if (!ride) return res.status(404).send({ message: "This ride is not currently accepting location updates" });
    res.json({ message: "Location updated." });
  } catch (error) {
    res.status(500).send({ message: "Could not update location" });
  }
});

router.post("/:id/finish/:sessionToken", async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).send({ message: "Invalid ride id" });
  }
  try {
    const ride = await Ride.findOneAndUpdate(
      {
        _id: req.params.id,
        driverSessionTokenHash: hashToken(req.params.sessionToken),
        driverSessionTokenExpires: { $gt: new Date() },
        status: "in-progress",
      },
      {
        status: "completed",
        driverSessionTokenHash: null,
        driverSessionTokenExpires: null,
      },
      { new: true }
    );
    if (!ride) return res.status(404).send({ message: "This ride cannot be completed - the link may be invalid, expired, or already used" });

    if (ride.assignedDriver) {
      await recomputeDriverStatusIfFree(ride.assignedDriver, ride.companyId, ride._id);
    }

    res.json({ message: "Ride completed.", status: ride.status });
  } catch (error) {
    res.status(500).send({ message: "Could not complete this ride" });
  }
});

// Mark a ride completed. No dedicated frontend action exists for this yet
// (out of scope for #8, which is about assignment status + SMS) - added so
// "driver returns to available when their ride completes" (a #8 requirement)
// has a real path to occur, mirroring the existing /cancel endpoint's shape.
router.patch("/:id/complete", requireAuth, requireRole("dispatcher", "manager"), async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).send({ message: "Invalid ride id" });
  }

  try {
    const existingRide = await Ride.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!existingRide) return res.status(404).send({ message: "Ride not found" });

    if (!["assigned", "in-progress"].includes(existingRide.status)) {
      return res.status(409).send({ message: `Cannot complete a ride that is ${existingRide.status}` });
    }

    if (existingRide.assignedDriver) {
      await recomputeDriverStatusIfFree(existingRide.assignedDriver, req.user.companyId, existingRide._id);
    }

    // Dispatcher-side completion is an alternate path to the same terminal
    // state as the driver's own /finish/:sessionToken - clearing the
    // session token here too stops a still-open driver tracking tab from
    // continuing to submit location updates or re-finish an already-closed ride.
    existingRide.status = "completed";
    existingRide.driverSessionTokenHash = null;
    existingRide.driverSessionTokenExpires = null;
    const completedRide = await existingRide.save();
    res.json(completedRide);
  } catch (error) {
    res.status(500).send({ message: "Could not complete ride" });
  }
});

// Cancel a ride
router.patch("/:id/cancel", requireAuth, requireRole("dispatcher", "manager"), async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).send({ message: "Invalid ride id" });
  }

  try {
    const existingRide = await Ride.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!existingRide) return res.status(404).send({ message: "Ride not found" });

    if (existingRide.status === "cancelled") {
      return res.status(409).send({ message: "Ride is already cancelled" });
    }
    if (existingRide.status === "completed") {
      return res.status(409).send({ message: "Cannot cancel a completed ride" });
    }

    // Cancelling an already-offered (pending) or already-assigned ride frees
    // the driver back up (unless they have another currently-blocking ride)
    // - without this they'd be stuck "assigned" forever with no ride to
    // actually work.
    if (existingRide.assignedDriver) {
      await recomputeDriverStatusIfFree(existingRide.assignedDriver, req.user.companyId, existingRide._id);
    }

    // Clears any live confirmation link AND any live tracking session, so a
    // driver can't confirm, or keep tracking/finish, a ride the dispatcher
    // just cancelled out from under them.
    existingRide.status = "cancelled";
    existingRide.driverConfirmationTokenHash = null;
    existingRide.driverConfirmationTokenExpires = null;
    existingRide.driverSessionTokenHash = null;
    existingRide.driverSessionTokenExpires = null;
    const cancelledRide = await existingRide.save();
    res.json(cancelledRide);
  } catch (error) {
    res.status(500).send({ message: "Could not cancel ride" });
  }
});

module.exports = router;
