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

    status: {
      type: String,
      enum: ["available", "assigned", "unavailable"],
      default: "available",
    },
  },
  { collection: "drivers" }
);

module.exports = mongoose.model("drivers", driverSchema);