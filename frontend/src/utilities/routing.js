// OSRM (Open Source Routing Machine) - public demo router, free, no API key,
// using OpenStreetMap road data (matching the Leaflet tiles and the backend's
// Nominatim geocoder). Only ever called once per ride, when pickup/dropoff
// coordinates are first known or change - never on every dispatcher/GPS poll,
// since the driving route between two fixed addresses doesn't change while
// the ride exists. Kept as its own utility, separate from the tracking
// components, so a different routing provider could be swapped in later
// without touching the tracking UI.
const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";

const isValidCoordinate = (c) =>
  !!c && Number.isFinite(c.lat) && Number.isFinite(c.lng) && c.lat >= -90 && c.lat <= 90 && c.lng >= -180 && c.lng <= 180;

// Returns { coordinates, distanceMeters, durationSeconds } on success, or
// null if either point is missing/invalid, OSRM found no route, or the
// request failed - callers must handle null (never fabricate a route).
// Same null-on-failure convention as backend/server/utilities/geocoding.js's
// geocodeAddress. coordinates is an array of [lat, lng] pairs in travel
// order, ready to hand straight to a react-leaflet <Polyline>.
export const getDrivingRoute = async (pickupCoordinates, dropoffCoordinates) => {
  if (!isValidCoordinate(pickupCoordinates) || !isValidCoordinate(dropoffCoordinates)) return null;

  const url =
    `${OSRM_URL}/${pickupCoordinates.lng},${pickupCoordinates.lat};${dropoffCoordinates.lng},${dropoffCoordinates.lat}` +
    "?overview=full&geometries=geojson";

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (data.code !== "Ok" || !Array.isArray(data.routes) || data.routes.length === 0) return null;

    const route = data.routes[0];
    const geometryCoordinates = route.geometry?.coordinates;
    if (!Array.isArray(geometryCoordinates) || geometryCoordinates.length === 0) return null;

    return {
      // OSRM/GeoJSON order is [lng, lat] - Leaflet wants [lat, lng].
      coordinates: geometryCoordinates.map(([lng, lat]) => [lat, lng]),
      distanceMeters: route.distance,
      durationSeconds: route.duration,
    };
  } catch (err) {
    return null;
  }
};
