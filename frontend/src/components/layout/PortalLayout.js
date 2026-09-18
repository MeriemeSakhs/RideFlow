import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Waypoints, Bell, LogOut, User } from "lucide-react";

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
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-64 shrink-0 bg-indigo-950 text-white flex flex-col">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-white/10">
          <Waypoints size={22} className="text-indigo-300" />
          <span className="font-bold text-lg tracking-tight">RideFlow</span>
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
                    ? "bg-white/10 text-white"
                    : "text-indigo-200 hover:bg-white/5 hover:text-white"
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
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-indigo-200 hover:bg-white/5 hover:text-white transition-colors w-full"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{portalTitle}</h1>
            <p className="text-sm text-slate-500">{portalSubtitle}</p>
          </div>
          <div className="flex items-center gap-4">
            <button type="button" className="text-slate-400 hover:text-slate-600" aria-label="Notifications">
              <Bell size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700">
                <User size={18} />
              </div>
              <div className="text-sm">
                <p className="font-semibold text-slate-900 leading-tight">{user?.fullName}</p>
                <p className="text-slate-500 leading-tight capitalize">{user?.role}</p>
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
