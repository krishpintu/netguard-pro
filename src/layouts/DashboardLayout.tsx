import React, { useState, useRef, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import networkLogo from "../assets/images/network1.png";
import {
  FaUser,
  FaSignOutAlt,
  FaTachometerAlt,
  FaWaveSquare,
  FaCog,
  FaChevronLeft,
  FaChevronRight,
  FaSun,
  FaRegFileAlt,
} from "react-icons/fa";
import { useTheme } from "../features/ThemeContext";

const DashboardLayout: React.FC = () => {
  const {
    bgColor,
    textColor,
    navHeaderBgColor,
    headerBgColor,
    setHeaderBgColor,
    setNavHeaderBgColor,
    setBgColor,
    setTextColor,
  } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());
  // Update live time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const timeString = currentTime.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true, // ensures AM/PM
  });

  // Inside your component

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSettingVisible, setIsSettingVisible] = useState<boolean>(() => {
    // Initialize from session storage on first render
    const stored = sessionStorage.getItem("selectSettingVisible");
    return stored === "true";
  });
  const [themeOpen, setThemeOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const location = useLocation();

  /* ---------------- CLOSE DROPDOWN ON OUTSIDE CLICK ---------------- */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
        setThemeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ---------------- LOGOUT ---------------- */
  const handleLogout = () => {
    setDropdownOpen(false);
    sessionStorage.removeItem("authToken");
    navigate("/");
  };

  /* ---------------- PAGE TITLE ---------------- */
  const pageTitle = location.pathname.includes("host-onboarding")
    ? "Host Onboarding"
    : location.pathname.includes("report")
      ? "Report"
      : "Dashboard";

  const handleClick = () => {
    const newValue = !isSettingVisible;
    setIsSettingVisible(newValue);
    sessionStorage.setItem("selectSettingVisible", String(newValue));

    // Dispatch custom event
    window.dispatchEvent(new Event("selectSettingChange"));
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* ---------------- SIDEBAR ---------------- */}
      <aside
        style={{ backgroundColor: headerBgColor, color: textColor }}
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        }  flex flex-col transition-all duration-300`}
      >
        {/* Sidebar header */}

        <div className="p-4 border-b border-blue-700 flex flex-col items-center gap-2">
          {sidebarOpen ? (
            // Expanded sidebar
            <div className="w-full flex items-center justify-between transition-all duration-300">
              <div className="flex items-center gap-3">
                <img
                  src={networkLogo}
                  alt="Logo"
                  className="w-10 h-10 rounded-full"
                />
                <div className="flex flex-col">
                  <h2 className="text-sm font-bold leading-tight">Aariz NMS</h2>
                  <span className="text-xs opacity-80">Welcome</span>
                </div>
              </div>

              {/* Toggle button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                <FaChevronLeft />
              </button>
            </div>
          ) : (
            // Collapsed sidebar
            <div className="flex flex-col items-center transition-all duration-300 gap-2">
              <img
                src={networkLogo}
                alt="Logo"
                className="w-10 h-10 rounded-full"
              />
              <h2 className="text-xs font-bold leading-tight text-center">
                NMS
              </h2>

              {/* Toggle button below */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                <FaChevronRight />
              </button>
            </div>
          )}
        </div>
        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-2">
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) =>
              `flex items-center px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? "bg-white text-[#1a3d73]"
                  : "hover:bg-blue-600 text-white"
              }`
            }
          >
            <FaTachometerAlt className="text-lg" />
            {sidebarOpen && <span className="ml-3">Dashboard</span>}
          </NavLink>

          <NavLink
            to="/dashboard/host-onboarding"
            className={({ isActive }) =>
              `flex items-center px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? "bg-white text-[#1a3d73]"
                  : "hover:bg-blue-600 text-white"
              }`
            }
          >
            <FaWaveSquare className="text-lg" />
            {sidebarOpen && <span className="ml-3">Host Onboarding</span>}
          </NavLink>

          <NavLink
            to="/dashboard/report"
            className={({ isActive }) =>
              `flex items-center px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? "bg-white text-[#1a3d73]"
                  : "hover:bg-blue-600 text-white"
              }`
            }
          >
            <FaRegFileAlt className="text-lg" />
            {sidebarOpen && <span className="ml-3">Report</span>}
          </NavLink>
        </nav>
      </aside>

      {/* ---------------- MAIN CONTENT ---------------- */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header
          className=" shadow-md p-2 flex items-center gap-3"
          style={{ backgroundColor: navHeaderBgColor }}
        >
          {/* Left: Page title and settings */}
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-800">{pageTitle}</h1>

            {pageTitle === "Dashboard" && (
              <FaCog
                onClick={handleClick}
                className="w-4 h-4 cursor-pointer text-gray-700 hover:shadow-lg hover:shadow-gray-500/60 transition-all"
              />
            )}
          </div>

          {/* Right: Clock */}
          <div className="ml-auto w-40 border rounded-xl overflow-hidden shadow-md flex flex-col bg-[#d3e1f7]">
            <div className="flex flex-col items-center justify-center p-1 space-y-0.5">
              <p className="text-sm font-bold text-[#1a3d73]">{timeString}</p>
            </div>
          </div>

          {/* Right: User Dropdown */}
          <div
            className="flex items-center gap-2 relative ml-auto"
            ref={dropdownRef}
          >
            {/* Theme Icon */}
            <button
              onClick={() => setThemeOpen(!themeOpen)}
              className="w-8 h-8 flex items-center justify-center text-[#1a3d73] hover:text-[#1a3d73] transition-colors"
              title="Theme"
            >
              <FaSun className="w-6 h-6" />
            </button>

            {/* Theme Popup */}
            {themeOpen && (
              <div className="absolute top-10 right-10 w-48 p-3 bg-white rounded-lg shadow-lg border z-50 flex flex-col gap-2">
                <label className="flex flex-col text-sm">
                  Nav Header Color:
                  <input
                    type="color"
                    value={navHeaderBgColor}
                    onChange={(e) => setNavHeaderBgColor(e.target.value)}
                    className="w-full h-8 border rounded mt-1 cursor-pointer"
                  />
                </label>
                <label className="flex flex-col text-sm">
                  Card Header Color:
                  <input
                    type="color"
                    value={headerBgColor}
                    onChange={(e) => setHeaderBgColor(e.target.value)}
                    className="w-full h-8 border rounded mt-1 cursor-pointer"
                  />
                </label>
                <label className="flex flex-col text-sm">
                  Background Color:
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-full h-8 border rounded mt-1 cursor-pointer"
                  />
                </label>

                <label className="flex flex-col text-sm">
                  Text Color:
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-full h-8 border rounded mt-1 cursor-pointer"
                  />
                </label>
                {/* Reset Button */}
                <button
                  onClick={() => {
                    setBgColor("#f9fafb");
                    setTextColor("#ffffff");
                    setHeaderBgColor("#1a3d73");
                    setThemeOpen(false);
                  }}
                  className="mt-2 w-full py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
                >
                  Reset to Default
                </button>
              </div>
            )}

            {/* User Button */}
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-8 h-8 bg-[#1a3d73] text-white rounded-full flex items-center justify-center text-sm hover:bg-blue-700"
            >
              U
            </button>

            {/* User Dropdown */}
            {dropdownOpen && (
              <div className="absolute top-10 right-0 w-44 bg-white rounded-lg shadow-lg border z-50">
                <button className="flex items-center w-full px-2 py-2 hover:bg-gray-100">
                  <FaUser className="mr-2 text-gray-600" />
                  Profile
                </button>

                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-2 py-2 hover:bg-gray-100"
                >
                  <FaSignOutAlt className="mr-2 text-gray-600" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main
          className="flex-1 p-4 overflow-auto"
          style={{ backgroundColor: bgColor }}
        >
          <Outlet />
        </main>

        {/* Footer */}
        {/* <footer className="bg-[#f9fafb] shadow-inner p-4 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} All rights reserved.
        </footer> */}
      </div>
    </div>
  );
};

export default DashboardLayout;
