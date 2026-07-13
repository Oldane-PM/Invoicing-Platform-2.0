import type { IncomingHttpHeaders } from "http";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../../src/lib/auth.js";
import { getSupabaseAdmin } from "../clients/supabase.server.js";

type AuthHeaders = IncomingHttpHeaders | Headers;

type OAuthSessionResult = {
  status: number;
  body: {
    success: boolean;
    error?: string;
    user?: {
      id: string;
      email: string;
      role: string;
      fullName: string | null;
      isActive: boolean;
    };
    session?: {
      token: string;
      type: string;
      email: string;
    };
  };
};

const jsonResult = (
  status: number,
  body: OAuthSessionResult["body"],
): OAuthSessionResult => ({ status, body });

function normalizeHeaders(headers: AuthHeaders): Headers {
  return headers instanceof Headers ? headers : fromNodeHeaders(headers);
}

/**
 * Gets or creates an auth user for the given email.
 * First checks profiles table (faster, avoids listUsers API issues).
 * Only creates if user doesn't exist.
 * Returns the auth user ID.
 */
async function getOrCreateAuthUser(
  email: string,
  metadata?: { full_name?: string; role?: string },
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const normalizedEmail = email.toLowerCase();

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existingProfile) {
    console.log("[OAuth Callback] User already exists in profiles:", existingProfile.id);
    return existingProfile.id;
  }

  console.log("[OAuth Callback] Creating new auth user for:", email);
  const { data, error } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    email_confirm: true,
    user_metadata: metadata,
  });

  if (error) {
    if (error.code === "email_exists" || error.status === 422) {
      console.log("[OAuth Callback] Email already exists in auth.users, recovering user ID via generateLink...");

      const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: normalizedEmail,
      });

      if (linkErr || !linkData?.user) {
        console.error("[OAuth Callback] generateLink fallback failed:", linkErr);
        throw new Error(`Cannot recover auth user for: ${email}`);
      }

      const recoveredId = linkData.user.id;
      console.log("[OAuth Callback] Recovered auth user ID:", recoveredId);

      console.log("[OAuth Callback] Recreating missing profile for recovered user...");
      const { error: profileCreateErr } = await supabase
        .from("profiles")
        .upsert(
          {
            id: recoveredId,
            email: normalizedEmail,
            full_name: metadata?.full_name || normalizedEmail.split("@")[0],
            role: metadata?.role || "contractor",
            is_active: true,
          },
          { onConflict: "id" },
        );

      if (profileCreateErr) {
        console.error("[OAuth Callback] Error recreating profile:", profileCreateErr);
      }

      return recoveredId;
    }
    throw error;
  }

  if (!data.user) {
    throw new Error("Failed to create auth user - no user returned");
  }

  return data.user.id;
}

/**
 * Creates the Supabase session used by the React app after Better Auth finishes
 * Google OAuth. This is shared by the long-running Express server and Vercel's
 * serverless callback route so production auth behavior stays identical.
 */
