/**
 * Typed access to public environment variables.
 * Add server-only vars in a separate module if needed.
 */
export function getPublicEnv() {
  return {
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  };
}
