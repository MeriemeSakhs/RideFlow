// OSRM (Open Source Routing Machine) - public demo router, free, no API
// key, using the same OpenStreetMap road data as the Leaflet tracking map
// and this backend's Nominatim geocoder (see utilities/geocoding.js). This
// is the SERVER-SIDE call used to authoritatively calculate point-to-point
// ride distance for pricing (see utilities/pricingEngine.js) - a price must
// never be derived from a distance the frontend could have supplied itself.
// The frontend has its own equivalent (frontend/src/utilities/routing.js)
// for drawing the route on the live tracking map - a different call site
// for the same external OSRM service, not a second routing system.
const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";

const isValidCoordinate = (c) =>
  !!c && Number.isFinite(c.lat) && Number.isFinite(c.lng) && c.lat >= -90 && c.lat <= 90 && c.lng >= -180 && c.lng <= 180;

// waypoints: array of { lat, lng }, in travel order - pickup, then any
// stops, then drop-off. At least 2 points. OSRM natively supports more
// than two coordinates in a single request and returns the TOTAL distance/
// duration across every leg (pickup->stop1->stop2->...->dropoff) in one
// call, so a ride with stops is priced from the real combined route rather
// than summing per-leg requests or (worse) a straight-line estimate.
//
// Returns { distanceMeters, durationSeconds } on success, or null if fewer
// than 2 valid points are given, OSRM found no route, or the request
// failed - callers must handle null (never fabricate a distance). Only
// requests the route summary (overview=false) since pricing needs the
// numbers, not the polyline geometry the tracking map draws.
const getDrivingRoute = async (waypoints) => {
  if (!Array.isArray(waypoints) || waypoints.length < 2 || !waypoints.every(isValidCoordinate)) return null;

  const coordinatesPath = waypoints.map((p) => `${p.lng},${p.lat}`).join(";");
  const url = `${OSRM_URL}/${coordinatesPath}?overview=false`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (data.code !== "Ok" || !Array.isArray(data.routes) || data.routes.length === 0) return null;

    const route = data.routes[0];
    if (!Number.isFinite(route.distance) || !Number.isFinite(route.duration)) return null;

    return { distanceMeters: route.distance, durationSeconds: route.duration };
  } catch (err) {
    return null;
  }
};

module.exports = { getDrivingRoute };
