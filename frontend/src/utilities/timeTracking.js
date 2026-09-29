const pad = (n) => String(n).padStart(2, "0");

// "05:42:18" - live elapsed timer while punched in
export const formatElapsed = (ms) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

// "5h 42m" - daily/weekly totals
export const formatHoursMinutes = (totalMinutes) => {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

// "9:02 AM" - no leading zero on the hour, matches the spec's examples
export const formatClockTime = (isoOrDate) => {
  const date = new Date(isoOrDate);
  if (Number.isNaN(date.getTime())) return "—";
  let hours = date.getHours();
  const minutes = pad(date.getMinutes());
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${period}`;
};

export const formatShortDate = (isoOrDate) => {
  const date = new Date(isoOrDate);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

export const isSameDay = (a, b) => {
  const dateA = new Date(a);
  const dateB = new Date(b);
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
};

// Monday-start work week
export const startOfWeek = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const isThisWeek = (isoOrDate, reference = new Date()) => {
  const date = new Date(isoOrDate);
  const weekStart = startOfWeek(reference);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  return date >= weekStart && date < weekEnd;
};

// Minutes worked "today" / "this week" from a list of CLOSED sessions, plus
// the live-elapsed minutes of the current open session if any (so the totals
// update in real time while punched in, not just after punching out).
export const sumMinutes = (sessions, predicate) =>
  sessions.filter(predicate).reduce((total, s) => total + (s.durationMinutes || 0), 0);

export const liveElapsedMinutes = (openSession, now = Date.now()) => {
  if (!openSession) return 0;
  return Math.max(0, (now - new Date(openSession.punchIn).getTime()) / 60000);
};
