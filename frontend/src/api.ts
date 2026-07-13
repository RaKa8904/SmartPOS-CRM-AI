import axios from "axios";

const getBaseURL = () => {
  const url = import.meta.env.VITE_API_URL;
  if (!url) return "http://127.0.0.1:8000";
  return url.startsWith("http") ? url : `https://${url}`;
};

// In-memory token storage (XSS protected)
let _inMemoryAccessToken: string | null = null;

export const getAccessToken = () => _inMemoryAccessToken;
export const setAccessToken = (token: string | null) => {
  _inMemoryAccessToken = token;
};

export const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true, // Enable sending HttpOnly cookies
});

const isAuthPath = (url?: string) => {
  if (!url) return false;
  return url.includes("/auth/login") || url.includes("/auth/refresh");
};

let refreshPromise: Promise<string | null> | null = null;

async function tryRefreshAccessToken(): Promise<string | null> {
  try {
    // Call refresh endpoint with credentials (cookie is sent automatically)
    const res = await axios.post(`${getBaseURL()}/auth/refresh`, {}, {
      withCredentials: true,
    });

    const nextAccess = res.data?.access_token as string | undefined;
    if (!nextAccess) return null;

    setAccessToken(nextAccess);
    return nextAccess;
  } catch {
    setAccessToken(null);
    return null;
  }
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
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

    if (status === 401 && !isAuthPath(originalRequest?.url)) {
      setAccessToken(null);
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);
