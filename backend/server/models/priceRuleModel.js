const mongoose = require("mongoose");

const priceRuleSchema = new mongoose.Schema(
  {
    // No pricing routes exist yet (future phase) - this is added now so the
    // schema is ready for company scoping when they're built.
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "companies",
      required: true,
    },

    vehicleType: {
      type: String,
      required: true,
    },

    baseFare: {
      type: Number,
      required: true,
    },

    pricePerMile: {
      type: Number,
      required: true,
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  { collection: "priceRules" }
);

module.exports = mongoose.model("priceRules", priceRuleSchema);
