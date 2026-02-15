import "dotenv/config";
import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../src/lib/auth";
import invoiceRoutes from "./routes/invoice.routes";
import oauthCallbackRoutes from "./routes/oauth-callback.routes";
import userRoutes from "./routes/user.routes";

const app = express();
const port = Number(process.env.PORT ?? 5001);

// CORS configuration for cross-origin requests
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? [
      "http://localhost:5173",
      "http://localhost:5001",
      "https://invoicing-platform-2-0.vercel.app/"
    ],
    credentials: true,
  })
);

// IMPORTANT: Mount Better Auth handler BEFORE express.json()
// Better Auth needs the raw request for some flows
app.use("/api/auth", toNodeHandler(auth));

// Normal API routes can use JSON body parsing
app.use(express.json());

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Invoice routes
app.use("/api/invoices", invoiceRoutes);

// User routes (admin only)
app.use("/api/users", userRoutes);

// OAuth callback routes (mounted separately to avoid conflict with Better Auth)
app.use("/api/callback", oauthCallbackRoutes);

// Example protected API route
app.get("/api/submissions", async (req, res) => {
  try {
    // Verify session using Better Auth
    const session = await auth.api.getSession({
      headers: req.headers as any,
    });

    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Return data based on user role
    res.json({
      user: session.user,
      submissions: [], // Your data here
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start server with error handling
try {
  app.listen(port, () => {
    console.log(` Server listening on http://localhost:${port}`);
    console.log(` Auth endpoint: http://localhost:${port}/api/auth`);
  });
} catch (error) {
  console.error("Failed to start server:", error);
  process.exit(1);
}
