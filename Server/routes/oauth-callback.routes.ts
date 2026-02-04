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
 * OAuth Callback Handler
 * 
 * This endpoint is called after Better Auth completes Google OAuth.
 * It creates a Supabase session for the authenticated user.
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

    // Step 2: Check if user exists in Supabase profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role, full_name, is_active')
      .eq('email', email)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('[OAuth Callback] Error fetching profile:', profileError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch user profile' 
      });
    }

    let userProfile = profile;

    // Step 3: Create profile if doesn't exist
    if (!userProfile) {
      console.log('[OAuth Callback] Creating new profile for:', email);
      
      // Check for invitation first
      const { data: invitation, error: invitationError } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('email', email)
        .is('used_at', null)
        .single();

      let roleToAssign = 'unassigned';
      let contractStartDate = null;
      let contractEndDate = null;
      let fullName = name || email.split('@')[0];

      if (invitation && !invitationError) {
        console.log('[OAuth Callback] Found invitation for:', email, 'with role:', invitation.role);
        roleToAssign = invitation.role.toLowerCase();
        contractStartDate = invitation.contract_start_date;
        contractEndDate = invitation.contract_end_date;
        fullName = invitation.first_name && invitation.last_name 
          ? `${invitation.first_name} ${invitation.last_name}` 
          : fullName;
      } else {
        console.log('[OAuth Callback] No invitation found, assigning unassigned role');
      }

      // IMPORTANT: Create auth.users FIRST - app_users has FK to auth.users
      console.log('[OAuth Callback] Creating Supabase auth user for:', email);
      const { data: authUserData, error: createAuthError } = await supabase.auth.admin.createUser({
        email: email,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      });
      
      let profileId: string;
      
      if (createAuthError) {
        if (createAuthError.message?.includes('already been registered')) {
          console.log('[OAuth Callback] Auth user already exists, fetching ID...');
          // User already exists in auth.users, get their ID
          const { data: existingUsers } = await supabase.auth.admin.listUsers();
          const existingUser = existingUsers?.users?.find(u => u.email === email);
          if (existingUser) {
            profileId = existingUser.id;
            console.log('[OAuth Callback] Found existing auth user ID:', profileId);
          } else {
            console.error('[OAuth Callback] Could not find existing auth user');
            return res.status(500).json({ 
              success: false, 
              error: 'Failed to find existing user' 
            });
          }
        } else {
          console.error('[OAuth Callback] Error creating auth user:', createAuthError);
          return res.status(500).json({ 
            success: false, 
            error: 'Failed to create user account' 
          });
        }
      } else {
        profileId = authUserData.user.id;
        console.log('[OAuth Callback] Created auth user with ID:', profileId);
      }
      
      // Try to create/update profile with the auth.users ID
      // Note: The handle_new_user trigger may have already created a profile
      console.log('[OAuth Callback] Creating/updating profile with ID:', profileId);
      
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .upsert({
          id: profileId,
          email: email,
          role: roleToAssign,
          full_name: fullName,
          is_active: true,
        }, { onConflict: 'id' })
        .select('id, email, role, full_name, is_active')
        .single();

      if (createError) {
        console.error('[OAuth Callback] Error creating/updating profile:', createError);
        // Try to fetch the existing profile instead
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id, email, role, full_name, is_active')
          .eq('id', profileId)
          .single();
        
        if (existingProfile) {
          userProfile = existingProfile;
          console.log('[OAuth Callback] Using existing profile:', userProfile);
        } else {
          return res.status(500).json({ 
            success: false, 
            error: 'Failed to create user profile' 
          });
        }
      } else {
        userProfile = newProfile;
        console.log('[OAuth Callback] Profile created/updated:', userProfile);
      }

      // Create/update app_users record - use upsert for robustness
      console.log('[OAuth Callback] Creating/updating app_users record for:', email);
      const { error: appUserError } = await supabase
        .from('app_users')
        .upsert({
          id: profileId,
          role: roleToAssign,
          full_name: fullName,
          email: email,
          is_active: true,
        }, { onConflict: 'id' });

      if (appUserError) {
        console.error('[OAuth Callback] Error creating app_users record:', appUserError);
        // Don't fail - app_users might have different constraints
      } else {
        console.log('[OAuth Callback] app_users record created/updated');
      }

      // If contractor, create contractor record AND contracts record
      if (roleToAssign === 'contractor' && contractStartDate && contractEndDate) {
        console.log('[OAuth Callback] Creating contractor record for:', email);
        
        const { error: contractorError } = await supabase
          .from('contractors')
          .upsert({
            contractor_id: profileId,
            contract_start: contractStartDate,
            contract_end: contractEndDate,
            hourly_rate: 75.0,
            overtime_rate: 112.5,
            is_active: true,
          }, { onConflict: 'contractor_id' });

        if (contractorError) {
          console.error('[OAuth Callback] Error creating contractor record:', contractorError);
        } else {
          console.log('[OAuth Callback] Contractor record created');
        }

        // Create contracts record - check if one exists first (contractor can have multiple contracts)
        console.log('[OAuth Callback] Creating contracts record for:', email);
        
        // Check if an active contract already exists
        const { data: existingContract } = await supabase
          .from('contracts')
          .select('id')
          .eq('contractor_user_id', profileId)
          .eq('is_active', true)
          .single();
        
        if (!existingContract) {
          const { error: contractError } = await supabase
            .from('contracts')
            .insert({
              contractor_user_id: profileId,
              project_name: 'General Work',
              contract_type: 'hourly',
              start_date: contractStartDate,
              end_date: contractEndDate,
              is_active: true,
            });

          if (contractError) {
            console.error('[OAuth Callback] Error creating contracts record:', contractError);
          } else {
            console.log('[OAuth Callback] Contracts record created');
          }
        } else {
          console.log('[OAuth Callback] Active contract already exists, skipping creation');
        }
      }

      // Mark invitation as used
      if (invitation) {
        await supabase
          .from('user_invitations')
          .update({ 
            used_at: new Date().toISOString(),
            used_by_user_id: profileId 
          })
          .eq('id', invitation.id);
        
        console.log('[OAuth Callback] Invitation marked as used');
      }
    }

    // Step 4: Check if user is active
    if (!userProfile.is_active) {
      console.log('[OAuth Callback] User is disabled:', email);
      return res.status(403).json({ 
        success: false, 
        error: 'Account is disabled. Please contact an administrator.' 
      });
    }

    // For existing users, ensure they have an auth.users entry
    // This handles users created before this flow was updated
    const { data: existingAuthUser } = await supabase.auth.admin.getUserById(userProfile.id);
    if (!existingAuthUser?.user) {
      console.log('[OAuth Callback] Creating missing auth user for existing profile:', email);
      const { error: createAuthErr } = await supabase.auth.admin.createUser({
        email: email,
        email_confirm: true,
        user_metadata: { full_name: userProfile.full_name },
      });
      if (createAuthErr && !createAuthErr.message?.includes('already been registered')) {
        console.error('[OAuth Callback] Error creating auth user for existing profile:', createAuthErr);
      }
    }

    // Step 5: Generate session using magic link
    // Now that user exists in auth.users, we can generate a magic link
    const { data: otpData, error: otpError} = await supabase.auth.admin.generateLink({
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

    // Step 8: Return session data and user profile
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
