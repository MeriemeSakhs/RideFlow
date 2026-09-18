import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import PortalLayout from "../layout/PortalLayout";
import Modal from "../ui/Modal";
import DriversTable from "../drivers/DriversTable";
import { MANAGER_NAV_ITEMS } from "../../portalConfig";
import getUserInfo from "../../utilities/decodeJwt";
import mockDrivers from "../../mockData/mockDrivers";

// MOCK DATA / LOCAL STATE ONLY - Driver Management backend (Todo #7) is not
// implemented yet. Add/Edit here only changes this component's in-memory
// state (seeded from mockData/mockDrivers.js) and is lost on refresh. Swap
// the seed + these handlers for real API calls when that work is due.
const emptyDriverForm = { name: "", email: "", phone: "", vehicleType: "Sedan", status: "available" };
const inputClass = "w-full px-4 py-2 rounded-md border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";

const ManagerDrivers = () => {
  const [user, setUser] = useState(undefined);
  const [drivers, setDrivers] = useState(mockDrivers);
  const [modalMode, setModalMode] = useState(null); // "add" | "edit" | null
  const [formData, setFormData] = useState(emptyDriverForm);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setUser(getUserInfo());
  }, []);

  const handleChange = ({ currentTarget: input }) => {
    setFormData((prev) => ({ ...prev, [input.name]: input.value }));
  };

  const openAdd = () => {
    setModalMode("add");
    setFormData(emptyDriverForm);
    setFormError("");
  };

  const openEdit = (driver) => {
    setModalMode("edit");
    setEditingId(driver.id);
    setFormData({ name: driver.name, email: driver.email, phone: driver.phone, vehicleType: driver.vehicleType, status: driver.status });
    setFormError("");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      setFormError("Name, email, and phone are required");
      return;
    }

    if (modalMode === "add") {
      const nextNumber = drivers.length + 1;
      const newDriver = { id: `DRV-${String(nextNumber).padStart(3, "0")}`, totalRides: 0, ...formData };
      setDrivers((prev) => [...prev, newDriver]);
    } else if (modalMode === "edit") {
      setDrivers((prev) => prev.map((d) => (d.id === editingId ? { ...d, ...formData } : d)));
    }
    closeModal();
  };

  return (
    <PortalLayout portalTitle="Manager Portal" portalSubtitle="Monitor operations and view analytics" navItems={MANAGER_NAV_ITEMS} user={user}>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-slate-500">Manage your fleet drivers</p>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm transition-colors"
        >
          <Plus size={16} /> Add New Driver
        </button>
      </div>

      <DriversTable drivers={drivers} onSelect={openEdit} selectLabel="Edit" />

      <Modal open={!!modalMode} onClose={closeModal} title={modalMode === "add" ? "Add New Driver" : "Edit Driver"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Phone</label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Vehicle Type</label>
            <select name="vehicleType" value={formData.vehicleType} onChange={handleChange} className={inputClass}>
              <option>Sedan</option>
              <option>SUV</option>
              <option>Van</option>
              <option>Luxury</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
            <select name="status" value={formData.status} onChange={handleChange} className={inputClass}>
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>
          {formError && <p className="text-red-600 text-sm">{formError}</p>}
          <button type="submit" className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors shadow-sm">
            {modalMode === "add" ? "Add Driver" : "Save Changes"}
          </button>
        </form>
      </Modal>
    </PortalLayout>
  );
};

export default ManagerDrivers;
