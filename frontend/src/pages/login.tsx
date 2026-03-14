import { useState } from "react";
import { useAuth } from "../context/useAuth";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { api } from "../api";
import type { AxiosError } from "axios";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetMode, setResetMode] = useState(Boolean(searchParams.get("reset_token")));
  const [resetEmail, setResetEmail] = useState(searchParams.get("email") ?? "");
  const [resetToken, setResetToken] = useState(searchParams.get("reset_token") ?? "");
  const [resetPassword, setResetPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await login(email, password);
      navigate("/");
    } catch (err: unknown) {
      const detail = (err as AxiosError<{ detail?: string }>)?.response?.data?.detail;
      alert((detail ?? "Invalid credentials") + " ❌");
    } finally {
      setLoading(false);
    }
  };

  const requestPasswordReset = async () => {
    if (!resetEmail.trim()) {
      alert("Enter email first");
      return;
    }
    try {
      await api.post("/auth/password-reset/request", { email: resetEmail.trim() });
      alert("If the email exists, reset instructions were sent.");
    } catch {
      alert("Unable to request password reset");
    }
  };

  const confirmPasswordReset = async () => {
    if (!resetToken.trim() || !resetPassword.trim()) {
      alert("Enter reset token and new password");
      return;
    }
    try {
      await api.post("/auth/password-reset/confirm", {
        token: resetToken.trim(),
        new_password: resetPassword,
      });
      alert("Password reset successful. You can login now.");
      setResetMode(false);
      setResetToken("");
      setResetPassword("");
    } catch {
      alert("Invalid or expired reset token");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md glass-card rounded-2xl p-6 md:p-7 shadow-lg fade-in">
        <p className="text-xs uppercase tracking-[0.18em] text-cyan-200/80 mb-2">Secure Access</p>
        <h2 className="text-2xl font-semibold text-zinc-100 mb-1">
          Welcome back
        </h2>
        <p className="text-sm text-slate-300/75 mb-6">
          Login to continue to SmartPOS
        </p>

        {resetMode && (
          <div className="mb-4 rounded-xl border border-cyan-300/25 bg-cyan-400/8 p-3 space-y-2">
            <p className="text-xs text-cyan-100 font-semibold">Password Reset</p>
            <input
              className="input-surface"
              placeholder="Email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
            />
            <button onClick={requestPasswordReset} className="input-surface py-2 text-sm">
              Request Reset Token
            </button>
            <input
              className="input-surface"
              placeholder="Reset Token"
              value={resetToken}
              onChange={(e) => setResetToken(e.target.value)}
            />
            <input
              type="password"
              className="input-surface"
              placeholder="New Password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
            />
            <button onClick={confirmPasswordReset} className="btn-primary w-full py-2">
              Confirm Password Reset
            </button>
          </div>
        )}

        {/* Email */}
        <input
          className="input-surface mb-3"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* Password */}
        <div className="relative mb-5">
          <input
            type={showPassword ? "text" : "password"}
            className="input-surface pr-11"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 px-3 text-slate-300/80 hover:text-cyan-100 transition"
            aria-label={showPassword ? "Hide password" : "Show password"}
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 3l18 18" />
                <path d="M10.5 10.5a3 3 0 014.2 4.2" />
                <path d="M9.88 5.09A10.94 10.94 0 0112 4.9c5.05 0 9.27 3.11 10.5 7.5a11.8 11.8 0 01-3.45 5.29" />
                <path d="M6.61 6.61A11.86 11.86 0 001.5 12.4c1.23 4.39 5.45 7.5 10.5 7.5 1.89 0 3.67-.43 5.24-1.19" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M1.5 12s4.2-7.5 10.5-7.5S22.5 12 22.5 12s-4.2 7.5-10.5 7.5S1.5 12 1.5 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>

        {/* Button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn-primary w-full py-2.5"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <button
          type="button"
          onClick={() => setResetMode((v) => !v)}
          className="w-full mt-3 text-xs text-cyan-200 hover:text-cyan-100"
        >
          {resetMode ? "Back to login" : "Forgot password?"}
        </button>

        {/* Register link */}
        <p className="text-sm text-slate-300/75 mt-4 text-center">
          Don’t have an account?{" "}
          <Link
            to="/register"
            className="text-cyan-200 hover:text-cyan-100 hover:underline"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
