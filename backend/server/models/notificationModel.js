const mongoose = require("mongoose");

// Company-wide, not per-user - every dispatcher/manager in a company already
// sees the same rides/drivers/vehicles (see rideModel.js, driverModel.js);
// notifications follow that same shared-visibility model rather than
// introducing a new per-user mechanism. isRead is likewise shared: whoever
// reads a notification first marks it read for the whole company, the same
// way any dispatcher resolving a ride resolves it for the whole team.
const notificationSchema = new mongoose.Schema(
  {
    // The real tenant boundary - always derived from the authenticated
    // user's JWT (or, for driver-triggered public events, from the ride
    // document's own companyId) - never trusted from a request body.
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "companies",
      required: true,
    },

    type: {
      type: String,
      enum: ["ride_requested", "ride_assigned", "driver_confirmed", "driver_declined", "ride_cancelled", "ride_completed"],
      required: true,
    },

    // Rendered server-side at creation time (not reconstructed from rideId
    // on read), so a notification still reads sensibly even after the ride
    // it refers to changes further or is deleted.
    message: {
      type: String,
      required: true,
    },

    // Optional - lets the frontend link back to the ride, but never
    // required to render the notification itself.
    rideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "rides",
      default: null,
    },

    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { collection: "notifications", timestamps: true }
);

notificationSchema.index({ companyId: 1, createdAt: -1 });

module.exports = mongoose.model("notifications", notificationSchema);
