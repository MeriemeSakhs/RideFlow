const mongoose = require("mongoose");

const rideSchema = new mongoose.Schema(
  {
    pickupLocation: {
      type: String,
      required: true,
    },

    dropoffLocation: {
      type: String,
      required: true,
    },

    rideDate: {
      type: Date,
      required: true,
    },

    passengerName: {
      type: String,
      required: true,
    },

    passengerPhone: {
      type: String,
      required: true,
    },

    vehicleType: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["requested", "assigned", "in-progress", "completed", "cancelled"],
      default: "requested",
    },

    assignedDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "drivers",
      default: null,
    },

    distance: {
      type: Number,
      default: 0,
    },

    price: {
      type: Number,
      default: 0,
    },
  },
  { collection: "rides" }
);

module.exports = mongoose.model("rides", rideSchema);