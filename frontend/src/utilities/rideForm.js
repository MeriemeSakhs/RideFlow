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

export const formatDisplayDate = (isoString) => {
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
};

export const formatDisplayTime = (isoString) => {
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
});
