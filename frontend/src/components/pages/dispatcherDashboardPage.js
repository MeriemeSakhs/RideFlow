import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { ClipboardList, Circle, Clock, CheckCircle2, Plus } from "lucide-react";
import getUserInfo from "../../utilities/decodeJwt";
import PortalLayout from "../layout/PortalLayout";
import StatCard from "../ui/StatCard";
import StatusBadge from "../ui/StatusBadge";
import AssignDriverModal from "../drivers/AssignDriverModal";
import { DISPATCHER_NAV_ITEMS } from "../../portalConfig";
import { formatDisplayDate } from "../../utilities/rideForm";
import { authHeader, errorMessageFrom } from "../../utilities/api";

const BASE_URL = `${process.env.REACT_APP_BACKEND_SERVER_URI}/ride`;

const PENDING_STATUSES = ["requested"];
const ACTIVE_STATUSES = ["assigned", "in-progress"];
const COMPLETED_STATUSES = ["completed"];

const STATUS_STYLES = {
  requested: "bg-amber-100 text-amber-700",
  assigned: "bg-blue-100 text-blue-700",
  "in-progress": "bg-violet-100 text-violet-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

const isToday = (isoString) => {
  const date = new Date(isoString);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
};

const RideTable = ({ title, icon: Icon, iconColor, rides, showAssign, showDriver, onAssign }) => (
  <div className="bg-white rounded-xl border border-black/5 overflow-hidden">
    <div className="px-5 py-4 border-b border-black/5 flex items-center gap-2">
      <Icon size={16} className={iconColor} />
      <h3 className="font-bold text-rideflow-navy">{title}</h3>
      <span className="text-xs text-rideflow-navy/40">({rides.length})</span>
    </div>
    {rides.length === 0 ? (
      <p className="text-rideflow-navy/40 text-sm px-5 py-6">None right now</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-rideflow-navy/40 uppercase border-b border-black/5">
              <th className="px-5 py-2 font-semibold">Pickup</th>
              <th className="px-5 py-2 font-semibold">Drop-off</th>
              <th className="px-5 py-2 font-semibold">Status</th>
              <th className="px-5 py-2 font-semibold">Pickup Time</th>
              <th className="px-5 py-2 font-semibold">Fare</th>
              {showDriver && <th className="px-5 py-2 font-semibold">Driver</th>}
              {showAssign && <th className="px-5 py-2 font-semibold">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rides.map((ride) => (
              <tr key={ride._id} className="border-b border-black/5 last:border-0">
                <td className="px-5 py-3 text-rideflow-navy">{ride.pickupLocation}</td>
                <td className="px-5 py-3 text-rideflow-navy">{ride.dropoffLocation}</td>
                <td className="px-5 py-3"><StatusBadge status={ride.status} styles={STATUS_STYLES} /></td>
                <td className="px-5 py-3 text-rideflow-navy/60">{formatDisplayDate(ride.rideDate)}</td>
                <td className="px-5 py-3 text-rideflow-navy">${ride.price?.toFixed(2) ?? "0.00"}</td>
                {showDriver && (
                  <td className="px-5 py-3 text-rideflow-navy">{ride.assignedDriver?.name || "—"}</td>
                )}
                {showAssign && (
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => onAssign(ride)}
                      className="text-rideflow-orange hover:text-rideflow-orange-hover font-semibold"
                    >
                      Assign Driver
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

const DispatcherDashboard = () => {
  const [user, setUser] = useState(undefined);
  const [rides, setRides] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [assigningRide, setAssigningRide] = useState(null);

  const fetchRides = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const { data } = await axios.get(BASE_URL, { headers: authHeader() });
      setRides(data);
    } catch (error) {
      setError(errorMessageFrom(error, "Could not load ride requests. Check your connection and try again."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const currentUser = getUserInfo();
    setUser(currentUser);
    // A Manager viewing this page in Dispatcher Mode should see real ride
    // data too - their JWT role is "manager", and GET /ride already permits it.
    if (currentUser && ["dispatcher", "manager"].includes(currentUser.role)) fetchRides();
  }, [fetchRides]);

  const todaysRides = rides.filter((r) => isToday(r.rideDate) && r.status !== "cancelled");
  const pending = todaysRides.filter((r) => PENDING_STATUSES.includes(r.status));
  const active = todaysRides.filter((r) => ACTIVE_STATUSES.includes(r.status));
  const completed = todaysRides.filter((r) => COMPLETED_STATUSES.includes(r.status));

  const handleAssigned = () => {
    setAssigningRide(null);
    fetchRides();
  };

  return (
    <PortalLayout
      portalTitle="Dispatcher Portal"
      portalSubtitle="Manage rides and assign drivers"
      navItems={DISPATCHER_NAV_ITEMS}
      user={user}
    >
      <div className="flex items-center justify-between mb-6">
        <div />
        <Link
          to="/dispatcher/rides/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rideflow-orange hover:bg-rideflow-orange-hover text-white font-semibold text-sm shadow-sm transition-colors"
        >
          <Plus size={16} /> Create New Ride Request
        </Link>
      </div>

      {isLoading && <p className="text-rideflow-navy/60">Loading dashboard...</p>}
      {!isLoading && error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {!isLoading && !error && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={ClipboardList} label="Total Rides Today" value={todaysRides.length} iconBg="bg-rideflow-orange/10" iconColor="text-rideflow-orange" />
            <StatCard icon={Circle} label="Active Rides" value={active.length} iconBg="bg-blue-100" iconColor="text-blue-600" />
            <StatCard icon={Clock} label="Pending Rides" value={pending.length} iconBg="bg-amber-100" iconColor="text-amber-600" />
            <StatCard icon={CheckCircle2} label="Completed Today" value={completed.length} iconBg="bg-emerald-100" iconColor="text-emerald-600" />
          </div>

          <RideTable title="Active Rides" icon={Circle} iconColor="text-blue-500" rides={active} showDriver />
          <RideTable title="Pending Rides" icon={Clock} iconColor="text-amber-500" rides={pending} showAssign onAssign={setAssigningRide} />
          <RideTable title="Completed Rides" icon={CheckCircle2} iconColor="text-emerald-500" rides={completed} showDriver />
        </div>
      )}

      <AssignDriverModal ride={assigningRide} onClose={() => setAssigningRide(null)} onAssigned={handleAssigned} />
    </PortalLayout>
  );
};

export default DispatcherDashboard;
