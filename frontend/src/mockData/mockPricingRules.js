// MOCK DATA - Pricing Engine backend (Todo #9) is not implemented yet.
// Stands in for a future GET /pricing-rule API. The Manager's ability to
// define these rules is UI-only for now; the ride creation form's
// "Calculate Rate" button reads from this same array as a placeholder estimate.
const mockPricingRules = [
  { id: "PR-001", name: "Standard Sedan Rate", vehicleType: "Sedan", baseRate: 25.0, perMile: 2.0, perMinute: 0.5, surge: 1, status: "active" },
  { id: "PR-002", name: "SUV Premium Rate", vehicleType: "SUV", baseRate: 35.0, perMile: 2.5, perMinute: 0.65, surge: 1, status: "active" },
  { id: "PR-003", name: "Van Group Rate", vehicleType: "Van", baseRate: 45.0, perMile: 3.0, perMinute: 0.75, surge: 1, status: "active" },
  { id: "PR-004", name: "Luxury Premium Rate", vehicleType: "Luxury", baseRate: 60.0, perMile: 3.5, perMinute: 1.0, surge: 1.2, status: "active" },
  { id: "PR-005", name: "Weekend Surge Pricing", vehicleType: "All", baseRate: 0.0, perMile: 0.0, perMinute: 0.0, surge: 1.5, status: "inactive" },
];

export default mockPricingRules;
