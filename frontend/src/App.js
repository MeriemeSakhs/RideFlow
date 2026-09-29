import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import './css/card.css';
import './index.css';

import LandingPage from "./components/pages/landingPage";
import Login from "./components/pages/loginPage";
import Signup from "./components/pages/registerPage";
import DispatcherDashboard from "./components/pages/dispatcherDashboardPage";
import DispatcherCreateRide from "./components/pages/dispatcherCreateRidePage";
import DispatcherRideRequests from "./components/pages/dispatcherRideRequestsPage";
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
import getUserInfo from "./utilities/decodeJwt";

const RootRoute = () => {
  const user = getUserInfo();
  if (user) return <Navigate to={user.role === "manager" ? "/manager" : "/dispatcher"} replace />;
  return <LandingPage />;
};

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<RootRoute />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/profile" element={<RequireRole role="any"><ProfilePage /></RequireRole>} />

      <Route path="/dispatcher" element={<RequireRole role="dispatcher"><DispatcherDashboard /></RequireRole>} />
      <Route path="/dispatcher/rides/new" element={<RequireRole role="dispatcher"><DispatcherCreateRide /></RequireRole>} />
      <Route path="/dispatcher/rides" element={<RequireRole role="dispatcher"><DispatcherRideRequests /></RequireRole>} />
      <Route path="/dispatcher/drivers" element={<RequireRole role="dispatcher"><DispatcherDrivers /></RequireRole>} />
      <Route path="/dispatcher/vehicles" element={<RequireRole role="dispatcher"><DispatcherVehicles /></RequireRole>} />

      <Route path="/manager" element={<RequireRole role="manager"><ManagerDashboard /></RequireRole>} />
      <Route path="/manager/drivers" element={<RequireRole role="manager"><ManagerDrivers /></RequireRole>} />
      <Route path="/manager/vehicles" element={<RequireRole role="manager"><ManagerVehicles /></RequireRole>} />
      <Route path="/manager/pricing" element={<RequireRole role="manager"><ManagerPricing /></RequireRole>} />
      <Route path="/manager/reports" element={<RequireRole role="manager"><ManagerReports /></RequireRole>} />
      <Route path="/manager/team-hours" element={<RequireRole role="manager"><ManagerTeamHours /></RequireRole>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App
