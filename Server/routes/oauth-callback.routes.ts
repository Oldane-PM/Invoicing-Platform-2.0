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

      let roleToAssign = 'UNASSIGNED';
      let contractStartDate = null;
      let contractEndDate = null;
      let fullName = name || email.split('@')[0];

      if (invitation && !invitationError) {
        console.log('[OAuth Callback] Found invitation for:', email, 'with role:', invitation.role);
        roleToAssign = invitation.role;
        contractStartDate = invitation.contract_start_date;
        contractEndDate = invitation.contract_end_date;
        fullName = invitation.first_name && invitation.last_name 
          ? `${invitation.first_name} ${invitation.last_name}` 
          : fullName;
      } else {
        console.log('[OAuth Callback] No invitation found, assigning UNASSIGNED role');
      }

      // Generate a UUID for the profile
      // Note: Better Auth handles authentication, we just need a UUID for our profile
      const { data: uuidData } = await supabase.rpc('gen_random_uuid');
      const profileId = uuidData || crypto.randomUUID();
      
      console.log('[OAuth Callback] Creating profile with ID:', profileId);
      
      // Create profile
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: profileId,
          email: email,
          role: roleToAssign.toLowerCase(), // Convert to lowercase to match DB constraint
          full_name: fullName,
          is_active: true,
        })
        .select('id, email, role, full_name, is_active')
        .single();

      if (createError) {
        console.error('[OAuth Callback] Error creating profile:', createError);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to create user profile' 
        });
      }

      userProfile = newProfile;
      console.log('[OAuth Callback] Profile created:', userProfile);

      // If contractor, create contractor record
      if (roleToAssign === 'CONTRACTOR' && contractStartDate && contractEndDate) {
        console.log('[OAuth Callback] Creating contractor record for:', email);
        
        const { error: contractorError } = await supabase
          .from('contractors')
          .insert({
            contractor_id: profileId,
            contract_start: contractStartDate,
            contract_end: contractEndDate,
            hourly_rate: 75.0, // Default rate
            overtime_rate: 112.5, // Default overtime rate
            is_active: true,
          });

        if (contractorError) {
          console.error('[OAuth Callback] Error creating contractor record:', contractorError);
          // Don't fail the whole login, just log the error
        } else {
          console.log('[OAuth Callback] Contractor record created');
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

    // Step 4: Ensure user exists in Supabase auth.users
    // Better Auth handles OAuth, but we need a Supabase auth user for RLS and generateLink to work
    // Try to create the user - if they already exist, this will fail gracefully
    const { error: createAuthError } = await supabase.auth.admin.createUser({
      email: email,
      email_confirm: true, // Auto-confirm since they authenticated via Google
      user_metadata: {
        full_name: userProfile.full_name,
      },
    });
    
    // Only log if it's an error other than "user already exists"
    if (createAuthError && !createAuthError.message?.includes('already been registered')) {
      console.log('[OAuth Callback] Note: Could not create auth user:', createAuthError.message);
      // Don't fail here - the user might already exist, which is fine
    } else if (!createAuthError) {
      console.log('[OAuth Callback] Created new Supabase auth user for:', email);
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
