import React, { useState, useEffect } from "react";
import axios from "axios";
import getUserInfo from "../../utilities/decodeJwt";

const url = `${process.env.REACT_APP_BACKEND_SERVER_URI}/ride`;

const emptyForm = {
  pickupLocation: "",
  dropoffLocation: "",
  rideDate: "",
  passengerName: "",
  passengerPhone: "",
  vehicleType: "",
};

const CreateRidePage = () => {
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    setUser(getUserInfo());
  }, []);

  const handleChange = ({ currentTarget: input }) => {
    setFormData({ ...formData, [input.name]: input.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const { data: createdRide } = await axios.post(url, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      });
      setSuccessMessage(`Ride request created (id: ${createdRide._id}).`);
      setFormData(emptyForm);
    } catch (error) {
      if (error.response && error.response.data && error.response.data.message) {
        setError(error.response.data.message);
      } else {
        setError("Could not create ride request. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-spotify-black flex items-center justify-center px-4">
        <p className="text-spotify-muted text-lg">Log in as a dispatcher to create a ride request.</p>
      </div>
    );
  }

  if (user.role !== "dispatcher") {
    return (
      <div className="min-h-screen bg-spotify-black flex items-center justify-center px-4">
        <p className="text-spotify-muted text-lg">Only dispatchers can create ride requests.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-spotify-black flex items-center justify-center px-4 py-10">
      <div className="bg-spotify-card rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">New Ride Request</h2>

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

          {error && <p className="text-red-400 text-sm">{error}</p>}
          {successMessage && <p className="text-spotify-green text-sm">{successMessage}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-full bg-spotify-green hover:bg-spotify-green-hover disabled:opacity-50 text-black font-bold transition-colors shadow-sm mt-2"
          >
            {isSubmitting ? "Creating..." : "Create Ride Request"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateRidePage;
