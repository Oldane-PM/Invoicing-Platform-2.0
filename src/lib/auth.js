import "dotenv/config";
import { betterAuth } from "better-auth";

const trimTrailingSlash = (value) => value.trim().replace(/\/+$/, "");

const getEnv = (key, fallback) => {
    const value = process.env[key];
    if (!value && !fallback) {
        console.warn(`⚠️  Missing env var: ${key}`);
        return "";
    }
    const result = value || fallback || "";
    const isSensitive = /SECRET|KEY|TOKEN|PASSWORD/i.test(key);
    console.log(`[ENV] ${key} = ${isSensitive ? "[set]" : result}`);
    return result;
};

const withHttps = (host) => {
    if (!host) return undefined;
    return host.startsWith("http://") || host.startsWith("https://")
        ? trimTrailingSlash(host)
        : `https://${trimTrailingSlash(host)}`;
};

const normalizeAppOrigin = (value) => trimTrailingSlash(value).replace(/\/api\/auth$/i, "");

const getBetterAuthBaseURL = () => {
    if (process.env.BETTER_AUTH_URL) {
        return normalizeAppOrigin(process.env.BETTER_AUTH_URL);
    }

    const vercelOrigin = withHttps(process.env.VERCEL_URL);
    if (vercelOrigin) {
        return normalizeAppOrigin(vercelOrigin);
    }

    return "http://localhost:5001";
};

const getOriginFromURL = (value) => {
    if (!value) return undefined;
    try {
        return new URL(withHttps(value) || value).origin;
    } catch {
        return undefined;
    }
};

const getTrustedOrigins = () => {
    const envOrigins = process.env.ALLOWED_ORIGINS?.split(",")
        .map((origin) => trimTrailingSlash(origin))
        .filter(Boolean);

    const defaults = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5001",
        "http://localhost:3000",
        "https://invoicing-platform-2-0.vercel.app",
        "https://invoicing-platform-20-production.up.railway.app",
    ];

    const derived = [
        process.env.FRONTEND_URL,
        withHttps(process.env.VERCEL_URL),
        withHttps(process.env.VERCEL_PROJECT_PRODUCTION_URL),
        getOriginFromURL(getBetterAuthBaseURL()),
    ];

    return Array.from(new Set([...(envOrigins?.length ? envOrigins : defaults), ...derived]
        .filter(Boolean)
        .map((origin) => trimTrailingSlash(origin))));
};

export const auth = betterAuth({
    baseURL: getBetterAuthBaseURL(),
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

    trustedOrigins: getTrustedOrigins(),

    advanced: {
        useSecureCookies: process.env.NODE_ENV === "production",
        defaultCookieAttributes: process.env.NODE_ENV === "production"
            ? { sameSite: "lax", secure: true, path: "/" }
            : undefined,
    },
});
