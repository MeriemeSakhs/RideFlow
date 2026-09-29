import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import PortalLayout from "../layout/PortalLayout";
import Modal from "../ui/Modal";
import DriversTable from "../drivers/DriversTable";
import { DISPATCHER_NAV_ITEMS } from "../../portalConfig";
import getUserInfo from "../../utilities/decodeJwt";
import { authHeader, errorMessageFrom } from "../../utilities/api";

const DRIVERS_URL = `${process.env.REACT_APP_BACKEND_SERVER_URI}/driver`;

// Read-only for dispatchers - adding drivers is a Manager action (see
// managerDriversPage.js).
const DispatcherDrivers = () => {
  const [user, setUser] = useState(undefined);
  const [drivers, setDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [selectedDriver, setSelectedDriver] = useState(null);

  const fetchDrivers = useCallback(async () => {
    setIsLoading(true);
    setListError("");
    try {
      const { data } = await axios.get(DRIVERS_URL, { headers: authHeader() });
      setDrivers(data);
    } catch (err) {
      setListError(errorMessageFrom(err, "Could not load drivers. Check your connection and try again."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const currentUser = getUserInfo();
    setUser(currentUser);
    if (currentUser && ["dispatcher", "manager"].includes(currentUser.role)) fetchDrivers();
  }, [fetchDrivers]);

  return (
    <PortalLayout
      portalTitle="Dispatcher Portal"
      portalSubtitle="Manage rides and assign drivers"
      navItems={DISPATCHER_NAV_ITEMS}
      user={user}
    >
      {isLoading && <p className="text-rideflow-navy/60">Loading drivers...</p>}
      {!isLoading && listError && <p className="text-red-600 text-sm mb-4">{listError}</p>}
      {!isLoading && !listError && <DriversTable drivers={drivers} onSelect={setSelectedDriver} />}

      <Modal open={!!selectedDriver} onClose={() => setSelectedDriver(null)} title="Driver Details">
        {selectedDriver && (
          <div className="space-y-2 text-sm">
            <p><span className="text-rideflow-navy/60">Name:</span> <span className="font-semibold text-rideflow-navy">{selectedDriver.name}</span></p>
            <p><span className="text-rideflow-navy/60">Phone:</span> {selectedDriver.phone}</p>
            <p><span className="text-rideflow-navy/60">License Number:</span> {selectedDriver.licenseNumber}</p>
            <p><span className="text-rideflow-navy/60">Status:</span> <span className="capitalize">{selectedDriver.status}</span></p>
          </div>
        )}
      </Modal>
    </PortalLayout>
  );
};

export default DispatcherDrivers;
