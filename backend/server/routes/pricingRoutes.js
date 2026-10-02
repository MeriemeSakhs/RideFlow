const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const PriceRule = require("../models/priceRuleModel");
const Vehicle = require("../models/vehiculeModel");
const { requireAuth, requireRole } = require("../middleware/auth");
const { priceRuleCreateValidation, priceRuleUpdateValidation, calculateRequestValidation } = require("../models/pricingValidator");
const { calculatePointToPoint, calculateHourly, pricingErrorResponse } = require("../utilities/pricingEngine");

const VEHICLE_FIELDS = "vehicleType make model licensePlate";
const { INACTIVE_STATUSES } = Vehicle;

// A vehicleId is never trusted on its own - every write (and the calculate
// endpoint) re-verifies it names a vehicle that actually belongs to the
// caller's own company, the same way ride/driver ownership is re-checked
// elsewhere. Returns the vehicle doc, or null if it doesn't exist or
// belongs to a different company (the two cases are deliberately
// indistinguishable to the caller - a 404 either way, never a 403, so a
// vehicle id reveals nothing about another company's fleet).
const findOwnedVehicle = (companyId, vehicleId) => Vehicle.findOne({ _id: vehicleId, companyId });

// List this company's pricing rules - manager only, same as the Pricing
// Settings page itself (see App.js's RequireRole on /manager/pricing).
// Populated with the vehicle's own fields so the table can show a real
// vehicle identity, not just a raw id.
router.get("/rules", requireAuth, requireRole("manager"), async (req, res) => {
  try {
    const rules = await PriceRule.find({ companyId: req.user.companyId })
      .populate("vehicleId", VEHICLE_FIELDS)
      .sort({ pricingType: 1 });
    res.json(rules);
  } catch (error) {
    res.status(500).send({ message: "Could not retrieve pricing rules" });
  }
});

// Create a pricing rule - manager only. companyId always comes from the
// JWT, never the request body (same pattern as ride/driver creation).
router.post("/rules", requireAuth, requireRole("manager"), async (req, res) => {
  const { success, data, error } = priceRuleCreateValidation(req.body);
  if (!success) return res.status(400).send({ message: error.errors[0].message });

  try {
    const vehicle = await findOwnedVehicle(req.user.companyId, data.vehicleId);
    if (!vehicle) return res.status(404).send({ message: "Vehicle not found" });
    if (INACTIVE_STATUSES.includes(vehicle.status)) {
      return res.status(400).send({ message: "This vehicle has been deleted and cannot be used for a new pricing rule" });
    }

    const existing = await PriceRule.findOne({ companyId: req.user.companyId, vehicleId: data.vehicleId, pricingType: data.pricingType });
    if (existing) {
      return res.status(409).send({ message: `A ${data.pricingType} pricing rule already exists for this vehicle - edit it instead` });
    }
    const rule = await PriceRule.create({ ...data, companyId: req.user.companyId });
    await rule.populate("vehicleId", VEHICLE_FIELDS);
    res.status(201).json(rule);
  } catch (error) {
    // Catches the unique-index race (two concurrent creates for the same
    // vehicleId+pricingType) that the findOne check above can't fully
    // prevent on its own.
    if (error.code === 11000) {
      return res.status(409).send({ message: `A ${data.pricingType} pricing rule already exists for this vehicle - edit it instead` });
    }
    res.status(400).send({ message: "Could not create pricing rule" });
  }
});

