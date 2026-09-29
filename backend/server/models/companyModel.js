const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
    },

    // Unguessable identifier used when a manager creates a dispatcher account
    // or otherwise needs to reference this company - see utilities/companyReference.js.
    referenceNumber: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { collection: "companies", timestamps: true }
);

module.exports = mongoose.model("companies", companySchema);
