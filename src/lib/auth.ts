import "dotenv/config";
import { betterAuth } from "better-auth";

const getEnv = (key: string, fallback?: string): string => {
  const value = process.env[key];
  if (!value && !fallback) {
    console.warn(`⚠️  Missing env var: ${key}`);
    return "";
  }
  const result = value || fallback || "";
  console.log(`[ENV] ${key} = ${result}`);
  return result;
};

export const auth = betterAuth({
  baseURL: getEnv("BETTER_AUTH_URL", "http://localhost:5001/api/auth"),
  basePath: "/api/auth",
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

  trustedOrigins: (() => {
    const list = process.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim().replace(/\/+$/, "")).filter(Boolean) ?? [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5001",
      "http://localhost:3000",
      "https://invoicing-platform-2-0.vercel.app",
      "https://invoicing-platform-20-production.up.railway.app",
    ];
    return list;
  })(),

  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    crossSubDomainCookies: {
      enabled: true,
    },
    // Required for cross-origin OAuth when frontend (Vercel) and backend (Railway) differ
    defaultCookieAttributes:
      process.env.NODE_ENV === "production"
        ? { sameSite: "none" as const, secure: true }
        : undefined,
  },
});
