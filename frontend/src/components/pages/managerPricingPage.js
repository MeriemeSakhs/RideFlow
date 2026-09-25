import React, { useState, useEffect } from "react";
import { Plus, DollarSign, CheckCircle2, TrendingUp } from "lucide-react";
import PortalLayout from "../layout/PortalLayout";
import Modal from "../ui/Modal";
import StatCard from "../ui/StatCard";
import StatusBadge from "../ui/StatusBadge";
import { MANAGER_NAV_ITEMS } from "../../portalConfig";
import getUserInfo from "../../utilities/decodeJwt";
import mockPricingRules from "../../mockData/mockPricingRules";

// MOCK DATA / LOCAL STATE ONLY - the real pricing engine (Todo #9) will store
// these rules server-side and use them (with real driving distance) to
// calculate ride fares. For now this page just demonstrates the Manager's
// ability to define the rule shape the pricing engine will consume.
const emptyRuleForm = { name: "", vehicleType: "Sedan", baseRate: 0, perMile: 0, perMinute: 0, surge: 1, status: "active" };
const inputClass = "w-full px-4 py-2 rounded-md border border-rideflow-navy/20 text-rideflow-navy focus:outline-none focus:ring-2 focus:ring-rideflow-orange focus:border-rideflow-orange";
const STATUS_STYLES = { active: "bg-emerald-100 text-emerald-700", inactive: "bg-rideflow-gray/60 text-rideflow-navy/60" };
const NUMERIC_FIELDS = ["baseRate", "perMile", "perMinute", "surge"];

