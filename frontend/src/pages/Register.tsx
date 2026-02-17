import { useState } from "react";
import { useAuth } from "../context/useAuth";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await register(email, password);
      navigate("/");
    } catch {
      alert("Registration failed ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-96 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-zinc-100 mb-1">
          Create account
        </h2>
        <p className="text-sm text-zinc-400 mb-5">
          Start using SmartPOS today
        </p>

        {/* Email */}
        <input
          className="w-full mb-3 p-2.5 rounded-lg bg-zinc-800
                     text-zinc-100 placeholder-zinc-500
                     border border-zinc-700
                     focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* Password */}
        <input
          type="password"
          className="w-full mb-4 p-2.5 rounded-lg bg-zinc-800
                     text-zinc-100 placeholder-zinc-500
                     border border-zinc-700
                     focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {/* Button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-2.5 rounded-lg font-medium text-white
                     bg-indigo-600 hover:bg-indigo-500
                     transition disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Register"}
        </button>

        {/* Login link */}
        <p className="text-sm text-zinc-400 mt-4 text-center">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-indigo-400 hover:text-indigo-300 hover:underline"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
