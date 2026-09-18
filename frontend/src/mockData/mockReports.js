// MOCK DATA - Reporting/analytics backend (Todo #10: Manager Dashboard &
// Reporting) is not implemented yet. Revenue and driver-performance figures
// depend on the pricing engine and driver assignment, neither of which exist
// yet either. The Day/Month/Year filter is wired up in the UI but reads this
// same static dataset regardless of period - a real API would take the place
// of this whole module.

export const mockManagerSummary = {
  totalRides: 1847,
  totalRidesTrendPct: 12.5,
  completedRides: 1652,
  completedRidesTrendPct: 8.2,
  completionRate: 89.4,
  cancelledRides: 195,
  cancelledRidesTrendPct: -3.1,
  cancellationRate: 10.6,
  totalRevenue: 82450,
  totalRevenueTrendPct: 15.7,
  activeDrivers: 24,
  totalDrivers: 32,
  fleetSize: 32,
  activeVehicles: 28,
  maintenanceVehicles: 4,
  fleetUtilizationPct: 87.5,
  avgRating: 4.8,
  totalReviews: 1450,
};

export const mockRevenueTrend = [
  { label: "Jan", value: 9500 },
  { label: "Feb", value: 13800 },
  { label: "Mar", value: 12600 },
  { label: "Apr", value: 15200 },
  { label: "May", value: 18900 },
  { label: "Jun", value: 21400 },
];

export const mockDailyRides = [
  { label: "Mon", value: 45 },
  { label: "Tue", value: 58 },
  { label: "Wed", value: 52 },
  { label: "Thu", value: 61 },
  { label: "Fri", value: 73 },
  { label: "Sat", value: 80 },
  { label: "Sun", value: 65 },
];

export const mockVehicleUtilization = [
  { name: "Sedan", value: 45 },
  { name: "SUV", value: 28 },
  { name: "Van", value: 18 },
  { name: "Luxury", value: 9 },
];

export const mockTopDrivers = [
  { name: "Lisa Chen", rides: 89, revenue: 4250 },
  { name: "Mike Johnson", rides: 76, revenue: 3680 },
  { name: "Sarah Williams", rides: 71, revenue: 3420 },
];

export const mockDriverPerformance = [
  { rank: 1, name: "Lisa Chen", totalRides: 89, revenue: 4250, avgPerRide: 47.75, performance: 100 },
  { rank: 2, name: "Mike Johnson", totalRides: 76, revenue: 3680, avgPerRide: 48.42, performance: 85 },
  { rank: 3, name: "Sarah Williams", totalRides: 71, revenue: 3420, avgPerRide: 48.17, performance: 80 },
  { rank: 4, name: "Tom Davis", totalRides: 65, revenue: 3100, avgPerRide: 47.69, performance: 75 },
  { rank: 5, name: "Robert Martinez", totalRides: 58, revenue: 3890, avgPerRide: 67.07, performance: 65 },
];

export const mockReportSummary = {
  totalRevenue: 106900,
  totalRevenueTrendPct: 18.2,
  totalRides: 2733,
  totalRidesTrendPct: 12.5,
  avgRideValue: 39.12,
  avgRideValueTrendPct: 5.1,
  customerSatisfaction: 4.8,
  customerSatisfactionTrendPct: 0.2,
};
