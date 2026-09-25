import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, LogOut, User } from "lucide-react";
import RideFlowLogo from "../branding/RideFlowLogo";

// Shared sidebar + top bar shell for both the Dispatcher and Manager portals.
// navItems: [{ label, href, icon: LucideIcon }]
const PortalLayout = ({ portalTitle, portalSubtitle, navItems, user, children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-rideflow-gray/30">
      <aside className="w-64 shrink-0 bg-rideflow-navy text-white flex flex-col">
        <div className="px-5 py-5 border-b border-white/10">
          <RideFlowLogo variant="dark" size="sm" />
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
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-rideflow-orange/10 flex items-center justify-center text-rideflow-orange">
                <User size={18} />
              </div>
              <div className="text-sm">
                <p className="font-semibold text-rideflow-navy leading-tight">{user?.fullName}</p>
                <p className="text-rideflow-navy/60 leading-tight capitalize">{user?.role}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-8 py-6">{children}</main>
      </div>
    </div>
  );
};

export default PortalLayout;
