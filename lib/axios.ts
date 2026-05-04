import axios from "axios";
import { refreshAccessToken } from "@/lib/auth-session";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_SERVER_URL || "",
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: () => void; reject: (err: unknown) => void }> = [];

const processQueue = (error: unknown | null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise<void>(function (resolve, reject) {
          // Wrap `resolve` so it matches our queue signature (no args).
          failedQueue.push({ resolve: () => resolve(), reject });
        })
          .then(() => {
            return axiosInstance(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await refreshAccessToken();
        processQueue(null);

        // Ensure we don't accidentally re-attach a stale localStorage token.
        if (originalRequest.headers && typeof originalRequest.headers === "object") {
          const headers = originalRequest.headers as Record<string, unknown>;
          delete headers["Authorization"];
        }

        // Retry original request with refreshed HttpOnly cookies.
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        
        // Dispatch global event so provider.tsx knows to fully log the user out
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("auth:logout"));
        }
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
