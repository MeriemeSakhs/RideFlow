import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, User, ChevronDown, Info } from "lucide-react";
import RideFlowLogo from "../branding/RideFlowLogo";
import RoleSwitcher from "./RoleSwitcher";
import NotificationBell from "./NotificationBell";
import { portalPathFor } from "../../utilities/companyUrl";

// Shared sidebar + top bar shell for both the Dispatcher and Manager portals.
// navItems: [{ label, href, icon: LucideIcon }]
const PortalLayout = ({ portalTitle, portalSubtitle, navItems, user, children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  // "Current view" is derived from the URL, not a separate stored flag - a
  // Manager on /dispatcher/* (or /<slug>/dispatcher/*) is in Dispatcher
  // Mode, on /manager/* (or /<slug>/manager/*) they're in Manager Mode.
  // This makes it inherently refresh-safe and needs no state to keep in
  // sync. The account's actual role (user.role) never changes. Falls back
  // to the account's real role on neutral pages like /profile, so those
  // never get mistaken for "viewing the Dispatcher portal". The company
  // slug prefix is stripped first so this check works under either URL form.
  const pathWithoutSlug =
    user?.companySlug && location.pathname.startsWith(`/${user.companySlug}/`)
      ? location.pathname.slice(user.companySlug.length + 1)
      : location.pathname;
  const currentView = pathWithoutSlug.startsWith("/dispatcher")
    ? "dispatcher"
    : pathWithoutSlug.startsWith("/manager")
    ? "manager"
    : user?.role || "dispatcher";
  const isManagerViewingDispatcher = user?.role === "manager" && currentView === "dispatcher";

  // Normalized to Title Case for display regardless of how it was actually
  // typed at signup (a company whose real record is "AZROU TRANSPORTATION"
  // or "azrou transportation" both render identically as "Azrou
  // Transportation") - this is a display-only transform, the stored
  // companyName itself is never modified.
  const toTitleCase = (str) =>
    str
      .toLowerCase()
      .split(" ")
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ");

  // The company name is split into a prominent first word + a lighter
  // secondary line for whatever follows, mirroring how a real wordmark
  // treats a brand name vs. a descriptor (e.g. "Azrou" / "Transportation").
  // This generalizes to any company name: a single-word name (e.g. "ABC")
  // simply has no second line, and the first word's size backs off for
  // unusually long single words so it never overflows the sidebar.
  const companyNameWords = toTitleCase((user?.companyName || "").trim()).split(/\s+/).filter(Boolean);
  const [companyFirstWord, ...companyRestWords] = companyNameWords;
  const companyRestOfName = companyRestWords.join(" ");
  const companyFirstWordSizeClass =
    (companyFirstWord?.length || 0) > 11 ? "text-xl" : (companyFirstWord?.length || 0) > 7 ? "text-2xl" : "text-3xl";

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    navigate(user?.companySlug ? `/${user.companySlug}/login` : "/login");
  };

  return (
    <div className="min-h-screen flex bg-rideflow-gray/30">
      <aside className="w-64 shrink-0 bg-rideflow-navy text-white flex flex-col relative overflow-hidden">
        {/* Very subtle curved road/motion lines - decorative only, kept to a
            low opacity so they read as texture in the navy, not as shapes
            competing with the branding or nav links above them. */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 256 800"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <path d="M -30 760 C 70 640, 30 520, 150 430 C 240 360, 200 220, 300 120" stroke="white" strokeOpacity="0.05" strokeWidth="2" fill="none" />
          <path d="M -50 620 C 50 520, 10 400, 120 320 C 210 260, 170 140, 270 60" stroke="white" strokeOpacity="0.035" strokeWidth="2" fill="none" />
        </svg>

        <div className="relative z-10 px-6 py-7 border-b border-white/10 flex flex-col items-center gap-2.5">
          {/* Company name is the primary brand on this screen - always the
              signed-in user's own company (user.companyName from the JWT),
              shown in its own natural casing, never hardcoded or styled for
              one specific company. Split into a bold first word + a lighter
              secondary line (see companyFirstWord/companyRestOfName above) -
              a single-word name just renders the first line alone. Not
              uppercase+wide-tracked - that combination reads as a generic
              section heading, not a brand name. */}
          {companyFirstWord && (
            <div className="flex flex-col items-center">
              <span
                className={`${companyFirstWordSizeClass} font-extrabold text-slate-300 leading-none tracking-tight text-center`}
              >
                {companyFirstWord}
              </span>
              {companyRestOfName && (
                <span className="mt-1.5 text-base font-medium text-slate-400 leading-snug tracking-tight text-center text-balance max-w-[12rem]">
                  {companyRestOfName}
                </span>
              )}
            </div>
          )}

          {companyFirstWord && (
            <div className="flex items-center gap-2 w-full max-w-[9rem]" aria-hidden="true">
              <span className="flex-1 h-px bg-white/15" />
              <span className="w-5 h-[3px] rounded-full bg-rideflow-orange shrink-0" />
              <span className="flex-1 h-px bg-white/15" />
            </div>
          )}

          <RideFlowLogo variant="dark" size="sm" />
        </div>

        <nav className="relative z-10 flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ label, href, icon: Icon }) => {
            const slugAwareHref = user?.companySlug ? `/${user.companySlug}${href}` : href;
            const isActive = location.pathname === slugAwareHref;
            return (
              <Link
                key={href}
                to={slugAwareHref}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-rideflow-orange text-white"
                    : "text-white/50 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="relative z-10 px-3 py-4 border-t border-white/10">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/50 hover:bg-white/5 hover:text-white transition-colors w-full"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-black/5 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-rideflow-navy">{portalTitle}</h1>
            <p className="text-sm text-rideflow-navy/60">{portalSubtitle}</p>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell user={user} />
            <div className="relative flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-rideflow-orange/10 flex items-center justify-center text-rideflow-orange">
                <User size={18} />
              </div>
              <div className="text-sm">
                <button
                  type="button"
                  onClick={() => navigate(user?.companySlug ? `/${user.companySlug}/profile` : "/profile")}
                  aria-label="Open my profile"
                  className="font-semibold text-rideflow-navy leading-tight hover:text-rideflow-orange transition-colors text-left"
                >
                  {user?.fullName}
                </button>
                {user?.role === "manager" ? (
                  <button
                    type="button"
                    onClick={() => setSwitcherOpen((v) => !v)}
                    aria-label="Switch role"
                    className="flex items-center gap-1 text-rideflow-navy/60 leading-tight hover:text-rideflow-orange transition-colors"
                  >
                    <span className="capitalize">{currentView}</span>
                    <ChevronDown size={12} />
                  </button>
                ) : (
                  <p className="text-rideflow-navy/60 leading-tight capitalize">{user?.role}</p>
                )}
              </div>

              {switcherOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setSwitcherOpen(false)} />
                  <RoleSwitcher currentView={currentView} companySlug={user?.companySlug} onClose={() => setSwitcherOpen(false)} />
                </>
              )}
            </div>
          </div>
        </header>

        {isManagerViewingDispatcher && (
          <div className="bg-amber-50 border-b border-amber-200 px-8 py-2.5 flex items-center gap-2 text-sm text-amber-800">
            <Info size={15} className="shrink-0" />
            <span>
              Account Role: <strong>Manager</strong> &middot; Currently viewing: <strong>Dispatcher Portal</strong>
            </span>
            <Link to={portalPathFor("manager", user?.companySlug)} className="ml-auto font-semibold text-amber-800 hover:text-amber-900 underline shrink-0">
              Switch back to Manager
            </Link>
          </div>
        )}

        <main className="flex-1 px-8 py-6">{children}</main>
      </div>
    </div>
  );
};

export default PortalLayout;
