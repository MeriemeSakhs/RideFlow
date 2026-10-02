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

    // The authoritative, URL-safe company identifier used for company-
    // specific URLs (e.g. rideflow.com/<slug>/login) - see
    // utilities/companySlug.js. This is display/routing only, never a
    // security boundary: every backend route still derives companyId
    // exclusively from the verified JWT (see middleware/auth.js), never
    // from a URL param.
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
  },
  { collection: "companies", timestamps: true }
);

module.exports = mongoose.model("companies", companySchema);
