import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Leaflet's default marker image paths break under most bundlers (webpack
// resolves them to hashed URLs it can't find) - this is the standard fix,
// not a RideFlow-specific workaround.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

// Three visually distinct markers (color + label) so pickup/drop-off/driver
// are never confused with each other or with Leaflet's plain default pin.
const coloredIcon = (color, label) =>
  L.divIcon({
    className: "",
    html: `<div style="background:${color};width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
      <span style="transform:rotate(45deg);color:white;font-size:12px;font-weight:700;">${label}</span>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });

const PICKUP_ICON = coloredIcon("#f59e0b", "P");
const DROPOFF_ICON = coloredIcon("#172643", "D");
const DRIVER_ICON = coloredIcon("#16a34a", "•");

// Fixes Leaflet's well-known "blank/broken tiles" issue when the map is
// mounted inside a flex layout or a container whose size isn't known at
// first paint (e.g. a page still loading its data) - and re-fits the view
// whenever the set of available points changes (a driver location arriving
// after the map already rendered, for example).
const MapController = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(t);
  }, [map]);

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 13);
    } else {
      map.fitBounds(points, { padding: [40, 40] });
    }
  }, [map, points]);

  return null;
};

// A failed geocode is stored as { lat: null, lng: null } (the Mongoose
// subdocument's own defaults), not as null itself - so a truthy check on
// the object isn't enough. Treat anything without finite lat/lng as "no
// point", exactly like a genuinely null pickup/dropoff/driver.
const isValidPoint = (p) => !!p && Number.isFinite(p.lat) && Number.isFinite(p.lng);

// pickup/dropoff/driver: { lat, lng } | null. routeCoordinates: array of
// [lat, lng] pairs (from utilities/routing.js's getDrivingRoute) | null -
// the actual road path, never a fabricated straight line between two
// points. Nothing is rendered for a missing/invalid point or route.
const TrackingMap = ({ pickup, dropoff, driver, routeCoordinates, className = "" }) => {
  const validPickup = isValidPoint(pickup) ? pickup : null;
  const validDropoff = isValidPoint(dropoff) ? dropoff : null;
  const validDriver = isValidPoint(driver) ? driver : null;
  const validRoute = Array.isArray(routeCoordinates) && routeCoordinates.length > 0 ? routeCoordinates : null;
  const points = [validPickup, validDropoff, validDriver].filter(Boolean).map((p) => [p.lat, p.lng]);
  // The route geometry already spans pickup -> dropoff, but is included
  // explicitly so the fitted view always covers the full road path, not
  // just the marker positions (relevant on routes that bow out from a
  // straight line between the two points).
  const boundsPoints = validRoute ? [...points, ...validRoute] : points;
  const initialCenter = points[0] || [20, 0];
  const mapRef = useRef(null);

  return (
    <div className={`rounded-xl overflow-hidden border border-black/5 ${className}`} style={{ height: "100%", minHeight: 320 }}>
      <MapContainer
        center={initialCenter}
        zoom={points.length ? 13 : 2}
        style={{ height: "100%", width: "100%" }}
        ref={mapRef}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController points={boundsPoints} />

        {validRoute && (
          <Polyline positions={validRoute} pathOptions={{ color: "#2563eb", weight: 4, opacity: 0.75 }} />
        )}

        {validPickup && (
          <Marker position={[validPickup.lat, validPickup.lng]} icon={PICKUP_ICON}>
            <Popup>Pickup</Popup>
          </Marker>
        )}
        {validDropoff && (
          <Marker position={[validDropoff.lat, validDropoff.lng]} icon={DROPOFF_ICON}>
            <Popup>Drop-off</Popup>
          </Marker>
        )}
        {validDriver && (
          <Marker position={[validDriver.lat, validDriver.lng]} icon={DRIVER_ICON}>
            <Popup>Driver's current location</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default TrackingMap;
