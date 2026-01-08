import "dotenv/config";
import { betterAuth } from "better-auth";

const getEnv = (key: string, fallback?: string): string => {
  const value = process.env[key];
  if (!value && !fallback) {
    console.warn(`⚠️  Missing env var: ${key}`);
    return "";
  }
  return value || fallback || "";
};

export const auth = betterAuth({
  baseURL: getEnv("BETTER_AUTH_URL", "http://localhost:5001"),
  secret: getEnv("BETTER_AUTH_SECRET", "development-secret-change-in-production"),

  // Stateless session management (no database required)
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 7 * 24 * 60 * 60, // 7 days
      strategy: "jwe",
      refreshCache: true,
    },
  },

  account: {
    storeStateStrategy: "cookie",
    storeAccountCookie: true,
  },

  socialProviders: {
    google: {
      clientId: getEnv("GOOGLE_CLIENT_ID", ""),
      clientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
    },
  },

  trustedOrigins: [
    "http://localhost:5173",
    "http://localhost:5174", // Added for when Vite uses alternate port
    "http://localhost:5001",
    "http://localhost:3000",
  ],

  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
});
