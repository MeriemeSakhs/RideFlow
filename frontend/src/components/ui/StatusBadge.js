import React from "react";

const StatusBadge = ({ status, styles }) => (
  <span
    className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap capitalize ${styles[status] || "bg-rideflow-gray/60 text-rideflow-navy/70"}`}
  >
    {status}
  </span>
);

export default StatusBadge;
