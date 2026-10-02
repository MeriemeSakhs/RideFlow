import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import getUserInfo from "../../utilities/decodeJwt";
import PortalLayout from "../layout/PortalLayout";
import StatusBadge from "../ui/StatusBadge";
import AddressCell from "../ui/AddressCell";
import WrapCell from "../ui/WrapCell";
import Modal from "../ui/Modal";
import ConfirmDialog from "../ui/ConfirmDialog";
import RideFormFields from "../rides/RideFormFields";
import AssignDriverModal from "../drivers/AssignDriverModal";
import { DISPATCHER_NAV_ITEMS } from "../../portalConfig";
import { portalPathFor } from "../../utilities/companyUrl";
import {
  emptyRideForm,
  validateRideForm,
  toRidePayload,
  splitIsoIntoDateAndTime,
  splitEstimatedDurationMinutes,
  formatDisplayDateOnly,
  formatDisplayTime,
  getDateRangeParams,
} from "../../utilities/rideForm";
import { authHeader, errorMessageFrom } from "../../utilities/api";

const BASE_URL = `${process.env.REACT_APP_BACKEND_SERVER_URI}/ride`;
const CANCELLABLE_STATUSES = ["requested", "pending", "assigned", "in-progress"];
const STATUS_FILTERS = ["all", "requested", "pending", "assigned", "in-progress", "completed", "cancelled"];

