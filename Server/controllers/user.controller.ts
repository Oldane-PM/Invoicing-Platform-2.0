import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Admin client
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  role: "unassigned" | "contractor" | "manager" | "admin";
  contractStartDate?: string; // ISO date string
  contractEndDate?: string; // ISO date string
}

/**
 * Pre-register a new user (creates invitation)
 * POST /api/users
 */
export async function createUser(req: Request, res: Response) {
  try {
    const {
      firstName,
      lastName,
      email,
      role,
      contractStartDate,
      contractEndDate,
    } = req.body as CreateUserRequest;

    // Validation
    if (!firstName || !lastName || !email || !role) {
      return res.status(400).json({
        error: "Missing required fields: firstName, lastName, email, role",
      });
    }

    // Validate email domain
    if (!email.endsWith("@intellibus.com")) {
      return res.status(400).json({
        error: "Email must be an @intellibus.com address",
      });
    }

    // Validate role
    const validRoles = ["unassigned", "contractor", "manager", "admin"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        error: `Invalid role. Must be one of: ${validRoles.join(", ")}`,
      });
    }

    // Validate contract dates for contractors
    if (role === "contractor") {
      if (!contractStartDate || !contractEndDate) {
        return res.status(400).json({
          error: "Contract start and end dates are required for contractors",
        });
      }
    }

    console.log(`[createUser] Pre-registering user: ${email} with role: ${role}`);

    // Check if user already has a profile
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("email", email)
      .single();

    if (existingProfile) {
      console.log(`[createUser] User already exists in profiles: ${email}`);
      return res.status(409).json({
        error: "User already exists",
        details: `A user with email ${email} already has an account`,
      });
    }

    // Check if invitation already exists
    const { data: existingInvitation } = await supabaseAdmin
      .from("user_invitations")
      .select("email, used_at")
      .eq("email", email)
      .single();

    if (existingInvitation) {
      if (existingInvitation.used_at) {
        return res.status(409).json({
          error: "Invitation already used",
          details: `User ${email} has already signed in and claimed their invitation`,
        });
      } else {
        return res.status(409).json({
          error: "Invitation already exists",
          details: `An invitation for ${email} already exists. Delete it first to create a new one.`,
        });
      }
    }

    // Get the admin's profile ID for created_by
    const adminEmail = (req as any).user?.email;
    const { data: adminProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", adminEmail)
      .single();

    // Create invitation
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from("user_invitations")
      .insert({
        email: email.toLowerCase(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role: role.toUpperCase(),
        contract_start_date: role === "contractor" ? contractStartDate : null,
        contract_end_date: role === "contractor" ? contractEndDate : null,
        created_by: adminProfile?.id,
      })
      .select()
      .single();

    if (invitationError) {
      console.error("[createUser] Error creating invitation:", invitationError);
      return res.status(500).json({
        error: "Failed to create invitation",
        details: invitationError.message,
      });
    }

    console.log(`[createUser] Invitation created for: ${email}`);

    // Success!
    return res.status(201).json({
      success: true,
      invitation: {
        id: invitation.id,
        email,
        firstName,
        lastName,
        role,
      },
      message: `User ${firstName} ${lastName} has been pre-registered. They will be assigned the ${role} role when they sign in with Google.`,
    });
  } catch (error) {
    console.error("[createUser] Unexpected error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
