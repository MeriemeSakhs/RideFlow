import React from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";

const PORTAL_OPTIONS = [
  { view: "dispatcher", label: "Dispatcher", description: "Manage rides & drivers", path: "/dispatcher" },
  { view: "manager", label: "Manager", description: "View analytics & reports", path: "/manager" },
];

// Manager-only control (rendered by PortalLayout). Switching views is just
// navigating between /dispatcher and /manager - the account's actual role
// never changes, only which portal is currently on screen.
const RoleSwitcher = ({ currentView, onClose }) => {
  const navigate = useNavigate();

  return (
    <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-black/5 z-50 overflow-hidden">
      <div className="px-4 py-3 border-b border-black/5">
        <p className="text-sm font-bold text-rideflow-navy">Switch Role</p>
        <p className="text-xs text-rideflow-navy/50">Choose your portal view</p>
      </div>
      <div className="py-1">
        {PORTAL_OPTIONS.map((opt) => {
          const active = currentView === opt.view;
          return (
            <button
              key={opt.view}
              type="button"
              onClick={() => {
                onClose();
                navigate(opt.path);
              }}
              aria-label={`Switch to ${opt.label} view`}
              className={`w-full text-left px-4 py-3 flex items-start gap-2 transition-colors hover:bg-rideflow-gray/40 ${
                active ? "bg-rideflow-orange/5" : ""
              }`}
            >
              <span className="w-4 pt-0.5 shrink-0">
                {active && <Check size={14} className="text-rideflow-orange" />}
              </span>
              <span>
                <span className="block text-sm font-semibold text-rideflow-navy">{opt.label}</span>
                <span className="block text-xs text-rideflow-navy/50 mt-0.5">{opt.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RoleSwitcher;
