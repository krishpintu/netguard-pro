import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import DashboardLayout from "./layouts/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import HostOnboarding from "./pages/HostOnboarding";
import Report from "./pages/Report";
import TestHoneycomb from "./pages/TestHoneycomb";

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Public login route */}
        <Route path="/" element={<Login />} />

        {/* Dashboard route with layout */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} /> {/* /dashboard */}
          <Route path="host-onboarding" element={<HostOnboarding />} />{" "}
          <Route path="report" element={<Report />} />{" "}
          <Route
            path="test-honeycomb"
            element={<TestHoneycomb items={[]} cardWidth={0} cardHeight={0} />}
          />{" "}
          {/* /dashboard/icmp-host */}
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
