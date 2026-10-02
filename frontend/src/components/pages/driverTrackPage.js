import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { MapPin, User, Play, CheckCircle2, AlertTriangle } from "lucide-react";
import RideFlowLogo from "../branding/RideFlowLogo";
import TrackingMap from "../tracking/TrackingMap";
import { errorMessageFrom } from "../../utilities/api";

const RIDE_URL = `${process.env.REACT_APP_BACKEND_SERVER_URI}/ride`;
const POLL_INTERVAL_MS = 15000;
const LOCATION_INTERVAL_MS = 15000;

const LIVE_STATUSES = ["assigned", "in-progress"];

// Public page reached only via the session token minted at confirm time (see
// backend routes/rideRoutes.js's POST /confirm/:token and the driverConfirmPage
// link to it) - drivers have no RideFlow login, so like driverConfirmPage this
// shows nothing beyond what's needed for this one ride. No PortalLayout, no nav.
const DriverTrackPage = () => {
  const { sessionToken } = useParams();

  const [ride, setRide] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isActing, setIsActing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [geoStatus, setGeoStatus] = useState(""); // "", "sharing", "denied", "unsupported", "error"

  const fetchRide = useCallback(async () => {
    try {
      const { data } = await axios.get(`${RIDE_URL}/session/${sessionToken}`);
      setRide(data);
      setLoadError("");
    } catch (err) {
      setLoadError(errorMessageFrom(err, "This tracking link is invalid or has expired."));
    } finally {
      setIsLoading(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    fetchRide();
  }, [fetchRide]);

  // Keep the page in sync if the dispatcher cancels/completes the ride from
  // their side while this tab is still open.
  useEffect(() => {
    if (!ride || !LIVE_STATUSES.includes(ride.status)) return;
    const t = setInterval(fetchRide, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [ride, fetchRide]);

  const handleStart = async () => {
    setActionError("");
    setIsActing(true);
    try {
      await axios.post(`${RIDE_URL}/${ride._id}/start/${sessionToken}`);
      await fetchRide();
    } catch (err) {
      setActionError(errorMessageFrom(err, "Could not start this ride. The link may have expired."));
    } finally {
      setIsActing(false);
    }
  };

  const handleFinish = async () => {
    if (!window.confirm("Complete this ride?")) return;
    setActionError("");
    setIsActing(true);
    try {
      await axios.post(`${RIDE_URL}/${ride._id}/finish/${sessionToken}`);
      await fetchRide();
    } catch (err) {
      setActionError(errorMessageFrom(err, "Could not complete this ride. The link may have expired."));
    } finally {
      setIsActing(false);
    }
  };

  // Shares location only while the ride is actually in-progress, and stops
  // immediately (clearInterval in the cleanup) the moment it isn't - a
  // completed/cancelled ride must never keep receiving position updates.
  const rideStatus = ride?.status;
  const rideId = ride?._id;

  useEffect(() => {
    if (rideStatus !== "in-progress" || !rideId) return undefined;

    if (!("geolocation" in navigator)) {
      setGeoStatus("unsupported");
      return undefined;
    }

    const sendLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGeoStatus("sharing");
          axios
            .post(`${RIDE_URL}/${rideId}/location/${sessionToken}`, {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            })
            .catch(() => {});
        },
        (err) => {
          setGeoStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    };

    sendLocation();
    const interval = setInterval(sendLocation, LOCATION_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [rideStatus, rideId, sessionToken]);

  const renderGeoNotice = () => {
    if (geoStatus === "sharing") return <p className="text-xs text-emerald-600">Sharing your location with the dispatcher.</p>;
    if (geoStatus === "denied")
      return (
        <p className="text-xs text-amber-700 flex items-start gap-1">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" /> Location permission was denied - the dispatcher won't see your
          position. Enable location access in your browser to share it.
        </p>
      );
    if (geoStatus === "unsupported")
      return (
        <p className="text-xs text-amber-700 flex items-start gap-1">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" /> This browser doesn't support location sharing.
        </p>
      );
    if (geoStatus === "error")
      return (
        <p className="text-xs text-amber-700 flex items-start gap-1">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" /> Couldn't get your location right now - it will keep retrying.
        </p>
      );
    return null;
  };

  return (
    <div className="min-h-screen bg-rideflow-gray/30 flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-8 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <RideFlowLogo size="lg" />
        </div>

        {isLoading && <p className="text-center text-rideflow-navy/60 text-sm">Loading ride details...</p>}
        {!isLoading && loadError && <p className="text-center text-red-600 text-sm">{loadError}</p>}

        {!isLoading && !loadError && ride && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-rideflow-navy mb-1 text-center">Your Ride</h2>
              <p className="text-sm text-rideflow-navy/50 text-center capitalize">{ride.status.replace("-", " ")}</p>
            </div>

            <div className="space-y-3 bg-rideflow-gray/30 rounded-lg p-4">
              <div className="flex items-start gap-2.5 text-sm">
                <User size={15} className="text-rideflow-orange shrink-0 mt-0.5" />
                <span className="text-rideflow-navy">
                  <span className="font-semibold">Passenger:</span> {ride.passengerName}
                </span>
              </div>
              <div className="flex items-start gap-2.5 text-sm">
                <MapPin size={15} className="text-rideflow-orange shrink-0 mt-0.5" />
                <span className="text-rideflow-navy">
                  <span className="font-semibold">Pickup:</span> {ride.pickupLocation}
                </span>
              </div>
              <div className="flex items-start gap-2.5 text-sm">
                <MapPin size={15} className="text-rideflow-navy/40 shrink-0 mt-0.5" />
                <span className="text-rideflow-navy">
                  <span className="font-semibold">Drop-off:</span> {ride.dropoffLocation}
                </span>
              </div>
            </div>

            {(ride.status === "assigned" || ride.status === "in-progress") && (
              <div style={{ height: 260 }}>
                <TrackingMap
                  pickup={ride.pickupCoordinates}
                  dropoff={ride.dropoffCoordinates}
                  driver={ride.status === "in-progress" ? ride.driverLocation : null}
                />
              </div>
            )}

            {actionError && <p className="text-red-600 text-sm">{actionError}</p>}

            {ride.status === "assigned" && (
              <button
                type="button"
                onClick={handleStart}
                disabled={isActing}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-rideflow-orange hover:bg-rideflow-orange-hover disabled:opacity-50 text-white font-semibold text-sm shadow-sm transition-colors"
              >
                <Play size={15} /> Start Ride
              </button>
            )}

            {ride.status === "in-progress" && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={isActing}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-rideflow-orange hover:bg-rideflow-orange-hover disabled:opacity-50 text-white font-semibold text-sm shadow-sm transition-colors"
                >
                  <CheckCircle2 size={15} /> Complete Ride
                </button>
                {renderGeoNotice()}
              </div>
            )}

            {ride.status === "completed" && (
              <div className="text-center space-y-1">
                <CheckCircle2 size={28} className="text-emerald-600 mx-auto" />
                <p className="text-emerald-600 font-semibold">Ride completed.</p>
              </div>
            )}

            {ride.status === "cancelled" && (
              <div className="text-center space-y-1">
                <AlertTriangle size={28} className="text-rideflow-navy/40 mx-auto" />
                <p className="text-rideflow-navy font-semibold">This ride was cancelled.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverTrackPage;
