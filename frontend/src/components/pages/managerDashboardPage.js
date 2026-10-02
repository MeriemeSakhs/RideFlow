import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { ClipboardList, CheckCircle2, XCircle, DollarSign, Users, Car, Gauge, TrendingUp } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import PortalLayout from "../layout/PortalLayout";
import StatCard from "../ui/StatCard";
import StatusBadge from "../ui/StatusBadge";
import AddressCell from "../ui/AddressCell";
import { MANAGER_NAV_ITEMS } from "../../portalConfig";
import getUserInfo from "../../utilities/decodeJwt";
import { authHeader, errorMessageFrom } from "../../utilities/api";
import { formatDisplayDate, formatDisplayDateOnly, formatDisplayTime } from "../../utilities/rideForm";
import { filterByStatus, sumRevenue, buildMonthlyRevenueTrend, buildWeeklyRideCounts, computeVehicleTypeUtilization, computeDriverPerformance } from "../../utilities/reportMetrics";

const RIDE_URL = `${process.env.REACT_APP_BACKEND_SERVER_URI}/ride`;
const DRIVER_URL = `${process.env.REACT_APP_BACKEND_SERVER_URI}/driver`;
const VEHICLE_URL = `${process.env.REACT_APP_BACKEND_SERVER_URI}/vehicle`;
const PIE_COLORS = ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];
const ACTIVE_RIDE_STATUSES = ["pending", "assigned", "in-progress"];

