import axios from "axios";

let refreshPromise: Promise<void> | null = null;

export const clearStoredAuth = () => {
  // Access/refresh tokens are stored in HttpOnly cookies by the backend.
  // Client-side JS cannot and should not mutate them directly.
  return;
};

export const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/auth/refresh`,
        {},
        { withCredentials: true }
      )
      .then((response) => {
        // Backend refresh endpoint sets HttpOnly cookies.
        // We intentionally do not persist tokens in localStorage.
        if (response.status < 200 || response.status >= 300) {
          throw new Error("Refresh failed");
        }
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};
