const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    // The real tenant boundary - stamped from the authenticated user's JWT
    // at creation time, never trusted from the request body (see
    // routes/vehicleRoutes.js). A company's vehicles are what
    // models/priceRuleModel.js's pricing rules reference.
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "companies",
      required: true,
    },

    // A manager-entered, human-readable identifier (e.g. "VEH-001") -
    // distinct from this document's own Mongo _id (which PriceRule.vehicleId
    // and Ride.vehicleId actually reference as the real foreign key).
    // Unique per company (see the compound index below), required for every
    // NEW vehicle (see models/vehicleValidator.js) but left optional at the
    // schema level so it never breaks a vehicle created before this field
    // existed. Immutable after creation once set - see routes/vehicleRoutes.js's
    // PUT /:id, which never accepts changes to it.
    vehicleId: {
      type: String,
      trim: true,
      default: null,
    },

    vehicleType: {
      type: String,
      required: true,
      trim: true,
    },

    // Optional at the schema level for the same backward-compatibility
    // reason as vehicleId above; required for every NEW vehicle.
    year: {
      type: Number,
      default: null,
    },

    make: {
      type: String,
      required: true,
      trim: true,
    },

    model: {
      type: String,
      required: true,
      trim: true,
    },

    licensePlate: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    // Optional - a vehicle doesn't need a driver assigned the moment it's
    // added. Must belong to the SAME company as the vehicle (checked in
    // routes/vehicleRoutes.js, never trusted from the request body).
    assignedDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "drivers",
      default: null,
    },

    mileage: {
      type: Number,
      default: 0,
      min: 0,
    },

    // "removed" is kept in the enum only so a vehicle soft-deleted before
    // this status vocabulary changed to active/maintenance/inactive still
    // validates on save - new removals always write "inactive" (see
    // routes/vehicleRoutes.js's PATCH /:id/remove). Both "inactive" and the
    // legacy "removed" are treated identically everywhere this status is
    // checked (excluded from the active vehicle list, excluded from new
    // pricing rules).
    status: {
      type: String,
      enum: ["active", "maintenance", "inactive", "removed"],
      default: "active",
    },
  },
  { collection: "vehicles", timestamps: true }
);

// A company can have at most one vehicle per human-readable vehicleId.
// Pre-existing vehicles without one (vehicleId: null) are unaffected since
// MongoDB only enforces uniqueness among documents that share a value -
// there is at most one legacy vehicle per company missing this field today.
vehicleSchema.index({ companyId: 1, vehicleId: 1 }, { unique: true, sparse: true });

// Treated identically everywhere a vehicle's "is it deleted" status matters
// (routes/vehicleRoutes.js's GET / and PATCH /:id/remove, routes/pricingRoutes.js's
// rule creation, routes/rideRoutes.js's ride pricing) - "removed" is the old
// status value, "inactive" is the current one; both mean the same thing.
const INACTIVE_STATUSES = ["inactive", "removed"];

module.exports = mongoose.model("vehicles", vehicleSchema);
module.exports.INACTIVE_STATUSES = INACTIVE_STATUSES;
