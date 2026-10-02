import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Clock, UserPlus } from "lucide-react";
import PortalLayout from "../layout/PortalLayout";
import Modal from "../ui/Modal";
import ConfirmDialog from "../ui/ConfirmDialog";
import WorkSessionHistoryTable from "../timeTracking/WorkSessionHistoryTable";
import { MANAGER_NAV_ITEMS } from "../../portalConfig";
import getUserInfo from "../../utilities/decodeJwt";
import { authHeader, errorMessageFrom } from "../../utilities/api";
import {
  formatHoursMinutes,
  formatClockTime,
  isSameDay,
  isThisWeek,
  sumMinutes,
  liveElapsedMinutes,
} from "../../utilities/timeTracking";

const SESSIONS_URL = `${process.env.REACT_APP_BACKEND_SERVER_URI}/work-sessions/company`;
const DISPATCHERS_URL = `${process.env.REACT_APP_BACKEND_SERVER_URI}/user/dispatchers`;
const RIDES_URL = `${process.env.REACT_APP_BACKEND_SERVER_URI}/ride`;

const inputClass =
  "w-full px-4 py-2 rounded-md border border-rideflow-navy/20 text-rideflow-navy placeholder-rideflow-navy/35 focus:outline-none focus:ring-2 focus:ring-rideflow-orange focus:border-rideflow-orange";

const emptyDispatcherForm = { fullName: "", dateOfBirth: "", email: "", password: "", confirmPassword: "" };

const sameUser = (a, b) => String(a) === String(b);

// Rides only carry a createdBy attribution from the point this field was
// added onward - rides created before that have createdBy: null and are
// simply not counted per-dispatcher (not backfilled with a guess).
const rideStatsFor = (rides, dispatcherId) => {
  const attributed = rides.filter((r) => r.createdBy && sameUser(r.createdBy, dispatcherId));
  return {
    total: attributed.length,
    completed: attributed.filter((r) => r.status === "completed").length,
    active: attributed.filter((r) => ["pending", "assigned", "in-progress"].includes(r.status)).length,
    cancelled: attributed.filter((r) => r.status === "cancelled").length,
  };
};

