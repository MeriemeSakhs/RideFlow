import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { User, Phone, Check, MessageSquare, AlertTriangle } from "lucide-react";
import Modal from "../ui/Modal";
import { authHeader, errorMessageFrom } from "../../utilities/api";

const DRIVERS_URL = `${process.env.REACT_APP_BACKEND_SERVER_URI}/driver`;
const RIDE_URL = `${process.env.REACT_APP_BACKEND_SERVER_URI}/ride`;

// Dispatcher-driven manual assignment: fetches the company's currently
// available drivers, lets the dispatcher click one to select it (never
// pre-selected, never auto-chosen by distance/workload/any algorithm), then
// confirms the assignment against PATCH /ride/:id/assign. On success, stays
// open on a confirmation view showing the assigned driver, the ride's new
// status, and whether the driver's SMS notification actually went out -
// only closing (and refreshing the parent's ride list) once the dispatcher
// clicks Done, so a failed SMS is never silently missed.
const AssignDriverModal = ({ ride, onClose, onAssigned }) => {
  const [drivers, setDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [assignError, setAssignError] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [result, setResult] = useState(null); // { ride, smsStatus } once assignment succeeds

  // Availability is schedule-aware, not just Driver.status="available" - a
  // driver busy with one ride can still be free for a different,
  // non-conflicting one, so this always asks the backend specifically
  // "who's free for THIS ride's pickup time" (see routes/driverRoutes.js).
  const fetchAvailableDrivers = useCallback(async () => {
    if (!ride) return;
    setIsLoading(true);
    setLoadError("");
    try {
      // Pass the ride's own estimatedDurationMinutes when it has one, so
      // the backend checks against this ride's real occupied window rather
      // than always falling back to the default (see
      // utilities/driverSchedule.js on the backend).
      const durationParam = ride.estimatedDurationMinutes
        ? `&estimatedDurationMinutes=${encodeURIComponent(ride.estimatedDurationMinutes)}`
        : "";
      const { data } = await axios.get(
        `${DRIVERS_URL}?pickupDate=${encodeURIComponent(ride.rideDate)}${durationParam}`,
        { headers: authHeader() }
      );
      setDrivers(data);
    } catch (err) {
      setLoadError(errorMessageFrom(err, "Could not load available drivers. Check your connection and try again."));
    } finally {
      setIsLoading(false);
    }
  }, [ride]);

  useEffect(() => {
    if (!ride) return;
    setSelectedDriverId(null);
    setAssignError("");
    setResult(null);
    fetchAvailableDrivers();
  }, [ride, fetchAvailableDrivers]);

  const handleConfirm = async () => {
    if (!selectedDriverId) return;
    setAssignError("");
    setIsAssigning(true);
    try {
      const { data } = await axios.patch(
        `${RIDE_URL}/${ride._id}/assign`,
        { driverId: selectedDriverId },
        { headers: authHeader() }
      );
      setResult(data);
    } catch (err) {
      setAssignError(errorMessageFrom(err, "Could not assign this driver. Please try again."));
      // A 404/409 means the ride or driver's state changed under us (already
      // assigned, driver taken by someone else, etc.) - refresh the list so
      // the dispatcher sees the current, real availability instead of a stale one.
      if (err.response && [404, 409].includes(err.response.status)) {
        fetchAvailableDrivers();
      }
    } finally {
      setIsAssigning(false);
    }
  };

  const handleDone = () => {
    const finishedRide = result.ride;
    setResult(null);
    onAssigned(finishedRide);
  };

  // Closing (backdrop/X) after a successful assignment should behave like
  // "Done" - the assignment already happened, so the parent's list must
  // still refresh rather than silently going stale.
  const handleModalClose = () => {
    if (result) {
      handleDone();
    } else {
      onClose();
    }
  };

  return (
    <Modal open={!!ride} onClose={handleModalClose} title={result ? "Ride Offered" : "Assign Driver"}>
      {ride && !result && (
        <div className="space-y-4">
          <p className="text-sm text-rideflow-navy/60">
            {ride.pickupLocation} &rarr; {ride.dropoffLocation}
          </p>

          {isLoading && <p className="text-rideflow-navy/60 text-sm">Loading available drivers...</p>}

          {!isLoading && loadError && <p className="text-red-600 text-sm">{loadError}</p>}

          {!isLoading && !loadError && drivers.length === 0 && (
            <p className="text-rideflow-navy/60 text-sm bg-rideflow-gray/40 rounded-lg px-3 py-3">
              No drivers are available for this ride's scheduled pickup time. Add a driver or choose a different time, then try again.
            </p>
          )}

          {!isLoading && !loadError && drivers.length > 0 && (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {drivers.map((driver) => {
                const isSelected = selectedDriverId === driver._id;
                return (
                  <button
                    key={driver._id}
                    type="button"
                    onClick={() => setSelectedDriverId(driver._id)}
                    className={`w-full flex items-center gap-3 border rounded-lg px-3 py-2.5 text-left transition-colors ${
                      isSelected
                        ? "border-rideflow-orange bg-rideflow-orange/10"
                        : "border-black/5 hover:border-rideflow-orange/40 hover:bg-rideflow-orange/5"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        isSelected ? "bg-rideflow-orange text-white" : "bg-rideflow-orange/10 text-rideflow-orange"
                      }`}
                    >
                      {isSelected ? <Check size={16} /> : <User size={16} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-rideflow-navy">{driver.name}</p>
                      <p className="text-xs text-rideflow-navy/60 flex items-center gap-1">
                        <Phone size={11} /> {driver.phone}
                      </p>
                    </div>
                    <span className="text-xs text-rideflow-navy/40 shrink-0">{driver.licenseNumber}</span>
                  </button>
                );
              })}
            </div>
          )}

          {assignError && <p className="text-red-600 text-sm">{assignError}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedDriverId || isAssigning}
              className="flex-1 py-2.5 rounded-lg bg-rideflow-orange hover:bg-rideflow-orange-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-colors shadow-sm"
            >
              {isAssigning ? "Assigning..." : "Confirm Assignment"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg border border-rideflow-navy/20 text-rideflow-navy hover:bg-rideflow-gray/40 transition-colors font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
            <Check size={18} className="text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-800">
              The ride has been offered to <span className="font-semibold">{result.ride.assignedDriver?.name}</span>.
              It becomes assigned once they confirm.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-rideflow-navy/50 uppercase tracking-wide mb-1">Ride Status</p>
            <span className="inline-block px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
              Pending Confirmation
            </span>
          </div>

          {result.smsStatus === "sent" ? (
            <div className="flex items-start gap-2.5 text-sm text-rideflow-navy/70">
              <MessageSquare size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <p>The driver was texted a link to confirm or decline the ride.</p>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                {result.smsStatus === "no_consent"
                  ? "The ride is pending. This driver has not opted in to SMS notifications, so no text was sent. Please contact the driver directly."
                  : "The ride is pending, but the SMS notification could not be sent. Please contact the driver directly."}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handleDone}
            className="w-full py-2.5 rounded-lg bg-rideflow-orange hover:bg-rideflow-orange-hover text-white font-semibold transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      )}
    </Modal>
  );
};

export default AssignDriverModal;
