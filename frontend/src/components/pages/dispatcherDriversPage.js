import React, { useState, useEffect } from "react";
import PortalLayout from "../layout/PortalLayout";
import Modal from "../ui/Modal";
import DriversTable from "../drivers/DriversTable";
import { DISPATCHER_NAV_ITEMS } from "../../portalConfig";
import getUserInfo from "../../utilities/decodeJwt";
import mockDrivers from "../../mockData/mockDrivers";

// MOCK DATA - see mockData/mockDrivers.js. Read-only for dispatchers; Manager
// gets Add/Edit once Driver Management (Todo #7) is scheduled.
const DispatcherDrivers = () => {
  const [user, setUser] = useState(undefined);
  const [selectedDriver, setSelectedDriver] = useState(null);

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
      <DriversTable drivers={mockDrivers} onSelect={setSelectedDriver} />

      <Modal open={!!selectedDriver} onClose={() => setSelectedDriver(null)} title="Driver Details">
        {selectedDriver && (
          <div className="space-y-2 text-sm">
            <p><span className="text-slate-500">Name:</span> <span className="font-semibold text-slate-900">{selectedDriver.name}</span></p>
            <p><span className="text-slate-500">Driver ID:</span> {selectedDriver.id}</p>
            <p><span className="text-slate-500">Email:</span> {selectedDriver.email}</p>
            <p><span className="text-slate-500">Phone:</span> {selectedDriver.phone}</p>
            <p><span className="text-slate-500">Vehicle Type:</span> {selectedDriver.vehicleType}</p>
            <p><span className="text-slate-500">Status:</span> <span className="capitalize">{selectedDriver.status}</span></p>
            <p><span className="text-slate-500">Total Rides:</span> {selectedDriver.totalRides}</p>
          </div>
        )}
      </Modal>
    </PortalLayout>
  );
};

export default DispatcherDrivers;
