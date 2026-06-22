import { Router } from "express";
import { createUser } from "../controllers/user.controller";
import { auth } from "../../src/lib/auth";
const router = Router();
/**
 * Middleware to verify admin access
 */
async function requireAdmin(req, res, next) {
    try {
        const session = await auth.api.getSession({
            headers: req.headers,
        });
        if (!session) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        // Check if user has admin role
        // Note: Better Auth user IDs are not UUIDs, so we need to look up by email
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
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
        req.user = session.user;
        req.profileId = profile.id; // Add the actual Supabase UUID
        next();
    }
    catch (error) {
        console.error("[requireAdmin] Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}
/**
 * POST /api/users
 * Create a new user (admin only)
 */
router.post("/", requireAdmin, createUser);
/**
 * PATCH /api/users/:userId/role
 * Update a user's role (admin only)
 * Uses the service role key to bypass RLS and guarantee the update persists
 */
router.patch("/:userId/role", requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;
        if (!role) {
            return res.status(400).json({ error: "Role is required" });
        }
        const validRoles = ['admin', 'manager', 'contractor', 'unassigned'];
        if (!validRoles.includes(role.toLowerCase())) {
            return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
        }
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        // Update profiles table (primary source of truth)
        const { data: updatedProfile, error: profileError } = await supabase
            .from('profiles')
            .update({ role: role.toLowerCase() })
            .eq('id', userId)
            .select('id, role')
            .single();
        if (profileError) {
            console.error('[UpdateRole] Error updating profiles:', profileError);
            return res.status(500).json({ error: 'Failed to update user role' });
        }
        if (!updatedProfile) {
            return res.status(404).json({ error: 'User not found' });
        }
        console.log('[UpdateRole] Profile role updated:', updatedProfile.id, '->', updatedProfile.role);
        // Also sync app_users table (non-fatal)
        const { error: appUserError } = await supabase
            .from('app_users')
            .update({ role: role.toLowerCase() })
            .eq('id', userId);
        if (appUserError) {
            console.error('[UpdateRole] Error syncing app_users (non-fatal):', appUserError);
        }
        return res.json({
            success: true,
            userId: updatedProfile.id,
            role: updatedProfile.role
        });
    }
    catch (error) {
        console.error('[UpdateRole] Unexpected error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * DELETE /api/users/:userId
 * Delete a user (admin only). Admins cannot delete themselves.
 * Removes from profiles, app_users, and contractors tables.
 */
router.delete("/:userId", requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const adminProfileId = req.profileId;
        // Prevent self-deletion
        if (userId === adminProfileId) {
            return res.status(403).json({ error: "You cannot delete your own account" });
        }
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        // 1) Get user info before deleting (for logging)
        const { data: profile } = await supabase
            .from("profiles")
            .select("email, full_name, role")
            .eq("id", userId)
            .single();
        if (!profile) {
            return res.status(404).json({ error: "User not found" });
        }
        console.log('[DeleteUser] Deleting user:', profile.email, '- requested by admin:', adminProfileId);
        // 2) Delete from contractors table (if exists)
        const { error: contractorError } = await supabase
            .from("contractors")
            .delete()
            .eq("contractor_id", userId);
        if (contractorError) {
            console.error("[DeleteUser] Error deleting contractor record (non-fatal):", contractorError);
        }
        // 3) Delete from app_users table
        const { error: appUserError } = await supabase
            .from("app_users")
            .delete()
            .eq("id", userId);
        if (appUserError) {
            console.error("[DeleteUser] Error deleting app_users record (non-fatal):", appUserError);
        }
        // 4) Nullify foreign key references that don't have ON DELETE CASCADE/SET NULL
        //    These would block the profiles row deletion otherwise
        await supabase
            .from("submissions")
            .update({ approved_by: null })
            .eq("approved_by", userId);
        await supabase
            .from("submissions")
            .update({ rejected_by: null })
            .eq("rejected_by", userId);
        await supabase
            .from("user_invitations")
            .update({ created_by: null })
            .eq("created_by", userId);
        // 5) Delete from profiles table (primary — cascades to contractors, manager_teams, notifications, etc.)
        const { error: profileError } = await supabase
            .from("profiles")
            .delete()
            .eq("id", userId);
        if (profileError) {
            console.error("[DeleteUser] Error deleting profile:", profileError);
            return res.status(500).json({ error: "Failed to delete user: " + profileError.message });
        }
        // 6) Delete from Supabase auth (remove their auth account entirely)
        const { error: authError } = await supabase.auth.admin.deleteUser(userId);
        if (authError) {
            console.error("[DeleteUser] Error deleting auth user (non-fatal):", authError);
            // Non-fatal — profile is already gone
        }
        console.log('[DeleteUser] User deleted successfully:', profile.email);
        return res.json({
            success: true,
            deletedUser: {
                id: userId,
                email: profile.email,
                fullName: profile.full_name,
            },
        });
    }
    catch (error) {
        console.error("[DeleteUser] Unexpected error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
export default router;