const STATUS_STYLES = {
  requested: "bg-amber-100 text-amber-700",
  pending: "bg-orange-100 text-orange-700",
  assigned: "bg-blue-100 text-blue-700",
  "in-progress": "bg-violet-100 text-violet-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

// Every figure here comes from the real, company-scoped GET /ride, GET
// /driver, and GET /vehicle responses (companyId is always derived
// server-side from the JWT - see backend/server/middleware/auth.js, never
// trusted from this page). There is no customer-rating field anywhere in the
// schema, so "Avg Rating" (the old mock KPI) is replaced with "Avg Fare per
// Ride" - a real, derivable operational metric - rather than inventing one.
const ManagerDashboard = () => {
  const [user, setUser] = useState(undefined);
  const [rides, setRides] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [ridesRes, driversRes, vehiclesRes] = await Promise.all([
        axios.get(RIDE_URL, { headers: authHeader() }),
        axios.get(DRIVER_URL, { headers: authHeader() }),
        axios.get(VEHICLE_URL, { headers: authHeader() }),
      ]);
      setRides(ridesRes.data);
      setDrivers(driversRes.data);
      setVehicles(vehiclesRes.data);
    } catch (error) {
      setError(errorMessageFrom(error, "Could not load dashboard data. Check your connection and try again."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const currentUser = getUserInfo();
    setUser(currentUser);
    if (currentUser && currentUser.role === "manager") fetchData();
  }, [fetchData]);

  const totalRides = rides.length;
  const completedRides = filterByStatus(rides, ["completed"]);
  const cancelledRides = filterByStatus(rides, ["cancelled"]);
  const activeRides = filterByStatus(rides, ACTIVE_RIDE_STATUSES);
  const completionRate = totalRides ? ((completedRides.length / totalRides) * 100).toFixed(1) : "0.0";
  const cancellationRate = totalRides ? ((cancelledRides.length / totalRides) * 100).toFixed(1) : "0.0";
  const totalRevenue = sumRevenue(completedRides);
  const avgFarePerRide = completedRides.length ? totalRevenue / completedRides.length : 0;

  const activeDrivers = drivers.filter((d) => d.status !== "unavailable");
  const activeVehicles = vehicles.filter((v) => v.status === "active");
  const maintenanceVehicles = vehicles.filter((v) => v.status === "maintenance");
  const fleetUtilizationPct = vehicles.length ? ((activeVehicles.length / vehicles.length) * 100).toFixed(1) : "0.0";

  const revenueTrend = buildMonthlyRevenueTrend(rides);
  const dailyRides = buildWeeklyRideCounts(rides);
  const vehicleUtilization = computeVehicleTypeUtilization(vehicles);
  const topDrivers = computeDriverPerformance(rides).slice(0, 5);

  return (
    <PortalLayout portalTitle="Manager Portal" portalSubtitle="Monitor operations and view analytics" navItems={MANAGER_NAV_ITEMS} user={user}>
      {isLoading && <p className="text-rideflow-navy/60">Loading dashboard...</p>}
      {!isLoading && error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {!isLoading && !error && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={ClipboardList} label="Total Rides" value={totalRides} iconBg="bg-rideflow-orange/10" iconColor="text-rideflow-orange" />
            <StatCard icon={CheckCircle2} label="Completed Rides" value={completedRides.length} trend={`${completionRate}% completion rate`} iconBg="bg-emerald-100" iconColor="text-emerald-600" />
            <StatCard icon={XCircle} label="Cancelled Rides" value={cancelledRides.length} trend={`${cancellationRate}% cancellation rate`} iconBg="bg-red-100" iconColor="text-red-600" />
            <StatCard icon={DollarSign} label="Total Revenue" value={`$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} iconBg="bg-blue-100" iconColor="text-blue-600" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Active Drivers" value={activeDrivers.length} trend={`out of ${drivers.length} total`} iconBg="bg-rideflow-orange/10" iconColor="text-rideflow-orange" />
            <StatCard icon={Car} label="Fleet Size" value={vehicles.length} trend={`${activeVehicles.length} active, ${maintenanceVehicles.length} maintenance`} iconBg="bg-blue-100" iconColor="text-blue-600" />
            <StatCard icon={Gauge} label="Fleet Utilization" value={`${fleetUtilizationPct}%`} iconBg="bg-emerald-100" iconColor="text-emerald-600" />
            <StatCard icon={TrendingUp} label="Avg Fare per Ride" value={`$${avgFarePerRide.toFixed(2)}`} trend={`across ${completedRides.length} completed ride${completedRides.length === 1 ? "" : "s"}`} iconBg="bg-amber-100" iconColor="text-amber-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-black/5 p-5">
              <h3 className="font-bold text-rideflow-navy mb-4">Revenue Overview</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
                  <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl border border-black/5 p-5">
              <h3 className="font-bold text-rideflow-navy mb-4">Daily Rides (This Week)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyRides}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl border border-black/5 p-5">
              <h3 className="font-bold text-rideflow-navy mb-4">Vehicle Type Utilization</h3>
              {vehicleUtilization.length === 0 ? (
                <p className="text-rideflow-navy/40 text-sm py-10 text-center">No vehicles added yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={vehicleUtilization} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} isAnimationActive={false} label={(entry) => `${entry.name}: ${entry.value}%`}>
                      {vehicleUtilization.map((entry, i) => <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-xl border border-black/5 p-5">
              <h3 className="font-bold text-rideflow-navy mb-4">Top Performing Drivers</h3>
              {topDrivers.length === 0 ? (
                <p className="text-rideflow-navy/40 text-sm py-10 text-center">No completed rides yet</p>
              ) : (
                <div className="space-y-3">
                  {topDrivers.map((driver, i) => (
                    <div key={driver.driverId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-rideflow-orange/10 text-rideflow-orange text-xs font-bold flex items-center justify-center">{i + 1}</span>
                        <div>
                          <p className="text-sm font-semibold text-rideflow-navy">{driver.name}</p>
                          <p className="text-xs text-rideflow-navy/60">{driver.rides} ride{driver.rides === 1 ? "" : "s"}</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-rideflow-navy">${driver.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-black/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-black/5"><h3 className="font-bold text-rideflow-navy">Active Rides</h3></div>
            {activeRides.length === 0 ? (
              <p className="text-rideflow-navy/40 text-sm px-5 py-6">No active rides right now</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm table-fixed">
                  <colgroup>
                    <col className="w-[260px]" />
                    <col className="w-[440px]" />
                    <col className="w-[440px]" />
                    <col className="w-24" />
                    <col className="w-28" />
                    <col className="w-20" />
                    <col className="w-20" />
                  </colgroup>
                  <thead>
                    <tr className="text-left text-xs text-rideflow-navy/40 uppercase border-b border-black/5">
                      <th className="px-5 py-2 font-semibold">Driver</th>
                      <th className="px-5 py-2 font-semibold">Pickup Location</th>
                      <th className="px-5 py-2 font-semibold">Drop-off Location</th>
                      <th className="px-5 py-2 font-semibold">Passenger Count</th>
                      <th className="px-5 py-2 font-semibold">Pickup Date</th>
                      <th className="px-5 py-2 font-semibold">Pickup Time</th>
                      <th className="px-5 py-2 font-semibold">Fare</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeRides.map((ride) => (
                      <tr key={ride._id} className="border-b border-black/5 last:border-0 align-top">
                        <td className="px-5 py-3 text-rideflow-navy"><AddressCell>{ride.assignedDriver?.name || "Unassigned"}</AddressCell></td>
                        <td className="px-5 py-3 text-rideflow-navy"><AddressCell>{ride.pickupLocation}</AddressCell></td>
                        <td className="px-5 py-3 text-rideflow-navy"><AddressCell>{ride.dropoffLocation}</AddressCell></td>
                        <td className="px-5 py-3 text-rideflow-navy">{ride.passengerCount}</td>
                        <td className="px-5 py-3 text-rideflow-navy/60 whitespace-nowrap">{formatDisplayDateOnly(ride.rideDate)}</td>
                        <td className="px-5 py-3 text-rideflow-navy/60 whitespace-nowrap">{formatDisplayTime(ride.rideDate)}</td>
                        <td className="px-5 py-3 text-rideflow-navy whitespace-nowrap">${ride.price?.toFixed(2) ?? "0.00"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-black/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-black/5"><h3 className="font-bold text-rideflow-navy">Recent Completed Rides</h3></div>
            {completedRides.length === 0 ? (
              <p className="text-rideflow-navy/40 text-sm px-5 py-6">No completed rides yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm table-fixed">
                  <colgroup>
                    <col className="w-[260px]" />
                    <col className="w-[480px]" />
                    <col className="w-32" />
                    <col className="w-28" />
                    <col className="w-20" />
                  </colgroup>
                  <thead>
                    <tr className="text-left text-xs text-rideflow-navy/40 uppercase border-b border-black/5">
                      <th className="px-5 py-2 font-semibold">Driver</th>
                      <th className="px-5 py-2 font-semibold">Route</th>
                      <th className="px-5 py-2 font-semibold">Date</th>
                      <th className="px-5 py-2 font-semibold">Status</th>
                      <th className="px-5 py-2 font-semibold">Fare</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedRides.slice(0, 5).map((ride) => (
                      <tr key={ride._id} className="border-b border-black/5 last:border-0 align-top">
                        <td className="px-5 py-3 text-rideflow-navy"><AddressCell>{ride.assignedDriver?.name || "Unassigned"}</AddressCell></td>
                        <td className="px-5 py-3 text-rideflow-navy"><AddressCell>{`${ride.pickupLocation} → ${ride.dropoffLocation}`}</AddressCell></td>
                        <td className="px-5 py-3 text-rideflow-navy/60 whitespace-nowrap">{formatDisplayDate(ride.rideDate)}</td>
                        <td className="px-5 py-3"><StatusBadge status={ride.status} styles={STATUS_STYLES} /></td>
                        <td className="px-5 py-3 text-rideflow-navy whitespace-nowrap">${ride.price?.toFixed(2) ?? "0.00"}</td>
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
