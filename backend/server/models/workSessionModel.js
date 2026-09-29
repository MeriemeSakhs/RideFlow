const mongoose = require("mongoose");

const workSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },

    // The real tenant boundary - stamped from the authenticated dispatcher's
    // JWT at creation time, same pattern as rideModel.js.
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "companies",
      required: true,
    },

    // Denormalized display fields only.
    companyName: {
      type: String,
      required: true,
    },

    companySlug: {
      type: String,
      required: true,
    },

    punchIn: {
      type: Date,
      required: true,
    },

    punchOut: {
      type: Date,
      default: null,
    },

    durationMinutes: {
      type: Number,
      default: null,
    },

    // Calendar day punchIn occurred on, at local server time - used to group
    // sessions into "today" / "this week" without recomputing from punchIn everywhere.
    date: {
      type: Date,
      required: true,
    },
  },
  { collection: "workSessions", timestamps: true }
);

module.exports = mongoose.model("workSessions", workSessionSchema);
