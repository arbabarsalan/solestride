import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { ApiError } from "../lib/api.js";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate("/shop");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not sign in. Try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-shell px-6 py-16">
      <h1 className="text-3xl font-semibold">Sign in</h1>
      <form onSubmit={handleSubmit} className="mt-8 w-full max-w-sm space-y-4">
        <div>
          <label htmlFor="email" className="block text-xs uppercase tracking-widest text-muted">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="mt-1.5 w-full border border-line bg-canvas px-3 py-2.5 text-sm focus:border-ink"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-xs uppercase tracking-widest text-muted">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="mt-1.5 w-full border border-line bg-canvas px-3 py-2.5 text-sm focus:border-ink"
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-ink py-3 text-sm font-medium text-white transition-colors hover:bg-accent disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-sm text-muted">
        New to LIBAS?{" "}
        <Link to="/register" className="text-ink underline underline-offset-4 hover:text-accent">
          Create an account
        </Link>
      </p>
    </div>
  );
}
