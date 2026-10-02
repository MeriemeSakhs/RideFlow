import mockPricingRules from "../mockData/mockPricingRules";

export const PHONE_REGEX = /^\+[1-9]\d{6,14}$/;

export const emptyRideForm = {
  passengerName: "",
  passengerPhone: "",
  pickupLocation: "",
  dropoffLocation: "",
  pickupDate: "",
  pickupTime: "",
  passengerCount: 1,
  vehicleType: "",
  notes: "",
  // Both left blank by default (not pre-filled with the backend's fallback
  // value) - RideFlow has no real distance/travel-time engine, so an
  // unfilled duration honestly means "unknown", not "2 hours". See
  // routes/rideRoutes.js's driverSchedule fallback for what happens when
  // this is left blank.
  durationHours: "",
  durationMinutes: "",
};

// Vehicle options with a base-price preview, sourced from the same mock
// pricing data the Manager's Pricing Rules page shows - keeps the two in
// sync until the real pricing engine (Todo #9) replaces both.
export const VEHICLE_OPTIONS = mockPricingRules
  .filter((rule) => rule.status === "active" && rule.vehicleType !== "All")
  .map((rule) => ({ value: rule.vehicleType.toLowerCase(), label: `${rule.vehicleType} (Base: $${rule.baseRate.toFixed(0)})` }));

// Placeholder trip length until the Google Distance API (Todo #9) supplies a
// real driving distance/duration. Clearly a stand-in, not a real estimate.
const MOCK_TRIP_MILES = 8;
const MOCK_TRIP_MINUTES = 20;

export const estimateFare = (vehicleType) => {
  const rule = mockPricingRules.find(
    (r) => r.vehicleType.toLowerCase() === vehicleType && r.status === "active"
  );
  if (!rule) return null;
  return rule.baseRate + rule.perMile * MOCK_TRIP_MILES + rule.perMinute * MOCK_TRIP_MINUTES;
};

// The backend stores one rideDate; the prototype's form splits it into a
// date input and a time input, so these convert between the two shapes.
export const combineDateAndTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return "";
  return `${dateStr}T${timeStr}`;
};

export const splitIsoIntoDateAndTime = (isoString) => {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return { pickupDate: "", pickupTime: "" };
  const pad = (n) => String(n).padStart(2, "0");
  return {
    pickupDate: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    pickupTime: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
};

// Combines the hours/minutes duration inputs into the single value the
// backend stores (Ride.estimatedDurationMinutes). Blank fields are treated
// as 0, and a total of 0 means "not provided" - returns undefined so
// toRidePayload omits the field entirely rather than sending a fake 0,
// letting the backend's documented fallback apply instead (see
// backend/server/utilities/driverSchedule.js).
export const toEstimatedDurationMinutes = (durationHours, durationMinutes) => {
  const hours = Number(durationHours) || 0;
  const minutes = Number(durationMinutes) || 0;
  const total = hours * 60 + minutes;
  return total > 0 ? total : undefined;
};

// The reverse, for populating the edit form from an existing ride's stored
// estimatedDurationMinutes.
export const splitEstimatedDurationMinutes = (totalMinutes) => {
  if (!totalMinutes || totalMinutes <= 0) return { durationHours: "", durationMinutes: "" };
  return { durationHours: String(Math.floor(totalMinutes / 60)), durationMinutes: String(totalMinutes % 60) };
};

export const formatDisplayDate = (isoString) => {
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
};

// MM/DD/YYYY, zero-padded - for a dedicated "Pickup Date" column, separate
// from the time (see formatDisplayTime below).
export const formatDisplayDateOnly = (isoString) => {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()}`;
};

const startOfLocalDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

// Computes the [startDate, endDate) window - in the caller's own local
// timezone, then converted to ISO for the wire - that GET /ride's generic
// rideDate range filter expects (see backend/server/routes/rideRoutes.js).
// Shared by any page that lets the user narrow a ride list/report down to a
// single day (dispatcherRideRequestsPage.js, managerReportsPage.js) rather
// than pulling the company's whole ride history into the browser. dateFilter
// is a plain "YYYY-MM-DD" string (an <input type="date">'s value) or "" for
// no filter.
export const getDateRangeParams = (dateFilter) => {
  if (!dateFilter) return {};
  const start = startOfLocalDay(new Date(`${dateFilter}T00:00:00`));
  return { startDate: start.toISOString(), endDate: addDays(start, 1).toISOString() };
};

// h:mm AM/PM, no leading zero on the hour and no seconds.
export const formatDisplayTime = (isoString) => {
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

// Mirrors the backend's rules (models/rideValidator.js) so obvious mistakes are
// caught before a round trip; the backend remains the source of truth.
export const validateRideForm = (formData) => {
  if (!formData.passengerName.trim()) return "Passenger name is required";
  if (!PHONE_REGEX.test(formData.passengerPhone.trim())) {
    return "Phone number must be in E.164 format, e.g. +15551234567";
  }
  if (!formData.pickupLocation.trim()) return "Pickup location is required";
  if (!formData.dropoffLocation.trim()) return "Dropoff location is required";
  if (formData.pickupLocation.trim().toLowerCase() === formData.dropoffLocation.trim().toLowerCase()) {
    return "Pickup and dropoff locations cannot be the same";
  }
  if (!formData.pickupDate) return "Pickup date is required";
  if (!formData.pickupTime) return "Pickup time is required";
  if (new Date(combineDateAndTime(formData.pickupDate, formData.pickupTime)).getTime() < Date.now()) {
    return "Ride date cannot be in the past";
  }
  const passengerCount = Number(formData.passengerCount);
  if (!Number.isInteger(passengerCount) || passengerCount < 1) return "Passenger count must be at least 1";
  if (passengerCount > 20) return "Passenger count must be 20 or fewer";
  if (!formData.vehicleType) return "Vehicle type is required";

  if (formData.durationHours !== "" && (!Number.isInteger(Number(formData.durationHours)) || Number(formData.durationHours) < 0)) {
    return "Estimated duration hours must be a whole number of 0 or more";
  }
  if (formData.durationMinutes !== "" && (!Number.isInteger(Number(formData.durationMinutes)) || Number(formData.durationMinutes) < 0 || Number(formData.durationMinutes) > 59)) {
    return "Estimated duration minutes must be a whole number from 0 to 59";
  }

  return "";
};

export const toRidePayload = (formData) => ({
  passengerName: formData.passengerName.trim(),
  passengerPhone: formData.passengerPhone.trim(),
  pickupLocation: formData.pickupLocation.trim(),
  dropoffLocation: formData.dropoffLocation.trim(),
  rideDate: combineDateAndTime(formData.pickupDate, formData.pickupTime),
  passengerCount: Number(formData.passengerCount),
  vehicleType: formData.vehicleType,
  notes: formData.notes.trim(),
  // Always sent (as a value or explicit null, never omitted) so clearing a
  // previously-set duration back to blank during an edit actually clears
  // it, rather than silently leaving the old value in place.
  estimatedDurationMinutes: toEstimatedDurationMinutes(formData.durationHours, formData.durationMinutes) ?? null,
});
