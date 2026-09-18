// MOCK DATA - Driver Management backend (Todo #7: Driver Availability & Assignment)
// is not implemented yet. This module stands in for a future GET /driver API.
// Shape matches what the real API is expected to return so swapping it out later
// is a one-line change in the pages that import this.
const mockDrivers = [
  { id: "DRV-001", name: "Mike Johnson", email: "mike.j@transport.com", phone: "+1 (555) 123-4567", vehicleType: "Sedan", status: "available", totalRides: 342 },
  { id: "DRV-002", name: "Sarah Williams", email: "sarah.w@transport.com", phone: "+1 (555) 234-5678", vehicleType: "SUV", status: "busy", totalRides: 456 },
  { id: "DRV-003", name: "Tom Davis", email: "tom.d@transport.com", phone: "+1 (555) 345-6789", vehicleType: "Van", status: "available", totalRides: 289 },
  { id: "DRV-004", name: "Lisa Chen", email: "lisa.c@transport.com", phone: "+1 (555) 456-7890", vehicleType: "Sedan", status: "available", totalRides: 521 },
];

export default mockDrivers;
