import { Router, Request, Response } from "express";
import { createUser } from "../controllers/user.controller";
import { auth } from "../../src/lib/auth";

const router = Router();

/**
 * Middleware to verify admin access
 */
async function requireAdmin(req: Request, res: Response, next: Function) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers as any,
    });

    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check if user has admin role
    // Note: Better Auth user IDs are not UUIDs, so we need to look up by email
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const userEmail = session.user.email;
    if (!userEmail) {
      console.error("[requireAdmin] No email in session");
      return res.status(401).json({ error: "Unauthorized" });
    }

    console.log("[requireAdmin] User email:", userEmail);

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role, id")
      .eq("email", userEmail)
      .single();

    console.log("[requireAdmin] Profile:", profile);
    console.log("[requireAdmin] Error:", error);

    if (error || !profile) {
      console.error("[requireAdmin] Failed to fetch profile:", error);
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    // Check role (case-insensitive)
    const userRole = profile.role?.toUpperCase();
    if (userRole !== "ADMIN") {
      console.log(`[requireAdmin] Access denied. User role: ${userRole}`);
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    console.log("[requireAdmin] Admin access granted");

    // Attach user to request for use in controllers
    (req as any).user = session.user;
    (req as any).profileId = profile.id; // Add the actual Supabase UUID
    next();
  } catch (error) {
    console.error("[requireAdmin] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * POST /api/users
 * Create a new user (admin only)
 */
router.post("/", requireAdmin, createUser);

export default router;
