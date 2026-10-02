// Fallback ONLY - used when a ride has no estimatedDurationMinutes of its
// own (Ride.estimatedDurationMinutes is null). RideFlow has no real
// distance/travel-time engine yet (no Google Distance Matrix / Map API
// integration exists anywhere in this codebase), so there is nothing to
// compute a real per-ride duration from today. This is a single, isolated,
// clearly-labeled stand-in, NOT the actual duration calculation - the real
// calculation, once it exists, is "use Ride.estimatedDurationMinutes",
// which already takes priority over this constant everywhere below. A
// future Maps/travel-time integration only needs to populate that field;
// nothing here would need to change.
const DEFAULT_RIDE_DURATION_MINUTES = 120;
const REQUIRED_BREAK_MINUTES = 60;

// A ride only actually occupies a driver's schedule once it's been offered
// (the driver has been reserved) and until it's resolved. "requested"
// (nobody offered yet) and "cancelled" never block; "completed" still
// blocks based on its own scheduled window, which naturally stops mattering
// once that window is in the past - no special-casing needed for that.
const BLOCKING_RIDE_STATUSES = ["pending", "assigned", "in-progress", "completed"];

// The one place that decides what duration a ride actually occupies:
// the ride's own estimate if it has one, else the configurable fallback.
const resolveDurationMinutes = (ride) => ride?.estimatedDurationMinutes ?? DEFAULT_RIDE_DURATION_MINUTES;

// ride: { rideDate, estimatedDurationMinutes? } - a plain object or
// Mongoose document, either works since only these two fields are read.
const getOccupiedWindow = (ride) => {
  const start = new Date(ride.rideDate);
  const durationMinutes = resolveDurationMinutes(ride);
  const end = new Date(start.getTime() + (durationMinutes + REQUIRED_BREAK_MINUTES) * 60000);
  return { start, end };
};

// Half-open interval overlap: [aStart, aEnd) vs [bStart, bEnd) - this is
// what makes a ride starting exactly at another's end-of-break moment count
// as NOT conflicting (e.g. a 10am pickup with a 2hr ride + 1hr break frees
// the driver again at exactly 1pm, so a 1pm pickup is fine; 12:59pm is not).
const windowsOverlap = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

// candidateRide: { rideDate, estimatedDurationMinutes? } - the ride being
// checked. existingRides: array of { rideDate, estimatedDurationMinutes? }
// (or Mongoose ride documents) already known to block this driver - each
// uses ITS OWN duration, not the candidate's, so a driver with a 30-minute
// ride and a 4-hour ride on the same day is checked correctly against both
// real windows rather than one shared assumption.
const hasScheduleConflict = (candidateRide, existingRides) => {
  const candidate = getOccupiedWindow(candidateRide);
  return existingRides.some((ride) => {
    const existing = getOccupiedWindow(ride);
    return windowsOverlap(candidate.start, candidate.end, existing.start, existing.end);
  });
};

module.exports = {
  DEFAULT_RIDE_DURATION_MINUTES,
  REQUIRED_BREAK_MINUTES,
  BLOCKING_RIDE_STATUSES,
  resolveDurationMinutes,
  getOccupiedWindow,
  windowsOverlap,
  hasScheduleConflict,
};
