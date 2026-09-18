import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import getUserInfo from "../../utilities/decodeJwt";
import PortalLayout from "../layout/PortalLayout";
import { DISPATCHER_NAV_ITEMS } from "../../portalConfig";
import RideFormFields from "../rides/RideFormFields";
import { emptyRideForm, validateRideForm, toRidePayload, estimateFare } from "../../utilities/rideForm";
import { authHeader, errorMessageFrom } from "../../utilities/api";

const BASE_URL = `${process.env.REACT_APP_BACKEND_SERVER_URI}/ride`;

const DispatcherCreateRide = () => {
  const [user, setUser] = useState(undefined);
  const [formData, setFormData] = useState(emptyRideForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [estimatedFare, setEstimatedFare] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setUser(getUserInfo());
  }, []);

  const handleChange = ({ currentTarget: input }) => {
    setFormData((prev) => ({ ...prev, [input.name]: input.value }));
    setEstimatedFare(null);
  };

  const handleCalculateRate = () => {
    if (!formData.vehicleType) {
      setError("Select a vehicle type before calculating a rate");
      return;
    }
    setError("");
    setEstimatedFare(estimateFare(formData.vehicleType));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const validationError = validateRideForm(formData);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post(BASE_URL, toRidePayload(formData), { headers: authHeader() });
      navigate("/dispatcher");
    } catch (error) {
      setError(errorMessageFrom(error, "Could not create ride request. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PortalLayout
      portalTitle="Dispatcher Portal"
      portalSubtitle="Manage rides and assign drivers"
      navItems={DISPATCHER_NAV_ITEMS}
      user={user}
    >
      <Link to="/dispatcher" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-2xl">
        <h2 className="text-lg font-bold text-slate-900">Create New Ride Request</h2>
        <p className="text-sm text-slate-500 mb-6">Fill in the details below to create a new ride request</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <RideFormFields formData={formData} onChange={handleChange} />

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">Estimated Fare</p>
              <p className="text-xs text-slate-500">
                {estimatedFare === null
                  ? 'Click "Calculate Rate" to estimate the fare'
                  : "Placeholder estimate - real pricing/distance lands with the pricing engine"}
              </p>
              {estimatedFare !== null && <p className="text-xl font-bold text-slate-900 mt-1">${estimatedFare.toFixed(2)}</p>}
            </div>
            <button
              type="button"
              onClick={handleCalculateRate}
              className="px-4 py-2 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 font-semibold text-sm transition-colors"
            >
              Calculate Rate
            </button>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold transition-colors shadow-sm"
            >
              {isSubmitting ? "Saving..." : "Save Ride Request"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/dispatcher")}
              className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </PortalLayout>
  );
};

export default DispatcherCreateRide;
