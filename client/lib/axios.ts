import axios from "axios";
import { getSessionId } from "./auth";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// ── Request interceptor — attach token & session ID ─────
axiosInstance.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      const sessionId = getSessionId();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      if (sessionId) {
        config.headers["X-Session-ID"] = sessionId;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor — handle 401 globally ──────────
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        if (!path.includes("/login") && !path.includes("/register") && !path.includes("/verify-email") && !path.includes("/forgot-password") && !path.includes("/reset-password")) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("sessionId");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;