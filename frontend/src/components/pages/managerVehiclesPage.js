import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import PortalLayout from "../layout/PortalLayout";
import Modal from "../ui/Modal";
import VehiclesTable from "../vehicles/VehiclesTable";
import { MANAGER_NAV_ITEMS } from "../../portalConfig";
import getUserInfo from "../../utilities/decodeJwt";
import mockVehicles from "../../mockData/mockVehicles";

// MOCK DATA / LOCAL STATE ONLY - Vehicle Management backend is not
// implemented yet. See managerDriversPage.js for the same pattern.
const emptyVehicleForm = { type: "Sedan", makeModel: "", licensePlate: "", assignedDriver: "", mileage: 0, status: "active" };
const inputClass = "w-full px-4 py-2 rounded-md border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";

const ManagerVehicles = () => {
  const [user, setUser] = useState(undefined);
  const [vehicles, setVehicles] = useState(mockVehicles);
  const [modalMode, setModalMode] = useState(null);
  const [formData, setFormData] = useState(emptyVehicleForm);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setUser(getUserInfo());
  }, []);

  const handleChange = ({ currentTarget: input }) => {
    setFormData((prev) => ({ ...prev, [input.name]: input.name === "mileage" ? Number(input.value) : input.value }));
  };

  const openAdd = () => {
    setModalMode("add");
    setFormData(emptyVehicleForm);
    setFormError("");
  };

  const openEdit = (vehicle) => {
    setModalMode("edit");
    setEditingId(vehicle.id);
    setFormData({
      type: vehicle.type,
      makeModel: vehicle.makeModel,
      licensePlate: vehicle.licensePlate,
      assignedDriver: vehicle.assignedDriver || "",
      mileage: vehicle.mileage,
      status: vehicle.status,
    });
    setFormError("");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.makeModel.trim() || !formData.licensePlate.trim()) {
      setFormError("Make/model and license plate are required");
      return;
    }

    if (modalMode === "add") {
      const nextNumber = vehicles.length + 1;
      const newVehicle = { id: `VEH-${String(nextNumber).padStart(3, "0")}`, ...formData };
      setVehicles((prev) => [...prev, newVehicle]);
    } else if (modalMode === "edit") {
      setVehicles((prev) => prev.map((v) => (v.id === editingId ? { ...v, ...formData } : v)));
    }
    closeModal();
  };

  return (
    <PortalLayout portalTitle="Manager Portal" portalSubtitle="Monitor operations and view analytics" navItems={MANAGER_NAV_ITEMS} user={user}>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-slate-500">Manage your fleet vehicles</p>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm transition-colors"
        >
          <Plus size={16} /> Add New Vehicle
        </button>
      </div>

      <VehiclesTable vehicles={vehicles} onSelect={openEdit} selectLabel="Edit" />

      <Modal open={!!modalMode} onClose={closeModal} title={modalMode === "add" ? "Add New Vehicle" : "Edit Vehicle"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Vehicle Type</label>
            <select name="type" value={formData.type} onChange={handleChange} className={inputClass}>
              <option>Sedan</option>
              <option>SUV</option>
              <option>Van</option>
              <option>Luxury</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Make &amp; Model</label>
            <input type="text" name="makeModel" placeholder="e.g. 2024 Toyota Camry" value={formData.makeModel} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">License Plate</label>
            <input type="text" name="licensePlate" value={formData.licensePlate} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Assigned Driver</label>
            <input type="text" name="assignedDriver" placeholder="Optional" value={formData.assignedDriver} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Mileage</label>
            <input type="number" name="mileage" min="0" value={formData.mileage} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
            <select name="status" value={formData.status} onChange={handleChange} className={inputClass}>
              <option value="active">Active</option>
              <option value="in-use">In Use</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
          {formError && <p className="text-red-600 text-sm">{formError}</p>}
          <button type="submit" className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors shadow-sm">
            {modalMode === "add" ? "Add Vehicle" : "Save Changes"}
          </button>
        </form>
      </Modal>
    </PortalLayout>
  );
};

export default ManagerVehicles;
