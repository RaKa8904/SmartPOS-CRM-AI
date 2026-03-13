import { useState } from "react";
import { useAuth } from "../context/useAuth";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("cashier");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await register(email, username, password, role);
      navigate("/");
    } catch {
      alert("Registration failed ❌");
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
          Start using SmartPOS today
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
        <input
          type={showPassword ? "text" : "password"}
          className="input-surface mb-2"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <label className="flex items-center gap-2 text-xs text-slate-300/75 mb-4 select-none">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(e) => setShowPassword(e.target.checked)}
          />
          Show password
        </label>

        {/* Role */}
        <select
          className="input-surface mb-5"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="cashier">Cashier</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>

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
