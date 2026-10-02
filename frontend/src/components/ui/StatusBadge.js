import React from "react";

// `label` overrides the displayed text (e.g. "Pending Confirmation" for a
// "pending" ride) while `status` still drives which color from `styles` is used.
const StatusBadge = ({ status, styles, label }) => (
  <span
    className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap capitalize ${styles[status] || "bg-rideflow-gray/60 text-rideflow-navy/70"}`}
  >
    {label || status}
  </span>
);

export default StatusBadge;
