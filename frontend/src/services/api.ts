import axios from "axios";
import { getAccessToken } from "../api";

const getBaseURL = () => {
  const url = import.meta.env.VITE_API_URL;
  if (!url) return "http://127.0.0.1:8000";
  return url.startsWith("http") ? url : `https://${url}`;
};

export const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