// Update a pricing rule - manager only, company-scoped (404, not 403, on a
// mismatch, so a rule id reveals nothing about another company's data).
router.put("/rules/:id", requireAuth, requireRole("manager"), async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).send({ message: "Invalid pricing rule id" });

  const { success, data, error } = priceRuleUpdateValidation(req.body);
  if (!success) return res.status(400).send({ message: error.errors[0].message });

  try {
    const rule = await PriceRule.findOne({ _id: req.params.id, companyId: req.user.companyId });
    if (!rule) return res.status(404).send({ message: "Pricing rule not found" });

    if (data.vehicleId && data.vehicleId !== rule.vehicleId.toString()) {
      const vehicle = await findOwnedVehicle(req.user.companyId, data.vehicleId);
      if (!vehicle) return res.status(404).send({ message: "Vehicle not found" });
    }

    const nextVehicleId = data.vehicleId ?? rule.vehicleId.toString();
    const nextPricingType = data.pricingType ?? rule.pricingType;
    if (nextVehicleId !== rule.vehicleId.toString() || nextPricingType !== rule.pricingType) {
      const collision = await PriceRule.findOne({
        _id: { $ne: rule._id },
        companyId: req.user.companyId,
        vehicleId: nextVehicleId,
        pricingType: nextPricingType,
      });
      if (collision) return res.status(409).send({ message: `A ${nextPricingType} pricing rule already exists for this vehicle` });
    }

    Object.assign(rule, data);
    await rule.save();
    await rule.populate("vehicleId", VEHICLE_FIELDS);
    res.json(rule);
  } catch (error) {
    res.status(400).send({ message: "Could not update pricing rule" });
  }
});

// Delete a pricing rule - manager only, company-scoped. A real (hard)
// delete, unlike the Vehicle/Driver soft-deletes: nothing references a
// PriceRule by id - a priced ride stores its own snapshot (pricingType,
// pricingRate, price) at creation time (see routes/rideRoutes.js), not a
// live reference to the rule that produced it, so removing the rule can
// never orphan historical ride data.
router.delete("/rules/:id", requireAuth, requireRole("manager"), async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).send({ message: "Invalid pricing rule id" });

  try {
    const rule = await PriceRule.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
    if (!rule) return res.status(404).send({ message: "Pricing rule not found" });
    res.json({ message: "Pricing rule deleted." });
  } catch (error) {
    res.status(500).send({ message: "Could not delete pricing rule" });
  }
});

// Activate/deactivate a pricing rule - manager only, company-scoped.
router.patch("/rules/:id/status", requireAuth, requireRole("manager"), async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).send({ message: "Invalid pricing rule id" });
  if (typeof req.body.active !== "boolean") return res.status(400).send({ message: '"active" must be true or false' });

  try {
    const rule = await PriceRule.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      { active: req.body.active },
      { new: true }
    ).populate("vehicleId", VEHICLE_FIELDS);
    if (!rule) return res.status(404).send({ message: "Pricing rule not found" });
    res.json(rule);
  } catch (error) {
    res.status(500).send({ message: "Could not update pricing rule status" });
  }
});

// Calculate a ride price - dispatcher or manager today (ride creation is
// dispatcher/manager-only); the same endpoint a future client reservation
// flow would call once client-facing auth exists. companyId always comes
// from the JWT, never the request body.
router.post("/calculate", requireAuth, requireRole("dispatcher", "manager"), async (req, res) => {
  const { success, data, error } = calculateRequestValidation(req.body);
  if (!success) return res.status(400).send({ message: error.errors[0].message });

  try {
    const vehicle = await findOwnedVehicle(req.user.companyId, data.vehicleId);
    if (!vehicle) return res.status(404).send({ message: "Vehicle not found" });

    const result =
      data.pricingType === "point-to-point"
        ? await calculatePointToPoint({ companyId: req.user.companyId, vehicleId: data.vehicleId, waypoints: data.waypoints })
        : await calculateHourly({ companyId: req.user.companyId, vehicleId: data.vehicleId, durationHours: data.durationHours });

    if (result.error) {
      const mapped = pricingErrorResponse(result.error);
      return res.status(mapped.status).send({ message: mapped.message });
    }

    res.json(result);
  } catch (error) {
    res.status(500).send({ message: "Could not calculate price" });
  }
});

module.exports = router;
