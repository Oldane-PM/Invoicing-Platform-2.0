import { createAuthClient } from "better-auth/react";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const getSameOrigin = () =>
  typeof window !== "undefined" ? window.location.origin : "";

// Better Auth should be same-origin in Vercel production so OAuth state cookies
// survive mobile and in-app browser redirects.
export const authBaseURL = trimTrailingSlash(
  import.meta.env.VITE_BETTER_AUTH_BASE_URL ||
    (import.meta.env.PROD
      ? getSameOrigin()
      : import.meta.env.VITE_AUTH_BASE_URL || "http://localhost:5001"),
);

export const authClient = createAuthClient({
  baseURL: authBaseURL,
});

export const { signIn, signOut, signUp, useSession } = authClient;
