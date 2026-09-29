const dotenv = require("dotenv");
dotenv.config();

const TEXTBELT_URL = "https://textbelt.com/text";

const formatPickupTime = (isoDate) => {
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};

// Throws if Textbelt isn't configured or the send fails - callers must catch
// this themselves and must never let it undo a database assignment that
// already succeeded (see routes/rideRoutes.js).
const sendAssignmentSms = async (ride, driver) => {
  if (!process.env.TEXTBELT_API_KEY) {
    throw new Error("SMS sending is not configured (missing TEXTBELT_API_KEY)");
  }

  const pickupTime = formatPickupTime(ride.rideDate);
  const message =
    `RideFlow: You have been assigned a new ride. ` +
    `Pickup: ${ride.pickupLocation}${pickupTime ? ` at ${pickupTime}` : ""}. ` +
    `Drop-off: ${ride.dropoffLocation}. Passenger: ${ride.passengerName}. ` +
    `Please review your assignment.`;

  const response = await fetch(TEXTBELT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: driver.phone,
      message,
      key: process.env.TEXTBELT_API_KEY,
    }),
  });

  const result = await response.json();
  if (!result.success) {
    throw new Error(`Textbelt send failed: ${result.error || "unknown error"}`);
  }
};

module.exports = { sendAssignmentSms };
