import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import loginImage from "../assets/images/admin-bg3.webp";
import logo from "../assets/images/network1.png";
import axios from "axios";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // <--- error state
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null); // reset error on new submit

    const data = {
      jsonrpc: "2.0",
      method: "user.login",
      params: {
        username: email,
        password: password,
      },
      id: 1,
    };

    try {
      const response = await axios.post(baseUrl, data, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Check if API returned an error
      if (response.data.error) {
        setErrorMessage("Invalid username or password.");
        return;
      }

      // Success: store token and navigate
      sessionStorage.setItem("authToken", response.data.result);
      navigate("/dashboard");
    } catch (error: unknown) {
      console.error("API error:", error);
      setErrorMessage("Failed to connect to API. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0f4f8] to-[#d9e2ec] px-2">
      <div className="flex flex-col md:flex-row w-full max-w-3xl h-auto md:h-[400px] bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="hidden md:flex w-1/2 h-full items-center justify-center bg-white">
          <img
            src={loginImage}
            alt="Admin Background"
            className="max-h-[90%] object-contain rounded-l-3xl"
          />
        </div>

        <div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
          <div className="flex items-center mb-4">
            <img src={logo} alt="Logo" className="w-12 h-12 mr-3" />
            <div className="flex flex-col">
              <h2 className="text-xl font-bold text-[#fd5658]">Aariz NMS</h2>
              <p className="text-xs text-gray-500">
                Manage & monitor your network
              </p>
            </div>
          </div>

          <h3 className="text-xl font-semibold text-gray-800 mb-1">Sign In</h3>
          <p className="text-xs text-gray-500 mb-4">
            Enter your credentials to access the dashboard
          </p>

          {/* Error message */}
          {errorMessage && (
            <div className="mb-4 text-red-500 text-sm">{errorMessage}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Username"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a3d73] focus:border-transparent outline-none text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1a3d73] focus:border-transparent outline-none text-sm"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-[#1a3d73] text-white rounded-lg font-semibold hover:bg-[#0f2f5c] transition text-sm"
            >
              Sign In
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            © {new Date().getFullYear()} Aariz NMS. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
