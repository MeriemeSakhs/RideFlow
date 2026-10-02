import React from "react";
import { VEHICLE_OPTIONS } from "../../utilities/rideForm";

const inputClass =
  "w-full px-4 py-2 rounded-md border border-rideflow-navy/20 text-rideflow-navy placeholder-rideflow-navy/35 focus:outline-none focus:ring-2 focus:ring-rideflow-orange focus:border-rideflow-orange";

// Shared field set used by both the Create Ride Request page and the edit
// modal on the Ride Requests page, so the two forms never drift apart.
// showDurationField: the Estimated Ride Duration inputs only render when
// this is true - Create Ride intentionally omits it (passes nothing, so it
// defaults to false) and stays exactly as it looked before that field
// existed; the edit modal still passes true, since an already-created
// ride's estimatedDurationMinutes still needs to be viewable/editable.
const RideFormFields = ({ formData, onChange, showDurationField = false }) => (
  <>
    <div>
      <label className="block text-sm font-semibold text-rideflow-navy mb-1">Passenger Name</label>
      <input type="text" name="passengerName" placeholder="Enter passenger name" value={formData.passengerName} onChange={onChange} className={inputClass} />
    </div>

    <div>
      <label className="block text-sm font-semibold text-rideflow-navy mb-1">Passenger Phone</label>
      <input type="tel" name="passengerPhone" placeholder="e.g. +15551234567" value={formData.passengerPhone} onChange={onChange} className={inputClass} />
    </div>

    <div>
      <label className="block text-sm font-semibold text-rideflow-navy mb-1">Pickup Location</label>
      <input type="text" name="pickupLocation" placeholder="Enter pickup address" value={formData.pickupLocation} onChange={onChange} className={inputClass} />
    </div>

    <div>
      <label className="block text-sm font-semibold text-rideflow-navy mb-1">Drop-off Location</label>
      <input type="text" name="dropoffLocation" placeholder="Enter drop-off address" value={formData.dropoffLocation} onChange={onChange} className={inputClass} />
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-semibold text-rideflow-navy mb-1">Pickup Date</label>
        <input type="date" name="pickupDate" value={formData.pickupDate} onChange={onChange} className={inputClass} />
      </div>
      <div>
        <label className="block text-sm font-semibold text-rideflow-navy mb-1">Pickup Time</label>
        <input type="time" name="pickupTime" value={formData.pickupTime} onChange={onChange} className={inputClass} />
      </div>
    </div>

    {showDurationField && (
      <div>
        <label className="block text-sm font-semibold text-rideflow-navy mb-1">Estimated Ride Duration (Optional)</label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <input
              type="number"
              name="durationHours"
              min="0"
              placeholder="Hours"
              value={formData.durationHours}
              onChange={onChange}
              className={inputClass}
            />
          </div>
          <div>
            <input
              type="number"
              name="durationMinutes"
              min="0"
              max="59"
              placeholder="Minutes"
              value={formData.durationMinutes}
              onChange={onChange}
              className={inputClass}
            />
          </div>
        </div>
        <p className="text-xs text-rideflow-navy/40 mt-1">
          Leave blank if unknown. A 1-hour break is added automatically after the ride when checking driver availability.
        </p>
      </div>
    )}

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-semibold text-rideflow-navy mb-1">Passenger Count</label>
        <input type="number" name="passengerCount" min="1" max="20" value={formData.passengerCount} onChange={onChange} className={inputClass} />
      </div>
      <div>
        <label className="block text-sm font-semibold text-rideflow-navy mb-1">Vehicle Type</label>
        <select name="vehicleType" value={formData.vehicleType} onChange={onChange} className={inputClass}>
          <option value="">Select a vehicle type</option>
          {VEHICLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>

    <div>
      <label className="block text-sm font-semibold text-rideflow-navy mb-1">Notes (Optional)</label>
      <textarea
        name="notes"
        rows={3}
        placeholder="Any special instructions or requirements..."
        value={formData.notes}
        onChange={onChange}
        className={inputClass}
      />
    </div>
  </>
);

export default RideFormFields;
