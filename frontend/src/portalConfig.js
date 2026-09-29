import { LayoutDashboard, ClipboardList, Users, Car, DollarSign, BarChart3, Clock } from "lucide-react";

// Single source of truth for each portal's sidebar nav, shared by the real
// pages and the "coming soon" placeholders so the list never drifts between them.
export const DISPATCHER_NAV_ITEMS = [
  { label: "Dashboard", href: "/dispatcher", icon: LayoutDashboard },
  { label: "Ride Requests", href: "/dispatcher/rides", icon: ClipboardList },
  { label: "Drivers", href: "/dispatcher/drivers", icon: Users },
  { label: "Vehicles", href: "/dispatcher/vehicles", icon: Car },
];

export const MANAGER_NAV_ITEMS = [
  { label: "Dashboard", href: "/manager", icon: LayoutDashboard },
  { label: "Drivers", href: "/manager/drivers", icon: Users },
  { label: "Vehicles", href: "/manager/vehicles", icon: Car },
  { label: "Pricing Rules", href: "/manager/pricing", icon: DollarSign },
  { label: "Reports", href: "/manager/reports", icon: BarChart3 },
  { label: "Team Hours", href: "/manager/team-hours", icon: Clock },
];
