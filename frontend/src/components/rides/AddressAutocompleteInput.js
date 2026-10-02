import React, { useState, useEffect, useRef } from "react";
import { MapPin } from "lucide-react";
import { fetchAddressSuggestions } from "../../utilities/addressSuggestions";

const DEBOUNCE_MS = 400;

const inputClass =
  "w-full px-4 py-2 rounded-md border border-rideflow-navy/20 text-rideflow-navy placeholder-rideflow-navy/35 focus:outline-none focus:ring-2 focus:ring-rideflow-orange focus:border-rideflow-orange";

// Reusable address input with debounced autocomplete suggestions - used for
// pickup, every stop, and drop-off on the Create Ride page (and reusable
// as-is by any future reservation flow), so there's exactly one place that
// implements "type an address -> see suggestions -> pick one -> coordinates
// are stored" rather than three near-identical copies.
//
// value: { address, lat, lng } - lat/lng are null until a suggestion is
// actually selected, which is what lets the form tell "the dispatcher typed
// something" apart from "a real, geocoded address was chosen" (see
// dispatcherCreateRidePage.js's validation).
// onChange: (nextValue) => void
const AddressAutocompleteInput = ({ value, onChange, placeholder, name }) => {
  const [query, setQuery] = useState(value?.address || "");
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);
  const containerRef = useRef(null);

  // Keep the displayed text in sync if the parent resets/changes the value
  // programmatically (e.g. clearing the form, removing a stop).
  useEffect(() => {
    setQuery(value?.address || "");
  }, [value?.address]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const nextQuery = e.target.value;
    setQuery(nextQuery);
    // Typing invalidates any previously-selected coordinates - the form
    // must never treat free-text as a valid address until a suggestion is
    // actually picked again.
    onChange({ address: nextQuery, lat: null, lng: null });

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    if (nextQuery.trim().length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);
      const results = await fetchAddressSuggestions(nextQuery, controller.signal);
      setIsLoading(false);
      setSuggestions(results);
      setIsOpen(true);
    }, DEBOUNCE_MS);
  };

  const handleSelect = (suggestion) => {
    setQuery(suggestion.label);
    onChange({ address: suggestion.label, lat: suggestion.lat, lng: suggestion.lng });
    setSuggestions([]);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <input
        type="text"
        name={name}
        placeholder={placeholder}
        value={query}
        onChange={handleInputChange}
        onFocus={() => suggestions.length > 0 && setIsOpen(true)}
        autoComplete="off"
        className={inputClass}
      />
      {isOpen && (suggestions.length > 0 || isLoading) && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-black/10 rounded-md shadow-lg max-h-56 overflow-y-auto">
          {isLoading && <p className="px-4 py-2 text-sm text-rideflow-navy/40">Searching...</p>}
          {!isLoading &&
            suggestions.map((s, i) => (
              <button
                key={`${s.lat}-${s.lng}-${i}`}
                type="button"
                onClick={() => handleSelect(s)}
                className="w-full text-left px-4 py-2 text-sm text-rideflow-navy hover:bg-rideflow-gray/40 flex items-start gap-2 border-b border-black/5 last:border-0"
              >
                <MapPin size={14} className="text-rideflow-orange shrink-0 mt-0.5" />
                <span>{s.label}</span>
              </button>
            ))}
          {!isLoading && suggestions.length === 0 && (
            <p className="px-4 py-2 text-sm text-rideflow-navy/40">No matching addresses found</p>
          )}
        </div>
      )}
    </div>
  );
};

export default AddressAutocompleteInput;
