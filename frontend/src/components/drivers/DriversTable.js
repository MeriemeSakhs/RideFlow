import React from "react";
import { Users, UserCheck, Clock, ClipboardList, Mail, Phone } from "lucide-react";
import StatCard from "../ui/StatCard";
import StatusBadge from "../ui/StatusBadge";

const STATUS_STYLES = {
  available: "bg-emerald-100 text-emerald-700",
  busy: "bg-amber-100 text-amber-700",
  "on duty": "bg-amber-100 text-amber-700",
  unavailable: "bg-rideflow-gray/60 text-rideflow-navy/70",
};

// Shared by the Dispatcher (read-only) and Manager (full CRUD) Drivers pages
// so the stat cards and table never drift between the two.
const DriversTable = ({ drivers, onSelect, selectLabel = "View Details" }) => {
  const availableCount = drivers.filter((d) => d.status === "available").length;
  const busyCount = drivers.filter((d) => d.status === "busy").length;
  const totalRides = drivers.reduce((sum, d) => sum + d.totalRides, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Drivers" value={drivers.length} iconBg="bg-rideflow-orange/10" iconColor="text-rideflow-orange" />
        <StatCard icon={UserCheck} label="Available" value={availableCount} iconBg="bg-emerald-100" iconColor="text-emerald-600" />
        <StatCard icon={Clock} label="On Duty" value={busyCount} iconBg="bg-amber-100" iconColor="text-amber-600" />
        <StatCard icon={ClipboardList} label="Total Rides" value={totalRides} iconBg="bg-blue-100" iconColor="text-blue-600" />
      </div>

      <div className="bg-white rounded-xl border border-black/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5">
          <h3 className="font-bold text-rideflow-navy">All Drivers</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-rideflow-navy/40 uppercase border-b border-black/5">
                <th className="px-5 py-2 font-semibold">Driver</th>
                <th className="px-5 py-2 font-semibold">Contact</th>
                <th className="px-5 py-2 font-semibold">Vehicle Type</th>
                <th className="px-5 py-2 font-semibold">Status</th>
                <th className="px-5 py-2 font-semibold">Total Rides</th>
                <th className="px-5 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver) => (
                <tr key={driver.id} className="border-b border-black/5 last:border-0">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-rideflow-orange/10 text-rideflow-orange flex items-center justify-center shrink-0">
                        <Users size={14} />
                      </div>
                      <div>
                        <p className="font-semibold text-rideflow-navy">{driver.name}</p>
                        <p className="text-xs text-rideflow-navy/40">{driver.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-rideflow-navy/70">
                    <div className="flex items-center gap-1.5 text-xs"><Mail size={12} /> {driver.email}</div>
                    <div className="flex items-center gap-1.5 text-xs mt-0.5"><Phone size={12} /> {driver.phone}</div>
                  </td>
                  <td className="px-5 py-3 text-rideflow-navy">{driver.vehicleType}</td>
                  <td className="px-5 py-3"><StatusBadge status={driver.status} styles={STATUS_STYLES} /></td>
                  <td className="px-5 py-3 text-rideflow-navy">{driver.totalRides}</td>
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => onSelect && onSelect(driver)}
                      className="text-rideflow-orange hover:text-rideflow-orange-hover font-semibold"
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

export default DriversTable;
