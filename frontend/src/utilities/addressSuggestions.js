import axios from "axios";
import { authHeader } from "./api";

const GEOCODE_URL = `${process.env.REACT_APP_BACKEND_SERVER_URI}/geocode`;

// Thin fetch wrapper for the backend's address-autocomplete proxy (see
// backend/server/routes/geocodeRoutes.js) - the actual Nominatim call, and
// its required descriptive User-Agent, lives entirely server-side.
// Debouncing is the CALLER's job (see components/rides/AddressAutocompleteInput.js) -
// this function itself just makes one request per call, with a signal so
// the caller can cancel a stale in-flight request when the user keeps typing.
export const fetchAddressSuggestions = async (query, signal) => {
  if (!query || query.trim().length < 3) return [];
  try {
    const { data } = await axios.get(`${GEOCODE_URL}/search`, { headers: authHeader(), params: { q: query }, signal });
    return Array.isArray(data) ? data : [];
  } catch (err) {
    if (axios.isCancel(err) || err.code === "ERR_CANCELED") return [];
    return [];
  }
};
