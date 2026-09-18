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

    passengerCount: {
      type: Number,
      required: true,
      min: 1,
    },

    notes: {
      type: String,
      default: "",
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

    // Tenant boundary - stamped from the authenticated dispatcher's JWT at
    // creation time, never trusted from the request body. See userModel.js.
    companyName: {
      type: String,
      required: true,
    },

    companySlug: {
      type: String,
      required: true,
    },
  },
  { collection: "rides" }
);

module.exports = mongoose.model("rides", rideSchema);