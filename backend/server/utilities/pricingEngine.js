// The one place that actually calculates a ride's price - used by both
// POST /pricing/calculate (a standalone estimate) and POST /ride (pricing a
// ride at creation time), so the two can never drift apart. Designed to be
// reused as-is by a future client reservation flow (see routes/pricingRoutes.js).
const PriceRule = require("../models/priceRuleModel");
const { getDrivingRoute } = require("./routing");

const METERS_PER_MILE = 1609.344;
const round2 = (n) => Math.round(n * 100) / 100;

// Each vehicle + pricing type combination has at most one rule per company
// (enforced by priceRuleModel.js's unique index) - only an ACTIVE one is
// usable for pricing; a deactivated rule simply isn't found here. Scoping
// by companyId here is also what makes vehicleId safe to use without a
// separate ownership check inside this function: a vehicleId belonging to
// another company could never have a rule saved against it under THIS
// companyId in the first place (routes/pricingRoutes.js verifies that at
// create/update time), so this query can never return another company's rule.
const findActiveRule = (companyId, vehicleId, pricingType) =>
  PriceRule.findOne({ companyId, vehicleId, pricingType, active: true });

// Returns a result object on success, or { error } on any failure - never
// throws for an ordinary "can't price this" case, so callers can map the
// error to a clean HTTP response. error is one of:
//   "no-active-rule"    - no active PriceRule for this company/vehicle/type
//   "route-unavailable" - fewer than 2 valid waypoints, OSRM found no
//                         drivable route, or the request failed
//
// waypoints: array of { lat, lng }, in travel order (pickup, then any
// stops, then drop-off) - already-resolved coordinates from the address
// autocomplete the caller used (see routes/geocodeRoutes.js), NOT address
// strings. This function does no geocoding of its own - geocoding happens
// once, at the point the address was actually selected, never repeated
// here on every price calculation.
const calculatePointToPoint = async ({ companyId, vehicleId, waypoints }) => {
  const rule = await findActiveRule(companyId, vehicleId, "point-to-point");
  if (!rule) return { error: "no-active-rule" };

  const route = await getDrivingRoute(waypoints);
  if (!route) return { error: "route-unavailable" };

  const distanceMiles = round2(route.distanceMeters / METERS_PER_MILE);
  const durationMinutes = Math.max(1, Math.round(route.durationSeconds / 60));

  return {
    pricingType: "point-to-point",
    vehicleId,
    rate: rule.rate,
    distanceMiles,
    durationMinutes,
    price: round2(distanceMiles * rule.rate),
  };
};

// durationHours may be fractional (e.g. 2.5 for "2 hours 30 minutes", or
// 4.5 for a 4:30 PM-9:00 PM booking window) - the caller is responsible for
// converting a time window or hours+minutes into this single value before
// calling in. This IS the driver's full occupied booking duration, not a
// driving-time estimate - see utilities/driverSchedule.js for how that
// then gets the existing 1-hour break added on top when checking conflicts.
const calculateHourly = async ({ companyId, vehicleId, durationHours }) => {
  const rule = await findActiveRule(companyId, vehicleId, "hourly");
  if (!rule) return { error: "no-active-rule" };

  const durationMinutes = Math.round(durationHours * 60);

  return {
    pricingType: "hourly",
    vehicleId,
    rate: rule.rate,
    durationHours,
    durationMinutes,
    price: round2(durationHours * rule.rate),
  };
};

// Maps a calculatePointToPoint/calculateHourly error code to a clean HTTP
// response - shared by routes/pricingRoutes.js (POST /pricing/calculate)
// and routes/rideRoutes.js (POST /ride, when pricingType is supplied), so
// the two never report the same failure differently.
const PRICING_ERROR_RESPONSES = {
  "no-active-rule": { status: 404, message: "No active pricing rule is configured for this vehicle type and pricing option" },
  "route-unavailable": { status: 422, message: "Could not calculate a driving route between these locations" },
};

const pricingErrorResponse = (errorCode) => PRICING_ERROR_RESPONSES[errorCode] || { status: 500, message: "Could not calculate price" };

module.exports = { findActiveRule, calculatePointToPoint, calculateHourly, pricingErrorResponse };
