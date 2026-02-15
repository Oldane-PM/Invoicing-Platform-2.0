import { createAuthClient } from "better-auth/react";

// Backend auth URL: use env in production (Vercel etc.), localhost in dev
const baseURL = import.meta.env.VITE_AUTH_BASE_URL || "http://localhost:5001";

export const authClient = createAuthClient({
  baseURL,
});

export const { signIn, signOut, signUp, useSession } = authClient;
