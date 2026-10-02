import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Plus, X } from "lucide-react";
import getUserInfo from "../../utilities/decodeJwt";
import PortalLayout from "../layout/PortalLayout";
import { DISPATCHER_NAV_ITEMS } from "../../portalConfig";
import AddressAutocompleteInput from "../rides/AddressAutocompleteInput";
import { combineDateAndTime, toEstimatedDurationMinutes, PHONE_REGEX } from "../../utilities/rideForm";
import { authHeader, errorMessageFrom } from "../../utilities/api";
import { portalPathFor } from "../../utilities/companyUrl";

const RIDE_URL = `${process.env.REACT_APP_BACKEND_SERVER_URI}/ride`;
const VEHICLE_URL = `${process.env.REACT_APP_BACKEND_SERVER_URI}/vehicle`;
const PRICING_URL = `${process.env.REACT_APP_BACKEND_SERVER_URI}/pricing`;
const PRICE_DEBOUNCE_MS = 500;

const inputClass =
  "w-full px-4 py-2 rounded-md border border-rideflow-navy/20 text-rideflow-navy placeholder-rideflow-navy/35 focus:outline-none focus:ring-2 focus:ring-rideflow-orange focus:border-rideflow-orange";

const emptyAddress = { address: "", lat: null, lng: null };
const emptyForm = {
  passengerName: "",
  passengerPhone: "",
  vehicleId: "",
  pricingType: "point-to-point",
  pickup: emptyAddress,
  dropoff: emptyAddress,
  stops: [],
  pickupDate: "",
  pickupTime: "",
  passengerCount: 1,
  notes: "",
  durationHours: "",
  durationMinutes: "",
};

const vehicleLabel = (v) => `${v.year ? `${v.year} ` : ""}${v.make} ${v.model} — ${v.vehicleType}`;

const hasCoordinates = (p) => p.lat !== null && p.lng !== null;

const formatDuration = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  if (minutes > 0 || hours === 0) parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);
  return parts.join(" ");
};

