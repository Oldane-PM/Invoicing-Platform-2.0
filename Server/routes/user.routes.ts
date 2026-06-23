import { Router, Request, Response } from "express";
import { createUser } from "../controllers/user.controller";
import { auth } from "../../src/lib/auth";

const router = Router();

function getCurrentWorkOrder(workOrders: any[]): any | null {
  if (!workOrders || workOrders.length === 0) return null;

  const todayStr = new Date().toISOString().substring(0, 10);

  // 1. Try to find an active one (start_date <= today and end_date >= today)
  const activeOrder = workOrders.find(
    (wo: any) => wo.start_date <= todayStr && wo.end_date >= todayStr
  );
  if (activeOrder) return activeOrder;

  // 2. If no active one, find the one with the latest start_date
  return [...workOrders].sort((a, b) => b.start_date.localeCompare(a.start_date))[0] || null;
}

/**
 * Middleware to verify manager or admin access
 */
async function requireManagerOrAdmin(req: Request, res: Response, next: Function) {
  try {
    // 1. Check for Bearer token (Supabase auth)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, id")
          .eq("id", user.id)
          .single();
        if (profile) {
          const userRole = profile.role?.toUpperCase();
          if (userRole === "ADMIN" || userRole === "MANAGER") {
            (req as any).user = user;
            (req as any).profileId = profile.id;
            return next();
          }
        }
      }
    }

    // 2. Fallback to Better Auth session
    const session = await auth.api.getSession({
      headers: req.headers as any,
    });

    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const userEmail = session.user.email;
    if (!userEmail) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role, id")
      .eq("email", userEmail)
      .single();

    if (error || !profile) {
      return res.status(403).json({ error: "Forbidden: Access denied" });
    }

    const userRole = profile.role?.toUpperCase();
    if (userRole !== "ADMIN" && userRole !== "MANAGER") {
      return res.status(403).json({ error: "Forbidden: Access denied" });
    }

    (req as any).user = session.user;
    (req as any).profileId = profile.id;
    next();
  } catch (error) {
    console.error("[requireManagerOrAdmin] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

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

/**
 * GET /api/users/contractors
 * Get all contractors on the platform (manager/admin only)
 * Bypasses RLS to fetch complete data (including completed work orders)
 */
router.get("/contractors", requireManagerOrAdmin, async (_req: Request, res: Response) => {
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Get profiles for all contractors
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .ilike("role", "contractor");

    if (profilesError) {
      return res.status(500).json({ error: profilesError.message });
    }

    const contractorIds = (profilesData || []).map((p: any) => p.id);
    if (contractorIds.length === 0) {
      return res.json([]);
    }

    // 2. Get contractor details from contractors table
    const { data: contractorsData, error: contractorsError } = await supabase
      .from("contractors")
      .select("contractor_id, hourly_rate, overtime_rate, default_project_name, contract_start, contract_end, is_active")
      .in("contractor_id", contractorIds);

    if (contractorsError) {
      console.error("[GetContractors] Contractors query error:", contractorsError);
    }

    // 3. Get completed system work orders for all contractors
    const { data: workOrdersData, error: workOrdersError } = await supabase
      .from("system_work_orders")
      .select("contractor_user_id, pay_type, pay_amount, start_date, end_date, status")
      .in("contractor_user_id", contractorIds)
      .eq("status", "COMPLETED");

    if (workOrdersError) {
      console.error("[GetContractors] Work orders query error:", workOrdersError);
    }

    const profilesMap = new Map((profilesData || []).map((p: any) => [p.id, p]));
    const contractorsMap = new Map(
      (contractorsData || []).map((c: any) => [c.contractor_id, c])
    );

    // Group work orders by contractor
    const workOrdersMap = new Map<string, any[]>();
    (workOrdersData || []).forEach((wo: any) => {
      const list = workOrdersMap.get(wo.contractor_user_id) || [];
      list.push(wo);
      workOrdersMap.set(wo.contractor_user_id, list);
    });

    const result = contractorIds
      .map((contractorId: string) => {
        const profile = profilesMap.get(contractorId);
        const contractor = contractorsMap.get(contractorId);
        const contractorWorkOrders = workOrdersMap.get(contractorId) || [];
        const currentWorkOrder = getCurrentWorkOrder(contractorWorkOrders);

        if (!profile) return null;

        return {
          id: contractorId,
          fullName: profile.full_name || "Unknown",
          email: profile.email || "",
          hourlyRate: currentWorkOrder ? currentWorkOrder.pay_amount : (contractor?.hourly_rate || 0),
          overtimeRate: currentWorkOrder && currentWorkOrder.pay_type === "Hourly"
            ? currentWorkOrder.pay_amount * 1.5
            : (contractor?.overtime_rate || 0),
          projectName: contractor?.default_project_name || null,
          contractType: currentWorkOrder ? currentWorkOrder.pay_type : "Hourly",
          contractStart: currentWorkOrder ? currentWorkOrder.start_date : (contractor?.contract_start || null),
          contractEnd: currentWorkOrder ? currentWorkOrder.end_date : (contractor?.contract_end || null),
          isActive: contractor?.is_active ?? true,
        };
      })
      .filter((c: any) => c !== null);

    return res.json(result);
  } catch (error) {
    console.error("[GetContractors] Unexpected error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PATCH /api/users/:userId/role
 * Update a user's role (admin only)
 * Uses the service role key to bypass RLS and guarantee the update persists
 */
router.patch("/:userId/role", requireAdmin, async (req: Request, res: Response) => {
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
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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
  } catch (error) {
    console.error('[UpdateRole] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/users/:userId
 * Delete a user (admin only). Admins cannot delete themselves.
 * Removes from profiles, app_users, and contractors tables.
 */
router.delete("/:userId", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const adminProfileId = (req as any).profileId;

    // Prevent self-deletion
    if (userId === adminProfileId) {
      return res.status(403).json({ error: "You cannot delete your own account" });
    }

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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
    const { error: authError } = await supabase.auth.admin.deleteUser(userId as string);
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
  } catch (error) {
    console.error("[DeleteUser] Unexpected error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

