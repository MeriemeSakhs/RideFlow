import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import axios from "axios";
import getUserInfo from "../../utilities/decodeJwt";
import RideFlowLogo from "../branding/RideFlowLogo";
import { portalPathFor } from "../../utilities/companyUrl";

const url = `${process.env.REACT_APP_BACKEND_SERVER_URI}/user/login`;
const companyByslugUrl = (slug) => `${process.env.REACT_APP_BACKEND_SERVER_URI}/company/by-slug/${slug}`;

const errorMessageFrom = (error, fallback) =>
  (error.response && error.response.data && error.response.data.message) || fallback;

const Login = () => {
  const { companySlug } = useParams();
  const [user, setUser] = useState(null);
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [companyLookupFailed, setCompanyLookupFailed] = useState(false);
  const navigate = useNavigate();

  const handleChange = ({ currentTarget: input }) => {
    setCredentials({ ...credentials, [input.name]: input.value });
  };

  useEffect(() => {
    setUser(getUserInfo());
  }, []);

  // Purely for display ("Signing in to <Company Name>") - this never gates
  // or informs authorization in any way, see utilities/companyUrl.js.
  useEffect(() => {
    if (!companySlug) return;
    axios
      .get(companyByslugUrl(companySlug))
      .then(({ data }) => setCompanyInfo(data))
      .catch(() => setCompanyLookupFailed(true));
  }, [companySlug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const { data: res } = await axios.post(url, credentials);
      localStorage.setItem("accessToken", res.accessToken);
      const decoded = getUserInfo();
      const ownSlug = decoded && decoded.companySlug;

      // The URL's company didn't match this account - log them in
      // normally (their credentials were valid), but take them to THEIR
      // OWN company's URL rather than leaving them under one that isn't
      // theirs. Never a silent switch - explained on screen first.
      if (companySlug && ownSlug && companySlug !== ownSlug) {
        setNotice("This sign-in page belongs to a different company. Taking you to your own company...");
        setTimeout(() => navigate(portalPathFor(decoded.role, ownSlug)), 1600);
        return;
      }

      navigate(portalPathFor(decoded && decoded.role, ownSlug));
    } catch (error) {
      if (error.response && error.response.data && error.response.data.requiresEmailVerification) {
        navigate("/verify-email", { state: { email: error.response.data.email } });
        return;
      }
      setError(errorMessageFrom(error, "Could not log in. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user) {
    navigate(portalPathFor(user.role, user.companySlug));
    return null;
  }

  if (companySlug && companyLookupFailed) {
    return (
      <div className="min-h-screen bg-rideflow-gray/30 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-8 w-full max-w-sm text-center space-y-4">
          <RideFlowLogo size="lg" />
          <p className="text-sm text-rideflow-navy/60">We couldn't find a company at this address.</p>
          <Link to="/login" className="inline-block font-semibold text-rideflow-orange hover:text-rideflow-orange-hover">
            Go to the general login page
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-rideflow-gray/30 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-8 w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <RideFlowLogo size="lg" />
        </div>
        <h2 className="text-xl font-bold text-rideflow-navy mb-1 text-center">Log in</h2>
        {companyInfo && (
          <p className="text-sm text-rideflow-navy/50 mb-5 text-center">
            Signing in to <span className="font-semibold text-rideflow-navy/70">{companyInfo.companyName}</span>
          </p>
        )}
        {!companyInfo && <div className="mb-6" />}

        {notice && <p className="text-emerald-600 text-sm text-center mb-4">{notice}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-rideflow-navy mb-1">Email</label>
            <input
              type="email"
              name="email"
              placeholder="Enter email"
              value={credentials.email}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-md border border-rideflow-navy/20 text-rideflow-navy placeholder-rideflow-navy/35 focus:outline-none focus:ring-2 focus:ring-rideflow-orange focus:border-rideflow-orange"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-rideflow-navy mb-1">Password</label>
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={credentials.password}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-md border border-rideflow-navy/20 text-rideflow-navy placeholder-rideflow-navy/35 focus:outline-none focus:ring-2 focus:ring-rideflow-orange focus:border-rideflow-orange"
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-lg bg-rideflow-orange hover:bg-rideflow-orange-hover disabled:opacity-50 text-white font-semibold transition-colors shadow-sm mt-2"
          >
            {isSubmitting ? "Logging in..." : "Log In"}
          </button>
        </form>

        <p className="text-center text-sm text-rideflow-navy/60 mt-6">
          Don't have an account?{" "}
          <Link to="/signup" className="font-semibold text-rideflow-orange hover:text-rideflow-orange-hover">Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
