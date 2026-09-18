import React from "react";
import { VEHICLE_OPTIONS } from "../../utilities/rideForm";

const inputClass =
  "w-full px-4 py-2 rounded-md border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";

// Shared field set used by both the Create Ride Request page and the edit
// modal on the Ride Requests page, so the two forms never drift apart.
const RideFormFields = ({ formData, onChange }) => (
  <>
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1">Passenger Name</label>
      <input type="text" name="passengerName" placeholder="Enter passenger name" value={formData.passengerName} onChange={onChange} className={inputClass} />
    </div>

    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1">Passenger Phone</label>
      <input type="tel" name="passengerPhone" placeholder="e.g. +15551234567" value={formData.passengerPhone} onChange={onChange} className={inputClass} />
    </div>

    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1">Pickup Location</label>
      <input type="text" name="pickupLocation" placeholder="Enter pickup address" value={formData.pickupLocation} onChange={onChange} className={inputClass} />
    </div>

    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1">Drop-off Location</label>
      <input type="text" name="dropoffLocation" placeholder="Enter drop-off address" value={formData.dropoffLocation} onChange={onChange} className={inputClass} />
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Pickup Date</label>
        <input type="date" name="pickupDate" value={formData.pickupDate} onChange={onChange} className={inputClass} />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Pickup Time</label>
        <input type="time" name="pickupTime" value={formData.pickupTime} onChange={onChange} className={inputClass} />
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Passenger Count</label>
        <input type="number" name="passengerCount" min="1" max="20" value={formData.passengerCount} onChange={onChange} className={inputClass} />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Vehicle Type</label>
        <select name="vehicleType" value={formData.vehicleType} onChange={onChange} className={inputClass}>
          <option value="">Select a vehicle type</option>
          {VEHICLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>

    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1">Notes (Optional)</label>
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
