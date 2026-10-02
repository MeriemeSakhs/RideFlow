import React, { useEffect, useState } from "react";
import { Link, Navigate, useParams, useLocation } from "react-router-dom";
import getUserInfo from "../utilities/decodeJwt";
import { portalPathFor } from "../utilities/companyUrl";

// Wraps a portal route: redirects to /login if no one is signed in, shows a
// clear "not authorized" message if the signed-in user has the wrong role,
// otherwise renders the page. This is a UX convenience only - the backend
// (middleware/auth.js) is what actually enforces role access on every API call.
//
// role="dispatcher" also admits a signed-in Manager (a Manager's real
// permissions are a superset of a Dispatcher's - this is what lets a Manager
// use "Dispatcher Mode" by simply navigating to /dispatcher/*, with no
// separate view-mode state to keep in sync). role="manager" stays strictly
// manager-only - a Dispatcher is never admitted, however they navigate there.
// role="any" admits any signed-in user regardless of role (e.g. /profile).
const RequireRole = ({ role, children }) => {
  const [user, setUser] = useState(undefined);
  const [checked, setChecked] = useState(false);
  const { companySlug } = useParams();
  const location = useLocation();

  useEffect(() => {
    setUser(getUserInfo());
    setChecked(true);
  }, []);

  if (!checked) return null;

  if (!user) {
    return (
      <div className="min-h-screen bg-rideflow-gray/30 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-rideflow-navy/70 text-lg mb-4">Please log in to continue.</p>
          <Link
            to={companySlug ? `/${companySlug}/login` : "/login"}
            className="text-rideflow-orange font-semibold hover:text-rideflow-orange-hover"
          >
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  // The URL's company slug is purely a routing/display convenience (see
  // utilities/companyUrl.js) - it never grants access to anything. If it
  // doesn't match the signed-in user's own company, this redirects them to
  // the identical page under their own correct URL rather than silently
  // rendering their own (still correctly company-scoped, since the backend
  // never trusts this param) data under a URL that visually claims to
  // belong to a different company.
  if (companySlug && user.companySlug && companySlug !== user.companySlug) {
    const restOfPath = location.pathname.split("/").slice(2).join("/");
    return <Navigate to={`/${user.companySlug}/${restOfPath}`} replace />;
  }

  const isAllowed = role === "any" || user.role === role || (role === "dispatcher" && user.role === "manager");

  if (!isAllowed) {
    return (
      <div className="min-h-screen bg-rideflow-gray/30 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-rideflow-navy text-lg font-semibold mb-2">You don't have access to this page.</p>
          <p className="text-rideflow-navy/70 mb-4">
            This area is for {role}s only. You're signed in as a {user.role}.
          </p>
          <Link
            to={portalPathFor(user.role, user.companySlug)}
            className="text-rideflow-orange font-semibold hover:text-rideflow-orange-hover"
          >
            Go to your dashboard
          </Link>
        </div>
      </div>
    );
  }

  return children;
};

export default RequireRole;
