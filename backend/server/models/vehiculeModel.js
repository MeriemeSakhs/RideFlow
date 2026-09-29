const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    // No vehicle-management routes exist yet (future phase) - this is added
    // now so the schema is ready for company scoping when they're built.
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "companies",
      required: true,
    },

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
