// Pure aggregation helpers shared by the Manager Dashboard and Reports pages
// (Issue #10) - both compute these from the same, already company-scoped
// GET /ride / GET /driver / GET /vehicle responses (companyId is always
// derived server-side from the JWT - see backend/server/middleware/auth.js -
// never trusted from the frontend). Nothing here invents a number: a metric
// that can't be honestly computed from the rides/drivers/vehicles it's given
// (e.g. a customer rating, a performance percentage) is simply not produced -
// callers must omit that card/column rather than fake a value.

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const filterByStatus = (rides, statuses) => rides.filter((r) => statuses.includes(r.status));

export const sumRevenue = (rides) => rides.reduce((total, r) => total + (r.price || 0), 0);

// Real revenue by calendar month, over the last `monthsBack` months
// (including the current one) - a month with no completed rides shows as a
// real $0, never an invented value. Only "completed" rides count, since a
// pending/cancelled ride never actually generated revenue.
export const buildMonthlyRevenueTrend = (rides, monthsBack = 6) => {
  const completed = filterByStatus(rides, ["completed"]);
  const now = new Date();
  const buckets = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ year: d.getFullYear(), month: d.getMonth(), label: MONTH_LABELS[d.getMonth()], value: 0 });
  }
  for (const ride of completed) {
    const d = new Date(ride.rideDate);
    const bucket = buckets.find((b) => b.year === d.getFullYear() && b.month === d.getMonth());
    if (bucket) bucket.value += ride.price || 0;
  }
  return buckets.map(({ label, value }) => ({ label, value: Math.round(value * 100) / 100 }));
};

// Real ride counts for each day of the CURRENT week (Monday-Sunday) - every
// ride regardless of status, since this answers "how many rides were
// scheduled that day", not "how many finished". A day with no rides shows as
// a real 0.
export const buildWeeklyRideCounts = (rides) => {
  const now = new Date();
  const dayIndex = (now.getDay() + 6) % 7; // 0=Mon ... 6=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayIndex);
  monday.setHours(0, 0, 0, 0);

  const buckets = DAY_LABELS.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { label, date: d, value: 0 };
  });

  for (const ride of rides) {
    const d = new Date(ride.rideDate);
    const bucket = buckets.find((b) => b.date.toDateString() === d.toDateString());
    if (bucket) bucket.value += 1;
  }
  return buckets.map(({ label, value }) => ({ label, value }));
};

// Real fleet composition by vehicle type - whatever types actually exist in
// this company's vehicles (never an assumed Sedan/SUV/Van/Luxury set).
export const computeVehicleTypeUtilization = (vehicles) => {
  if (vehicles.length === 0) return [];
  const counts = new Map();
  for (const v of vehicles) counts.set(v.vehicleType, (counts.get(v.vehicleType) || 0) + 1);
  return Array.from(counts.entries()).map(([name, count]) => ({
    name,
    value: Math.round((count / vehicles.length) * 1000) / 10,
  }));
};

// Real per-driver totals from COMPLETED rides only ("performing" = actually
// finished work) - driver name/ride count/revenue, sorted highest revenue
// first. Deliberately has no performance-percentage field: there's no real
// relative-performance metric stored anywhere, so one is never invented.
export const computeDriverPerformance = (rides) => {
  const completed = filterByStatus(rides, ["completed"]).filter((r) => r.assignedDriver);
  const byDriver = new Map();
  for (const ride of completed) {
    const id = ride.assignedDriver._id;
    if (!byDriver.has(id)) byDriver.set(id, { driverId: id, name: ride.assignedDriver.name, rides: 0, revenue: 0 });
    const entry = byDriver.get(id);
    entry.rides += 1;
    entry.revenue += ride.price || 0;
  }
  return Array.from(byDriver.values())
    .map((d) => ({ ...d, avgPerRide: d.rides ? d.revenue / d.rides : 0 }))
    .sort((a, b) => b.revenue - a.revenue);
};
