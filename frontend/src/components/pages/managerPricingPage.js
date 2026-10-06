import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Plus, DollarSign, CheckCircle2, XCircle } from "lucide-react";
import PortalLayout from "../layout/PortalLayout";
import Modal from "../ui/Modal";
import ConfirmDialog from "../ui/ConfirmDialog";
import StatCard from "../ui/StatCard";
import StatusBadge from "../ui/StatusBadge";
import { MANAGER_NAV_ITEMS } from "../../portalConfig";
import getUserInfo from "../../utilities/decodeJwt";
import { authHeader, errorMessageFrom } from "../../utilities/api";
import { portalPathFor } from "../../utilities/companyUrl";

const PRICING_URL = `${process.env.REACT_APP_BACKEND_SERVER_URI}/pricing`;
const VEHICLE_URL = `${process.env.REACT_APP_BACKEND_SERVER_URI}/vehicle`;
const STATUS_STYLES = { active: "bg-emerald-100 text-emerald-700", inactive: "bg-rideflow-gray/60 text-rideflow-navy/60" };
const inputClass =
  "w-full px-4 py-2 rounded-md border border-rideflow-navy/20 text-rideflow-navy focus:outline-none focus:ring-2 focus:ring-rideflow-orange focus:border-rideflow-orange";

const emptyForm = { vehicleId: "", pointToPointRate: "", hourlyRate: "", active: true };

const vehicleLabel = (v) => `${v.make} ${v.model} — ${v.vehicleType} — ${v.licensePlate}`;

// Each actual vehicle (see backend/server/models/vehiculeModel.js - a
// manager's own company fleet, never another company's) is managed as ONE
// row, but under the hood it's up to two separate PriceRule documents - one
// "point-to-point" and one "hourly" - since the backend keeps those fully
// independent (see backend/server/models/priceRuleModel.js) for a future
// reservation flow that may only need one or the other.
const groupRulesByVehicle = (rules) => {
  const map = {};
  rules.forEach((rule) => {
    const vehicle = rule.vehicleId; // populated by GET /pricing/rules
    if (!vehicle) return;
    if (!map[vehicle._id]) map[vehicle._id] = { vehicle, pointToPoint: null, hourly: null };
    if (rule.pricingType === "point-to-point") map[vehicle._id].pointToPoint = rule;
    else map[vehicle._id].hourly = rule;
  });
  return Object.values(map).sort((a, b) => vehicleLabel(a.vehicle).localeCompare(vehicleLabel(b.vehicle)));
};

