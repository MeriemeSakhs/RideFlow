const mongoose = require("mongoose");

const rideSchema = new mongoose.Schema(
  {
    pickupLocation: {
      type: String,
      required: true,
    },

    dropoffLocation: {
      type: String,
      required: true,
    },

    rideDate: {
      type: Date,
      required: true,
    },

    passengerName: {
      type: String,
      required: true,
    },

    passengerPhone: {
      type: String,
      required: true,
    },

    vehicleType: {
      type: String,
      required: true,
    },

    passengerCount: {
      type: Number,
      required: true,
      min: 1,
    },

    notes: {
      type: String,
      default: "",
    },

    // "pending" sits between requested and assigned: the dispatcher has
    // offered the ride to a driver, but the driver hasn't confirmed yet.
    // Existing statuses are unchanged, so no existing ride's status becomes
    // invalid.
    status: {
      type: String,
      enum: ["requested", "pending", "assigned", "in-progress", "completed", "cancelled"],
      default: "requested",
    },

    // Set as soon as a ride is offered (status "pending"), not only once
    // confirmed - this is what lets the dispatcher see who a ride was
    // offered to, and what the driver-confirmation token below is scoped to.
    assignedDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "drivers",
      default: null,
    },

    // A high-entropy, single-use, expiring token (hash stored, never the raw
    // value - same hash-at-rest pattern as email verification codes) that
    // authenticates the driver's confirm/decline action from the SMS link,
    // since drivers have no RideFlow login. Scoped to exactly this ride +
    // its current assignedDriver, and cleared the instant the ride leaves
    // "pending" (confirmed, declined, or cancelled) so it can never be reused.
    driverConfirmationTokenHash: {
      type: String,
      default: null,
    },

    driverConfirmationTokenExpires: {
      type: Date,
      default: null,
    },

    // A SEPARATE token from driverConfirmationTokenHash above, generated at
    // the moment the driver confirms (not before) and persisting through
    // "in-progress" - the confirm token is deliberately single-use and
    // cleared immediately, so it can't safely be reused for anything
    // ongoing. This is the sole credential for the driver's tracking page
    // (starting the ride, submitting location updates, finishing the
    // ride) - drivers still have no RideFlow login. Cleared on
    // completed/cancelled, same hash-at-rest pattern as every other token
    // in this schema.
    driverSessionTokenHash: {
      type: String,
      default: null,
    },

    driverSessionTokenExpires: {
      type: Date,
      default: null,
    },

    // Geocoded once, at confirm time (see /confirm/:token), and cached here
    // rather than re-geocoded on every map load - both to respect
    // Nominatim's usage policy and because an address's coordinates don't
    // change. null means geocoding failed/found nothing; the frontend must
    // handle that rather than a fake position ever being shown.
    pickupCoordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },

    dropoffCoordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },

    // Intermediate stops between pickup and drop-off, in travel order -
    // structured (address + real coordinates), never a comma-separated
    // string, so each stop can be geocoded once (via address autocomplete,
    // see routes/geocodeRoutes.js) and fed straight into the pricing
    // engine's multi-waypoint OSRM route (see utilities/pricingEngine.js,
    // utilities/routing.js) the same way pickup/dropoff are. Defaults to an
    // empty array, so every ride created before this field existed is
    // unaffected - it simply has no stops.
    stops: {
      type: [
        {
          _id: false,
          address: { type: String, required: true },
          coordinates: {
            lat: { type: Number, required: true },
            lng: { type: Number, required: true },
          },
        },
      ],
      default: [],
    },

    // The driver's most recent reported position only - no history array,
    // since nothing in this feature needs a trail, just "where are they
    // right now". updatedAt is what the dispatcher's UI uses to show
    // "updated Xs ago" or flag a stale/unavailable location rather than
    // ever presenting an old position as current.
    driverLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      updatedAt: { type: Date, default: null },
    },

    // Driving distance in MILES for a point-to-point-priced ride (see
    // utilities/pricingEngine.js). 0/unset for rides that weren't priced
    // through the pricing engine (including every ride created before this
    // field existed) or that used hourly pricing, which has no distance
    // concept.
    distance: {
      type: Number,
      default: 0,
    },

    // The calculated fare, preserved at the time the ride was priced so it
    // stays stable even if the manager edits the underlying PriceRule's
    // rate later. 0/unset for rides not priced through the pricing engine.
    price: {
      type: Number,
      default: 0,
    },

    // Set only when this ride was priced through the pricing engine (see
    // utilities/pricingEngine.js) - null for every ride created before this
    // field existed, and for any ride created without going through
    // pricing. pricingRate is the exact per-mile/per-hour rate that was
    // actually used, captured independently of the live PriceRule so a
    // past ride's price stays explainable even if the manager changes that
    // rule's rate afterward.
    pricingType: {
      type: String,
      enum: ["point-to-point", "hourly", null],
      default: null,
    },

    pricingRate: {
      type: Number,
      default: null,
    },

    // The actual Vehicle this ride was priced against (see
    // models/vehiculeModel.js) - set only alongside pricingType, null
    // otherwise. This is what "ride.vehicleId -> vehicle -> active pricing
    // rule" traces back to; if the vehicle is later removed (soft-deleted),
    // this reference still resolves to the real historical document, it
    // just won't be offered for NEW pricing rules anymore. Separate from
    // the ride's own free-text vehicleType field above, which is unrelated.
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "vehicles",
      default: null,
    },

    // How long this specific ride is expected to take, in minutes. null
    // means "unknown" - RideFlow has no real distance/travel-time engine
    // yet, so there's nothing to compute this from at creation time. When
    // null, driver-schedule conflict checks fall back to a single
    // configurable default (see utilities/driverSchedule.js) rather than
    // treating every ride as if it takes the same fixed time. A future
    // Maps/travel-time integration would populate this field for real
    // instead of leaving it null.
    estimatedDurationMinutes: {
      type: Number,
      default: null,
    },

    // The real tenant boundary - stamped from the authenticated user's JWT
    // at creation time, never trusted from the request body. See userModel.js.
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "companies",
      required: true,
    },

    // Denormalized display fields only - companyId above is what queries
    // actually filter by.
    companyName: {
      type: String,
      required: true,
    },

    companySlug: {
      type: String,
      required: true,
    },

    // Who created this ride - stamped from the JWT the same way as
    // companyName/companySlug. null on rides created before this field
    // existed; never backfilled, so per-dispatcher stats only reflect real data.
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },
  },
  { collection: "rides" }
);

module.exports = mongoose.model("rides", rideSchema);