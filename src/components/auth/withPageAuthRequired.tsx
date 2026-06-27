import { Navigate, useLocation } from "react-router-dom";
import type { ComponentType } from "react";
import { useSession } from "@/context/AuthContext";

interface WithPageAuthRequiredOptions {
  redirectTo?: string;
}

function AuthLoadingScreen() {
  return (
    <div className="auth-page">
      <div className="auth-card auth-card--loading">
        <div className="auth-mark">TC</div>
        <p className="auth-loading-text">Verifying session…</p>
      </div>
    </div>
  );
}

export function withPageAuthRequired<P extends object>(
  Component: ComponentType<P>,
  options: WithPageAuthRequiredOptions = {},
) {
  const redirectTo = options.redirectTo ?? "/login";

  function AuthenticatedPage(props: P) {
    const { session, isLoading } = useSession();
    const location = useLocation();

    if (isLoading) {
      return <AuthLoadingScreen />;
    }

    if (!session) {
      return <Navigate to={redirectTo} state={{ from: location.pathname }} replace />;
    }

    return <Component {...props} />;
  }

  AuthenticatedPage.displayName = `withPageAuthRequired(${Component.displayName ?? Component.name ?? "Component"})`;

  return AuthenticatedPage;
}
