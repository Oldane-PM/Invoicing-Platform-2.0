import { Router } from "express";
import { createSupabaseOAuthSession } from "../services/supabaseOAuthSession";

const router = Router();

/**
 * OAuth Callback Handler
 *
 * This endpoint is called after Better Auth completes Google OAuth.
 * It creates a Supabase session for the authenticated user.
 *
 * Idempotent: Safe to call multiple times for the same user.
 */
router.post("/supabase", async (req, res) => {
  console.log("[OAuth Callback Route] POST /supabase endpoint hit!");
  const result = await createSupabaseOAuthSession(req.headers);
  return res.status(result.status).json(result.body);
});

export default router;
