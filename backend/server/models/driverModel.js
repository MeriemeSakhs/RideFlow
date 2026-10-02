const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema(
  {
    // No driver-management routes exist yet (future phase) - this is added
    // now so the schema is ready for company scoping when they're built.
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "companies",
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      required: true,
    },

    licenseNumber: {
      type: String,
      required: true,
      unique: true,
    },

    // "removed" is a soft-delete, never a hard delete (see
    // routes/driverRoutes.js's PATCH /:id/remove) - a driver can be
    // referenced by historical rides (ride.assignedDriver), so deleting one
    // just excludes them from the active driver list and new assignments;
    // existing ride/driver history keeps resolving to a real document.
    status: {
      type: String,
      enum: ["available", "assigned", "unavailable", "removed"],
      default: "available",
    },
  },
  { collection: "drivers" }
);

module.exports = mongoose.model("drivers", driverSchema);