const DispatcherCreateRide = () => {
  const [user, setUser] = useState(undefined);
  const [vehicles, setVehicles] = useState([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);

  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [pricePreview, setPricePreview] = useState(null);
  const [priceError, setPriceError] = useState("");
  const [isCalculatingPrice, setIsCalculatingPrice] = useState(false);

  const navigate = useNavigate();

  const fetchVehicles = useCallback(async () => {
    setIsLoadingVehicles(true);
    try {
      const { data } = await axios.get(VEHICLE_URL, { headers: authHeader() });
      setVehicles(data);
    } catch (err) {
      // Non-fatal for the page - the vehicle dropdown just shows no options.
    } finally {
      setIsLoadingVehicles(false);
    }
  }, []);

  useEffect(() => {
    setUser(getUserInfo());
    fetchVehicles();
  }, [fetchVehicles]);

  const handleChange = ({ currentTarget: input }) => {
    setFormData((prev) => ({ ...prev, [input.name]: input.value }));
  };

  const setPickup = (next) => setFormData((prev) => ({ ...prev, pickup: next }));
  const setDropoff = (next) => setFormData((prev) => ({ ...prev, dropoff: next }));

  const addStop = () => setFormData((prev) => ({ ...prev, stops: [...prev.stops, { ...emptyAddress }] }));
  const removeStop = (index) => setFormData((prev) => ({ ...prev, stops: prev.stops.filter((_, i) => i !== index) }));
  const updateStop = (index, next) =>
    setFormData((prev) => ({ ...prev, stops: prev.stops.map((s, i) => (i === index ? next : s)) }));

  // Live price preview - recalculates (debounced) whenever the fields that
  // actually affect price change: vehicle, pricing type, pickup/dropoff/
  // stop coordinates (point-to-point), or the booked duration (hourly).
  // Never fires on passenger name/phone/notes/etc changing, and never fires
  // at all until every required coordinate is actually known (not just
  // typed) - see AddressAutocompleteInput's lat/lng-only-on-selection contract.
  const stopsCoordinatesKey = JSON.stringify(formData.stops.map((s) => [s.lat, s.lng]));

  useEffect(() => {
    let cancelled = false;

    const timeoutId = setTimeout(async () => {
      if (!formData.vehicleId) {
        setPricePreview(null);
        setPriceError("");
        return;
      }

      if (formData.pricingType === "point-to-point") {
        const stopsValid = formData.stops.every(hasCoordinates);
        if (!hasCoordinates(formData.pickup) || !hasCoordinates(formData.dropoff) || !stopsValid) {
          setPricePreview(null);
          setPriceError("");
          return;
        }

        const waypoints = [
          { lat: formData.pickup.lat, lng: formData.pickup.lng },
          ...formData.stops.map((s) => ({ lat: s.lat, lng: s.lng })),
          { lat: formData.dropoff.lat, lng: formData.dropoff.lng },
        ];

        setIsCalculatingPrice(true);
        setPriceError("");
        try {
          const { data } = await axios.post(
            `${PRICING_URL}/calculate`,
            { vehicleId: formData.vehicleId, pricingType: "point-to-point", waypoints },
            { headers: authHeader() }
          );
          if (!cancelled) setPricePreview(data);
        } catch (err) {
          if (!cancelled) {
            setPricePreview(null);
            setPriceError(errorMessageFrom(err, "Could not calculate a price for this route."));
          }
        } finally {
          if (!cancelled) setIsCalculatingPrice(false);
        }
      } else {
        const totalMinutes = toEstimatedDurationMinutes(formData.durationHours, formData.durationMinutes);
        if (!totalMinutes) {
          setPricePreview(null);
          setPriceError("");
          return;
        }

        setIsCalculatingPrice(true);
        setPriceError("");
        try {
          const { data } = await axios.post(
            `${PRICING_URL}/calculate`,
            { vehicleId: formData.vehicleId, pricingType: "hourly", durationHours: totalMinutes / 60 },
            { headers: authHeader() }
          );
          if (!cancelled) setPricePreview(data);
        } catch (err) {
          if (!cancelled) {
            setPricePreview(null);
            setPriceError(errorMessageFrom(err, "Could not calculate an hourly fare."));
          }
        } finally {
          if (!cancelled) setIsCalculatingPrice(false);
        }
      }
    }, PRICE_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
    // Deliberately depends on coordinates only, not the whole pickup/dropoff/
    // stops objects - including their .address text would re-fire this on
    // every keystroke instead of only when a real selection changes the price.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.vehicleId,
    formData.pricingType,
    formData.pickup.lat,
    formData.pickup.lng,
    formData.dropoff.lat,
    formData.dropoff.lng,
    formData.durationHours,
    formData.durationMinutes,
    stopsCoordinatesKey,
  ]);

  const validate = () => {
    if (!formData.passengerName.trim()) return "Passenger name is required";
    if (!PHONE_REGEX.test(formData.passengerPhone.trim())) return "Phone number must be in E.164 format, e.g. +15551234567";
    if (!formData.vehicleId) return "Select a vehicle";
    if (!formData.pickup.address.trim()) return "Pickup location is required";
    if (!hasCoordinates(formData.pickup)) return "Select a pickup address from the suggestions list";
    if (!formData.pickupDate) return "Pickup date is required";
    if (!formData.pickupTime) return "Pickup time is required";
    if (new Date(combineDateAndTime(formData.pickupDate, formData.pickupTime)).getTime() < Date.now()) {
      return "Ride date cannot be in the past";
    }
    const passengerCount = Number(formData.passengerCount);
    if (!Number.isInteger(passengerCount) || passengerCount < 1) return "Passenger count must be at least 1";
    if (passengerCount > 20) return "Passenger count must be 20 or fewer";

    for (const stop of formData.stops) {
      if (!stop.address.trim()) return "Remove empty stops or select a valid address for each one";
      if (!hasCoordinates(stop)) return "Select each stop's address from the suggestions list";
    }

    if (!formData.dropoff.address.trim()) return "Drop-off location is required";

    if (formData.pricingType === "point-to-point") {
      if (!hasCoordinates(formData.dropoff)) return "Select a drop-off address from the suggestions list";
      if (formData.pickup.address.trim().toLowerCase() === formData.dropoff.address.trim().toLowerCase()) {
        return "Pickup and dropoff locations cannot be the same";
      }
      if (!pricePreview) return "Could not calculate a driving route for this trip - check the pickup, stop, and drop-off addresses";
    } else {
      const totalMinutes = toEstimatedDurationMinutes(formData.durationHours, formData.durationMinutes);
      if (!totalMinutes) return "Enter the booked duration for this hourly ride";
      if (!pricePreview) return "Could not calculate an hourly fare - check that an active hourly rate is configured for this vehicle";
    }

    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const selectedVehicle = vehicles.find((v) => v._id === formData.vehicleId);
    const totalMinutes = toEstimatedDurationMinutes(formData.durationHours, formData.durationMinutes);

    const payload = {
      passengerName: formData.passengerName.trim(),
      passengerPhone: formData.passengerPhone.trim(),
      pickupLocation: formData.pickup.address.trim(),
      pickupCoordinates: { lat: formData.pickup.lat, lng: formData.pickup.lng },
      dropoffLocation: formData.dropoff.address.trim(),
      ...(hasCoordinates(formData.dropoff) && { dropoffCoordinates: { lat: formData.dropoff.lat, lng: formData.dropoff.lng } }),
      stops: formData.stops.map((s) => ({ address: s.address.trim(), coordinates: { lat: s.lat, lng: s.lng } })),
      rideDate: combineDateAndTime(formData.pickupDate, formData.pickupTime),
      passengerCount: Number(formData.passengerCount),
      // The ride's own free-text vehicleType field (unrelated to vehicleId)
      // is auto-filled from the selected real vehicle, so the dispatcher
      // never has to pick a type separately.
      vehicleType: selectedVehicle?.vehicleType || "Sedan",
      vehicleId: formData.vehicleId,
      pricingType: formData.pricingType,
      notes: formData.notes.trim(),
      ...(formData.pricingType === "hourly" && { durationHours: totalMinutes / 60 }),
    };

    setIsSubmitting(true);
    try {
      await axios.post(RIDE_URL, payload, { headers: authHeader() });
      navigate(portalPathFor("dispatcher", user?.companySlug));
    } catch (error) {
      setFormError(errorMessageFrom(error, "Could not create ride request. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedVehicle = vehicles.find((v) => v._id === formData.vehicleId);

  return (
    <PortalLayout
      portalTitle="Dispatcher Portal"
      portalSubtitle="Manage rides and assign drivers"
      navItems={DISPATCHER_NAV_ITEMS}
      user={user}
    >
      <Link to={portalPathFor("dispatcher", user?.companySlug)} className="inline-flex items-center gap-1 text-sm text-rideflow-navy/60 hover:text-rideflow-navy mb-4">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <div className="bg-white rounded-xl border border-black/5 p-6 max-w-2xl">
        <h2 className="text-lg font-bold text-rideflow-navy">Create New Ride Request</h2>
        <p className="text-sm text-rideflow-navy/60 mb-6">Fill in the details below to create a new ride request</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-rideflow-navy uppercase tracking-wide border-b border-black/5 pb-2">
              Passenger Information
            </h3>
            <div>
              <label className="block text-sm font-semibold text-rideflow-navy mb-1">Passenger Name</label>
              <input type="text" name="passengerName" placeholder="Enter passenger name" value={formData.passengerName} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-rideflow-navy mb-1">Passenger Phone</label>
              <input type="tel" name="passengerPhone" placeholder="e.g. +15551234567" value={formData.passengerPhone} onChange={handleChange} className={inputClass} />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-rideflow-navy uppercase tracking-wide border-b border-black/5 pb-2">
              Trip Details
            </h3>

            <div>
              <label className="block text-sm font-semibold text-rideflow-navy mb-1">Pricing Type</label>
              <div className="flex gap-2">
                {[
                  { value: "point-to-point", label: "Point-to-Point" },
                  { value: "hourly", label: "Hourly" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, pricingType: opt.value }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      formData.pricingType === opt.value
                        ? "bg-rideflow-orange text-white"
                        : "bg-rideflow-gray/60 text-rideflow-navy/70 hover:bg-rideflow-gray/70"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-rideflow-navy mb-1">Vehicle</label>
              <select name="vehicleId" value={formData.vehicleId} onChange={handleChange} className={inputClass}>
                <option value="">{isLoadingVehicles ? "Loading vehicles..." : "Select a vehicle"}</option>
                {vehicles.map((v) => (
                  <option key={v._id} value={v._id}>
                    {vehicleLabel(v)}
                  </option>
                ))}
              </select>
              {!isLoadingVehicles && vehicles.length === 0 && (
                <p className="text-xs text-rideflow-navy/40 mt-1">
                  No vehicles available. Ask a manager to add a vehicle before creating a ride.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-rideflow-navy mb-1">Pickup</label>
              <AddressAutocompleteInput value={formData.pickup} onChange={setPickup} placeholder="Search pickup address..." name="pickupLocation" />
            </div>

            {formData.stops.length > 0 && (
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-rideflow-navy mb-1">Stops</label>
                {formData.stops.map((stop, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="flex-1">
                      <AddressAutocompleteInput
                        value={stop}
                        onChange={(next) => updateStop(index, next)}
                        placeholder={`Stop ${index + 1} address...`}
                        name={`stop-${index}`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeStop(index)}
                      className="mt-2 text-rideflow-navy/40 hover:text-red-600 shrink-0"
                      aria-label={`Remove stop ${index + 1}`}
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={addStop}
              className="inline-flex items-center gap-1.5 text-sm text-rideflow-orange hover:text-rideflow-orange-hover font-semibold"
            >
              <Plus size={14} /> Add Stop
            </button>

            <div>
              <label className="block text-sm font-semibold text-rideflow-navy mb-1">Drop-off</label>
              <AddressAutocompleteInput value={formData.dropoff} onChange={setDropoff} placeholder="Search drop-off address..." name="dropoffLocation" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-rideflow-navy mb-1">Pickup Date</label>
                <input type="date" name="pickupDate" value={formData.pickupDate} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-rideflow-navy mb-1">Pickup Time</label>
                <input type="time" name="pickupTime" value={formData.pickupTime} onChange={handleChange} className={inputClass} />
              </div>
            </div>

            {formData.pricingType === "hourly" && (
              <div>
                <label className="block text-sm font-semibold text-rideflow-navy mb-1">Booked Duration</label>
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" name="durationHours" min="0" placeholder="Hours" value={formData.durationHours} onChange={handleChange} className={inputClass} />
                  <input type="number" name="durationMinutes" min="0" max="59" placeholder="Minutes" value={formData.durationMinutes} onChange={handleChange} className={inputClass} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-rideflow-navy mb-1">Passenger Count</label>
                <input type="number" name="passengerCount" min="1" max="20" value={formData.passengerCount} onChange={handleChange} className={inputClass} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-rideflow-navy mb-1">Notes (Optional)</label>
              <textarea name="notes" rows={3} placeholder="Any special instructions or requirements..." value={formData.notes} onChange={handleChange} className={inputClass} />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-bold text-rideflow-navy uppercase tracking-wide border-b border-black/5 pb-2">
              Pricing Summary
            </h3>
            <div className="bg-rideflow-gray/30 border border-black/5 rounded-lg p-4 text-sm space-y-1.5">
              {isCalculatingPrice && <p className="text-rideflow-navy/50">Calculating price...</p>}
              {!isCalculatingPrice && priceError && <p className="text-red-600">{priceError}</p>}
              {!isCalculatingPrice && !priceError && !pricePreview && (
                <p className="text-rideflow-navy/50">Select a vehicle and {formData.pricingType === "point-to-point" ? "pickup/drop-off addresses" : "a booked duration"} to see pricing.</p>
              )}
              {!isCalculatingPrice && pricePreview && (
                <>
                  <p className="text-rideflow-navy/60">
                    Ride Type: <span className="font-semibold text-rideflow-navy capitalize">{formData.pricingType.replace("-", " ")}</span>
                  </p>
                  {selectedVehicle && (
                    <p className="text-rideflow-navy/60">
                      Vehicle: <span className="font-semibold text-rideflow-navy">{vehicleLabel(selectedVehicle)}</span>
                    </p>
                  )}
                  {formData.pricingType === "point-to-point" ? (
                    <>
                      <p className="text-rideflow-navy/60">
                        Distance: <span className="font-semibold text-rideflow-navy">{pricePreview.distanceMiles} miles</span>
                      </p>
                      <p className="text-rideflow-navy/60">
                        Estimated Driving Time: <span className="font-semibold text-rideflow-navy">{pricePreview.durationMinutes} minutes</span>
                      </p>
                      <p className="text-rideflow-navy/60">
                        Pricing Rate: <span className="font-semibold text-rideflow-navy">${pricePreview.rate.toFixed(2)} / mile</span>
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-rideflow-navy/60">
                        Booked Duration: <span className="font-semibold text-rideflow-navy">{formatDuration(pricePreview.durationMinutes)}</span>
                      </p>
                      <p className="text-rideflow-navy/60">
                        Hourly Rate: <span className="font-semibold text-rideflow-navy">${pricePreview.rate.toFixed(2)} / hour</span>
                      </p>
                    </>
                  )}
                  <p className="text-xl font-bold text-rideflow-navy pt-1">Estimated Fare: ${pricePreview.price.toFixed(2)}</p>
                </>
              )}
            </div>
          </div>

          {formError && <p className="text-red-600 text-sm">{formError}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-lg bg-rideflow-orange hover:bg-rideflow-orange-hover disabled:opacity-50 text-white font-semibold transition-colors shadow-sm"
            >
              {isSubmitting ? "Saving..." : "Create Ride Request"}
            </button>
            <button
              type="button"
              onClick={() => navigate(portalPathFor("dispatcher", user?.companySlug))}
              className="px-6 py-2.5 rounded-lg border border-rideflow-navy/20 text-rideflow-navy hover:bg-rideflow-gray/40 transition-colors font-semibold"
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