const STATUS_STYLES = {
  requested: "bg-amber-100 text-amber-700",
  pending: "bg-orange-100 text-orange-700",
  assigned: "bg-blue-100 text-blue-700",
  "in-progress": "bg-violet-100 text-violet-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

// A ride is "pending" the instant it's offered to a driver, but the driver
// hasn't confirmed or declined yet - this label is what keeps the dispatcher
// from reading that as the driver having already accepted.
const STATUS_LABELS = {
  pending: "Pending Confirmation",
};

const DispatcherRideRequests = () => {
  const [user, setUser] = useState(undefined);
  const [rides, setRides] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState(""); // "" = no filter, else "YYYY-MM-DD"

  const [editingRide, setEditingRide] = useState(null);
  const [formData, setFormData] = useState(emptyRideForm);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [cancellingId, setCancellingId] = useState(null);
  const [actionErrors, setActionErrors] = useState({});
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [assigningRide, setAssigningRide] = useState(null);

  const fetchRides = useCallback(async () => {
    setIsLoading(true);
    setListError("");
    try {
      const params = getDateRangeParams(dateFilter);
      const { data } = await axios.get(BASE_URL, { headers: authHeader(), params });
      setRides(data);
    } catch (error) {
      setListError(errorMessageFrom(error, "Could not load ride requests. Check your connection and try again."));
    } finally {
      setIsLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    const currentUser = getUserInfo();
    setUser(currentUser);
    if (currentUser && ["dispatcher", "manager"].includes(currentUser.role)) fetchRides();
  }, [fetchRides]);

  const handleChange = ({ currentTarget: input }) => {
    setFormData((prev) => ({ ...prev, [input.name]: input.value }));
  };

  const openEdit = (ride) => {
    setEditingRide(ride);
    const { pickupDate, pickupTime } = splitIsoIntoDateAndTime(ride.rideDate);
    const { durationHours, durationMinutes } = splitEstimatedDurationMinutes(ride.estimatedDurationMinutes);
    setFormData({
      passengerName: ride.passengerName,
      passengerPhone: ride.passengerPhone,
      pickupLocation: ride.pickupLocation,
      dropoffLocation: ride.dropoffLocation,
      pickupDate,
      pickupTime,
      passengerCount: ride.passengerCount,
      vehicleType: ride.vehicleType,
      notes: ride.notes || "",
      durationHours,
      durationMinutes,
    });
    setFormError("");
  };

  const closeEdit = () => {
    setEditingRide(null);
    setFormData(emptyRideForm);
    setFormError("");
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    setFormError("");

    const validationError = validateRideForm(formData);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.put(`${BASE_URL}/${editingRide._id}`, toRidePayload(formData), { headers: authHeader() });
      closeEdit();
      await fetchRides();
    } catch (error) {
      setFormError(errorMessageFrom(error, "Could not update ride request. Please try again."));
      if (error.response && (error.response.status === 404 || error.response.status === 409)) {
        fetchRides();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clicking Cancel only opens the confirmation dialog - the ride stays
  // untouched until the dialog's own Cancel-ride button is explicitly clicked.
  const handleCancelRide = (ride) => setConfirmTarget(ride);

  const dismissCancelConfirm = () => setConfirmTarget(null);

  const confirmCancelRide = async () => {
    const ride = confirmTarget;
    setCancellingId(ride._id);
    setActionErrors((prev) => ({ ...prev, [ride._id]: "" }));

    try {
      await axios.patch(`${BASE_URL}/${ride._id}/cancel`, {}, { headers: authHeader() });
      if (editingRide && editingRide._id === ride._id) closeEdit();
      setConfirmTarget(null);
      await fetchRides();
    } catch (error) {
      const message = errorMessageFrom(error, "Could not cancel ride. Please try again.");
      setActionErrors((prev) => ({ ...prev, [ride._id]: message }));
      setConfirmTarget(null);
      if (error.response && error.response.status === 404) fetchRides();
    } finally {
      setCancellingId(null);
    }
  };

  const visibleRides = statusFilter === "all" ? rides : rides.filter((r) => r.status === statusFilter);

  return (
    <PortalLayout
      portalTitle="Dispatcher Portal"
      portalSubtitle="Manage rides and assign drivers"
      navItems={DISPATCHER_NAV_ITEMS}
      user={user}
    >
      <div className="bg-white rounded-xl border border-black/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-bold text-rideflow-navy">Ride Requests</h2>
            <div className="flex items-center gap-2">
              <label htmlFor="rideDateFilter" className="text-xs font-semibold text-rideflow-navy/50">
                Date
              </label>
              <input
                id="rideDateFilter"
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="text-sm px-3 py-1.5 rounded-md border border-rideflow-navy/20 text-rideflow-navy focus:outline-none focus:ring-2 focus:ring-rideflow-orange focus:border-rideflow-orange"
              />
              {dateFilter && (
                <button type="button" onClick={() => setDateFilter("")} className="text-xs text-rideflow-navy/50 hover:text-rideflow-navy font-semibold">
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {STATUS_FILTERS.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize transition-colors ${
                  statusFilter === status ? "bg-rideflow-orange text-white" : "bg-rideflow-gray/60 text-rideflow-navy/70 hover:bg-rideflow-gray/70"
                }`}
              >
                {STATUS_LABELS[status] || status}
              </button>
            ))}
          </div>
        </div>

        {isLoading && <p className="text-rideflow-navy/60 px-5 py-6">Loading ride requests...</p>}
        {!isLoading && listError && <p className="text-red-600 text-sm px-5 py-6">{listError}</p>}
        {!isLoading && !listError && visibleRides.length === 0 && (
          <p className="text-rideflow-navy/40 px-5 py-6">No ride requests match this filter.</p>
        )}

        {!isLoading && !listError && visibleRides.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col className="w-[123px]" />
                <col className="w-[145px]" />
                <col className="w-[145px]" />
                <col className="w-[80px]" />
                <col className="w-[85px]" />
                <col className="w-[78px]" />
                <col className="w-[182px]" />
                <col className="w-[115px]" />
                <col className="w-[160px]" />
              </colgroup>
              <thead>
                <tr className="text-left text-xs text-rideflow-navy/40 uppercase border-b border-black/5">
                  <th className="px-3 py-2 font-semibold">Passenger</th>
                  <th className="px-3 py-2 font-semibold">Pickup</th>
                  <th className="px-3 py-2 font-semibold">Drop-off</th>
                  <th className="px-3 py-2 font-semibold">Pickup Date</th>
                  <th className="px-3 py-2 font-semibold">Pickup Time</th>
                  <th className="px-3 py-2 font-semibold">Vehicle</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Driver</th>
                  <th className="px-3 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRides.map((ride) => {
                  const isFinal = !CANCELLABLE_STATUSES.includes(ride.status);
                  return (
                    <tr key={ride._id} className="border-b border-black/5 last:border-0 align-top">
                      <td className="px-3 py-3 text-rideflow-navy font-medium"><WrapCell>{ride.passengerName}</WrapCell></td>
                      <td className="px-3 py-3 text-rideflow-navy"><AddressCell>{ride.pickupLocation}</AddressCell></td>
                      <td className="px-3 py-3 text-rideflow-navy"><AddressCell>{ride.dropoffLocation}</AddressCell></td>
                      <td className="px-3 py-3 text-rideflow-navy/60 whitespace-nowrap">{formatDisplayDateOnly(ride.rideDate)}</td>
                      <td className="px-3 py-3 text-rideflow-navy/60 whitespace-nowrap">{formatDisplayTime(ride.rideDate)}</td>
                      <td className="px-3 py-3 text-rideflow-navy capitalize"><WrapCell>{ride.vehicleType}</WrapCell></td>
                      <td className="px-3 py-3"><StatusBadge status={ride.status} styles={STATUS_STYLES} label={STATUS_LABELS[ride.status]} /></td>
                      <td className="px-3 py-3 text-rideflow-navy"><WrapCell>{ride.assignedDriver?.name || "—"}</WrapCell></td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-x-2 gap-y-1">
                          {ride.status === "requested" && (
                            <button
                              type="button"
                              onClick={() => setAssigningRide(ride)}
                              className="text-rideflow-orange hover:text-rideflow-orange-hover font-semibold"
                            >
                              Assign
                            </button>
                          )}
                          {["assigned", "in-progress"].includes(ride.status) && (
                            <Link
                              to={`${portalPathFor("dispatcher", user?.companySlug)}/rides/${ride._id}/track`}
                              className="text-rideflow-orange hover:text-rideflow-orange-hover font-semibold"
                            >
                              Track Ride
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => openEdit(ride)}
                            disabled={isFinal}
                            className="text-rideflow-orange hover:text-rideflow-orange-hover font-semibold disabled:text-rideflow-navy/25 disabled:cursor-not-allowed"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelRide(ride)}
                            disabled={isFinal || cancellingId === ride._id}
                            className="text-red-600 hover:text-red-700 font-semibold disabled:text-rideflow-navy/25 disabled:cursor-not-allowed"
                          >
                            {cancellingId === ride._id ? "Cancelling..." : "Cancel"}
                          </button>
                        </div>
                        {actionErrors[ride._id] && <p className="text-red-600 text-xs mt-1">{actionErrors[ride._id]}</p>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!editingRide} onClose={closeEdit} title="Edit Ride Request">
        <form onSubmit={handleSubmitEdit} className="space-y-4">
          <RideFormFields formData={formData} onChange={handleChange} showDurationField />
          {formError && <p className="text-red-600 text-sm">{formError}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-lg bg-rideflow-orange hover:bg-rideflow-orange-hover disabled:opacity-50 text-white font-semibold transition-colors shadow-sm"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={closeEdit}
              className="px-6 py-2.5 rounded-lg border border-rideflow-navy/20 text-rideflow-navy hover:bg-rideflow-gray/40 transition-colors font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <AssignDriverModal
        ride={assigningRide}
        onClose={() => setAssigningRide(null)}
        onAssigned={() => {
          setAssigningRide(null);
          fetchRides();
        }}
      />

      <ConfirmDialog
        open={!!confirmTarget}
        title="Cancel Ride?"
        message={
          confirmTarget
            ? `Are you sure you want to cancel the ride for ${confirmTarget.passengerName}? This action cannot be undone.`
            : ""
        }
        confirmLabel="Cancel Ride"
        confirmingLabel="Cancelling..."
        cancelLabel="Keep Ride"
        isConfirming={cancellingId === confirmTarget?._id}
        onConfirm={confirmCancelRide}
        onCancel={dismissCancelConfirm}
      />
    </PortalLayout>
  );
};

export default DispatcherRideRequests;
