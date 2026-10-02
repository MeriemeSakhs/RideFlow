import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import PortalLayout from "../layout/PortalLayout";
import Modal from "../ui/Modal";
import VehiclesTable from "../vehicles/VehiclesTable";
import { DISPATCHER_NAV_ITEMS } from "../../portalConfig";
import getUserInfo from "../../utilities/decodeJwt";
import { authHeader, errorMessageFrom } from "../../utilities/api";

const VEHICLE_URL = `${process.env.REACT_APP_BACKEND_SERVER_URI}/vehicle`;

// Read-only - the manager's own Vehicles page (managerVehiclesPage.js) owns
// add/edit/remove. Real data from GET /vehicle, not mock data.
const DispatcherVehicles = () => {
  const [user, setUser] = useState(undefined);
  const [vehicles, setVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const fetchVehicles = useCallback(async () => {
    setIsLoading(true);
    setListError("");
    try {
      const { data } = await axios.get(VEHICLE_URL, { headers: authHeader() });
      setVehicles(data);
    } catch (err) {
      setListError(errorMessageFrom(err, "Could not load vehicles. Check your connection and try again."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setUser(getUserInfo());
    fetchVehicles();
  }, [fetchVehicles]);

  return (
    <PortalLayout
      portalTitle="Dispatcher Portal"
      portalSubtitle="Manage rides and assign drivers"
      navItems={DISPATCHER_NAV_ITEMS}
      user={user}
    >
      {isLoading && <p className="text-rideflow-navy/60">Loading vehicles...</p>}
      {!isLoading && listError && <p className="text-red-600 text-sm">{listError}</p>}
      {!isLoading && !listError && <VehiclesTable vehicles={vehicles} onSelect={setSelectedVehicle} />}

      <Modal open={!!selectedVehicle} onClose={() => setSelectedVehicle(null)} title="Vehicle Details">
        {selectedVehicle && (
          <div className="space-y-2 text-sm">
            <p><span className="text-rideflow-navy/60">Vehicle ID:</span> <span className="font-semibold text-rideflow-navy">{selectedVehicle.vehicleId || "—"}</span></p>
            <p><span className="text-rideflow-navy/60">Type:</span> {selectedVehicle.vehicleType}</p>
            <p><span className="text-rideflow-navy/60">Make &amp; Model:</span> {selectedVehicle.year ? `${selectedVehicle.year} ` : ""}{selectedVehicle.make} {selectedVehicle.model}</p>
            <p><span className="text-rideflow-navy/60">License Plate:</span> {selectedVehicle.licensePlate}</p>
            <p><span className="text-rideflow-navy/60">Assigned Driver:</span> {selectedVehicle.assignedDriver?.name || "—"}</p>
            <p><span className="text-rideflow-navy/60">Mileage:</span> {(selectedVehicle.mileage || 0).toLocaleString()} mi</p>
            <p><span className="text-rideflow-navy/60">Status:</span> <span className="capitalize">{selectedVehicle.status}</span></p>
          </div>
        )}
      </Modal>
    </PortalLayout>
  );
};

export default DispatcherVehicles;
