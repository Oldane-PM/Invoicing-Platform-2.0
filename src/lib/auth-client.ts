import { createAuthClient } from "better-auth/react";

// Use the backend URL directly for OAuth to avoid proxy cookie issues
const baseURL = "http://localhost:5001";

export const authClient = createAuthClient({
  baseURL,
});

export const { signIn, signOut, signUp, useSession } = authClient;
