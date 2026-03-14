import { useState } from "react";
import { useAuth } from "../context/useAuth";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import type { AxiosError } from "axios";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [inviteToken, setInviteToken] = useState(searchParams.get("invite") ?? "");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await register(email, username, password, inviteToken || undefined);
      navigate("/");
    } catch (err: unknown) {
      const detail = (err as AxiosError<{ detail?: string }>)?.response?.data?.detail;
      alert((detail ?? "Registration failed") + " ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md glass-card rounded-2xl p-6 md:p-7 shadow-lg fade-in">
        <p className="text-xs uppercase tracking-[0.18em] text-cyan-200/80 mb-2">Onboarding</p>
        <h2 className="text-2xl font-semibold text-zinc-100 mb-1">
          Create account
        </h2>
        <p className="text-sm text-slate-300/75 mb-6">
          Join SmartPOS with your admin invite token
        </p>

        {/* Email */}
        <input
          className="input-surface mb-3"
          placeholder="Full name / Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          className="input-surface mb-3"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* Password */}
        <div className="relative mb-4">
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

        <input
          className="input-surface mb-5"
          placeholder="Invite Token"
          value={inviteToken}
          onChange={(e) => setInviteToken(e.target.value)}
        />

        {/* Button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn-primary w-full py-2.5"
        >
          {loading ? "Creating account..." : "Register"}
        </button>

        {/* Login link */}
        <p className="text-sm text-slate-300/75 mt-4 text-center">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-cyan-200 hover:text-cyan-100 hover:underline"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
