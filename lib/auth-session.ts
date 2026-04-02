import axios from "axios";

let refreshPromise: Promise<string> | null = null;

export const clearStoredAuth = () => {
  if (typeof window === "undefined") return;

  localStorage.removeItem("access_token");
  document.cookie = "access_token=; Max-Age=0; path=/";
  document.cookie = "refresh_token=; Max-Age=0; path=/";
  document.cookie = "user_id=; Max-Age=0; path=/";
  document.cookie = "username=; Max-Age=0; path=/";
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
        const refreshedToken = response.data?.accessToken;
        if (!refreshedToken) {
          throw new Error("Refresh response did not include an access token");
        }

        if (typeof window !== "undefined") {
          localStorage.setItem("access_token", refreshedToken);
        }

        return refreshedToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};
