import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { ArrowLeft, Pencil, Mail, Building2, Copy, Check } from "lucide-react";
import PortalLayout from "../layout/PortalLayout";
import TimeClockCard from "../timeTracking/TimeClockCard";
import { DISPATCHER_NAV_ITEMS, MANAGER_NAV_ITEMS } from "../../portalConfig";
import getUserInfo from "../../utilities/decodeJwt";
import { authHeader, errorMessageFrom } from "../../utilities/api";
import { portalPathFor } from "../../utilities/companyUrl";

const BASE_URL = `${process.env.REACT_APP_BACKEND_SERVER_URI}/user`;

const inputClass =
  "w-full px-4 py-2 rounded-md border border-rideflow-navy/20 text-rideflow-navy placeholder-rideflow-navy/35 focus:outline-none focus:ring-2 focus:ring-rideflow-orange focus:border-rideflow-orange";

const emptyPasswordForm = { currentPassword: "", newPassword: "", confirmNewPassword: "" };

const ProfilePage = () => {
  const [user, setUser] = useState(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // "view" (read-only, default) -> "edit" (editing fields + optional password
  // change) -> "verify" (only entered if the edit changed the email address)
  const [mode, setMode] = useState("view");

  const [savedProfile, setSavedProfile] = useState({ fullName: "", email: "", phone: "" });
  const [profileForm, setProfileForm] = useState({ fullName: "", email: "", phone: "" });
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [company, setCompany] = useState(null);
  const [companyError, setCompanyError] = useState("");
  const [referenceCopied, setReferenceCopied] = useState(false);

  const [pendingEmail, setPendingEmail] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifyNotice, setVerifyNotice] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const { data } = await axios.get(`${BASE_URL}/profile`, { headers: authHeader() });
      const loaded = { fullName: data.fullName || "", email: data.email || "", phone: data.phone || "" };
      setSavedProfile(loaded);
      setProfileForm(loaded);
      if (data.pendingEmail) {
        setPendingEmail(data.pendingEmail);
        setMode("verify");
      }
    } catch (err) {
      setLoadError(errorMessageFrom(err, "Could not load your profile. Check your connection and try again."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const currentUser = getUserInfo();
    setUser(currentUser);
    fetchProfile();

    // Reference number is manager-only, enforced backend-side too (GET
    // /company is requireRole("manager")) - a Dispatcher never fetches this.
    if (currentUser && currentUser.role === "manager") {
      axios
        .get(`${process.env.REACT_APP_BACKEND_SERVER_URI}/company`, { headers: authHeader() })
        .then(({ data }) => setCompany(data))
        .catch((err) => setCompanyError(errorMessageFrom(err, "Could not load company information.")));
    }
  }, [fetchProfile]);

  const handleCopyReference = async () => {
    if (!company) return;
    try {
      await navigator.clipboard.writeText(company.referenceNumber);
      setReferenceCopied(true);
      setTimeout(() => setReferenceCopied(false), 1500);
    } catch {
      // Clipboard API can be unavailable (e.g. insecure context) - the
      // reference number is still visible on screen to copy manually.
    }
  };

  const startEditing = () => {
    setProfileForm(savedProfile);
    setPasswordForm(emptyPasswordForm);
    setSaveError("");
    setSaveSuccess("");
    setMode("edit");
  };

  const cancelEditing = () => {
    setProfileForm(savedProfile);
    setPasswordForm(emptyPasswordForm);
    setSaveError("");
    setMode("view");
  };

  const handleProfileChange = ({ currentTarget: input }) => {
    setProfileForm((prev) => ({ ...prev, [input.name]: input.value }));
  };

  const handlePasswordChange = ({ currentTarget: input }) => {
    setPasswordForm((prev) => ({ ...prev, [input.name]: input.value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveError("");
    setSaveSuccess("");

    if (!profileForm.fullName.trim()) return setSaveError("Full name is required");
    if (!profileForm.email.trim()) return setSaveError("Email is required");

    const wantsPasswordChange = passwordForm.currentPassword || passwordForm.newPassword || passwordForm.confirmNewPassword;
    if (wantsPasswordChange) {
      if (!passwordForm.currentPassword) return setSaveError("Current password is required to change your password");
      if (passwordForm.newPassword.length < 8) return setSaveError("New password must be 8 or more characters");
      if (passwordForm.newPassword !== passwordForm.confirmNewPassword) return setSaveError("New passwords do not match");
    }

    setIsSaving(true);
    try {
      if (wantsPasswordChange) {
        await axios.put(`${BASE_URL}/change-password`, passwordForm, { headers: authHeader() });
      }

      const { data } = await axios.put(
        `${BASE_URL}/profile`,
        { fullName: profileForm.fullName, phone: profileForm.phone, email: profileForm.email },
        { headers: authHeader() }
      );

      if (data.pendingEmailVerificationRequired) {
        setSavedProfile((prev) => ({ ...prev, fullName: profileForm.fullName, phone: profileForm.phone }));
        setPendingEmail(data.pendingEmail);
        setVerifyNotice(wantsPasswordChange ? `Password updated. ${data.message}` : data.message);
        setMode("verify");
      } else {
        localStorage.setItem("accessToken", data.accessToken);
        setSaveSuccess("Profile updated successfully");
        setTimeout(() => window.location.reload(), 900);
      }
      setPasswordForm(emptyPasswordForm);
    } catch (err) {
      setSaveError(errorMessageFrom(err, "Could not save your changes. Please try again."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setVerifyError("");
    if (!/^\d{6}$/.test(verifyCode.trim())) return setVerifyError("Enter the 6-digit code");

    setIsVerifying(true);
    try {
      const { data } = await axios.post(`${BASE_URL}/verify-email-change`, { code: verifyCode.trim() }, { headers: authHeader() });
      localStorage.setItem("accessToken", data.accessToken);
      setVerifyNotice("Email updated successfully");
      setTimeout(() => window.location.reload(), 900);
    } catch (err) {
      setVerifyError(errorMessageFrom(err, "Could not verify the code. Please try again."));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    setVerifyError("");
    setIsResending(true);
    try {
      const { data } = await axios.post(`${BASE_URL}/resend-email-change-code`, {}, { headers: authHeader() });
      setVerifyNotice(data.message);
    } catch (err) {
      setVerifyError(errorMessageFrom(err, "Could not resend the code."));
    } finally {
      setIsResending(false);
    }
  };

  const cancelVerification = () => {
    setPendingEmail("");
    setVerifyCode("");
    setVerifyError("");
    setVerifyNotice("");
    setMode("view");
  };

  if (!user) return null;

  const navItems = user.role === "manager" ? MANAGER_NAV_ITEMS : DISPATCHER_NAV_ITEMS;
  const dashboardHref = portalPathFor(user.role, user.companySlug);

  return (
    <PortalLayout portalTitle="My Profile" portalSubtitle="Manage your account information" navItems={navItems} user={user}>
      <Link
        to={dashboardHref}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-rideflow-navy/60 hover:text-rideflow-orange transition-colors mb-6"
      >
        <ArrowLeft size={15} /> Back to Dashboard
      </Link>

      {isLoading && <p className="text-rideflow-navy/60">Loading profile...</p>}
      {!isLoading && loadError && <p className="text-red-600 text-sm mb-4">{loadError}</p>}

      {!isLoading && !loadError && (
        <div className="max-w-2xl space-y-6">
          {/* Only real Dispatchers punch in/out - a Manager viewing the
              Dispatcher portal isn't an hourly employee being time-tracked. */}
          {user.role === "dispatcher" && <TimeClockCard />}

          <div className="bg-white rounded-xl border border-black/5 p-6">
            <h2 className="font-bold text-rideflow-navy mb-5">Account Information</h2>

            <div className="mb-5">
              <p className="text-xs font-semibold text-rideflow-navy/50 uppercase tracking-wide mb-1">Role</p>
              <span className="inline-block px-3 py-1 rounded-full bg-rideflow-orange/10 text-rideflow-orange text-sm font-semibold capitalize">
                {user.role}
              </span>
            </div>

            {mode === "verify" && (
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="flex items-start gap-3 bg-rideflow-gray/40 border border-black/5 rounded-lg px-4 py-3">
                  <Mail size={18} className="text-rideflow-orange shrink-0 mt-0.5" />
                  <p className="text-sm text-rideflow-navy/80">
                    A 6-digit code was sent to <span className="font-semibold">{pendingEmail}</span>. Enter it below to confirm your
                    new email. Your email stays as <span className="font-semibold">{savedProfile.email}</span> until then.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-rideflow-navy mb-1">Verification Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                    className={`${inputClass} tracking-[0.3em] text-center font-mono text-lg`}
                  />
                </div>

                {verifyError && <p className="text-red-600 text-sm">{verifyError}</p>}
                {verifyNotice && !verifyError && <p className="text-emerald-600 text-sm">{verifyNotice}</p>}

                <div className="flex flex-wrap items-center gap-4">
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="px-5 py-2.5 rounded-lg bg-rideflow-orange hover:bg-rideflow-orange-hover disabled:opacity-50 text-white font-semibold text-sm shadow-sm transition-colors"
                  >
                    {isVerifying ? "Verifying..." : "Verify Email"}
                  </button>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={isResending}
                    className="text-sm font-semibold text-rideflow-navy/60 hover:text-rideflow-orange transition-colors disabled:opacity-50"
                  >
                    {isResending ? "Resending..." : "Resend code"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelVerification}
                    className="text-sm font-semibold text-rideflow-navy/40 hover:text-rideflow-navy transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {mode === "view" && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-rideflow-navy/50 uppercase tracking-wide mb-1">Full Name</p>
                  <p className="text-sm text-rideflow-navy">{savedProfile.fullName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-rideflow-navy/50 uppercase tracking-wide mb-1">Email Address</p>
                  <p className="text-sm text-rideflow-navy">{savedProfile.email}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-rideflow-navy/50 uppercase tracking-wide mb-1">Phone Number</p>
                  <p className="text-sm text-rideflow-navy">{savedProfile.phone || "—"}</p>
                </div>

                {saveSuccess && <p className="text-emerald-600 text-sm">{saveSuccess}</p>}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={startEditing}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-rideflow-navy/15 hover:border-rideflow-orange/40 hover:bg-rideflow-orange/5 text-rideflow-navy font-semibold text-sm transition-colors"
                  >
                    <Pencil size={15} /> Edit
                  </button>
                </div>
              </div>
            )}

            {mode === "edit" && (
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-rideflow-navy mb-1">Full Name</label>
                  <input type="text" name="fullName" value={profileForm.fullName} onChange={handleProfileChange} className={inputClass} />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-rideflow-navy mb-1">Email Address</label>
                  <input type="email" name="email" value={profileForm.email} onChange={handleProfileChange} className={inputClass} />
                  <p className="text-xs text-rideflow-navy/40 mt-1">
                    Changing this sends a 6-digit code to the new address to confirm it.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-rideflow-navy mb-1">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Optional"
                    value={profileForm.phone}
                    onChange={handleProfileChange}
                    className={inputClass}
                  />
                </div>

                <div className="pt-3 border-t border-black/5">
                  <p className="text-sm font-semibold text-rideflow-navy mb-1">Change Password</p>
                  <p className="text-xs text-rideflow-navy/40 mb-3">Optional — leave blank to keep your current password.</p>

                  <div className="space-y-3">
                    <input
                      type="password"
                      name="currentPassword"
                      placeholder="Current password"
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordChange}
                      className={inputClass}
                    />
                    <input
                      type="password"
                      name="newPassword"
                      placeholder="New password (at least 8 characters)"
                      value={passwordForm.newPassword}
                      onChange={handlePasswordChange}
                      className={inputClass}
                    />
                    <input
                      type="password"
                      name="confirmNewPassword"
                      placeholder="Confirm new password"
                      value={passwordForm.confirmNewPassword}
                      onChange={handlePasswordChange}
                      className={inputClass}
                    />
                  </div>
                </div>

                {saveError && <p className="text-red-600 text-sm">{saveError}</p>}
                {saveSuccess && <p className="text-emerald-600 text-sm">{saveSuccess}</p>}

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-lg bg-rideflow-orange hover:bg-rideflow-orange-hover disabled:opacity-50 text-white font-semibold text-sm shadow-sm transition-colors"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    className="px-5 py-2.5 rounded-lg text-rideflow-navy/60 hover:text-rideflow-navy font-semibold text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Reference number is never shown to Dispatchers - backend GET
              /company already enforces requireRole("manager"), this just
              matches that on the UI side. */}
          {user.role === "manager" && (
            <div className="bg-white rounded-xl border border-black/5 p-6">
              <div className="flex items-center gap-2 mb-5">
                <Building2 size={18} className="text-rideflow-orange" />
                <h2 className="font-bold text-rideflow-navy">Company Information</h2>
              </div>

              {companyError && <p className="text-red-600 text-sm">{companyError}</p>}

              {!companyError && !company && <p className="text-rideflow-navy/60 text-sm">Loading company information...</p>}

              {company && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-rideflow-navy/50 uppercase tracking-wide mb-1">Company Name</p>
                    <p className="text-sm text-rideflow-navy">{company.companyName}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-rideflow-navy/50 uppercase tracking-wide mb-1">Company Reference Number</p>
                    <div className="flex items-center gap-3">
                      <p className="text-lg font-mono font-bold text-rideflow-navy tracking-wide">{company.referenceNumber}</p>
                      <button
                        type="button"
                        onClick={handleCopyReference}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rideflow-navy/15 hover:border-rideflow-orange/40 hover:bg-rideflow-orange/5 text-rideflow-navy text-xs font-semibold transition-colors"
                      >
                        {referenceCopied ? (
                          <>
                            <Check size={13} className="text-emerald-600" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy size={13} /> Copy Reference Number
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </PortalLayout>
  );
};

export default ProfilePage;
