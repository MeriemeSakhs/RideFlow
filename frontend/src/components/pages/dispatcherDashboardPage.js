import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import getUserInfo from "../../utilities/decodeJwt";

const BASE_URL = `${process.env.REACT_APP_BACKEND_SERVER_URI}/ride`;
const PHONE_REGEX = /^\+[1-9]\d{6,14}$/;
// Rides in these statuses can still be edited/cancelled; completed/cancelled are final.
const CANCELLABLE_STATUSES = ["requested", "assigned", "in-progress"];

const STATUS_STYLES = {
  requested: "bg-yellow-500/20 text-yellow-300",
  assigned: "bg-blue-500/20 text-blue-300",
  "in-progress": "bg-purple-500/20 text-purple-300",
  completed: "bg-spotify-green/20 text-spotify-green",
  cancelled: "bg-red-500/20 text-red-400",
};

const emptyForm = {
  pickupLocation: "",
  dropoffLocation: "",
  rideDate: "",
  passengerName: "",
  passengerPhone: "",
  vehicleType: "",
};

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
});

// datetime-local inputs need "YYYY-MM-DDTHH:mm" in local time, not the ISO string the API returns.
const toDatetimeLocalValue = (isoString) => {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatDisplayDate = (isoString) => {
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
};

// Mirrors the backend's rules so obvious mistakes get caught before a round trip;
// the backend (models/rideValidator.js) remains the source of truth.
const validateForm = (formData) => {
  if (!formData.pickupLocation.trim()) return "Pickup location is required";
  if (!formData.dropoffLocation.trim()) return "Dropoff location is required";
  if (formData.pickupLocation.trim().toLowerCase() === formData.dropoffLocation.trim().toLowerCase()) {
    return "Pickup and dropoff locations cannot be the same";
  }
  if (!formData.rideDate) return "Ride date is required";
  if (new Date(formData.rideDate).getTime() < Date.now()) return "Ride date cannot be in the past";
  if (!formData.passengerName.trim()) return "Passenger name is required";
  if (!PHONE_REGEX.test(formData.passengerPhone.trim())) {
    return "Phone number must be in E.164 format, e.g. +15551234567";
  }
  if (!formData.vehicleType) return "Vehicle type is required";
  return "";
};

const errorMessageFrom = (error, fallback) =>
  (error.response && error.response.data && error.response.data.message) || fallback;

const DispatcherDashboard = () => {
  const [user, setUser] = useState(undefined);

  const [rides, setRides] = useState([]);
  const [isLoadingRides, setIsLoadingRides] = useState(true);
  const [listError, setListError] = useState("");

  const [formData, setFormData] = useState(emptyForm);
  const [editingRideId, setEditingRideId] = useState(null);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [cancellingId, setCancellingId] = useState(null);
  const [actionErrors, setActionErrors] = useState({});

  const fetchRides = useCallback(async () => {
    setIsLoadingRides(true);
    setListError("");
    try {
      const { data } = await axios.get(BASE_URL, { headers: authHeader() });
      setRides(data);
    } catch (error) {
      setListError(errorMessageFrom(error, "Could not load ride requests. Check your connection and try again."));
    } finally {
      setIsLoadingRides(false);
    }
  }, []);

  useEffect(() => {
    const currentUser = getUserInfo();
    setUser(currentUser);
    if (currentUser && currentUser.role === "dispatcher") {
      fetchRides();
    }
  }, [fetchRides]);

  const handleChange = ({ currentTarget: input }) => {
    setFormData((prev) => ({ ...prev, [input.name]: input.value }));
  };

  const startEdit = (ride) => {
    setEditingRideId(ride._id);
    setFormData({
      pickupLocation: ride.pickupLocation,
      dropoffLocation: ride.dropoffLocation,
      rideDate: toDatetimeLocalValue(ride.rideDate),
      passengerName: ride.passengerName,
      passengerPhone: ride.passengerPhone,
      vehicleType: ride.vehicleType,
    });
    setFormError("");
    setFormSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingRideId(null);
    setFormData(emptyForm);
    setFormError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    const validationError = validateForm(formData);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingRideId) {
        await axios.put(`${BASE_URL}/${editingRideId}`, formData, { headers: authHeader() });
        setFormSuccess("Ride request updated.");
      } else {
        await axios.post(BASE_URL, formData, { headers: authHeader() });
        setFormSuccess("Ride request created.");
      }
      setFormData(emptyForm);
      setEditingRideId(null);
      await fetchRides();
    } catch (error) {
      setFormError(errorMessageFrom(error, "Could not save ride request. Please try again."));
      // The ride may have been cancelled/removed by someone else since the page loaded - resync.
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
      if (editingRideId === ride._id) cancelEdit();
      await fetchRides();
    } catch (error) {
      const message = errorMessageFrom(error, "Could not cancel ride. Please try again.");
      setActionErrors((prev) => ({ ...prev, [ride._id]: message }));
      if (error.response && error.response.status === 404) {
        fetchRides();
      }
    } finally {
      setCancellingId(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-spotify-black flex items-center justify-center px-4">
        <p className="text-spotify-muted text-lg">Log in as a dispatcher to manage ride requests.</p>
      </div>
    );
  }

  if (user.role !== "dispatcher") {
    return (
      <div className="min-h-screen bg-spotify-black flex items-center justify-center px-4">
        <p className="text-spotify-muted text-lg">Only dispatchers can manage ride requests.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-spotify-black px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-white">RideFlow Dispatcher Dashboard</h1>

        <div className="bg-spotify-card rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-bold text-white mb-6">
            {editingRideId ? "Edit Ride Request" : "New Ride Request"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-spotify-muted mb-1">Pickup Location</label>
              <input
                type="text"
                name="pickupLocation"
                placeholder="Enter pickup address"
                value={formData.pickupLocation}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-md bg-spotify-hover border border-spotify-hover text-white placeholder-spotify-muted focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-spotify-muted mb-1">Dropoff Location</label>
              <input
                type="text"
                name="dropoffLocation"
                placeholder="Enter dropoff address"
                value={formData.dropoffLocation}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-md bg-spotify-hover border border-spotify-hover text-white placeholder-spotify-muted focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-spotify-muted mb-1">Ride Date &amp; Time</label>
              <input
                type="datetime-local"
                name="rideDate"
                value={formData.rideDate}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-md bg-spotify-hover border border-spotify-hover text-white placeholder-spotify-muted focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-spotify-muted mb-1">Passenger Name</label>
              <input
                type="text"
                name="passengerName"
                placeholder="Enter passenger name"
                value={formData.passengerName}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-md bg-spotify-hover border border-spotify-hover text-white placeholder-spotify-muted focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-spotify-muted mb-1">Passenger Phone</label>
              <input
                type="tel"
                name="passengerPhone"
                placeholder="e.g. +15551234567"
                value={formData.passengerPhone}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-md bg-spotify-hover border border-spotify-hover text-white placeholder-spotify-muted focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-spotify-muted mb-1">Vehicle Type</label>
              <select
                name="vehicleType"
                value={formData.vehicleType}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-md bg-spotify-hover border border-spotify-hover text-white focus:outline-none focus:border-white"
              >
                <option value="">Select a vehicle type</option>
                <option value="sedan">Sedan</option>
                <option value="suv">SUV</option>
                <option value="van">Van</option>
                <option value="luxury">Luxury</option>
              </select>
            </div>

            {formError && <p className="text-red-400 text-sm">{formError}</p>}
            {formSuccess && <p className="text-spotify-green text-sm">{formSuccess}</p>}

            <div className="flex gap-3 mt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-full bg-spotify-green hover:bg-spotify-green-hover disabled:opacity-50 text-black font-bold transition-colors shadow-sm"
              >
                {isSubmitting ? "Saving..." : editingRideId ? "Save Changes" : "Create Ride Request"}
              </button>
              {editingRideId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-6 py-3 rounded-full border border-spotify-muted text-white hover:border-white transition-colors font-semibold"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="bg-spotify-card rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Ride Requests</h2>
            <button
              type="button"
              onClick={fetchRides}
              className="text-sm text-spotify-muted hover:text-white transition-colors"
            >
              Refresh
            </button>
          </div>

          {isLoadingRides && <p className="text-spotify-muted">Loading ride requests...</p>}
          {!isLoadingRides && listError && <p className="text-red-400 text-sm">{listError}</p>}
          {!isLoadingRides && !listError && rides.length === 0 && (
            <p className="text-spotify-muted">No ride requests yet. Create one above.</p>
          )}

          {!isLoadingRides && !listError && rides.length > 0 && (
            <div className="space-y-3">
              {rides.map((ride) => {
                const isFinal = !CANCELLABLE_STATUSES.includes(ride.status);
                return (
                  <div key={ride._id} className="border border-spotify-hover rounded-xl p-4">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <p className="text-white font-semibold">{ride.passengerName}</p>
                        <p className="text-spotify-muted text-sm">
                          {ride.pickupLocation} &rarr; {ride.dropoffLocation}
                        </p>
                        <p className="text-spotify-muted text-sm">
                          {formatDisplayDate(ride.rideDate)} &middot; {ride.vehicleType}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${STATUS_STYLES[ride.status] || "bg-spotify-hover text-spotify-muted"}`}
                      >
                        {ride.status}
                      </span>
                    </div>

                    {actionErrors[ride._id] && (
                      <p className="text-red-400 text-xs mt-2">{actionErrors[ride._id]}</p>
                    )}

                    <div className="flex gap-4 mt-3">
                      <button
                        type="button"
                        onClick={() => startEdit(ride)}
                        disabled={isFinal}
                        className="text-sm font-semibold text-spotify-green hover:text-spotify-green-hover disabled:text-spotify-muted disabled:cursor-not-allowed transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancelRide(ride)}
                        disabled={isFinal || cancellingId === ride._id}
                        className="text-sm font-semibold text-red-400 hover:text-red-300 disabled:text-spotify-muted disabled:cursor-not-allowed transition-colors"
                      >
                        {cancellingId === ride._id ? "Cancelling..." : "Cancel Ride"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DispatcherDashboard;
