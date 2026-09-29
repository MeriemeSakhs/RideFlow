import React from "react";
import { formatShortDate, formatClockTime, formatHoursMinutes } from "../../utilities/timeTracking";

// Date | Punch In | Punch Out | Total - reused by the Dispatcher's own
// dashboard and the Manager's per-dispatcher detail view.
const WorkSessionHistoryTable = ({ sessions, openSession }) => {
  const rows = openSession ? [openSession, ...sessions] : sessions;

  if (rows.length === 0) {
    return <p className="text-rideflow-navy/40 text-sm px-5 py-6">No work sessions yet</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-rideflow-navy/40 uppercase border-b border-black/5 whitespace-nowrap">
            <th className="px-5 py-2 font-semibold">Date</th>
            <th className="px-5 py-2 font-semibold">Punch In</th>
            <th className="px-5 py-2 font-semibold">Punch Out</th>
            <th className="px-5 py-2 font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((session) => (
            <tr key={session._id} className="border-b border-black/5 last:border-0">
              <td className="px-5 py-3 text-rideflow-navy whitespace-nowrap">{formatShortDate(session.date)}</td>
              <td className="px-5 py-3 text-rideflow-navy/70 whitespace-nowrap">{formatClockTime(session.punchIn)}</td>
              <td className="px-5 py-3 text-rideflow-navy/70 whitespace-nowrap">
                {session.punchOut ? formatClockTime(session.punchOut) : (
                  <span className="text-emerald-600 font-medium">Currently working</span>
                )}
              </td>
              <td className="px-5 py-3 text-rideflow-navy font-medium">
                {session.durationMinutes != null ? formatHoursMinutes(session.durationMinutes) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default WorkSessionHistoryTable;
