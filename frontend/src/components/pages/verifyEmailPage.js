import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import axios from "axios";
import RideFlowLogo from "../branding/RideFlowLogo";
import getUserInfo from "../../utilities/decodeJwt";
import { portalPathFor } from "../../utilities/companyUrl";

const VERIFY_URL = `${process.env.REACT_APP_BACKEND_SERVER_URI}/user/verify-signup-email`;
const RESEND_URL = `${process.env.REACT_APP_BACKEND_SERVER_URI}/user/resend-signup-verification`;

const errorMessageFrom = (error, fallback) =>
  (error.response && error.response.data && error.response.data.message) || fallback;

// Privacy-conscious display: j***@example.com instead of the full address.
const maskEmail = (email) => {
  const [local, domain] = String(email || "").split("@");
  if (!local || !domain) return email || "";
  const visible = local.slice(0, 1);
  return `${visible}${"*".repeat(Math.max(local.length - 1, 3))}@${domain}`;
};

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(
    location.state?.verificationSent === false
      ? "We couldn't send the verification email. Use Resend below to try again."
      : ""
  );
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verified, setVerified] = useState(false);

  if (!email) {
    return (
      <div className="min-h-screen bg-rideflow-gray/30 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-8 w-full max-w-sm text-center space-y-4">
          <RideFlowLogo size="lg" />
          <p className="text-sm text-rideflow-navy/60">
            We couldn't find a pending verification. Please sign up or log in again.
          </p>
          <Link to="/login" className="inline-block font-semibold text-rideflow-orange hover:text-rideflow-orange-hover">
            Back to log in
          </Link>
        </div>
      </div>
    );
  }

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(code.trim())) return setError("Enter the 6-digit code");

    setIsVerifying(true);
    try {
      const { data } = await axios.post(VERIFY_URL, { email, code: code.trim() });
      localStorage.setItem("accessToken", data.accessToken);
      setVerified(true);
      setNotice("Email verified successfully.");
      const decoded = getUserInfo();
      setTimeout(() => navigate(portalPathFor(decoded && decoded.role, decoded && decoded.companySlug)), 1200);
    } catch (err) {
      setError(errorMessageFrom(err, "Could not verify the code. Please try again."));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setIsResending(true);
    try {
      const { data } = await axios.post(RESEND_URL, { email });
      setNotice(data.message || "Verification code sent. Please check your email.");
    } catch (err) {
      setError(errorMessageFrom(err, "Could not resend the code. Please try again."));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-rideflow-gray/30 flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-8 w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <RideFlowLogo size="lg" />
        </div>
        <h2 className="text-xl font-bold text-rideflow-navy mb-1 text-center">Verify your email</h2>
        <p className="text-sm text-rideflow-navy/50 mb-6 text-center">
          Enter the verification code we sent to <span className="font-semibold text-rideflow-navy/70">{maskEmail(email)}</span>.
        </p>

        {!verified && (
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-rideflow-navy mb-1">Verification Code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="w-full px-4 py-2 rounded-md border border-rideflow-navy/20 text-rideflow-navy placeholder-rideflow-navy/35 focus:outline-none focus:ring-2 focus:ring-rideflow-orange focus:border-rideflow-orange tracking-[0.3em] text-center font-mono text-lg"
              />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}
            {notice && !error && <p className="text-emerald-600 text-sm">{notice}</p>}

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-3 rounded-lg bg-rideflow-orange hover:bg-rideflow-orange-hover disabled:opacity-50 text-white font-semibold transition-colors shadow-sm mt-2"
            >
              {isVerifying ? "Verifying..." : "Verify Email"}
            </button>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="text-sm font-semibold text-rideflow-navy/60 hover:text-rideflow-orange transition-colors disabled:opacity-50"
              >
                {isResending ? "Resending..." : "Resend code"}
              </button>
              <Link to="/login" className="text-sm font-semibold text-rideflow-navy/40 hover:text-rideflow-navy transition-colors">
                Back to log in
              </Link>
            </div>
          </form>
        )}

        {verified && (
          <div className="text-center space-y-2">
            <p className="text-emerald-600 font-semibold">{notice}</p>
            <p className="text-sm text-rideflow-navy/50">Taking you to your dashboard...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
