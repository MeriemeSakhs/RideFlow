import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, LogOut, User, ChevronDown, Info } from "lucide-react";
import RideFlowLogo from "../branding/RideFlowLogo";
import RoleSwitcher from "./RoleSwitcher";

// Shared sidebar + top bar shell for both the Dispatcher and Manager portals.
// navItems: [{ label, href, icon: LucideIcon }]
const PortalLayout = ({ portalTitle, portalSubtitle, navItems, user, children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  // "Current view" is derived from the URL, not a separate stored flag - a
  // Manager on /dispatcher/* is in Dispatcher Mode, on /manager/* they're in
  // Manager Mode. This makes it inherently refresh-safe and needs no state
  // to keep in sync. The account's actual role (user.role) never changes.
  // Falls back to the account's real role on neutral pages like /profile,
  // so those never get mistaken for "viewing the Dispatcher portal".
  const currentView = location.pathname.startsWith("/dispatcher")
    ? "dispatcher"
    : location.pathname.startsWith("/manager")
    ? "manager"
    : user?.role || "dispatcher";
  const isManagerViewingDispatcher = user?.role === "manager" && currentView === "dispatcher";

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-rideflow-gray/30">
      <aside className="w-64 shrink-0 bg-rideflow-navy text-white flex flex-col">
        <div className="px-5 py-5 border-b border-white/10 flex flex-col items-center">
          <RideFlowLogo variant="dark" size="sm" />
          {user?.companyName && (
            <p className="mt-1.5 max-w-[11rem] text-[11px] font-medium text-white/40 uppercase tracking-wide leading-tight text-center text-balance">
              {user.companyName}
            </p>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ label, href, icon: Icon }) => {
            const isActive = location.pathname === href;
            return (
              <Link
                key={href}
                to={href}
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

        <div className="px-3 py-4 border-t border-white/10">
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
            <button type="button" className="text-rideflow-navy/40 hover:text-rideflow-navy" aria-label="Notifications">
              <Bell size={20} />
            </button>
            <div className="relative flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-rideflow-orange/10 flex items-center justify-center text-rideflow-orange">
                <User size={18} />
              </div>
              <div className="text-sm">
                <button
                  type="button"
                  onClick={() => navigate("/profile")}
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
                  <RoleSwitcher currentView={currentView} onClose={() => setSwitcherOpen(false)} />
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
            <Link to="/manager" className="ml-auto font-semibold text-amber-800 hover:text-amber-900 underline shrink-0">
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