const ManagerPricing = () => {
  const [user, setUser] = useState(undefined);
  const [rules, setRules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [vehicles, setVehicles] = useState([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);

  const [modalMode, setModalMode] = useState(null); // "add" | "edit" | null
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingVehicleId, setTogglingVehicleId] = useState(null);
  const [deletingVehicleId, setDeletingVehicleId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [confirmTarget, setConfirmTarget] = useState(null);

  const fetchRules = useCallback(async () => {
    setIsLoading(true);
    setListError("");
    try {
      const { data } = await axios.get(`${PRICING_URL}/rules`, { headers: authHeader() });
      setRules(data);
    } catch (err) {
      setListError(errorMessageFrom(err, "Could not load pricing rules. Check your connection and try again."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchVehicles = useCallback(async () => {
    setIsLoadingVehicles(true);
    try {
      const { data } = await axios.get(VEHICLE_URL, { headers: authHeader() });
      setVehicles(data);
    } catch (err) {
      // Non-fatal for the page itself (the rules table still renders) - the
      // add/edit form will simply show an empty vehicle list.
    } finally {
      setIsLoadingVehicles(false);
    }
  }, []);

  useEffect(() => {
    setUser(getUserInfo());
    fetchRules();
    fetchVehicles();
  }, [fetchRules, fetchVehicles]);

  const grouped = useMemo(() => groupRulesByVehicle(rules), [rules]);

  // GET /vehicle already excludes deleted/inactive vehicles - a manager
  // creating a rule only ever sees their active fleet. When EDITING a rule
  // that already references a since-deleted vehicle, that one vehicle
  // won't be in `vehicles` anymore; it's pulled from the rule's own
  // populated data instead, so the dropdown still shows it correctly
  // rather than going blank (it's not selectable as a new choice anyway,
  // since the field is disabled while editing).
  const availableVehicles = vehicles;
  const editingGroupVehicle = modalMode === "edit" ? grouped.find((g) => g.vehicle._id === editingVehicleId)?.vehicle : null;
  const dropdownVehicles =
    editingGroupVehicle && !availableVehicles.some((v) => v._id === editingGroupVehicle._id)
      ? [editingGroupVehicle, ...availableVehicles]
      : availableVehicles;

  const handleChange = ({ currentTarget: input }) => {
    const value = input.type === "checkbox" ? input.checked : input.value;
    setFormData((prev) => ({ ...prev, [input.name]: value }));
  };

  const openAdd = () => {
    setModalMode("add");
    setEditingVehicleId(null);
    setFormData(emptyForm);
    setFormError("");
  };

  const openEdit = (group) => {
    setModalMode("edit");
    setEditingVehicleId(group.vehicle._id);
    setFormData({
      vehicleId: group.vehicle._id,
      pointToPointRate: group.pointToPoint ? String(group.pointToPoint.rate) : "",
      hourlyRate: group.hourly ? String(group.hourly.rate) : "",
      active: (group.pointToPoint ?? group.hourly)?.active ?? true,
    });
    setFormError("");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingVehicleId(null);
  };

  const upsertRule = (existingRule, payload) =>
    existingRule
      ? axios.put(`${PRICING_URL}/rules/${existingRule._id}`, payload, { headers: authHeader() })
      : axios.post(`${PRICING_URL}/rules`, payload, { headers: authHeader() });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.vehicleId) {
      setFormError("Select a vehicle");
      return;
    }

    const pointToPointRate = formData.pointToPointRate === "" ? null : Number(formData.pointToPointRate);
    const hourlyRate = formData.hourlyRate === "" ? null : Number(formData.hourlyRate);
    if (pointToPointRate === null && hourlyRate === null) {
      setFormError("Enter a point-to-point rate, an hourly rate, or both");
      return;
    }
    if ((pointToPointRate !== null && (!Number.isFinite(pointToPointRate) || pointToPointRate <= 0)) ||
        (hourlyRate !== null && (!Number.isFinite(hourlyRate) || hourlyRate <= 0))) {
      setFormError("Rates must be greater than 0");
      return;
    }

    setIsSubmitting(true);
    try {
      const existingGroup = grouped.find((g) => g.vehicle._id === editingVehicleId);
      const tasks = [];
      if (pointToPointRate !== null) {
        tasks.push(
          upsertRule(existingGroup?.pointToPoint, { vehicleId: formData.vehicleId, pricingType: "point-to-point", rate: pointToPointRate, active: formData.active })
        );
      }
      if (hourlyRate !== null) {
        tasks.push(upsertRule(existingGroup?.hourly, { vehicleId: formData.vehicleId, pricingType: "hourly", rate: hourlyRate, active: formData.active }));
      }
      await Promise.all(tasks);
      closeModal();
      await fetchRules();
    } catch (err) {
      setFormError(errorMessageFrom(err, "Could not save pricing rule. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (group) => {
    setActionError("");
    setTogglingVehicleId(group.vehicle._id);
    const nextActive = !((group.pointToPoint ?? group.hourly)?.active ?? true);
    try {
      const tasks = [group.pointToPoint, group.hourly]
        .filter(Boolean)
        .map((rule) => axios.patch(`${PRICING_URL}/rules/${rule._id}/status`, { active: nextActive }, { headers: authHeader() }));
      await Promise.all(tasks);
      await fetchRules();
    } catch (err) {
      setActionError(errorMessageFrom(err, "Could not update pricing rule status. Please try again."));
    } finally {
      setTogglingVehicleId(null);
    }
  };

  // Clicking Delete only opens the confirmation dialog - nothing is
  // deleted until the dialog's own Delete button is explicitly clicked.
  const handleDelete = (group) => setConfirmTarget(group);

  const cancelDelete = () => setConfirmTarget(null);

  const confirmDelete = async () => {
    const group = confirmTarget;
    setActionError("");
    setDeletingVehicleId(group.vehicle._id);
    try {
      const tasks = [group.pointToPoint, group.hourly]
        .filter(Boolean)
        .map((rule) => axios.delete(`${PRICING_URL}/rules/${rule._id}`, { headers: authHeader() }));
      await Promise.all(tasks);
      setConfirmTarget(null);
      await fetchRules();
    } catch (err) {
      setActionError(errorMessageFrom(err, "Could not delete pricing rule. Please try again."));
      setConfirmTarget(null);
    } finally {
      setDeletingVehicleId(null);
    }
  };

  const activeVehicles = grouped.filter((g) => (g.pointToPoint ?? g.hourly)?.active).length;
  const vehiclesPath = `${portalPathFor("manager", user?.companySlug)}/vehicles`;

  return (
    <PortalLayout portalTitle="Manager Portal" portalSubtitle="Monitor operations and view analytics" navItems={MANAGER_NAV_ITEMS} user={user}>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-rideflow-navy/60">Configure point-to-point and hourly rates for each of your vehicles</p>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rideflow-orange hover:bg-rideflow-orange-hover text-white font-semibold text-sm shadow-sm transition-colors"
        >
          <Plus size={16} /> Add Pricing Rule
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={DollarSign} label="Vehicles Priced" value={grouped.length} iconBg="bg-rideflow-orange/10" iconColor="text-rideflow-orange" />
        <StatCard icon={CheckCircle2} label="Active" value={activeVehicles} iconBg="bg-emerald-100" iconColor="text-emerald-600" />
        <StatCard icon={XCircle} label="Inactive" value={grouped.length - activeVehicles} iconBg="bg-rideflow-gray/60" iconColor="text-rideflow-navy/60" />
      </div>

      <div className="bg-white rounded-xl border border-black/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5">
          <h3 className="font-bold text-rideflow-navy">Pricing Settings</h3>
        </div>

        {isLoading && <p className="text-rideflow-navy/60 px-5 py-6">Loading pricing rules...</p>}
        {!isLoading && listError && <p className="text-red-600 text-sm px-5 py-6">{listError}</p>}
        {!isLoading && !listError && grouped.length === 0 && (
          <p className="text-rideflow-navy/40 px-5 py-6">No pricing rules configured yet. Add one to get started.</p>
        )}

        {!isLoading && !listError && grouped.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-rideflow-navy/40 uppercase border-b border-black/5">
                  <th className="px-5 py-2 font-semibold">Vehicle</th>
                  <th className="px-5 py-2 font-semibold">Point-to-Point</th>
                  <th className="px-5 py-2 font-semibold">Hourly</th>
                  <th className="px-5 py-2 font-semibold">Status</th>
                  <th className="px-5 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map((group) => {
                  const isActive = (group.pointToPoint ?? group.hourly)?.active ?? false;
                  return (
                    <tr key={group.vehicle._id} className="border-b border-black/5 last:border-0 align-top">
                      <td className="px-5 py-3 text-rideflow-navy font-medium">{vehicleLabel(group.vehicle)}</td>
                      <td className="px-5 py-3 text-rideflow-navy">{group.pointToPoint ? `$${group.pointToPoint.rate.toFixed(2)}/mile` : "—"}</td>
                      <td className="px-5 py-3 text-rideflow-navy">{group.hourly ? `$${group.hourly.rate.toFixed(2)}/hr` : "—"}</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={isActive ? "active" : "inactive"} styles={STATUS_STYLES} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-3">
                          <button type="button" onClick={() => openEdit(group)} className="text-rideflow-orange hover:text-rideflow-orange-hover font-semibold">
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(group)}
                            disabled={togglingVehicleId === group.vehicle._id}
                            className="text-rideflow-navy/60 hover:text-rideflow-navy font-semibold disabled:opacity-50"
                          >
                            {togglingVehicleId === group.vehicle._id ? "Saving..." : isActive ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(group)}
                            disabled={deletingVehicleId === group.vehicle._id}
                            className="text-red-600 hover:text-red-700 font-semibold disabled:opacity-50"
                          >
                            {deletingVehicleId === group.vehicle._id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {actionError && <p className="text-red-600 text-xs px-5 pb-4">{actionError}</p>}
      </div>

      <Modal open={!!modalMode} onClose={closeModal} title={modalMode === "add" ? "Add Pricing Rule" : "Edit Pricing Rule"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-rideflow-navy mb-1">Vehicle</label>
            {!isLoadingVehicles && availableVehicles.length === 0 && modalMode === "add" ? (
              <div className="text-sm text-rideflow-navy/60 bg-rideflow-gray/30 rounded-md p-3">
                No vehicles available. <Link to={vehiclesPath} className="text-rideflow-orange font-semibold hover:text-rideflow-orange-hover">Add a vehicle</Link> before creating a pricing rule.
              </div>
            ) : (
              <select
                name="vehicleId"
                value={formData.vehicleId}
                onChange={handleChange}
                disabled={modalMode === "edit"}
                className={`${inputClass} disabled:bg-rideflow-gray/30 disabled:text-rideflow-navy/60`}
              >
                <option value="">{isLoadingVehicles ? "Loading vehicles..." : "Select a vehicle"}</option>
                {dropdownVehicles.map((v) => (
                  <option key={v._id} value={v._id}>
                    {vehicleLabel(v)}
                    {!["active", "maintenance"].includes(v.status) ? " (deleted)" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-rideflow-navy mb-1">Point-to-Point ($/mile)</label>
              <input type="number" step="0.01" min="0" name="pointToPointRate" placeholder="e.g. 3.00" value={formData.pointToPointRate} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-rideflow-navy mb-1">Hourly ($/hr)</label>
              <input type="number" step="0.01" min="0" name="hourlyRate" placeholder="e.g. 45.00" value={formData.hourlyRate} onChange={handleChange} className={inputClass} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-rideflow-navy">
            <input type="checkbox" name="active" checked={formData.active} onChange={handleChange} className="rounded border-rideflow-navy/20" />
            Active
          </label>
          {formError && <p className="text-red-600 text-sm">{formError}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-lg bg-rideflow-orange hover:bg-rideflow-orange-hover disabled:opacity-50 text-white font-semibold transition-colors shadow-sm"
          >
            {isSubmitting ? "Saving..." : modalMode === "add" ? "Add Rule" : "Save Changes"}
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmTarget}
        title="Delete Pricing Rule?"
        message={
          confirmTarget
            ? `Are you sure you want to delete the pricing for ${vehicleLabel(confirmTarget.vehicle)}? This removes both the point-to-point and hourly rates for this vehicle.`
            : ""
        }
        isConfirming={deletingVehicleId === confirmTarget?.vehicle._id}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </PortalLayout>
  );
};

export default ManagerPricing;
