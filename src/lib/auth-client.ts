import { createAuthClient } from "better-auth/react";

// Use environment variable or fallback to current origin (works via Vite proxy)
const baseURL = import.meta.env.VITE_AUTH_BASE_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:5001");

export const authClient = createAuthClient({
  baseURL,
});

export const { signIn, signOut, signUp, useSession } = authClient;
