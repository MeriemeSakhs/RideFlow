const Notification = require("../models/notificationModel");

// Best-effort, non-blocking - same "a side effect must never undo the real
// operation that triggered it" pattern as utilities/smsNotifier.js and
// utilities/mailer.js. Unlike those, this never throws past its own
// console.error - callers can just `await notify(...)` inline, right after
// the real ride event already succeeded, with no extra try/catch needed at
// each call site.
const notify = async ({ companyId, type, message, rideId }) => {
  try {
    await Notification.create({ companyId, type, message, rideId: rideId || null });
  } catch (err) {
    console.error("Failed to create notification:", err.message);
  }
};

module.exports = { notify };
