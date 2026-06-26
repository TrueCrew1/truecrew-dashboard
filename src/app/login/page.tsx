import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useSession } from "@/context/AuthContext";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, isLoading: sessionLoading } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectPath =
    (location.state as { from?: string } | null)?.from ?? "/today";

  useEffect(() => {
    if (session) {
      navigate(redirectPath, { replace: true });
    }
  }, [session, navigate, redirectPath]);

  if (sessionLoading) {
    return (
      <div className="auth-page">
        <div className="auth-card auth-card--loading">
          <div className="auth-mark">TC</div>
          <p className="auth-loading-text">Loading…</p>
        </div>
      </div>
    );
  }

  if (session) {
    return <Navigate to={redirectPath} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const supabase = getSupabaseClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      navigate(redirectPath, { replace: true });
    } catch {
      setError("Unable to sign in. Check your Supabase configuration.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-mark">TC</div>
          <div>
            <h1 className="auth-title">
              True <em>Crew</em>
            </h1>
            <p className="auth-subtitle">Operations command center</p>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error ? <p className="auth-error">{error}</p> : null}

          <button
            type="submit"
            className="auth-submit topbar-btn primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="auth-footer">
          No account?{" "}
          <Link to="/signup" className="auth-link">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
