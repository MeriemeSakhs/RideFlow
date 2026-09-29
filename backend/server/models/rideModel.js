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

    // The real tenant boundary - stamped from the authenticated user's JWT
    // at creation time, never trusted from the request body. See userModel.js.
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "companies",
      required: true,
    },

    // Denormalized display fields only - companyId above is what queries
    // actually filter by.
    companyName: {
      type: String,
      required: true,
    },

    companySlug: {
      type: String,
      required: true,
    },

    // Who created this ride - stamped from the JWT the same way as
    // companyName/companySlug. null on rides created before this field
    // existed; never backfilled, so per-dispatcher stats only reflect real data.
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },
  },
  { collection: "rides" }
);

module.exports = mongoose.model("rides", rideSchema);