import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, User, MapPin, Clock, Navigation } from "lucide-react";
import getUserInfo from "../../utilities/decodeJwt";
import PortalLayout from "../layout/PortalLayout";
import StatusBadge from "../ui/StatusBadge";
import TrackingMap from "../tracking/TrackingMap";
import { DISPATCHER_NAV_ITEMS } from "../../portalConfig";
import { portalPathFor } from "../../utilities/companyUrl";
import { authHeader, errorMessageFrom } from "../../utilities/api";
import { getDrivingRoute } from "../../utilities/routing";

const RIDE_URL = `${process.env.REACT_APP_BACKEND_SERVER_URI}/ride`;
const POLL_INTERVAL_MS = 12000;
const STALE_AFTER_MS = 90 * 1000;

const STATUS_STYLES = {
  requested: "bg-amber-100 text-amber-700",
  pending: "bg-orange-100 text-orange-700",
  assigned: "bg-blue-100 text-blue-700",
  "in-progress": "bg-violet-100 text-violet-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};
const STATUS_LABELS = { pending: "Pending Confirmation" };

// A failed geocode is stored as { lat: null, lng: null }, not null itself -
// same subdocument-default quirk handled in TrackingMap.
const hasValidCoordinates = (c) => !!c && Number.isFinite(c.lat) && Number.isFinite(c.lng);

const secondsAgo = (isoDate) => Math.max(0, Math.round((Date.now() - new Date(isoDate).getTime()) / 1000));

const formatAgo = (seconds) => {
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
};

const formatMiles = (meters) => `${(meters / 1609.344).toFixed(1)} mi`;
const formatMinutes = (seconds) => `${Math.max(1, Math.round(seconds / 60))} min`;

const DispatcherTrackRide = () => {
  const { rideId } = useParams();
  const [user, setUser] = useState(undefined);
  const [ride, setRide] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [, forceTick] = useState(0); // re-render every second so "Updated Xs ago" stays live
  const [route, setRoute] = useState(null);
  const [routeStatus, setRouteStatus] = useState("idle"); // "idle" | "loading" | "ready" | "unavailable"
  const pollRef = useRef(null);

  const fetchRide = useCallback(async () => {
    try {
      const { data } = await axios.get(`${RIDE_URL}/${rideId}`, { headers: authHeader() });
      setRide(data);
      setLoadError("");
    } catch (err) {
      setLoadError(errorMessageFrom(err, "Could not load this ride. Check your connection and try again."));
    } finally {
      setIsLoading(false);
    }
  }, [rideId]);

  useEffect(() => {
    setUser(getUserInfo());
    fetchRide();
  }, [fetchRide]);

  // Poll while the ride is still live (pending confirmation through
  // in-progress) - once it's completed/cancelled there's nothing left to
  // watch update, so polling stops rather than hitting the API forever.
  useEffect(() => {
    if (!ride || !["pending", "assigned", "in-progress"].includes(ride.status)) return;
    pollRef.current = setInterval(fetchRide, POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [ride, fetchRide]);

  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Pickup/drop-off coordinates are geocoded once and cached on the ride -
  // they never change while the ride exists, so this deliberately depends
  // on the coordinate VALUES, not on `ride` itself. `ride` is replaced by
  // every 12s poll response, but these primitives stay identical across
  // polls, so OSRM is only ever called once per ride (or again if the
  // cached coordinates genuinely change) - never on a driver-location-only
  // update, and never on a polling tick.
  const pickupLat = ride?.pickupCoordinates?.lat;
  const pickupLng = ride?.pickupCoordinates?.lng;
  const dropoffLat = ride?.dropoffCoordinates?.lat;
  const dropoffLng = ride?.dropoffCoordinates?.lng;

  useEffect(() => {
    let cancelled = false;
    if (!Number.isFinite(pickupLat) || !Number.isFinite(pickupLng) || !Number.isFinite(dropoffLat) || !Number.isFinite(dropoffLng)) {
      setRoute(null);
      setRouteStatus("unavailable");
      return undefined;
    }
    setRouteStatus("loading");
    getDrivingRoute({ lat: pickupLat, lng: pickupLng }, { lat: dropoffLat, lng: dropoffLng }).then((result) => {
      if (cancelled) return;
      setRoute(result);
      setRouteStatus(result ? "ready" : "unavailable");
    });
    return () => {
      cancelled = true;
    };
  }, [pickupLat, pickupLng, dropoffLat, dropoffLng]);

  if (!user) return null;

  const backHref = portalPathFor("dispatcher", user.companySlug) + "/rides";

  const driverLocation = ride?.driverLocation?.updatedAt ? ride.driverLocation : null;
  const locationAgeSeconds = driverLocation ? secondsAgo(driverLocation.updatedAt) : null;
  const isStale = locationAgeSeconds !== null && locationAgeSeconds * 1000 > STALE_AFTER_MS;

  return (
    <PortalLayout
      portalTitle="Dispatcher Portal"
      portalSubtitle="Manage rides and assign drivers"
      navItems={DISPATCHER_NAV_ITEMS}
      user={user}
    >
      <Link to={backHref} className="inline-flex items-center gap-1 text-sm text-rideflow-navy/60 hover:text-rideflow-navy mb-4">
        <ArrowLeft size={16} /> Back to Ride Requests
      </Link>

      {isLoading && <p className="text-rideflow-navy/60">Loading ride...</p>}
      {!isLoading && loadError && <p className="text-red-600 text-sm">{loadError}</p>}

      {!isLoading && !loadError && ride && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-black/5 p-5">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <h2 className="text-lg font-bold text-rideflow-navy">Ride Tracking</h2>
              <StatusBadge status={ride.status} styles={STATUS_STYLES} label={STATUS_LABELS[ride.status]} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <User size={15} className="text-rideflow-orange shrink-0 mt-0.5" />
                <div>
                  <p className="text-rideflow-navy/50 text-xs uppercase tracking-wide">Passenger</p>
                  <p className="text-rideflow-navy font-medium">{ride.passengerName}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <User size={15} className="text-rideflow-navy/40 shrink-0 mt-0.5" />
                <div>
                  <p className="text-rideflow-navy/50 text-xs uppercase tracking-wide">Driver</p>
                  <p className="text-rideflow-navy font-medium">{ride.assignedDriver?.name || "Not yet assigned"}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin size={15} className="text-rideflow-orange shrink-0 mt-0.5" />
                <div>
                  <p className="text-rideflow-navy/50 text-xs uppercase tracking-wide">Pickup</p>
                  <p className="text-rideflow-navy font-medium">{ride.pickupLocation}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin size={15} className="text-rideflow-navy/40 shrink-0 mt-0.5" />
                <div>
                  <p className="text-rideflow-navy/50 text-xs uppercase tracking-wide">Drop-off</p>
                  <p className="text-rideflow-navy font-medium">{ride.dropoffLocation}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-black/5 p-5">
            <div style={{ height: 420 }}>
              <TrackingMap
                pickup={ride.pickupCoordinates}
                dropoff={ride.dropoffCoordinates}
                driver={driverLocation}
                routeCoordinates={route?.coordinates}
              />
            </div>

            <div className="mt-4 pt-4 border-t border-black/5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-2">
                <Navigation size={15} className="text-rideflow-orange shrink-0 mt-0.5" />
                <div>
                  <p className="text-rideflow-navy/50 text-xs uppercase tracking-wide">Route</p>
                  {routeStatus === "ready" && route && (
                    <p className="text-rideflow-navy font-medium">
                      Distance: {formatMiles(route.distanceMeters)}
                      <br />
                      Estimated driving time: {formatMinutes(route.durationSeconds)}
                    </p>
                  )}
                  {routeStatus === "loading" && <p className="text-rideflow-navy/40 text-sm">Calculating route...</p>}
                  {routeStatus === "unavailable" && (
                    <p className="text-rideflow-navy/40 text-sm">Driving route unavailable.</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Clock size={15} className={`shrink-0 mt-0.5 ${isStale ? "text-amber-600" : "text-rideflow-navy/50"}`} />
                <div>
                  <p className="text-rideflow-navy/50 text-xs uppercase tracking-wide">Driver</p>
                  {!driverLocation && <p className="text-rideflow-navy/50 text-sm">Location unavailable</p>}
                  {driverLocation && !isStale && (
                    <p className="text-rideflow-navy font-medium">Updated {formatAgo(locationAgeSeconds)}</p>
                  )}
                  {driverLocation && isStale && (
                    <p className="text-amber-700 font-medium">May be out of date - last updated {formatAgo(locationAgeSeconds)}</p>
                  )}
                </div>
              </div>
            </div>

            {(!hasValidCoordinates(ride.pickupCoordinates) || !hasValidCoordinates(ride.dropoffCoordinates)) && (
              <p className="mt-3 text-xs text-rideflow-navy/40">
                Some locations on this map could not be determined from the address on file.
              </p>
            )}
          </div>
        </div>
      )}
    </PortalLayout>
  );
};

export default DispatcherTrackRide;
