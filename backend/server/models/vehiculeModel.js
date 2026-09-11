const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    vehicleType: {
      type: String,
      required: true,
    },

    make: {
      type: String,
      required: true,
    },

    model: {
      type: String,
      required: true,
    },

    licensePlate: {
      type: String,
      required: true,
      unique: true,
    },

    status: {
      type: String,
      enum: ["available", "in-use", "maintenance"],
      default: "available",
    },
  },
  { collection: "vehicles" }
);

module.exports = mongoose.model("vehicles", vehicleSchema);
