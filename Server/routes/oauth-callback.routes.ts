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
      
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: email,
          role: 'unassigned',
          full_name: name || email.split('@')[0],
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
    }

    // Step 4: Check if user is active
    if (!userProfile.is_active) {
      console.log('[OAuth Callback] User is disabled:', email);
      return res.status(403).json({ 
        success: false, 
        error: 'Account is disabled. Please contact an administrator.' 
      });
    }

    // Step 6: Get or create auth user and generate session
    let authUserId = userProfile.id;
    
    // Check if auth user exists
    const { data: existingAuthUser } = await supabase.auth.admin.getUserById(userProfile.id);
    
    if (!existingAuthUser.user) {
      console.log('[OAuth Callback] Creating Supabase auth user...');
      
      const { data: newAuthUser, error: createAuthError } = await supabase.auth.admin.createUser({
        email: email,
        email_confirm: true,
        user_metadata: {
          full_name: userProfile.full_name,
          role: userProfile.role,
        },
      });

      if (createAuthError || !newAuthUser.user) {
        console.error('[OAuth Callback] Error creating auth user:', createAuthError);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to create authentication user' 
        });
      }

      authUserId = newAuthUser.user.id;
      console.log('[OAuth Callback] Auth user created:', authUserId);
    }

    // Step 7: Generate session using sign-in with email OTP
    // This creates a valid session that the frontend can use
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