const ManagerTeamHours = () => {
  const [user, setUser] = useState(undefined);
  const [dispatchers, setDispatchers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [rides, setRides] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDispatcherId, setSelectedDispatcherId] = useState(null);
  const [now, setNow] = useState(Date.now());

  const [addDispatcherOpen, setAddDispatcherOpen] = useState(false);
  const [dispatcherForm, setDispatcherForm] = useState(emptyDispatcherForm);
  const [addError, setAddError] = useState("");
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  const [removingId, setRemovingId] = useState(null);
  const [removeError, setRemoveError] = useState("");
  const [confirmTarget, setConfirmTarget] = useState(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [dispatchersRes, sessionsRes, ridesRes] = await Promise.all([
        axios.get(DISPATCHERS_URL, { headers: authHeader() }),
        axios.get(SESSIONS_URL, { headers: authHeader() }),
        axios.get(RIDES_URL, { headers: authHeader() }),
      ]);
      setDispatchers(dispatchersRes.data);
      setSessions(sessionsRes.data);
      setRides(ridesRes.data);
    } catch (err) {
      setError(errorMessageFrom(err, "Could not load team hours. Check your connection and try again."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const currentUser = getUserInfo();
    setUser(currentUser);
    if (currentUser && currentUser.role === "manager") fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const today = new Date();

  const statsFor = (dispatcherId) => {
    const dSessions = sessions.filter((s) => sameUser(s.user?._id, dispatcherId));
    const openSession = dSessions.find((s) => !s.punchOut) || null;
    const closedSessions = dSessions.filter((s) => s.punchOut);
    const live = liveElapsedMinutes(openSession, now);
    return {
      openSession,
      closedSessions,
      todayMinutes: sumMinutes(closedSessions, (s) => isSameDay(s.date, today)) + live,
      weekMinutes: sumMinutes(closedSessions, (s) => isThisWeek(s.date, today)) + live,
    };
  };

  const openAddDispatcher = () => {
    setDispatcherForm(emptyDispatcherForm);
    setAddError("");
    setAddDispatcherOpen(true);
  };

  const handleDispatcherFormChange = ({ currentTarget: input }) => {
    setDispatcherForm((prev) => ({ ...prev, [input.name]: input.value }));
  };

  const handleAddDispatcher = async (e) => {
    e.preventDefault();
    setAddError("");

    if (!dispatcherForm.fullName.trim()) return setAddError("Full name is required");
    if (!dispatcherForm.dateOfBirth) return setAddError("Date of birth is required");
    if (!dispatcherForm.email.trim()) return setAddError("Email is required");
    if (dispatcherForm.password.length < 8) return setAddError("Password must be 8 or more characters");
    if (dispatcherForm.password !== dispatcherForm.confirmPassword) return setAddError("Passwords do not match");

    setIsSubmittingAdd(true);
    try {
      await axios.post(DISPATCHERS_URL, dispatcherForm, { headers: authHeader() });
      setAddDispatcherOpen(false);
      await fetchAll();
    } catch (err) {
      setAddError(errorMessageFrom(err, "Could not create the dispatcher account. Please try again."));
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Clicking Remove only opens the confirmation dialog - nothing is
  // removed until the dialog's own Delete button is explicitly clicked.
  const handleRemoveDispatcher = (dispatcher, e) => {
    e.stopPropagation();
    setConfirmTarget(dispatcher);
  };

  const cancelRemoveDispatcher = () => setConfirmTarget(null);

  const confirmRemoveDispatcher = async () => {
    const dispatcher = confirmTarget;
    setRemoveError("");
    setRemovingId(dispatcher._id);
    try {
      await axios.patch(`${DISPATCHERS_URL}/${dispatcher._id}/remove`, {}, { headers: authHeader() });
      if (selectedDispatcherId === dispatcher._id) setSelectedDispatcherId(null);
      setConfirmTarget(null);
      await fetchAll();
    } catch (err) {
      setRemoveError(errorMessageFrom(err, "Could not remove this dispatcher. Please try again."));
      setConfirmTarget(null);
    } finally {
      setRemovingId(null);
    }
  };

  const selectedDispatcher = dispatchers.find((d) => d._id === selectedDispatcherId);
  const selectedStats = selectedDispatcher ? statsFor(selectedDispatcher._id) : null;
  const selectedRideStats = selectedDispatcher ? rideStatsFor(rides, selectedDispatcher._id) : null;
  const todaysSessionsForSelected = selectedStats
    ? [...(selectedStats.openSession ? [selectedStats.openSession] : []), ...selectedStats.closedSessions].filter((s) =>
        isSameDay(s.date, today)
      )
    : [];

  return (
    <PortalLayout portalTitle="Manager Portal" portalSubtitle="Monitor operations and view analytics" navItems={MANAGER_NAV_ITEMS} user={user}>
      <div className="flex items-center justify-end mb-6">
        <button
          type="button"
          onClick={openAddDispatcher}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rideflow-orange hover:bg-rideflow-orange-hover text-white font-semibold text-sm shadow-sm transition-colors"
        >
          <UserPlus size={16} /> Add Dispatcher
        </button>
      </div>

      {isLoading && <p className="text-rideflow-navy/60">Loading team hours...</p>}
      {!isLoading && error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      {!isLoading && removeError && <p className="text-red-600 text-sm mb-4">{removeError}</p>}

      {!isLoading && !error && (
        <div className="bg-white rounded-xl border border-black/5 overflow-hidden">
          <div className="px-5 py-4 border-b border-black/5 flex items-center gap-2">
            <Clock size={16} className="text-rideflow-orange" />
            <h3 className="font-bold text-rideflow-navy">Dispatcher Hours</h3>
            <span className="text-xs text-rideflow-navy/40">({dispatchers.length})</span>
          </div>

          {dispatchers.length === 0 ? (
            <p className="text-rideflow-navy/40 text-sm px-5 py-6">No dispatchers in your company yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-rideflow-navy/40 uppercase border-b border-black/5">
                    <th className="px-5 py-2 font-semibold">Dispatcher</th>
                    <th className="px-5 py-2 font-semibold">Status</th>
                    <th className="px-5 py-2 font-semibold">Today</th>
                    <th className="px-5 py-2 font-semibold">This Week</th>
                    <th className="px-5 py-2 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dispatchers.map((dispatcher) => {
                    const stats = statsFor(dispatcher._id);
                    return (
                      <tr
                        key={dispatcher._id}
                        onClick={() => setSelectedDispatcherId(dispatcher._id)}
                        className="border-b border-black/5 last:border-0 cursor-pointer hover:bg-rideflow-gray/20"
                      >
                        <td className="px-5 py-3 text-rideflow-navy font-medium">{dispatcher.fullName}</td>
                        <td className="px-5 py-3">
                          {stats.openSession ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Clocked In
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-rideflow-navy/50 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-rideflow-navy/20" /> Clocked Out
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-rideflow-navy">{formatHoursMinutes(stats.todayMinutes)}</td>
                        <td className="px-5 py-3 text-rideflow-navy">{formatHoursMinutes(stats.weekMinutes)}</td>
                        <td className="px-5 py-3">
                          <button
                            type="button"
                            onClick={(e) => handleRemoveDispatcher(dispatcher, e)}
                            disabled={removingId === dispatcher._id}
                            className="text-red-600 hover:text-red-700 font-semibold disabled:text-rideflow-navy/25 disabled:cursor-not-allowed"
                          >
                            {removingId === dispatcher._id ? "Removing..." : "Remove Dispatcher"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Modal open={!!selectedDispatcher} onClose={() => setSelectedDispatcherId(null)} title={selectedDispatcher?.fullName || ""}>
        {selectedDispatcher && selectedStats && selectedRideStats && (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold text-rideflow-navy/50 uppercase tracking-wide mb-2">Today's Sessions</p>
              {todaysSessionsForSelected.length === 0 ? (
                <p className="text-sm text-rideflow-navy/50">No sessions today</p>
              ) : (
                <ul className="space-y-1.5">
                  {todaysSessionsForSelected.map((s) => (
                    <li key={s._id} className="text-sm text-rideflow-navy">
                      {formatClockTime(s.punchIn)} &rarr;{" "}
                      {s.punchOut ? formatClockTime(s.punchOut) : <span className="text-emerald-600 font-medium">Currently working</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-rideflow-navy/50">Total Today</p>
                <p className="text-lg font-bold text-rideflow-navy">{formatHoursMinutes(selectedStats.todayMinutes)}</p>
              </div>
              <div>
                <p className="text-xs text-rideflow-navy/50">Total This Week</p>
                <p className="text-lg font-bold text-rideflow-navy">{formatHoursMinutes(selectedStats.weekMinutes)}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-rideflow-navy/50 uppercase tracking-wide mb-2">Ride Activity</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-rideflow-gray/30 rounded-lg px-3 py-2 text-center">
                  <p className="text-lg font-bold text-rideflow-navy">{selectedRideStats.completed}</p>
                  <p className="text-xs text-rideflow-navy/50">Completed</p>
                </div>
                <div className="bg-rideflow-gray/30 rounded-lg px-3 py-2 text-center">
                  <p className="text-lg font-bold text-rideflow-navy">{selectedRideStats.active}</p>
                  <p className="text-xs text-rideflow-navy/50">Active</p>
                </div>
                <div className="bg-rideflow-gray/30 rounded-lg px-3 py-2 text-center">
                  <p className="text-lg font-bold text-rideflow-navy">{selectedRideStats.cancelled}</p>
                  <p className="text-xs text-rideflow-navy/50">Cancelled</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-rideflow-navy/50 uppercase tracking-wide mb-2">Session History</p>
              <WorkSessionHistoryTable sessions={selectedStats.closedSessions.slice(0, 10)} openSession={null} />
            </div>
          </div>
        )}
      </Modal>

      <Modal open={addDispatcherOpen} onClose={() => setAddDispatcherOpen(false)} title="Add Dispatcher">
        <form onSubmit={handleAddDispatcher} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-rideflow-navy mb-1">Full Name</label>
            <input type="text" name="fullName" value={dispatcherForm.fullName} onChange={handleDispatcherFormChange} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-rideflow-navy mb-1">Date of Birth</label>
            <input type="date" name="dateOfBirth" value={dispatcherForm.dateOfBirth} onChange={handleDispatcherFormChange} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-rideflow-navy mb-1">Email</label>
            <input type="email" name="email" value={dispatcherForm.email} onChange={handleDispatcherFormChange} className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-rideflow-navy mb-1">Password</label>
            <input
              type="password"
              name="password"
              placeholder="At least 8 characters"
              value={dispatcherForm.password}
              onChange={handleDispatcherFormChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-rideflow-navy mb-1">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={dispatcherForm.confirmPassword}
              onChange={handleDispatcherFormChange}
              className={inputClass}
            />
          </div>

          <p className="text-xs text-rideflow-navy/40">
            This dispatcher joins your company automatically - no reference number needed.
          </p>

          {addError && <p className="text-red-600 text-sm">{addError}</p>}

          <button
            type="submit"
            disabled={isSubmittingAdd}
            className="w-full py-2.5 rounded-lg bg-rideflow-orange hover:bg-rideflow-orange-hover disabled:opacity-50 text-white font-semibold text-sm shadow-sm transition-colors"
          >
            {isSubmittingAdd ? "Creating account..." : "Create Dispatcher Account"}
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmTarget}
        title="Remove Dispatcher?"
        message={
          confirmTarget
            ? `Are you sure you want to remove ${confirmTarget.fullName || "this dispatcher"}? They will immediately lose access to their RideFlow account. This action cannot be undone.`
            : ""
        }
        confirmLabel="Remove"
        confirmingLabel="Removing..."
        isConfirming={removingId === confirmTarget?._id}
        onConfirm={confirmRemoveDispatcher}
        onCancel={cancelRemoveDispatcher}
      />
    </PortalLayout>
  );
};

export default ManagerTeamHours;
