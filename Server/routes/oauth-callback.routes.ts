import { Router, Request, Response } from 'express';
import { auth } from '../../src/lib/auth';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Gets or creates an auth user for the given email.
 * First checks profiles table (faster, avoids listUsers API issues).
 * Only creates if user doesn't exist.
 * Returns the auth user ID.
 */
async function getOrCreateAuthUser(
  email: string,
  metadata?: { full_name?: string; role?: string }
): Promise<string> {
  const normalizedEmail = email.toLowerCase();

  // 1) Check if user already exists via profiles table (mirrors auth.users)
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (existingProfile) {
    console.log('[OAuth Callback] User already exists in profiles:', existingProfile.id);
    return existingProfile.id;
  }

  // 2) User doesn't exist - create new auth user
  console.log('[OAuth Callback] Creating new auth user for:', email);
  const { data, error } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    email_confirm: true,
    user_metadata: metadata,
  });

  if (error) {
    // Handle race condition: user was created between our check and create
    if (error.code === 'email_exists' || error.status === 422) {
      console.log('[OAuth Callback] User was created by another request, fetching from profiles');
      
      // Wait a moment for the trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { data: raceProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (raceProfile) {
        return raceProfile.id;
      }
      
      // If still not found, the trigger might not have run yet - throw
      throw new Error(`User exists but profile not found for: ${email}`);
    }
    throw error;
  }

  if (!data.user) {
    throw new Error('Failed to create auth user - no user returned');
  }

  return data.user.id;
}

/**
 * OAuth Callback Handler
 * 
 * This endpoint is called after Better Auth completes Google OAuth.
 * It creates a Supabase session for the authenticated user.
 * 
 * Idempotent: Safe to call multiple times for the same user.
 */
