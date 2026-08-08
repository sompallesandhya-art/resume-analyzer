import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-base-deep via-base-mid to-base-deep px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-11 h-11 mx-auto rounded-lg bg-accent-violet flex items-center justify-center font-display font-bold text-white text-sm mb-4">
            RA
          </div>
          <h1 className="font-display font-bold text-2xl text-ink-primary tracking-tight">
            Welcome back
          </h1>
          <p className="font-body text-ink-secondary text-sm mt-1">
            Sign in to continue to Resume Analyzer
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/40 space-y-4"
        >
          <div>
            <label className="font-body text-xs text-ink-secondary mb-1.5 block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 font-body text-sm text-ink-primary placeholder:text-ink-faint focus:outline-none focus:border-accent-violet/50 transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-body text-xs text-ink-secondary">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="font-body text-xs text-accent-violet hover:text-accent-violet/80 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 font-body text-sm text-ink-primary placeholder:text-ink-faint focus:outline-none focus:border-accent-violet/50 transition-colors"
            />
          </div>

          {error && (
            <p className="text-accent-rose font-body text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full font-display font-semibold bg-accent-violet hover:bg-accent-violet/90 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl transition-colors"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <p className="text-center font-body text-sm text-ink-secondary">
            Don't have an account?{" "}
            <Link to="/signup" className="text-accent-violet hover:text-accent-violet/80 font-medium transition-colors">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
