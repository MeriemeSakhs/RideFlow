import React from "react";

const StatusBadge = ({ status, styles }) => (
  <span
    className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap capitalize ${styles[status] || "bg-slate-100 text-slate-600"}`}
  >
    {status}
  </span>
);

export default StatusBadge;
