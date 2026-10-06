const twilio = require("twilio");
const dotenv = require("dotenv");
dotenv.config();

let client = null;

const getClient = () => {
  if (client) return client;
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) return null;

  client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  return client;
};

const formatPickupTime = (isoDate) => {
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};

const formatPickupDate = (isoDate) => {
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString([], { dateStyle: "medium" });
};

const formatPickupClock = (isoDate) => {
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString([], { timeStyle: "short" });
};

// Throws if Twilio isn't configured or the send fails - callers must catch
// this themselves and must never let it undo a database assignment that
// already succeeded (see routes/rideRoutes.js).
//
// confirmUrl points at the driver's one-time confirm/decline link (see
// driverConfirmationTokenHash on the Ride model) - the ride is only
// "pending" at this point, not assigned, so the message asks the driver to
// confirm or decline rather than telling them they've already been assigned.
const sendAssignmentSms = async (ride, driver, confirmUrl) => {
  const t = getClient();
  if (!t) {
    throw new Error("SMS sending is not configured (missing TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_PHONE_NUMBER)");
  }
  if (!driver.phone) {
    throw new Error("Driver has no phone number on file");
  }

  const pickupDate = formatPickupDate(ride.rideDate);
  const pickupTime = formatPickupClock(ride.rideDate);
  const body =
    `RideFlow: New ride request. Passenger: ${ride.passengerName}. ` +
    `Pickup: ${ride.pickupLocation}${pickupDate ? ` on ${pickupDate}` : ""}${pickupTime ? ` at ${pickupTime}` : ""}. ` +
    `Drop-off: ${ride.dropoffLocation}. ` +
    `Confirm or decline: ${confirmUrl} ` +
    `Reply HELP for help, STOP to opt out.`;

  await t.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: driver.phone,
  });
};

module.exports = { sendAssignmentSms };
