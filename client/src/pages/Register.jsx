import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { ApiError } from "../lib/api.js";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (fullName.trim().length < 2) {
      setError("Enter your full name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      await register(email.trim(), password, fullName.trim());
      navigate("/shop");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not create the account. Try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-shell px-6 py-16">
      <h1 className="text-3xl font-semibold">Create account</h1>
      <form onSubmit={handleSubmit} className="mt-8 w-full max-w-sm space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-xs uppercase tracking-widest text-muted">
            Full name
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            className="mt-1.5 w-full border border-line bg-canvas px-3 py-2.5 text-sm focus:border-ink"
          />
        </div>
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
            autoComplete="new-password"
            className="mt-1.5 w-full border border-line bg-canvas px-3 py-2.5 text-sm focus:border-ink"
          />
          <p className="mt-1 text-xs text-muted">At least 8 characters.</p>
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
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link to="/login" className="text-ink underline underline-offset-4 hover:text-accent">
          Sign in
        </Link>
      </p>
    </div>
  );
}