const ManagerPricing = () => {
  const [user, setUser] = useState(undefined);
  const [rules, setRules] = useState(mockPricingRules);
  const [modalMode, setModalMode] = useState(null);
  const [formData, setFormData] = useState(emptyRuleForm);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setUser(getUserInfo());
  }, []);

  const handleChange = ({ currentTarget: input }) => {
    setFormData((prev) => ({ ...prev, [input.name]: NUMERIC_FIELDS.includes(input.name) ? Number(input.value) : input.value }));
  };

  const openAdd = () => {
    setModalMode("add");
    setFormData(emptyRuleForm);
    setFormError("");
  };

  const openEdit = (rule) => {
    setModalMode("edit");
    setEditingId(rule.id);
    setFormData({ name: rule.name, vehicleType: rule.vehicleType, baseRate: rule.baseRate, perMile: rule.perMile, perMinute: rule.perMinute, surge: rule.surge, status: rule.status });
    setFormError("");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
  };

  const handleDelete = (rule) => {
    if (!window.confirm(`Delete pricing rule "${rule.name}"?`)) return;
    setRules((prev) => prev.filter((r) => r.id !== rule.id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError("Rule name is required");
      return;
    }

    if (modalMode === "add") {
      const nextNumber = rules.length + 1;
      setRules((prev) => [...prev, { id: `PR-${String(nextNumber).padStart(3, "0")}`, ...formData }]);
    } else if (modalMode === "edit") {
      setRules((prev) => prev.map((r) => (r.id === editingId ? { ...r, ...formData } : r)));
    }
    closeModal();
  };

  const activeCount = rules.filter((r) => r.status === "active").length;
  const activeRules = rules.filter((r) => r.status === "active" && r.baseRate > 0);
  const avgBaseRate = activeRules.length ? activeRules.reduce((sum, r) => sum + r.baseRate, 0) / activeRules.length : 0;
  const surgeActive = rules.some((r) => r.status === "active" && r.surge > 1);

  return (
    <PortalLayout portalTitle="Manager Portal" portalSubtitle="Monitor operations and view analytics" navItems={MANAGER_NAV_ITEMS} user={user}>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-rideflow-navy/60">Manage your pricing structure and rates</p>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rideflow-orange hover:bg-rideflow-orange-hover text-white font-semibold text-sm shadow-sm transition-colors"
        >
          <Plus size={16} /> Add Pricing Rule
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={DollarSign} label="Total Rules" value={rules.length} iconBg="bg-rideflow-orange/10" iconColor="text-rideflow-orange" />
        <StatCard icon={CheckCircle2} label="Active Rules" value={activeCount} iconBg="bg-emerald-100" iconColor="text-emerald-600" />
        <StatCard icon={DollarSign} label="Avg Base Rate" value={`$${avgBaseRate.toFixed(0)}`} iconBg="bg-blue-100" iconColor="text-blue-600" />
        <StatCard icon={TrendingUp} label="Surge Active" value={surgeActive ? "Yes" : "No"} iconBg={surgeActive ? "bg-red-100" : "bg-rideflow-gray/60"} iconColor={surgeActive ? "text-red-600" : "text-rideflow-navy/60"} />
      </div>

      <div className="bg-white rounded-xl border border-black/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5">
          <h3 className="font-bold text-rideflow-navy">All Pricing Rules</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-rideflow-navy/40 uppercase border-b border-black/5">
                <th className="px-5 py-2 font-semibold">Rule ID</th>
                <th className="px-5 py-2 font-semibold">Name</th>
                <th className="px-5 py-2 font-semibold">Vehicle Type</th>
                <th className="px-5 py-2 font-semibold">Base Rate</th>
                <th className="px-5 py-2 font-semibold">Per Mile</th>
                <th className="px-5 py-2 font-semibold">Per Minute</th>
                <th className="px-5 py-2 font-semibold">Surge</th>
                <th className="px-5 py-2 font-semibold">Status</th>
                <th className="px-5 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className="border-b border-black/5 last:border-0">
                  <td className="px-5 py-3 font-semibold text-rideflow-orange">{rule.id}</td>
                  <td className="px-5 py-3 text-rideflow-navy">{rule.name}</td>
                  <td className="px-5 py-3 text-rideflow-navy">{rule.vehicleType}</td>
                  <td className="px-5 py-3 text-rideflow-navy">${rule.baseRate.toFixed(2)}</td>
                  <td className="px-5 py-3 text-rideflow-navy">${rule.perMile.toFixed(2)}</td>
                  <td className="px-5 py-3 text-rideflow-navy">${rule.perMinute.toFixed(2)}</td>
                  <td className="px-5 py-3 text-rideflow-navy">{rule.surge}x</td>
                  <td className="px-5 py-3"><StatusBadge status={rule.status} styles={STATUS_STYLES} /></td>
                  <td className="px-5 py-3">
                    <div className="flex gap-3">
                      <button type="button" onClick={() => openEdit(rule)} className="text-rideflow-orange hover:text-rideflow-orange-hover font-semibold">Edit</button>
                      <button type="button" onClick={() => handleDelete(rule)} className="text-red-600 hover:text-red-700 font-semibold">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!modalMode} onClose={closeModal} title={modalMode === "add" ? "Add Pricing Rule" : "Edit Pricing Rule"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-rideflow-navy mb-1">Rule Name</label>
            <input type="text" name="name" placeholder="e.g. Standard Sedan Rate" value={formData.name} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-rideflow-navy mb-1">Vehicle Type</label>
            <select name="vehicleType" value={formData.vehicleType} onChange={handleChange} className={inputClass}>
              <option>Sedan</option>
              <option>SUV</option>
              <option>Van</option>
              <option>Luxury</option>
              <option>All</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-rideflow-navy mb-1">Base Rate ($)</label>
              <input type="number" step="0.01" min="0" name="baseRate" value={formData.baseRate} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-rideflow-navy mb-1">Surge Multiplier</label>
              <input type="number" step="0.1" min="1" name="surge" value={formData.surge} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-rideflow-navy mb-1">Per Mile ($)</label>
              <input type="number" step="0.01" min="0" name="perMile" value={formData.perMile} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-rideflow-navy mb-1">Per Minute ($)</label>
              <input type="number" step="0.01" min="0" name="perMinute" value={formData.perMinute} onChange={handleChange} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-rideflow-navy mb-1">Status</label>
            <select name="status" value={formData.status} onChange={handleChange} className={inputClass}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          {formError && <p className="text-red-600 text-sm">{formError}</p>}
          <button type="submit" className="w-full py-2.5 rounded-lg bg-rideflow-orange hover:bg-rideflow-orange-hover text-white font-semibold transition-colors shadow-sm">
            {modalMode === "add" ? "Add Rule" : "Save Changes"}
          </button>
        </form>
      </Modal>
    </PortalLayout>
  );
};

export default ManagerPricing;
