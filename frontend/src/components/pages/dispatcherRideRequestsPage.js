import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import getUserInfo from "../../utilities/decodeJwt";
import PortalLayout from "../layout/PortalLayout";
import StatusBadge from "../ui/StatusBadge";
import Modal from "../ui/Modal";
import RideFormFields from "../rides/RideFormFields";
import { DISPATCHER_NAV_ITEMS } from "../../portalConfig";
import {
  emptyRideForm,
  validateRideForm,
  toRidePayload,
  splitIsoIntoDateAndTime,
  formatDisplayDate,
} from "../../utilities/rideForm";
import { authHeader, errorMessageFrom } from "../../utilities/api";

const BASE_URL = `${process.env.REACT_APP_BACKEND_SERVER_URI}/ride`;
const CANCELLABLE_STATUSES = ["requested", "assigned", "in-progress"];
const STATUS_FILTERS = ["all", "requested", "assigned", "in-progress", "completed", "cancelled"];

const STATUS_STYLES = {
  requested: "bg-amber-100 text-amber-700",
  assigned: "bg-blue-100 text-blue-700",
  "in-progress": "bg-violet-100 text-violet-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

const DispatcherRideRequests = () => {
  const [user, setUser] = useState(undefined);
  const [rides, setRides] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [editingRide, setEditingRide] = useState(null);
  const [formData, setFormData] = useState(emptyRideForm);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [cancellingId, setCancellingId] = useState(null);
  const [actionErrors, setActionErrors] = useState({});

  const fetchRides = useCallback(async () => {
    setIsLoading(true);
    setListError("");
    try {
      const { data } = await axios.get(BASE_URL, { headers: authHeader() });
      setRides(data);
    } catch (error) {
      setListError(errorMessageFrom(error, "Could not load ride requests. Check your connection and try again."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const currentUser = getUserInfo();
    setUser(currentUser);
    if (currentUser && currentUser.role === "dispatcher") fetchRides();
  }, [fetchRides]);

  const handleChange = ({ currentTarget: input }) => {
    setFormData((prev) => ({ ...prev, [input.name]: input.value }));
  };

  const openEdit = (ride) => {
    setEditingRide(ride);
    const { pickupDate, pickupTime } = splitIsoIntoDateAndTime(ride.rideDate);
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

  const handleCancelRide = async (ride) => {
    if (!window.confirm(`Cancel the ride for ${ride.passengerName}?`)) return;

    setCancellingId(ride._id);
    setActionErrors((prev) => ({ ...prev, [ride._id]: "" }));

    try {
      await axios.patch(`${BASE_URL}/${ride._id}/cancel`, {}, { headers: authHeader() });
      if (editingRide && editingRide._id === ride._id) closeEdit();
      await fetchRides();
    } catch (error) {
      const message = errorMessageFrom(error, "Could not cancel ride. Please try again.");
      setActionErrors((prev) => ({ ...prev, [ride._id]: message }));
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
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-lg font-bold text-slate-900">Ride Requests</h2>
          <div className="flex items-center gap-2 flex-wrap">
            {STATUS_FILTERS.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize transition-colors ${
                  statusFilter === status ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {isLoading && <p className="text-slate-500 px-5 py-6">Loading ride requests...</p>}
        {!isLoading && listError && <p className="text-red-600 text-sm px-5 py-6">{listError}</p>}
        {!isLoading && !listError && visibleRides.length === 0 && (
          <p className="text-slate-400 px-5 py-6">No ride requests match this filter.</p>
        )}

        {!isLoading && !listError && visibleRides.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 uppercase border-b border-slate-100">
                  <th className="px-5 py-2 font-semibold">Passenger</th>
                  <th className="px-5 py-2 font-semibold">Pickup</th>
                  <th className="px-5 py-2 font-semibold">Drop-off</th>
                  <th className="px-5 py-2 font-semibold">Pickup Time</th>
                  <th className="px-5 py-2 font-semibold">Vehicle</th>
                  <th className="px-5 py-2 font-semibold">Status</th>
                  <th className="px-5 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRides.map((ride) => {
                  const isFinal = !CANCELLABLE_STATUSES.includes(ride.status);
                  return (
                    <tr key={ride._id} className="border-b border-slate-50 last:border-0 align-top">
                      <td className="px-5 py-3 text-slate-900 font-medium">{ride.passengerName}</td>
                      <td className="px-5 py-3 text-slate-700">{ride.pickupLocation}</td>
                      <td className="px-5 py-3 text-slate-700">{ride.dropoffLocation}</td>
                      <td className="px-5 py-3 text-slate-500">{formatDisplayDate(ride.rideDate)}</td>
                      <td className="px-5 py-3 text-slate-700 capitalize">{ride.vehicleType}</td>
                      <td className="px-5 py-3"><StatusBadge status={ride.status} styles={STATUS_STYLES} /></td>
                      <td className="px-5 py-3">
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => openEdit(ride)}
                            disabled={isFinal}
                            className="text-indigo-600 hover:text-indigo-700 font-semibold disabled:text-slate-300 disabled:cursor-not-allowed"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelRide(ride)}
                            disabled={isFinal || cancellingId === ride._id}
                            className="text-red-600 hover:text-red-700 font-semibold disabled:text-slate-300 disabled:cursor-not-allowed"
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
          <RideFormFields formData={formData} onChange={handleChange} />
          {formError && <p className="text-red-600 text-sm">{formError}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold transition-colors shadow-sm"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={closeEdit}
              className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </PortalLayout>
  );
};

export default DispatcherRideRequests;
