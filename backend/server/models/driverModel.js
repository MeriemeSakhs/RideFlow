const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema(
  {
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