import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Download, DollarSign, ClipboardList, TrendingUp, CheckCircle2 } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import PortalLayout from "../layout/PortalLayout";
import StatCard from "../ui/StatCard";
import { MANAGER_NAV_ITEMS } from "../../portalConfig";
import getUserInfo from "../../utilities/decodeJwt";
import { authHeader, errorMessageFrom } from "../../utilities/api";
import { getDateRangeParams } from "../../utilities/rideForm";
import { filterByStatus, sumRevenue, buildMonthlyRevenueTrend, buildWeeklyRideCounts, computeDriverPerformance } from "../../utilities/reportMetrics";

const RIDE_URL = `${process.env.REACT_APP_BACKEND_SERVER_URI}/ride`;
const DATE_MODES = ["all", "custom"];
const DATE_MODE_LABELS = { all: "All Dates", custom: "Custom Date" };

// Builds the CSV straight from the real, currently-computed driver
// performance data (see utilities/reportMetrics.js's computeDriverPerformance) -
// no invented "Performance" column, since there's no real relative-performance
// metric stored anywhere.
const exportDriverPerformanceCsv = (driverPerformance) => {
  const header = "Rank,Driver,Total Rides,Revenue Generated,Avg Per Ride\n";
  const rows = driverPerformance
    .map((d, i) => `${i + 1},${d.name},${d.rides},${d.revenue.toFixed(2)},${d.avgPerRide.toFixed(2)}`)
    .join("\n");
  const blob = new Blob([header + rows], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "driver-performance-report.csv";
  link.click();
  URL.revokeObjectURL(url);
};

// Every number on this page comes from the real, company-scoped GET /ride
// response (companyId is always derived server-side from the JWT - see
// backend/server/middleware/auth.js, never trusted from this page). There is
// no historical snapshot stored anywhere to compare "this period" against,
// so no "+X% from last period" text is shown - that would have to be
// invented. "Customer Satisfaction" (the old mock KPI) is dropped entirely
// since no rating field exists anywhere in the schema; "Completed Rides"
// takes its place as a real, non-duplicate metric.
const ManagerReports = () => {
  const [user, setUser] = useState(undefined);
  const [rides, setRides] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateMode, setDateMode] = useState("all");
  const [customDate, setCustomDate] = useState(""); // "" = not chosen yet, else "YYYY-MM-DD"

  const fetchRides = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const params = dateMode === "custom" ? getDateRangeParams(customDate) : {};
      const { data } = await axios.get(RIDE_URL, { headers: authHeader(), params });
      setRides(data);
    } catch (error) {
      setError(errorMessageFrom(error, "Could not load report data. Check your connection and try again."));
    } finally {
      setIsLoading(false);
    }
  }, [dateMode, customDate]);

  useEffect(() => {
    const currentUser = getUserInfo();
    setUser(currentUser);
    if (currentUser && currentUser.role === "manager") fetchRides();
  }, [fetchRides]);

  const completedRides = filterByStatus(rides, ["completed"]);
  const totalRevenue = sumRevenue(completedRides);
  const totalRides = rides.length;
  const avgRideValue = completedRides.length ? totalRevenue / completedRides.length : 0;

  const revenueTrend = buildMonthlyRevenueTrend(rides);
  const ridesTrend = buildWeeklyRideCounts(rides);
  const driverPerformance = computeDriverPerformance(rides);

  return (
    <PortalLayout portalTitle="Manager Portal" portalSubtitle="Monitor operations and view analytics" navItems={MANAGER_NAV_ITEMS} user={user}>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-rideflow-navy/60">View detailed reports and analytics</p>
        <button
          type="button"
          onClick={() => exportDriverPerformanceCsv(driverPerformance)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rideflow-orange hover:bg-rideflow-orange-hover text-white font-semibold text-sm shadow-sm transition-colors"
        >
          <Download size={16} /> Export Report
        </button>
      </div>

      <div className="bg-white rounded-xl border border-black/5 p-4 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-rideflow-navy">Date:</span>
          {DATE_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setDateMode(mode)}
              className={`text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                dateMode === mode ? "bg-rideflow-orange text-white" : "bg-rideflow-gray/60 text-rideflow-navy/70 hover:bg-rideflow-gray/70"
              }`}
            >
              {DATE_MODE_LABELS[mode]}
            </button>
          ))}
        </div>
        {dateMode === "custom" && (
          <input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            className="text-sm px-3 py-1.5 rounded-md border border-rideflow-navy/20 text-rideflow-navy focus:outline-none focus:ring-2 focus:ring-rideflow-orange focus:border-rideflow-orange"
          />
        )}
      </div>

      {isLoading && <p className="text-rideflow-navy/60">Loading report data...</p>}
      {!isLoading && error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {!isLoading && !error && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard icon={DollarSign} label="Total Revenue" value={`$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} iconBg="bg-emerald-100" iconColor="text-emerald-600" />
            <StatCard icon={ClipboardList} label="Total Rides" value={totalRides.toLocaleString()} iconBg="bg-rideflow-orange/10" iconColor="text-rideflow-orange" />
            <StatCard icon={TrendingUp} label="Avg Ride Value" value={`$${avgRideValue.toFixed(2)}`} iconBg="bg-blue-100" iconColor="text-blue-600" />
            <StatCard icon={CheckCircle2} label="Completed Rides" value={completedRides.length.toLocaleString()} iconBg="bg-amber-100" iconColor="text-amber-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl border border-black/5 p-5">
              <h3 className="font-bold text-rideflow-navy mb-4">Revenue Trend</h3>
              <ResponsiveContainer width="100%" height={220}>
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
              <h3 className="font-bold text-rideflow-navy mb-4">Rides Trend</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={ridesTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-black/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-black/5">
              <h3 className="font-bold text-rideflow-navy">Driver Performance Report</h3>
            </div>
            {driverPerformance.length === 0 ? (
              <p className="text-rideflow-navy/40 text-sm px-5 py-6">No completed rides yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-rideflow-navy/40 uppercase border-b border-black/5">
                      <th className="px-5 py-2 font-semibold">Rank</th>
                      <th className="px-5 py-2 font-semibold">Driver Name</th>
                      <th className="px-5 py-2 font-semibold">Total Rides</th>
                      <th className="px-5 py-2 font-semibold">Revenue Generated</th>
                      <th className="px-5 py-2 font-semibold">Avg Per Ride</th>
                    </tr>
                  </thead>
                  <tbody>
                    {driverPerformance.map((driver, i) => (
                      <tr key={driver.driverId} className="border-b border-black/5 last:border-0">
                        <td className="px-5 py-3">
                          <span className="w-6 h-6 rounded-full bg-rideflow-orange/10 text-rideflow-orange text-xs font-bold flex items-center justify-center">{i + 1}</span>
                        </td>
                        <td className="px-5 py-3 text-rideflow-navy font-medium">{driver.name}</td>
                        <td className="px-5 py-3 text-rideflow-navy">{driver.rides}</td>
                        <td className="px-5 py-3 text-rideflow-navy">${driver.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="px-5 py-3 text-rideflow-navy">${driver.avgPerRide.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </PortalLayout>
  );
};

export default ManagerReports;
