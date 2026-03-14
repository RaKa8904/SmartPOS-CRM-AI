import axios from "axios";

export const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

const isAuthPath = (url?: string) => {
  if (!url) return false;
  return url.includes("/auth/login") || url.includes("/auth/refresh");
};

let refreshPromise: Promise<string | null> | null = null;

async function tryRefreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) return null;

  try {
    const res = await axios.post("http://127.0.0.1:8000/auth/refresh", {
      refresh_token: refreshToken,
    });

    const nextAccess = res.data?.access_token as string | undefined;
    const nextRefresh = (res.data?.refresh_token as string | undefined) ?? refreshToken;

    if (!nextAccess) return null;

    localStorage.setItem("access_token", nextAccess);
    localStorage.setItem("refresh_token", nextRefresh);
    return nextAccess;
  } catch {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("token");
    return null;
  }
}

api.interceptors.request.use((config) => {
  // Backward compatibility: support old key "token" and migrate it.
  const legacyToken = localStorage.getItem("token");
  if (legacyToken && !localStorage.getItem("access_token")) {
    localStorage.setItem("access_token", legacyToken);
    localStorage.removeItem("token");
  }

  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config as (Record<string, unknown> & {
      _retry?: boolean;
      url?: string;
      headers?: Record<string, string>;
    });

    if (status === 401 && originalRequest && !originalRequest._retry && !isAuthPath(originalRequest.url)) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = tryRefreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const nextToken = await refreshPromise;
      if (nextToken) {
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${nextToken}`;
        return api(originalRequest);
      }
    }

    if (status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);
