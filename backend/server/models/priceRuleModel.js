const mongoose = require("mongoose");

// One rule = one company + one actual vehicle (not a free-text type label -
// see models/vehiculeModel.js) + one pricing type (either "point-to-point"
// or "hourly") + the rate for that combination. A vehicle that supports
// both pricing options (the common case) is simply two separate rule
// documents - this keeps the shape uniform instead of one document trying
// to carry two unrelated rate concepts.
const priceRuleSchema = new mongoose.Schema(
  {
    // The real tenant boundary - stamped from the authenticated user's JWT
    // at creation time, never trusted from the request body. See
    // middleware/auth.js and rideModel.js's companyId for the same pattern.
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "companies",
      required: true,
    },

    // References an actual Vehicle document belonging to this SAME
    // companyId - routes/pricingRoutes.js verifies that ownership on every
    // create/update, so a rule can never end up pointing at another
    // company's vehicle.
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "vehicles",
      required: true,
    },

    pricingType: {
      type: String,
      enum: ["point-to-point", "hourly"],
      required: true,
    },

    // Dollars per mile (point-to-point) or dollars per hour (hourly),
    // depending on pricingType. No base fare field - RideFlow's pricing
    // model is deliberately rate-only for now (see utilities/pricingEngine.js).
    rate: {
      type: Number,
      required: true,
      min: 0,
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  { collection: "priceRules", timestamps: true }
);

// A company can have at most one rule per (vehicleId, pricingType) pair -
// enforced here and re-checked at the application layer (routes/pricingRoutes.js)
// so a race can't slip two rules past the check-then-insert.
priceRuleSchema.index({ companyId: 1, vehicleId: 1, pricingType: 1 }, { unique: true });

module.exports = mongoose.model("priceRules", priceRuleSchema);
