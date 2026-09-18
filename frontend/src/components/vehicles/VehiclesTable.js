import React from "react";
import { Car, CheckCircle2, Wrench, Gauge } from "lucide-react";
import StatCard from "../ui/StatCard";
import StatusBadge from "../ui/StatusBadge";

const STATUS_STYLES = {
  active: "bg-emerald-100 text-emerald-700",
  maintenance: "bg-amber-100 text-amber-700",
  "in-use": "bg-blue-100 text-blue-700",
};

// Shared by the Dispatcher (read-only) and Manager (full CRUD) Vehicles pages.
const VehiclesTable = ({ vehicles, onSelect, selectLabel = "View Details" }) => {
  const activeCount = vehicles.filter((v) => v.status === "active").length;
  const maintenanceCount = vehicles.filter((v) => v.status === "maintenance").length;
  const avgMileage = vehicles.length
    ? Math.round(vehicles.reduce((sum, v) => sum + v.mileage, 0) / vehicles.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Car} label="Total Vehicles" value={vehicles.length} iconBg="bg-indigo-100" iconColor="text-indigo-600" />
        <StatCard icon={CheckCircle2} label="Active" value={activeCount} iconBg="bg-emerald-100" iconColor="text-emerald-600" />
        <StatCard icon={Wrench} label="Maintenance" value={maintenanceCount} iconBg="bg-amber-100" iconColor="text-amber-600" />
        <StatCard icon={Gauge} label="Avg Mileage" value={`${(avgMileage / 1000).toFixed(1)}K`} iconBg="bg-blue-100" iconColor="text-blue-600" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">All Vehicles</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase border-b border-slate-100">
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
                <tr key={vehicle.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-5 py-3 font-semibold text-indigo-600">{vehicle.id}</td>
                  <td className="px-5 py-3 text-slate-700">{vehicle.type}</td>
                  <td className="px-5 py-3 text-slate-700">{vehicle.makeModel}</td>
                  <td className="px-5 py-3 text-slate-700">{vehicle.licensePlate}</td>
                  <td className="px-5 py-3 text-slate-700">{vehicle.assignedDriver || "—"}</td>
                  <td className="px-5 py-3 text-slate-700">{vehicle.mileage.toLocaleString()} mi</td>
                  <td className="px-5 py-3"><StatusBadge status={vehicle.status} styles={STATUS_STYLES} /></td>
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => onSelect && onSelect(vehicle)}
                      className="text-indigo-600 hover:text-indigo-700 font-semibold"
                    >
                      {selectLabel}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default VehiclesTable;
