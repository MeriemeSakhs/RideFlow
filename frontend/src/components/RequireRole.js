import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import getUserInfo from "../utilities/decodeJwt";

// Wraps a portal route: redirects to /login if no one is signed in, shows a
// clear "not authorized" message if the signed-in user has the wrong role,
// otherwise renders the page. This is a UX convenience only - the backend
// (middleware/auth.js) is what actually enforces role access on every API call.
const RequireRole = ({ role, children }) => {
  const [user, setUser] = useState(undefined);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setUser(getUserInfo());
    setChecked(true);
  }, []);

  if (!checked) return null;

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-slate-600 text-lg mb-4">Please log in to continue.</p>
          <Link to="/login" className="text-indigo-600 font-semibold hover:text-indigo-700">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  if (user.role !== role) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-slate-900 text-lg font-semibold mb-2">You don't have access to this page.</p>
          <p className="text-slate-600 mb-4">
            This area is for {role}s only. You're signed in as a {user.role}.
          </p>
          <Link
            to={user.role === "dispatcher" ? "/dispatcher" : "/manager"}
            className="text-indigo-600 font-semibold hover:text-indigo-700"
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
