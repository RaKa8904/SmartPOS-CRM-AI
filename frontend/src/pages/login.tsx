import { useState } from "react";
import { useAuth } from "../context/useAuth";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await login(email, password);
      navigate("/");
    } catch {
      alert("Invalid credentials ❌");
    } finally {
      setLoading(false);
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

        {/* Email */}
        <input
          className="input-surface mb-3"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* Password */}
        <input
          type="password"
          className="input-surface mb-5"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {/* Button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn-primary w-full py-2.5"
        >
          {loading ? "Logging in..." : "Login"}
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
