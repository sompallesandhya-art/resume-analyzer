import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message || "Unable to send reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-base-deep via-base-mid to-base-deep px-4">
        <div className="w-full max-w-sm glass-panel rounded-3xl p-8 text-center shadow-2xl shadow-black/40">
          <div className="w-12 h-12 mx-auto rounded-full bg-accent-emerald/15 flex items-center justify-center text-accent-emerald text-2xl mb-4">
            ✓
          </div>
          <h1 className="font-display font-bold text-xl text-ink-primary mb-2">
            Check your email
          </h1>
          <p className="font-body text-ink-secondary text-sm leading-relaxed mb-6">
            If an account exists for <span className="text-ink-primary">{email}</span>,
            we've sent a password reset link. Click it to choose a new password.
          </p>
          <Link
            to="/login"
            className="font-display font-semibold text-sm text-accent-violet hover:text-accent-violet/80 transition-colors"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-base-deep via-base-mid to-base-deep px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-11 h-11 mx-auto rounded-lg bg-accent-violet flex items-center justify-center font-display font-bold text-white text-sm mb-4">
            RA
          </div>
          <h1 className="font-display font-bold text-2xl text-ink-primary tracking-tight">
            Reset your password
          </h1>
          <p className="font-body text-ink-secondary text-sm mt-1">
            Enter your email and we'll send you a reset link
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

          {error && (
            <p className="text-accent-rose font-body text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full font-display font-semibold bg-accent-violet hover:bg-accent-violet/90 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl transition-colors"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>

          <p className="text-center font-body text-sm text-ink-secondary">
            Remember your password?{" "}
            <Link to="/login" className="text-accent-violet hover:text-accent-violet/80 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
