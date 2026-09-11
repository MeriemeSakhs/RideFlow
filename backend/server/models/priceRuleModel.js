const mongoose = require("mongoose");

const priceRuleSchema = new mongoose.Schema(
  {
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
