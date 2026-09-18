// MOCK DATA - Vehicle Management backend is not implemented yet (planned
// alongside Driver Management). Stands in for a future GET /vehicle API.
const mockVehicles = [
  { id: "VEH-001", type: "Sedan", makeModel: "2024 Toyota Camry", licensePlate: "ABC-1234", assignedDriver: "Mike Johnson", mileage: 25400, status: "active" },
  { id: "VEH-002", type: "SUV", makeModel: "2023 Honda CR-V", licensePlate: "XYZ-5678", assignedDriver: "Sarah Williams", mileage: 18200, status: "active" },
  { id: "VEH-003", type: "Van", makeModel: "2024 Ford Transit", licensePlate: "DEF-9012", assignedDriver: "Tom Davis", mileage: 32100, status: "maintenance" },
  { id: "VEH-004", type: "Sedan", makeModel: "2023 Honda Accord", licensePlate: "GHI-3456", assignedDriver: "Lisa Chen", mileage: 15800, status: "active" },
];

export default mockVehicles;
