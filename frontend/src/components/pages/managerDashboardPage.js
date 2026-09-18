import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { ClipboardList, CheckCircle2, XCircle, DollarSign, Users, Car, Gauge, Star } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import PortalLayout from "../layout/PortalLayout";
import StatCard from "../ui/StatCard";
import StatusBadge from "../ui/StatusBadge";
import { MANAGER_NAV_ITEMS } from "../../portalConfig";
import getUserInfo from "../../utilities/decodeJwt";
import { authHeader, errorMessageFrom } from "../../utilities/api";
import { formatDisplayDate } from "../../utilities/rideForm";
import { mockManagerSummary, mockRevenueTrend, mockDailyRides, mockVehicleUtilization, mockTopDrivers } from "../../mockData/mockReports";

const BASE_URL = `${process.env.REACT_APP_BACKEND_SERVER_URI}/ride`;
const PIE_COLORS = ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b"];

const STATUS_STYLES = {
  requested: "bg-amber-100 text-amber-700",
  assigned: "bg-blue-100 text-blue-700",
  "in-progress": "bg-violet-100 text-violet-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

// Ride counts and the two tables below use REAL data (GET /ride already
// supports the manager role and is company-scoped). Revenue, fleet, and
// driver-performance figures are MOCK - see mockData/mockReports.js - since
// they depend on the pricing engine and driver management (Todo #7/#9).
const ManagerDashboard = () => {
  const [user, setUser] = useState(undefined);
  const [rides, setRides] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRides = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const { data } = await axios.get(BASE_URL, { headers: authHeader() });
      setRides(data);
    } catch (error) {
      setError(errorMessageFrom(error, "Could not load ride data. Check your connection and try again."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const currentUser = getUserInfo();
    setUser(currentUser);
    if (currentUser && currentUser.role === "manager") fetchRides();
  }, [fetchRides]);

  const totalRides = rides.length;
  const completedRides = rides.filter((r) => r.status === "completed");
  const cancelledRides = rides.filter((r) => r.status === "cancelled");
  const activeRides = rides.filter((r) => ["assigned", "in-progress"].includes(r.status));
  const completionRate = totalRides ? ((completedRides.length / totalRides) * 100).toFixed(1) : "0.0";
  const cancellationRate = totalRides ? ((cancelledRides.length / totalRides) * 100).toFixed(1) : "0.0";

  return (
    <PortalLayout portalTitle="Manager Portal" portalSubtitle="Monitor operations and view analytics" navItems={MANAGER_NAV_ITEMS} user={user}>
      {isLoading && <p className="text-slate-500">Loading dashboard...</p>}
      {!isLoading && error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {!isLoading && !error && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={ClipboardList} label="Total Rides" value={totalRides} iconBg="bg-indigo-100" iconColor="text-indigo-600" />
            <StatCard icon={CheckCircle2} label="Completed Rides" value={completedRides.length} trend={`${completionRate}% completion rate`} iconBg="bg-emerald-100" iconColor="text-emerald-600" />
            <StatCard icon={XCircle} label="Cancelled Rides" value={cancelledRides.length} trend={`${cancellationRate}% cancellation rate`} iconBg="bg-red-100" iconColor="text-red-600" />
            <StatCard icon={DollarSign} label="Total Revenue" value={`$${mockManagerSummary.totalRevenue.toLocaleString()}`} trend={`+${mockManagerSummary.totalRevenueTrendPct}%`} iconBg="bg-blue-100" iconColor="text-blue-600" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Active Drivers" value={mockManagerSummary.activeDrivers} trend={`out of ${mockManagerSummary.totalDrivers} total`} iconBg="bg-indigo-100" iconColor="text-indigo-600" />
            <StatCard icon={Car} label="Fleet Size" value={mockManagerSummary.fleetSize} trend={`${mockManagerSummary.activeVehicles} active, ${mockManagerSummary.maintenanceVehicles} maintenance`} iconBg="bg-blue-100" iconColor="text-blue-600" />
            <StatCard icon={Gauge} label="Fleet Utilization" value={`${mockManagerSummary.fleetUtilizationPct}%`} iconBg="bg-emerald-100" iconColor="text-emerald-600" />
            <StatCard icon={Star} label="Avg Rating" value={mockManagerSummary.avgRating} trend={`Based on ${mockManagerSummary.totalReviews.toLocaleString()} reviews`} iconBg="bg-amber-100" iconColor="text-amber-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-bold text-slate-900 mb-4">Revenue Overview</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={mockRevenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
                  <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-bold text-slate-900 mb-4">Daily Rides (This Week)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={mockDailyRides}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <Tooltip />
                  <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-bold text-slate-900 mb-4">Vehicle Type Utilization</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={mockVehicleUtilization} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={(entry) => `${entry.name}: ${entry.value}%`}>
                    {mockVehicleUtilization.map((entry, i) => <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-bold text-slate-900 mb-4">Top Performing Drivers</h3>
              <div className="space-y-3">
                {mockTopDrivers.map((driver, i) => (
                  <div key={driver.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{driver.name}</p>
                        <p className="text-xs text-slate-500">{driver.rides} rides</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">${driver.revenue.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100"><h3 className="font-bold text-slate-900">Active Rides</h3></div>
            {activeRides.length === 0 ? (
              <p className="text-slate-400 text-sm px-5 py-6">No active rides right now</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-400 uppercase border-b border-slate-100">
                      <th className="px-5 py-2 font-semibold">Driver</th>
                      <th className="px-5 py-2 font-semibold">Pickup Location</th>
                      <th className="px-5 py-2 font-semibold">Drop-off Location</th>
                      <th className="px-5 py-2 font-semibold">Passenger Count</th>
                      <th className="px-5 py-2 font-semibold">Pickup Time</th>
                      <th className="px-5 py-2 font-semibold">Fare</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeRides.map((ride) => (
                      <tr key={ride._id} className="border-b border-slate-50 last:border-0">
                        <td className="px-5 py-3 text-slate-700">Unassigned</td>
                        <td className="px-5 py-3 text-slate-700">{ride.pickupLocation}</td>
                        <td className="px-5 py-3 text-slate-700">{ride.dropoffLocation}</td>
                        <td className="px-5 py-3 text-slate-700">{ride.passengerCount}</td>
                        <td className="px-5 py-3 text-slate-500">{formatDisplayDate(ride.rideDate)}</td>
                        <td className="px-5 py-3 text-slate-700">${ride.price?.toFixed(2) ?? "0.00"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100"><h3 className="font-bold text-slate-900">Recent Completed Rides</h3></div>
            {completedRides.length === 0 ? (
              <p className="text-slate-400 text-sm px-5 py-6">No completed rides yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-400 uppercase border-b border-slate-100">
                      <th className="px-5 py-2 font-semibold">Driver</th>
                      <th className="px-5 py-2 font-semibold">Route</th>
                      <th className="px-5 py-2 font-semibold">Date</th>
                      <th className="px-5 py-2 font-semibold">Status</th>
                      <th className="px-5 py-2 font-semibold">Fare</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedRides.slice(0, 5).map((ride) => (
                      <tr key={ride._id} className="border-b border-slate-50 last:border-0">
                        <td className="px-5 py-3 text-slate-700">Unassigned</td>
                        <td className="px-5 py-3 text-slate-700">{ride.pickupLocation} &rarr; {ride.dropoffLocation}</td>
                        <td className="px-5 py-3 text-slate-500">{formatDisplayDate(ride.rideDate)}</td>
                        <td className="px-5 py-3"><StatusBadge status={ride.status} styles={STATUS_STYLES} /></td>
                        <td className="px-5 py-3 text-slate-700">${ride.price?.toFixed(2) ?? "0.00"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </PortalLayout>
  );
};

export default ManagerDashboard;
