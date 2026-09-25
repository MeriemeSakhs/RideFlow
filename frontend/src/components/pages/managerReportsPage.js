import React, { useState, useEffect } from "react";
import { Download, DollarSign, ClipboardList, TrendingUp, Star } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import PortalLayout from "../layout/PortalLayout";
import StatCard from "../ui/StatCard";
import { MANAGER_NAV_ITEMS } from "../../portalConfig";
import getUserInfo from "../../utilities/decodeJwt";
import { mockReportSummary, mockRevenueTrend, mockDailyRides, mockDriverPerformance } from "../../mockData/mockReports";

// MOCK DATA - see mockData/mockReports.js. Real numbers depend on the pricing
// engine and driver assignment (Todo #9/#7), neither built yet. The Day/Month/
// Year filter is functional as UI state but reads this same static dataset.
const PERIODS = ["Day", "Month", "Year"];

const exportDriverPerformanceCsv = () => {
  const header = "Rank,Driver,Total Rides,Revenue Generated,Avg Per Ride,Performance\n";
  const rows = mockDriverPerformance
    .map((d) => `${d.rank},${d.name},${d.totalRides},${d.revenue},${d.avgPerRide},${d.performance}%`)
    .join("\n");
  const blob = new Blob([header + rows], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "driver-performance-report.csv";
  link.click();
  URL.revokeObjectURL(url);
};

const ManagerReports = () => {
  const [user, setUser] = useState(undefined);
  const [period, setPeriod] = useState("Month");
  const [month, setMonth] = useState("");

  useEffect(() => {
    setUser(getUserInfo());
  }, []);

  return (
    <PortalLayout portalTitle="Manager Portal" portalSubtitle="Monitor operations and view analytics" navItems={MANAGER_NAV_ITEMS} user={user}>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-rideflow-navy/60">View detailed reports and analytics</p>
        <button
          type="button"
          onClick={exportDriverPerformanceCsv}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rideflow-orange hover:bg-rideflow-orange-hover text-white font-semibold text-sm shadow-sm transition-colors"
        >
          <Download size={16} /> Export Report
        </button>
      </div>

      <div className="bg-white rounded-xl border border-black/5 p-4 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-rideflow-navy">Filter Total Rides By:</span>
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                period === p ? "bg-rideflow-orange text-white" : "bg-rideflow-gray/60 text-rideflow-navy/70 hover:bg-rideflow-gray/70"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-rideflow-navy">Select Month:</span>
          <select value={month} onChange={(e) => setMonth(e.target.value)} className="px-3 py-1.5 rounded-lg border border-rideflow-navy/20 text-sm">
            <option value="">Choose a month...</option>
            {["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={DollarSign} label="Total Revenue" value={`$${mockReportSummary.totalRevenue.toLocaleString()}`} trend={`+${mockReportSummary.totalRevenueTrendPct}% from last period`} iconBg="bg-emerald-100" iconColor="text-emerald-600" />
        <StatCard icon={ClipboardList} label="Total Rides" value={mockReportSummary.totalRides.toLocaleString()} trend={`+${mockReportSummary.totalRidesTrendPct}% from last period`} iconBg="bg-rideflow-orange/10" iconColor="text-rideflow-orange" />
        <StatCard icon={TrendingUp} label="Avg Ride Value" value={`$${mockReportSummary.avgRideValue}`} trend={`+${mockReportSummary.avgRideValueTrendPct}% from last period`} iconBg="bg-blue-100" iconColor="text-blue-600" />
        <StatCard icon={Star} label="Customer Satisfaction" value={`${mockReportSummary.customerSatisfaction}/5.0`} trend={`+${mockReportSummary.customerSatisfactionTrendPct} from last period`} iconBg="bg-amber-100" iconColor="text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-black/5 p-5">
          <h3 className="font-bold text-rideflow-navy mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={mockRevenueTrend}>
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
            <BarChart data={mockDailyRides}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-rideflow-navy/40 uppercase border-b border-black/5">
                <th className="px-5 py-2 font-semibold">Rank</th>
                <th className="px-5 py-2 font-semibold">Driver Name</th>
                <th className="px-5 py-2 font-semibold">Total Rides</th>
                <th className="px-5 py-2 font-semibold">Revenue Generated</th>
                <th className="px-5 py-2 font-semibold">Avg Per Ride</th>
                <th className="px-5 py-2 font-semibold">Performance</th>
              </tr>
            </thead>
            <tbody>
              {mockDriverPerformance.map((driver) => (
                <tr key={driver.rank} className="border-b border-black/5 last:border-0">
                  <td className="px-5 py-3">
                    <span className="w-6 h-6 rounded-full bg-rideflow-orange/10 text-rideflow-orange text-xs font-bold flex items-center justify-center">{driver.rank}</span>
                  </td>
                  <td className="px-5 py-3 text-rideflow-navy font-medium">{driver.name}</td>
                  <td className="px-5 py-3 text-rideflow-navy">{driver.totalRides}</td>
                  <td className="px-5 py-3 text-rideflow-navy">${driver.revenue.toLocaleString()}</td>
                  <td className="px-5 py-3 text-rideflow-navy">${driver.avgPerRide.toFixed(2)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-rideflow-gray/60 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${driver.performance}%` }} />
                      </div>
                      <span className="text-xs text-rideflow-navy/60">{driver.performance}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PortalLayout>
  );
};

export default ManagerReports;
