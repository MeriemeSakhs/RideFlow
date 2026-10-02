import React from "react";

// Wraps content across as many lines as it needs - never truncates and
// never shows an ellipsis. For fields that must always display completely
// (passenger/driver names, vehicle type), as opposed to AddressCell (same
// folder), which deliberately caps an address at ~2 lines with a graceful
// ellipsis fallback when it's genuinely too long to fit.
const WrapCell = ({ children }) => (
  <span className="block w-full text-sm leading-snug break-words">{children}</span>
);

export default WrapCell;
