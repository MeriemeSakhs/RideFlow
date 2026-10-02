// Company-specific URLs are purely a routing/display convenience
// (rideflow.com/<slug>/login, /<slug>/dispatcher, etc.) - they carry NO
// authorization weight. The backend always derives companyId from the
// verified JWT alone (see middleware/auth.js); a mismatched or missing
// slug in the URL can only ever cause a redirect here on the frontend,
// never a change in what data is actually returned.

// companySlug is the signed-in user's own slug, decoded from their JWT -
// never trusted from a URL param. Omitting it falls back to the original,
// un-prefixed portal paths (still fully supported).
export const portalPathFor = (role, companySlug) => {
  const base = role === "manager" ? "/manager" : "/dispatcher";
  return companySlug ? `/${companySlug}${base}` : base;
};
