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

    // Express SMS opt-in for ride assignment texts (see
    // utilities/smsNotifier.js). Defaults to false - a driver is never
    // texted until a manager records that the driver agreed, and existing
    // drivers without this field are treated as not consented.
    smsConsent: {
      type: Boolean,
      default: false,
    },

    smsConsentAt: {
      type: Date,
      default: null,
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