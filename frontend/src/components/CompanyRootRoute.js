import React from "react";
import { Navigate, useParams } from "react-router-dom";
import getUserInfo from "../utilities/decodeJwt";
import { portalPathFor } from "../utilities/companyUrl";

// Handles a bare company URL with nothing after it (rideflow.com/<slug>) -
// sends a signed-out visitor to that company's login page, or a signed-in
// user to their own portal. Always uses the signed-in user's OWN slug from
// their JWT for the redirect target, never the :companySlug from the URL -
// see RequireRole.js for why that distinction matters.
const CompanyRootRoute = () => {
  const { companySlug } = useParams();
  const user = getUserInfo();

  if (user) return <Navigate to={portalPathFor(user.role, user.companySlug)} replace />;
  return <Navigate to={`/${companySlug}/login`} replace />;
};

export default CompanyRootRoute;
