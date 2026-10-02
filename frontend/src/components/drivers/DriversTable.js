import React from "react";
import { Users, UserCheck, Clock, Phone } from "lucide-react";
import StatCard from "../ui/StatCard";
import StatusBadge from "../ui/StatusBadge";

const STATUS_STYLES = {
  available: "bg-emerald-100 text-emerald-700",
  assigned: "bg-blue-100 text-blue-700",
  unavailable: "bg-rideflow-gray/60 text-rideflow-navy/70",
};

// Shared by the Dispatcher (read-only) and Manager (add/delete) Drivers
// pages so the stat cards and table never drift between the two. Only
// shows fields that actually exist on the Driver model
// (name/phone/licenseNumber/status) - no invented vehicle/email/ride-count
// data. onRemove is optional; when provided (the Manager page), a Delete
// action appears alongside View Details.
const DriversTable = ({ drivers, onSelect, selectLabel = "View Details", onRemove, removingId }) => {
  const availableCount = drivers.filter((d) => d.status === "available").length;
  const assignedCount = drivers.filter((d) => d.status === "assigned").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Total Drivers" value={drivers.length} iconBg="bg-rideflow-orange/10" iconColor="text-rideflow-orange" />
        <StatCard icon={UserCheck} label="Available" value={availableCount} iconBg="bg-emerald-100" iconColor="text-emerald-600" />
        <StatCard icon={Clock} label="Assigned" value={assignedCount} iconBg="bg-blue-100" iconColor="text-blue-600" />
      </div>

      <div className="bg-white rounded-xl border border-black/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5">
          <h3 className="font-bold text-rideflow-navy">All Drivers</h3>
        </div>
        {drivers.length === 0 ? (
          <p className="text-rideflow-navy/40 text-sm px-5 py-6">No drivers yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-rideflow-navy/40 uppercase border-b border-black/5">
                  <th className="px-5 py-2 font-semibold">Driver</th>
                  <th className="px-5 py-2 font-semibold">Phone</th>
                  <th className="px-5 py-2 font-semibold">License Number</th>
                  <th className="px-5 py-2 font-semibold">Status</th>
                  <th className="px-5 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((driver) => (
                  <tr key={driver._id} className="border-b border-black/5 last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-rideflow-orange/10 text-rideflow-orange flex items-center justify-center shrink-0">
                          <Users size={14} />
                        </div>
                        <p className="font-semibold text-rideflow-navy">{driver.name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-rideflow-navy/70">
                      <div className="flex items-center gap-1.5 text-xs"><Phone size={12} /> {driver.phone}</div>
                    </td>
                    <td className="px-5 py-3 text-rideflow-navy">{driver.licenseNumber}</td>
                    <td className="px-5 py-3"><StatusBadge status={driver.status} styles={STATUS_STYLES} /></td>
                    <td className="px-5 py-3">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => onSelect && onSelect(driver)}
                          className="text-rideflow-orange hover:text-rideflow-orange-hover font-semibold"
                        >
                          {selectLabel}
                        </button>
                        {onRemove && (
                          <button
                            type="button"
                            onClick={() => onRemove(driver)}
                            disabled={removingId === driver._id}
                            className="text-red-600 hover:text-red-700 font-semibold disabled:opacity-50"
                          >
                            {removingId === driver._id ? "Deleting..." : "Delete"}
                          </button>
                        )}
                      </div>
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

export default DriversTable;
