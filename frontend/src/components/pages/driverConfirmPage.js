import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { MapPin, Calendar, Clock, User, Check, X, Navigation } from "lucide-react";
import RideFlowLogo from "../branding/RideFlowLogo";

const RIDE_URL = `${process.env.REACT_APP_BACKEND_SERVER_URI}/ride`;

const errorMessageFrom = (error, fallback) =>
  (error.response && error.response.data && error.response.data.message) || fallback;

const formatDate = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString([], { dateStyle: "medium" });
};

const formatTime = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { timeStyle: "short" });
};

// Public page reached only via the one-time SMS link (see
// backend routes/rideRoutes.js's /confirm/:token, /decline/:token) - drivers
// have no RideFlow login, so this page intentionally shows nothing beyond
// what's needed to confirm or decline this one ride. No PortalLayout, no
// nav, no dispatcher/manager data.
const DriverConfirmPage = () => {
  const { token } = useParams();

  const [ride, setRide] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isActing, setIsActing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [outcome, setOutcome] = useState(null); // "confirmed" | "declined"
  const [sessionToken, setSessionToken] = useState(null);

  const fetchRide = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const { data } = await axios.get(`${RIDE_URL}/confirm/${token}`);
      setRide(data);
    } catch (err) {
      setLoadError(errorMessageFrom(err, "This confirmation link is invalid, expired, or already used."));
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRide();
  }, [fetchRide]);

  const handleConfirm = async () => {
    setActionError("");
    setIsActing(true);
    try {
      const { data } = await axios.post(`${RIDE_URL}/confirm/${token}`);
      setSessionToken(data.sessionToken);
      setOutcome("confirmed");
    } catch (err) {
      setActionError(errorMessageFrom(err, "Could not confirm this ride. The link may have already been used."));
    } finally {
      setIsActing(false);
    }
  };

  const handleDecline = async () => {
    if (!window.confirm("Decline this ride? It will go back to the dispatcher for reassignment.")) return;

    setActionError("");
    setIsActing(true);
    try {
      await axios.post(`${RIDE_URL}/decline/${token}`);
      setOutcome("declined");
    } catch (err) {
      setActionError(errorMessageFrom(err, "Could not decline this ride. The link may have already been used."));
    } finally {
      setIsActing(false);
    }
  };

  return (
    <div className="min-h-screen bg-rideflow-gray/30 flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-8 w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <RideFlowLogo size="lg" />
        </div>

        {isLoading && <p className="text-center text-rideflow-navy/60 text-sm">Loading ride details...</p>}

        {!isLoading && loadError && !outcome && (
          <p className="text-center text-red-600 text-sm">{loadError}</p>
        )}

        {!isLoading && !loadError && ride && !outcome && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-rideflow-navy mb-1 text-center">New Ride Request</h2>
              <p className="text-sm text-rideflow-navy/50 text-center">Review the details and confirm or decline.</p>
            </div>

            <div className="space-y-3 bg-rideflow-gray/30 rounded-lg p-4">
              <div className="flex items-start gap-2.5 text-sm">
                <User size={15} className="text-rideflow-orange shrink-0 mt-0.5" />
                <span className="text-rideflow-navy"><span className="font-semibold">Passenger:</span> {ride.passengerName}</span>
              </div>
              <div className="flex items-start gap-2.5 text-sm">
                <MapPin size={15} className="text-rideflow-orange shrink-0 mt-0.5" />
                <span className="text-rideflow-navy"><span className="font-semibold">Pickup:</span> {ride.pickupLocation}</span>
              </div>
              <div className="flex items-start gap-2.5 text-sm">
                <MapPin size={15} className="text-rideflow-navy/40 shrink-0 mt-0.5" />
                <span className="text-rideflow-navy"><span className="font-semibold">Drop-off:</span> {ride.dropoffLocation}</span>
              </div>
              <div className="flex items-start gap-2.5 text-sm">
                <Calendar size={15} className="text-rideflow-orange shrink-0 mt-0.5" />
                <span className="text-rideflow-navy">{formatDate(ride.rideDate)}</span>
              </div>
              <div className="flex items-start gap-2.5 text-sm">
                <Clock size={15} className="text-rideflow-orange shrink-0 mt-0.5" />
                <span className="text-rideflow-navy">{formatTime(ride.rideDate)}</span>
              </div>
            </div>

            {actionError && <p className="text-red-600 text-sm">{actionError}</p>}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isActing}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-rideflow-orange hover:bg-rideflow-orange-hover disabled:opacity-50 text-white font-semibold text-sm shadow-sm transition-colors"
              >
                <Check size={15} /> Confirm Ride
              </button>
              <button
                type="button"
                onClick={handleDecline}
                disabled={isActing}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 font-semibold text-sm transition-colors"
              >
                <X size={15} /> Decline
              </button>
            </div>
          </div>
        )}

        {outcome === "confirmed" && (
          <div className="text-center space-y-2">
            <Check size={28} className="text-emerald-600 mx-auto" />
            <p className="text-emerald-600 font-semibold">Ride confirmed.</p>
            <p className="text-sm text-rideflow-navy/50">Thanks - the dispatcher has been notified.</p>
            {sessionToken && (
              <Link
                to={`/driver/track/${sessionToken}`}
                className="inline-flex items-center justify-center gap-1.5 mt-2 py-2.5 px-5 rounded-lg bg-rideflow-orange hover:bg-rideflow-orange-hover text-white font-semibold text-sm shadow-sm transition-colors"
              >
                <Navigation size={15} /> Open Ride Tracking
              </Link>
            )}
          </div>
        )}

        {outcome === "declined" && (
          <div className="text-center space-y-2">
            <X size={28} className="text-rideflow-navy/40 mx-auto" />
            <p className="text-rideflow-navy font-semibold">Ride declined.</p>
            <p className="text-sm text-rideflow-navy/50">The dispatcher will offer it to another driver.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverConfirmPage;
