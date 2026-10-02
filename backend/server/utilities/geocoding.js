// OpenStreetMap Nominatim - free, no API key required. Its usage policy
// requires a descriptive User-Agent and asks callers not to hammer it; this
// is only ever called once per ride (at confirm time, cached on the ride
// document afterward), never on every map load.
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

// Returns { lat, lng } or null if the address couldn't be resolved - never
// fabricates a position. Callers must handle null.
const geocodeAddress = async (address) => {
  if (!address || !address.trim()) return null;

  try {
    const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(address)}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "RideFlow/1.0 (ride dispatch capstone project)" },
    });
    if (!response.ok) return null;

    const results = await response.json();
    if (!Array.isArray(results) || results.length === 0) return null;

    const lat = Number(results[0].lat);
    const lng = Number(results[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return { lat, lng };
  } catch (err) {
    return null;
  }
};

// Up to 5 { label, lat, lng } suggestions for an in-progress address query
// (autocomplete) - a different use case from geocodeAddress's single
// best-match lookup (used once, at ride-confirm time, and cached). The
// caller (routes/geocodeRoutes.js) is responsible for not calling this on
// every keystroke - the frontend debounces (see
// frontend/src/utilities/addressSuggestions.js) so this only ever fires
// after the user pauses typing, respecting Nominatim's usage policy.
const SEARCH_RESULT_LIMIT = 5;

const searchAddressSuggestions = async (query) => {
  if (!query || !query.trim() || query.trim().length < 3) return [];

  try {
    const url = `${NOMINATIM_URL}?format=json&limit=${SEARCH_RESULT_LIMIT}&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "RideFlow/1.0 (ride dispatch capstone project)" },
    });
    if (!response.ok) return [];

    const results = await response.json();
    if (!Array.isArray(results)) return [];

    return results
      .map((r) => ({ label: r.display_name, lat: Number(r.lat), lng: Number(r.lon) }))
      .filter((r) => r.label && Number.isFinite(r.lat) && Number.isFinite(r.lng));
  } catch (err) {
    return [];
  }
};

module.exports = { geocodeAddress, searchAddressSuggestions };
