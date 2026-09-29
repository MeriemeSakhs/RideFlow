import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Clock, PlayCircle, StopCircle } from "lucide-react";
import { authHeader, errorMessageFrom } from "../../utilities/api";
import {
  formatElapsed,
  formatHoursMinutes,
  formatClockTime,
  isSameDay,
  isThisWeek,
  sumMinutes,
  liveElapsedMinutes,
} from "../../utilities/timeTracking";
import WorkSessionHistoryTable from "./WorkSessionHistoryTable";

const BASE_URL = `${process.env.REACT_APP_BACKEND_SERVER_URI}/work-sessions`;

// Dispatcher-only widget. The timer is always recomputed from the server's
// openSession.punchIn timestamp (re-fetched on mount), never from client-only
// state - so a page refresh continues the same session instead of resetting.
const TimeClockCard = () => {
  const [openSession, setOpenSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [now, setNow] = useState(Date.now());

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const { data } = await axios.get(`${BASE_URL}/me`, { headers: authHeader() });
      setOpenSession(data.openSession);
      setSessions(data.sessions);
    } catch (err) {
      setError(errorMessageFrom(err, "Could not load your time clock. Check your connection and try again."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!openSession) return undefined;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [openSession]);

  const handlePunchIn = async () => {
    setActionError("");
    setIsSubmitting(true);
    try {
      const { data } = await axios.post(`${BASE_URL}/punch-in`, {}, { headers: authHeader() });
      setOpenSession(data);
      setNow(Date.now());
    } catch (err) {
      setActionError(errorMessageFrom(err, "Could not punch in. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePunchOut = async () => {
    setActionError("");
    setIsSubmitting(true);
    try {
      const { data } = await axios.post(`${BASE_URL}/punch-out`, {}, { headers: authHeader() });
      setOpenSession(null);
      setSessions((prev) => [data, ...prev]);
    } catch (err) {
      setActionError(errorMessageFrom(err, "Could not punch out. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-black/5 p-5">
        <p className="text-rideflow-navy/60 text-sm">Loading time clock...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-black/5 p-5">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  const today = new Date();
  const liveMinutes = liveElapsedMinutes(openSession, now);
  const todaysMinutes = sumMinutes(sessions, (s) => isSameDay(s.date, today)) + liveMinutes;
  const weeklyMinutes = sumMinutes(sessions, (s) => isThisWeek(s.date, today)) + liveMinutes;
  const mostRecentSession = sessions[0];

  return (
    <div className="bg-white rounded-xl border border-black/5 overflow-hidden">
      <div className="px-5 py-4 border-b border-black/5 flex items-center gap-2">
        <Clock size={16} className="text-rideflow-orange" />
        <h3 className="font-bold text-rideflow-navy">Time Clock</h3>
      </div>

      <div className="p-5 grid sm:grid-cols-3 gap-5">
        <div>
          <p className="text-xs text-rideflow-navy/50 uppercase tracking-wide font-semibold">Today's Work Time</p>
          <p className="text-2xl font-bold text-rideflow-navy mt-1 font-mono tabular-nums">
            {openSession ? formatElapsed(now - new Date(openSession.punchIn).getTime()) : formatHoursMinutes(todaysMinutes)}
          </p>
        </div>

        <div>
          <p className="text-xs text-rideflow-navy/50 uppercase tracking-wide font-semibold">Current Status</p>
          {openSession ? (
            <>
              <p className="text-lg font-bold text-emerald-600 mt-1">Clocked In</p>
              <p className="text-xs text-rideflow-navy/50 mt-0.5">Punch In: {formatClockTime(openSession.punchIn)}</p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-rideflow-navy/60 mt-1">Clocked Out</p>
              {mostRecentSession && (
                <p className="text-xs text-rideflow-navy/50 mt-0.5">
                  Last: {formatClockTime(mostRecentSession.punchIn)} &rarr; {formatClockTime(mostRecentSession.punchOut)}
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex sm:flex-col sm:items-end justify-between sm:justify-center gap-2">
          <div className="text-left sm:text-right">
            <p className="text-xs text-rideflow-navy/50">This Week</p>
            <p className="text-sm font-semibold text-rideflow-navy">{formatHoursMinutes(weeklyMinutes)}</p>
          </div>
          {openSession ? (
            <button
              type="button"
              onClick={handlePunchOut}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-sm shadow-sm transition-colors"
            >
              <StopCircle size={16} /> Punch Out
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePunchIn}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-rideflow-orange hover:bg-rideflow-orange-hover disabled:opacity-50 text-white font-semibold text-sm shadow-sm transition-colors"
            >
              <PlayCircle size={16} /> Punch In
            </button>
          )}
        </div>
      </div>

      {actionError && <p className="text-red-600 text-sm px-5 pb-4">{actionError}</p>}

      {sessions.length > 0 && (
        <div className="border-t border-black/5">
          <div className="px-5 py-3">
            <p className="text-xs font-semibold text-rideflow-navy/50 uppercase tracking-wide">Recent Sessions</p>
          </div>
          <WorkSessionHistoryTable sessions={sessions.slice(0, 7)} openSession={null} />
        </div>
      )}
    </div>
  );
};

export default TimeClockCard;
