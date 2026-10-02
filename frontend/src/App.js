import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import './css/card.css';
import './index.css';

import LandingPage from "./components/pages/landingPage";
import Login from "./components/pages/loginPage";
import Signup from "./components/pages/registerPage";
import VerifyEmail from "./components/pages/verifyEmailPage";
import DriverConfirmPage from "./components/pages/driverConfirmPage";
import DriverTrackPage from "./components/pages/driverTrackPage";
import DispatcherDashboard from "./components/pages/dispatcherDashboardPage";
import DispatcherCreateRide from "./components/pages/dispatcherCreateRidePage";
import DispatcherRideRequests from "./components/pages/dispatcherRideRequestsPage";
import DispatcherTrackRide from "./components/pages/dispatcherTrackRidePage";
import DispatcherDrivers from "./components/pages/dispatcherDriversPage";
import DispatcherVehicles from "./components/pages/dispatcherVehiclesPage";
import ManagerDashboard from "./components/pages/managerDashboardPage";
import ManagerDrivers from "./components/pages/managerDriversPage";
import ManagerVehicles from "./components/pages/managerVehiclesPage";
import ManagerPricing from "./components/pages/managerPricingPage";
import ManagerReports from "./components/pages/managerReportsPage";
import ManagerTeamHours from "./components/pages/managerTeamHoursPage";
import ProfilePage from "./components/pages/profilePage";
import RequireRole from "./components/RequireRole";
import CompanyRootRoute from "./components/CompanyRootRoute";
import getUserInfo from "./utilities/decodeJwt";
import { portalPathFor } from "./utilities/companyUrl";

const RootRoute = () => {
  const user = getUserInfo();
  if (user) return <Navigate to={portalPathFor(user.role, user.companySlug)} replace />;
  return <LandingPage />;
};

// Routes that make sense both bare (/login, /dispatcher, ...) and under a
// company-specific URL (/<slug>/login, /<slug>/dispatcher, ...). Rendered
// twice below at two different path prefixes so every existing bare route
// keeps working exactly as before, and the new company-prefixed ones reuse
// the identical components - nothing about what a route DOES differs by
// prefix, only the URL. /, /signup, /verify-email and
// /driver/confirm/:token are deliberately NOT duplicated here: signup
// creates a brand-new company (no slug exists yet to prefix with), verify-
// email redirects using the slug from the freshly-issued JWT regardless of
// how it was reached, and the driver confirm link is already fully scoped
// by its own single-use token.
const portalRouteDefs = [
  { path: "/login", element: <Login /> },
  { path: "/profile", element: <RequireRole role="any"><ProfilePage /></RequireRole> },
  { path: "/dispatcher", element: <RequireRole role="dispatcher"><DispatcherDashboard /></RequireRole> },
  { path: "/dispatcher/rides/new", element: <RequireRole role="dispatcher"><DispatcherCreateRide /></RequireRole> },
  { path: "/dispatcher/rides", element: <RequireRole role="dispatcher"><DispatcherRideRequests /></RequireRole> },
  { path: "/dispatcher/rides/:rideId/track", element: <RequireRole role="dispatcher"><DispatcherTrackRide /></RequireRole> },
  { path: "/dispatcher/drivers", element: <RequireRole role="dispatcher"><DispatcherDrivers /></RequireRole> },
  { path: "/dispatcher/vehicles", element: <RequireRole role="dispatcher"><DispatcherVehicles /></RequireRole> },
  { path: "/manager", element: <RequireRole role="manager"><ManagerDashboard /></RequireRole> },
  { path: "/manager/drivers", element: <RequireRole role="manager"><ManagerDrivers /></RequireRole> },
  { path: "/manager/vehicles", element: <RequireRole role="manager"><ManagerVehicles /></RequireRole> },
  { path: "/manager/pricing", element: <RequireRole role="manager"><ManagerPricing /></RequireRole> },
  { path: "/manager/reports", element: <RequireRole role="manager"><ManagerReports /></RequireRole> },
  { path: "/manager/team-hours", element: <RequireRole role="manager"><ManagerTeamHours /></RequireRole> },
];

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<RootRoute />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/driver/confirm/:token" element={<DriverConfirmPage />} />
      <Route path="/driver/track/:sessionToken" element={<DriverTrackPage />} />

      {portalRouteDefs.map(({ path, element }) => (
        <Route key={path} path={path} element={element} />
      ))}
      <Route path="/:companySlug" element={<CompanyRootRoute />} />
      {portalRouteDefs.map(({ path, element }) => (
        <Route key={`slug${path}`} path={`/:companySlug${path}`} element={element} />
      ))}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App
