import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Plus } from "lucide-react";
import PortalLayout from "../layout/PortalLayout";
import Modal from "../ui/Modal";
import ConfirmDialog from "../ui/ConfirmDialog";
import VehiclesTable from "../vehicles/VehiclesTable";
import { MANAGER_NAV_ITEMS } from "../../portalConfig";
import getUserInfo from "../../utilities/decodeJwt";
import { authHeader, errorMessageFrom } from "../../utilities/api";

const VEHICLE_URL = `${process.env.REACT_APP_BACKEND_SERVER_URI}/vehicle`;
const DRIVER_URL = `${process.env.REACT_APP_BACKEND_SERVER_URI}/driver`;
const inputClass = "w-full px-4 py-2 rounded-md border border-rideflow-navy/20 text-rideflow-navy focus:outline-none focus:ring-2 focus:ring-rideflow-orange focus:border-rideflow-orange";
const emptyForm = { vehicleId: "", vehicleType: "", year: "", make: "", model: "", licensePlate: "", assignedDriver: "", mileage: "0", status: "active" };

const ManagerVehicles = () => {
  const [user, setUser] = useState(undefined);
  const [vehicles, setVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [drivers, setDrivers] = useState([]);

  const [modalMode, setModalMode] = useState(null); // "add" | "edit" | null
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [removingId, setRemovingId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [confirmTarget, setConfirmTarget] = useState(null);

  const fetchVehicles = useCallback(async () => {
    setIsLoading(true);
    setListError("");
    try {
      const { data } = await axios.get(VEHICLE_URL, { headers: authHeader() });
      setVehicles(data);
    } catch (err) {
      setListError(errorMessageFrom(err, "Could not load vehicles. Check your connection and try again."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchDrivers = useCallback(async () => {
    try {
      const { data } = await axios.get(DRIVER_URL, { headers: authHeader() });
      setDrivers(data);
    } catch (err) {
      // Non-fatal - the Assigned Driver dropdown just shows no options.
    }
  }, []);

  useEffect(() => {
    setUser(getUserInfo());
    fetchVehicles();
    fetchDrivers();
  }, [fetchVehicles, fetchDrivers]);

  const handleChange = ({ currentTarget: input }) => {
    setFormData((prev) => ({ ...prev, [input.name]: input.value }));
  };

  const openAdd = () => {
    setModalMode("add");
    setEditingId(null);
    setFormData(emptyForm);
    setFormError("");
  };

  const openEdit = (vehicle) => {
    setModalMode("edit");
    setEditingId(vehicle._id);
    setFormData({
      vehicleId: vehicle.vehicleId || "",
      vehicleType: vehicle.vehicleType,
      year: vehicle.year ? String(vehicle.year) : "",
      make: vehicle.make,
      model: vehicle.model,
      licensePlate: vehicle.licensePlate,
      assignedDriver: vehicle.assignedDriver?._id || "",
      mileage: String(vehicle.mileage ?? 0),
      status: ["active", "maintenance"].includes(vehicle.status) ? vehicle.status : "active",
    });
    setFormError("");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (modalMode === "add" && !formData.vehicleId.trim()) {
      setFormError("Vehicle ID is required");
      return;
    }
    if (!formData.vehicleType || !formData.year || !formData.make.trim() || !formData.model.trim() || !formData.licensePlate.trim()) {
      setFormError("Vehicle type, year, make, model, and license plate are required");
      return;
    }

    const payload = {
      vehicleType: formData.vehicleType,
      year: Number(formData.year),
      make: formData.make.trim(),
      model: formData.model.trim(),
      licensePlate: formData.licensePlate.trim(),
      assignedDriver: formData.assignedDriver || null,
      mileage: formData.mileage === "" ? 0 : Number(formData.mileage),
      status: formData.status,
    };

    setIsSubmitting(true);
    try {
      if (modalMode === "add") {
        await axios.post(VEHICLE_URL, { ...payload, vehicleId: formData.vehicleId.trim() }, { headers: authHeader() });
      } else {
        await axios.put(`${VEHICLE_URL}/${editingId}`, payload, { headers: authHeader() });
      }
      closeModal();
      await fetchVehicles();
    } catch (err) {
      setFormError(errorMessageFrom(err, "Could not save vehicle. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clicking Delete only opens the confirmation dialog - nothing is
  // deleted until the dialog's own Delete button is explicitly clicked.
  const handleRemove = (vehicle) => setConfirmTarget(vehicle);

  const cancelRemove = () => setConfirmTarget(null);

  const confirmRemove = async () => {
    const vehicle = confirmTarget;
    setActionError("");
    setRemovingId(vehicle._id);
    try {
      await axios.patch(`${VEHICLE_URL}/${vehicle._id}/remove`, {}, { headers: authHeader() });
      setConfirmTarget(null);
      await fetchVehicles();
    } catch (err) {
      setActionError(errorMessageFrom(err, "Could not delete vehicle. Please try again."));
      setConfirmTarget(null);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <PortalLayout portalTitle="Manager Portal" portalSubtitle="Monitor operations and view analytics" navItems={MANAGER_NAV_ITEMS} user={user}>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-rideflow-navy/60">Manage your fleet vehicles</p>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rideflow-orange hover:bg-rideflow-orange-hover text-white font-semibold text-sm shadow-sm transition-colors"
        >
          <Plus size={16} /> Add Vehicle
        </button>
      </div>

      {isLoading && <p className="text-rideflow-navy/60">Loading vehicles...</p>}
      {!isLoading && listError && <p className="text-red-600 text-sm">{listError}</p>}
      {!isLoading && !listError && (
        <>
          <VehiclesTable vehicles={vehicles} onEdit={openEdit} onRemove={handleRemove} removingId={removingId} />
          {actionError && <p className="text-red-600 text-xs mt-2">{actionError}</p>}
        </>
      )}

      <Modal open={!!modalMode} onClose={closeModal} title={modalMode === "add" ? "Add Vehicle" : "Edit Vehicle"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-rideflow-navy mb-1">Vehicle ID</label>
            <input
              type="text"
              name="vehicleId"
              placeholder="e.g. VEH-001"
              value={formData.vehicleId}
              onChange={handleChange}
              disabled={modalMode === "edit"}
              className={`${inputClass} disabled:bg-rideflow-gray/30 disabled:text-rideflow-navy/60`}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-rideflow-navy mb-1">Vehicle Type</label>
              <select name="vehicleType" value={formData.vehicleType} onChange={handleChange} className={inputClass}>
                <option value="">Select a type</option>
                <option>Sedan</option>
                <option>SUV</option>
                <option>Van</option>
                <option>Bus</option>
                <option>Luxury</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-rideflow-navy mb-1">Year</label>
              <input type="number" name="year" placeholder="e.g. 2024" value={formData.year} onChange={handleChange} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-rideflow-navy mb-1">Make</label>
              <input type="text" name="make" placeholder="e.g. Toyota" value={formData.make} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-rideflow-navy mb-1">Model</label>
              <input type="text" name="model" placeholder="e.g. Camry" value={formData.model} onChange={handleChange} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-rideflow-navy mb-1">License Plate</label>
            <input type="text" name="licensePlate" value={formData.licensePlate} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-rideflow-navy mb-1">Assigned Driver</label>
            <select name="assignedDriver" value={formData.assignedDriver} onChange={handleChange} className={inputClass}>
              <option value="">Unassigned</option>
              {drivers.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-rideflow-navy mb-1">Mileage</label>
              <input type="number" min="0" name="mileage" value={formData.mileage} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-rideflow-navy mb-1">Status</label>
              <select name="status" value={formData.status} onChange={handleChange} className={inputClass}>
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          {formError && <p className="text-red-600 text-sm">{formError}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-lg bg-rideflow-orange hover:bg-rideflow-orange-hover disabled:opacity-50 text-white font-semibold transition-colors shadow-sm"
          >
            {isSubmitting ? "Saving..." : modalMode === "add" ? "Add Vehicle" : "Save Changes"}
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmTarget}
        title="Delete Vehicle?"
        message={
          confirmTarget
            ? `Are you sure you want to delete ${confirmTarget.make} ${confirmTarget.model} (${confirmTarget.licensePlate})? It will no longer be available for new pricing rules, but any ride or pricing history referencing it is unaffected.`
            : ""
        }
        isConfirming={removingId === confirmTarget?._id}
        onConfirm={confirmRemove}
        onCancel={cancelRemove}
      />
    </PortalLayout>
  );
};

export default ManagerVehicles;