router.post('/supabase', async (req: Request, res: Response) => {
  console.log('[OAuth Callback Route] POST /supabase endpoint hit!');
  try {
    console.log('[OAuth Callback] Starting Supabase session creation...');

    // Step 1: Get Better Auth session
    const session = await auth.api.getSession({
      headers: req.headers as any,
    });

    if (!session || !session.user) {
      console.error('[OAuth Callback] No Better Auth session found');
      return res.status(401).json({ 
        success: false, 
        error: 'No active session' 
      });
    }

    const { email, id: userId, name } = session.user;
    console.log('[OAuth Callback] Better Auth user:', { email, userId, name });

    if (!email) {
      console.error('[OAuth Callback] No email in session');
      return res.status(400).json({ 
        success: false, 
        error: 'Email not found in session' 
      });
    }

    // Step 2: Check for invitation (including already used ones for role info)
    // First check for unused invitation
    const { data: unusedInvitation } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('email', email.toLowerCase())
      .is('used_at', null)
      .maybeSingle();

    // If no unused invitation, check for any invitation (may have been used already)
    const { data: anyInvitation } = !unusedInvitation
      ? await supabase
          .from('user_invitations')
          .select('*')
          .eq('email', email.toLowerCase())
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
      : { data: null };

    const invitation = unusedInvitation || anyInvitation;
    const isInvitationAlreadyUsed = !unusedInvitation && !!anyInvitation;

    let roleToAssign = 'unassigned';
    let fullName = name || email.split('@')[0];

    if (invitation) {
      console.log('[OAuth Callback] Found invitation for:', email, 'with role:', invitation.role, 'already used:', isInvitationAlreadyUsed);
      roleToAssign = invitation.role.toLowerCase();
      fullName = invitation.first_name && invitation.last_name 
        ? `${invitation.first_name} ${invitation.last_name}` 
        : fullName;
    }

    // Step 3: Get existing auth user or create new one
    console.log('[OAuth Callback] Getting or creating auth user for:', email);
    
    const authUserId = await getOrCreateAuthUser(email, {
      full_name: fullName,
      role: roleToAssign,
    });

    console.log('[OAuth Callback] Using auth user:', authUserId);

    // Step 4: Ensure profile is up to date (upsert pattern)
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authUserId,
        email: email.toLowerCase(),
        role: roleToAssign,
        full_name: fullName,
        is_active: true,
      }, {
        onConflict: 'id',
      });

    if (profileError) {
      console.error('[OAuth Callback] Error upserting profile:', profileError);
      // Don't fail - profile might exist from trigger, try update instead
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          role: roleToAssign,
          full_name: fullName,
          is_active: true,
        })
        .eq('id', authUserId);

      if (updateError) {
        console.error('[OAuth Callback] Error updating profile:', updateError);
      }
    }

    // Step 5: If contractor from invitation, ensure contractor record exists (idempotent)
    if (invitation && invitation.role === 'CONTRACTOR' && invitation.contract_start_date && invitation.contract_end_date) {
      // Check if contractor record already exists
      const { data: existingContractor } = await supabase
        .from('contractors')
        .select('contractor_id')
        .eq('contractor_id', authUserId)
        .maybeSingle();

      if (!existingContractor) {
        console.log('[OAuth Callback] Creating contractor record for:', email);
        
        const { error: contractorError } = await supabase
          .from('contractors')
          .insert({
            contractor_id: authUserId,
            contract_start: invitation.contract_start_date,
            contract_end: invitation.contract_end_date,
            hourly_rate: 75.0,
            overtime_rate: 112.5,
            is_active: true,
          });

        if (contractorError) {
          // Check if it's a duplicate key error (race condition - another request created it)
          if (contractorError.code === '23505') {
            console.log('[OAuth Callback] Contractor record already exists (race condition handled)');
          } else {
            console.error('[OAuth Callback] Error creating contractor record:', contractorError);
          }
        } else {
          console.log('[OAuth Callback] Contractor record created');
        }
      } else {
        console.log('[OAuth Callback] Contractor record already exists, skipping creation');
      }
    }

    // Step 6: Mark invitation as used only if not already used (idempotent)
    if (invitation && !isInvitationAlreadyUsed) {
      console.log('[OAuth Callback] Marking invitation as used');
      await supabase
        .from('user_invitations')
        .update({ 
          used_at: new Date().toISOString(),
          used_by_user_id: authUserId 
        })
        .eq('id', invitation.id);
      
      console.log('[OAuth Callback] Invitation marked as used');
    } else if (isInvitationAlreadyUsed) {
      console.log('[OAuth Callback] Invitation already used, skipping mark-used step');
    }

    // Step 7: Get the user profile (should exist now from upsert above)
    const { data: userProfile, error: fetchProfileError } = await supabase
      .from('profiles')
      .select('id, email, role, full_name, is_active')
      .eq('id', authUserId)
      .single();

    if (fetchProfileError || !userProfile) {
      console.error('[OAuth Callback] Error fetching profile:', fetchProfileError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch user profile' 
      });
    }

    // Step 8: Check if user is active
    if (!userProfile.is_active) {
      console.log('[OAuth Callback] User is disabled:', email);
      return res.status(403).json({ 
        success: false, 
        error: 'Account is disabled. Please contact an administrator.' 
      });
    }

    // Step 9: Generate session using magic link
    const { data: otpData, error: otpError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    });

    if (otpError || !otpData) {
      console.error('[OAuth Callback] Error generating magic link:', otpError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to generate session' 
      });
    }

    console.log('[OAuth Callback] Session link created successfully for:', email);

    // Extract the hashed token from the magic link URL
    const url = new URL(otpData.properties.action_link);
    const token = url.searchParams.get('token');
    const type = url.searchParams.get('type');

    if (!token) {
      console.error('[OAuth Callback] No token in magic link');
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to extract session token' 
      });
    }

    // Step 10: Return session data and user profile
    return res.json({
      success: true,
      user: {
        id: userProfile.id,
        email: userProfile.email,
        role: userProfile.role,
        fullName: userProfile.full_name,
        isActive: userProfile.is_active,
      },
      session: {
        token: token,
        type: type || 'magiclink',
        email: email,
      },
    });

  } catch (error) {
    console.error('[OAuth Callback] Unexpected error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

export default router;
