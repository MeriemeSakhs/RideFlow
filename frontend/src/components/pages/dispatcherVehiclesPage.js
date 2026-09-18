import React, { useState, useEffect } from "react";
import PortalLayout from "../layout/PortalLayout";
import Modal from "../ui/Modal";
import VehiclesTable from "../vehicles/VehiclesTable";
import { DISPATCHER_NAV_ITEMS } from "../../portalConfig";
import getUserInfo from "../../utilities/decodeJwt";
import mockVehicles from "../../mockData/mockVehicles";

// MOCK DATA - see mockData/mockVehicles.js. Read-only for dispatchers.
const DispatcherVehicles = () => {
  const [user, setUser] = useState(undefined);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  useEffect(() => {
    setUser(getUserInfo());
  }, []);

  return (
    <PortalLayout
      portalTitle="Dispatcher Portal"
      portalSubtitle="Manage rides and assign drivers"
      navItems={DISPATCHER_NAV_ITEMS}
      user={user}
    >
      <VehiclesTable vehicles={mockVehicles} onSelect={setSelectedVehicle} />

      <Modal open={!!selectedVehicle} onClose={() => setSelectedVehicle(null)} title="Vehicle Details">
        {selectedVehicle && (
          <div className="space-y-2 text-sm">
            <p><span className="text-slate-500">Vehicle ID:</span> <span className="font-semibold text-slate-900">{selectedVehicle.id}</span></p>
            <p><span className="text-slate-500">Type:</span> {selectedVehicle.type}</p>
            <p><span className="text-slate-500">Make &amp; Model:</span> {selectedVehicle.makeModel}</p>
            <p><span className="text-slate-500">License Plate:</span> {selectedVehicle.licensePlate}</p>
            <p><span className="text-slate-500">Assigned Driver:</span> {selectedVehicle.assignedDriver || "—"}</p>
            <p><span className="text-slate-500">Mileage:</span> {selectedVehicle.mileage.toLocaleString()} mi</p>
            <p><span className="text-slate-500">Status:</span> <span className="capitalize">{selectedVehicle.status}</span></p>
          </div>
        )}
      </Modal>
    </PortalLayout>
  );
};

export default DispatcherVehicles;