export async function createSupabaseOAuthSession(
  headers: AuthHeaders,
): Promise<OAuthSessionResult> {
  const supabase = getSupabaseAdmin();

  try {
    console.log("[OAuth Callback] Starting Supabase session creation...");

    const session = await auth.api.getSession({
      headers: normalizeHeaders(headers),
    });

    if (!session || !session.user) {
      console.error("[OAuth Callback] No Better Auth session found");
      return jsonResult(401, {
        success: false,
        error: "No active session",
      });
    }

    const { email, id: userId, name } = session.user;
    console.log("[OAuth Callback] Better Auth user:", { email, userId, name });

    if (!email) {
      console.error("[OAuth Callback] No email in session");
      return jsonResult(400, {
        success: false,
        error: "Email not found in session",
      });
    }

    if (!email.toLowerCase().endsWith("@intellibus.com")) {
      console.log("[OAuth Callback] Non-Intellibus email blocked:", email);
      return jsonResult(403, {
        success: false,
        error: "Access restricted to Intellibus accounts only. Please sign in with your @intellibus.com email.",
      });
    }

    const { data: unusedInvitation } = await supabase
      .from("user_invitations")
      .select("*")
      .eq("email", email.toLowerCase())
      .is("used_at", null)
      .maybeSingle();

    const { data: anyInvitation } = !unusedInvitation
      ? await supabase
          .from("user_invitations")
          .select("*")
          .eq("email", email.toLowerCase())
          .order("created_at", { ascending: false })
          .limit(1)
          .single()
      : { data: null };

    const invitation = unusedInvitation || anyInvitation;
    const isInvitationAlreadyUsed = !unusedInvitation && !!anyInvitation;
    const isIntellibusEmail = email.toLowerCase().endsWith("@intellibus.com");
    let roleToAssign = isIntellibusEmail ? "contractor" : "unassigned";
    let fullName = name || email.split("@")[0];

    if (isIntellibusEmail && !invitation) {
      console.log("[OAuth Callback] Intellibus email detected without invitation, defaulting to contractor:", email);
    }

    if (invitation) {
      console.log("[OAuth Callback] Found invitation for:", email, "with role:", invitation.role, "already used:", isInvitationAlreadyUsed);
      roleToAssign = invitation.role.toLowerCase();
      fullName = invitation.first_name && invitation.last_name
        ? `${invitation.first_name} ${invitation.last_name}`
        : fullName;
    }

    console.log("[OAuth Callback] Getting or creating auth user for:", email);

    const authUserId = await getOrCreateAuthUser(email, {
      full_name: fullName,
      role: roleToAssign,
    });

    console.log("[OAuth Callback] Using auth user:", authUserId);

    let existingIsActive = true;

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("role, full_name, is_active")
      .eq("id", authUserId)
      .maybeSingle();

    if (existingProfile) {
      existingIsActive = existingProfile.is_active !== false;

      if (existingProfile.role && existingProfile.role !== "unassigned") {
        console.log("[OAuth Callback] User already has role in profiles:", existingProfile.role, "- preserving it");
        roleToAssign = existingProfile.role;
        fullName = existingProfile.full_name || fullName;
      } else if (roleToAssign === "unassigned") {
        const { data: appUser } = await supabase
          .from("app_users")
          .select("role, full_name, is_active")
          .eq("email", email.toLowerCase())
          .maybeSingle();

        if (appUser?.role && appUser.role !== "unassigned" && appUser.role !== null) {
          console.log("[OAuth Callback] Found role in app_users:", appUser.role);
          roleToAssign = appUser.role.toLowerCase();
          fullName = appUser.full_name || fullName;
        }
        if (appUser && appUser.is_active === false) {
          existingIsActive = false;
        }
      }
    }

    if (!existingIsActive) {
      console.log("[OAuth Callback] User is disabled, blocking login:", email);
      return jsonResult(403, {
        success: false,
        error: "Account is disabled. Please contact an administrator.",
      });
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: authUserId,
          email: email.toLowerCase(),
          role: roleToAssign,
          full_name: fullName,
          is_active: true,
        },
        { onConflict: "id" },
      );

    if (profileError) {
      console.error("[OAuth Callback] Error upserting profile:", profileError);
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          role: roleToAssign,
          full_name: fullName,
          is_active: true,
        })
        .eq("id", authUserId);

      if (updateError) {
        console.error("[OAuth Callback] Error updating profile:", updateError);
      }
    }

    const { error: appUserSyncError } = await supabase
      .from("app_users")
      .upsert(
        {
          id: authUserId,
          email: email.toLowerCase(),
          role: roleToAssign,
          full_name: fullName,
          is_active: true,
        },
        { onConflict: "id" },
      );

    if (appUserSyncError) {
      console.error("[OAuth Callback] Error syncing app_users:", appUserSyncError);
    } else {
      console.log("[OAuth Callback] app_users synced with role:", roleToAssign);
    }

    const isContractorFromInvitation =
      invitation &&
      invitation.role === "CONTRACTOR" &&
      invitation.contract_start_date &&
      invitation.contract_end_date;
    const isAutoAssignedContractor =
      isIntellibusEmail && roleToAssign === "contractor" && !invitation;

    if (isContractorFromInvitation || isAutoAssignedContractor) {
      const { data: existingContractor } = await supabase
        .from("contractors")
        .select("contractor_id")
        .eq("contractor_id", authUserId)
        .maybeSingle();

      if (!existingContractor) {
        const contractStart = isContractorFromInvitation
          ? invitation.contract_start_date
          : new Date().toISOString().split("T")[0];
        const contractEnd = isContractorFromInvitation
          ? invitation.contract_end_date
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

        console.log("[OAuth Callback] Creating contractor record for:", email, isAutoAssignedContractor ? "(auto-assigned Intellibus)" : "(from invitation)");

        const { error: contractorError } = await supabase
          .from("contractors")
          .insert({
            contractor_id: authUserId,
            contract_start: contractStart,
            contract_end: contractEnd,
            hourly_rate: null,
            overtime_rate: null,
            is_active: true,
          });

        if (contractorError) {
          if (contractorError.code === "23505") {
            console.log("[OAuth Callback] Contractor record already exists (race condition handled)");
          } else {
            console.error("[OAuth Callback] Error creating contractor record:", contractorError);
          }
        } else {
          console.log("[OAuth Callback] Contractor record created");
        }
      } else {
        console.log("[OAuth Callback] Contractor record already exists, skipping creation");
      }


    }

    if (invitation && !isInvitationAlreadyUsed) {
      console.log("[OAuth Callback] Marking invitation as used");
      await supabase
        .from("user_invitations")
        .update({
          used_at: new Date().toISOString(),
          used_by_user_id: authUserId,
        })
        .eq("id", invitation.id);

      console.log("[OAuth Callback] Invitation marked as used");
    } else if (isInvitationAlreadyUsed) {
      console.log("[OAuth Callback] Invitation already used, skipping mark-used step");
    }

    const { data: userProfile, error: fetchProfileError } = await supabase
      .from("profiles")
      .select("id, email, role, full_name, is_active")
      .eq("id", authUserId)
      .single();

    if (fetchProfileError || !userProfile) {
      console.error("[OAuth Callback] Error fetching profile:", fetchProfileError);
      return jsonResult(500, {
        success: false,
        error: "Failed to fetch user profile",
      });
    }

    if (!userProfile.is_active) {
      console.log("[OAuth Callback] User is disabled:", email);
      return jsonResult(403, {
        success: false,
        error: "Account is disabled. Please contact an administrator.",
      });
    }

    const { data: otpData, error: otpError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (otpError || !otpData) {
      console.error("[OAuth Callback] Error generating magic link:", otpError);
      return jsonResult(500, {
        success: false,
        error: "Failed to generate session",
      });
    }

    console.log("[OAuth Callback] Session link created successfully for:", email);

    const url = new URL(otpData.properties.action_link);
    const token = url.searchParams.get("token");
    const type = url.searchParams.get("type");

    if (!token) {
      console.error("[OAuth Callback] No token in magic link");
      return jsonResult(500, {
        success: false,
        error: "Failed to extract session token",
      });
    }

    return jsonResult(200, {
      success: true,
      user: {
        id: userProfile.id,
        email: userProfile.email,
        role: userProfile.role,
        fullName: userProfile.full_name,
        isActive: userProfile.is_active,
      },
      session: {
        token,
        type: type || "magiclink",
        email,
      },
    });
  } catch (error) {
    console.error("[OAuth Callback] Unexpected error:", error);
    return jsonResult(500, {
      success: false,
      error: "Internal server error",
    });
  }
}
