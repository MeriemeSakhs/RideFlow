import React from "react";
import { Car, CheckCircle2, Wrench } from "lucide-react";
import StatCard from "../ui/StatCard";
import StatusBadge from "../ui/StatusBadge";

const STATUS_STYLES = {
  active: "bg-emerald-100 text-emerald-700",
  maintenance: "bg-amber-100 text-amber-700",
  inactive: "bg-rideflow-gray/60 text-rideflow-navy/60",
  removed: "bg-rideflow-gray/60 text-rideflow-navy/60",
};

// Year is only shown when present - a vehicle added before this field
// existed won't have one, and showing "undefined" or "null" would be worse
// than just omitting it.
const makeModelLabel = (v) => `${v.year ? `${v.year} ` : ""}${v.make} ${v.model}`;

// Shared by the Dispatcher (read-only) and Manager (full CRUD) Vehicles
// pages - real data from GET /vehicle (see backend/server/models/vehiculeModel.js),
// never mock data. That endpoint already excludes inactive/deleted
// vehicles, so everything rendered here is the active fleet. onEdit/onRemove
// are optional; when provided (the Manager page), Actions shows Edit/Delete
// buttons instead of the read-only onSelect button the Dispatcher page uses.
const VehiclesTable = ({ vehicles, onSelect, selectLabel = "View Details", onEdit, onRemove, removingId }) => {
  const activeCount = vehicles.filter((v) => v.status === "active").length;
  const maintenanceCount = vehicles.filter((v) => v.status === "maintenance").length;
  const avgMileage = vehicles.length ? Math.round(vehicles.reduce((sum, v) => sum + (v.mileage || 0), 0) / vehicles.length) : 0;
  const hasActions = !!(onEdit || onRemove);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Car} label="Total Vehicles" value={vehicles.length} iconBg="bg-rideflow-orange/10" iconColor="text-rideflow-orange" />
        <StatCard icon={CheckCircle2} label="Active" value={activeCount} iconBg="bg-emerald-100" iconColor="text-emerald-600" />
        <StatCard icon={Wrench} label="Maintenance" value={maintenanceCount} iconBg="bg-amber-100" iconColor="text-amber-600" />
        <StatCard icon={Car} label="Avg Mileage" value={`${(avgMileage / 1000).toFixed(1)}K`} iconBg="bg-blue-100" iconColor="text-blue-600" />
      </div>

      <div className="bg-white rounded-xl border border-black/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5">
          <h3 className="font-bold text-rideflow-navy">All Vehicles</h3>
        </div>
        {vehicles.length === 0 ? (
          <p className="text-rideflow-navy/40 px-5 py-6">No vehicles yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-rideflow-navy/40 uppercase border-b border-black/5">
                  <th className="px-5 py-2 font-semibold">Vehicle ID</th>
                  <th className="px-5 py-2 font-semibold">Type</th>
                  <th className="px-5 py-2 font-semibold">Make &amp; Model</th>
                  <th className="px-5 py-2 font-semibold">License Plate</th>
                  <th className="px-5 py-2 font-semibold">Assigned Driver</th>
                  <th className="px-5 py-2 font-semibold">Mileage</th>
                  <th className="px-5 py-2 font-semibold">Status</th>
                  <th className="px-5 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((vehicle) => (
                  <tr key={vehicle._id} className="border-b border-black/5 last:border-0">
                    <td className="px-5 py-3 font-semibold text-rideflow-orange">{vehicle.vehicleId || "—"}</td>
                    <td className="px-5 py-3 text-rideflow-navy">{vehicle.vehicleType}</td>
                    <td className="px-5 py-3 text-rideflow-navy">{makeModelLabel(vehicle)}</td>
                    <td className="px-5 py-3 text-rideflow-navy">{vehicle.licensePlate}</td>
                    <td className="px-5 py-3 text-rideflow-navy">{vehicle.assignedDriver?.name || "—"}</td>
                    <td className="px-5 py-3 text-rideflow-navy">{(vehicle.mileage || 0).toLocaleString()} mi</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={vehicle.status} styles={STATUS_STYLES} />
                    </td>
                    <td className="px-5 py-3">
                      {hasActions ? (
                        <div className="flex gap-3">
                          {onEdit && (
                            <button type="button" onClick={() => onEdit(vehicle)} className="text-rideflow-orange hover:text-rideflow-orange-hover font-semibold">
                              Edit
                            </button>
                          )}
                          {onRemove && (
                            <button
                              type="button"
                              onClick={() => onRemove(vehicle)}
                              disabled={removingId === vehicle._id}
                              className="text-red-600 hover:text-red-700 font-semibold disabled:opacity-50"
                            >
                              {removingId === vehicle._id ? "Deleting..." : "Delete"}
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSelect && onSelect(vehicle)}
                          className="text-rideflow-orange hover:text-rideflow-orange-hover font-semibold"
                        >
                          {selectLabel}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default VehiclesTable;
