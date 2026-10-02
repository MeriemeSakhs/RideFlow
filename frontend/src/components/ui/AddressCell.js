import React from "react";

// Displays an address wrapped to at most 2 lines via CSS line-clamp, with a
// native ellipsis only if it's genuinely too long to fit in 2 lines at the
// column's width - this is the "readable but compact" treatment, as opposed
// to WrapCell (same folder), which never clips at all. Shared by the Ride
// Requests table and the Dashboard's ride tables so an address renders
// identically everywhere. Needs a fixed-width parent cell (table-fixed + a
// colgroup width) to wrap at a predictable width rather than the column's
// natural content width.
//
// Deliberately omits Tailwind's `block` utility: `line-clamp-2` itself sets
// `display: -webkit-box`, and adding `block` on the same element lets that
// utility's `display: block` win the cascade instead, silently disabling the
// clamp (the content then just renders at full, unclipped height). `w-full`
// alone is enough to stretch the span to the cell's width regardless of
// which display value is in effect.
const AddressCell = ({ children }) => (
  <span className="w-full text-sm leading-snug line-clamp-2 break-words">{children}</span>
);

export default AddressCell;
