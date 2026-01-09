/**
 * useAuth Hook
 *
 * Provides Supabase authentication state and methods.
 * Used for Contractor and Manager login - Admin still uses mock auth.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "../supabase/client";
import { getUserProfile, type UserRole, type UserProfile } from "../supabase/repos/auth.repo";
import type { User, Session } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  error: Error | null;
}

interface UseAuthResult extends AuthState {
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  role: UserRole | null;
}

export function useAuth(): UseAuthResult {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true,
    error: null,
  });

  // Fetch user profile after session changes
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const profile = await getUserProfile(userId);
      setState((prev) => ({ ...prev, profile }));
    } catch (err) {
      console.error("[useAuth] Error fetching profile:", err);
    }
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    // Get initial session
    const getSession = async () => {
      // Re-check supabase in async context for TypeScript
      if (!supabase) return;

      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error("[useAuth] Error getting session:", error);
          setState((prev) => ({ ...prev, loading: false, error }));
          return;
        }

        setState({
          user: session?.user ?? null,
          session,
          profile: null,
          loading: false,
          error: null,
        });

        // Fetch profile if we have a user
        if (session?.user?.id) {
          fetchProfile(session.user.id);
        }
      } catch (err) {
        console.error("[useAuth] Exception getting session:", err);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err : new Error("Failed to get session"),
        }));
      }
    };

    getSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setState((prev) => ({
          ...prev,
          user: session?.user ?? null,
          session,
          profile: session ? prev.profile : null,
          loading: false,
          error: null,
        }));

        // Fetch profile when user logs in
        if (session?.user?.id) {
          fetchProfile(session.user.id);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Sign in with email and password
  const signIn = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string; role?: UserRole }> => {
      if (!isSupabaseConfigured || !supabase) {
        return { success: false, error: "Supabase is not configured" };
      }

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error("[useAuth] Sign in error:", error);
          return { success: false, error: error.message };
        }

        if (!data.user || !data.session) {
          return { success: false, error: "Failed to authenticate" };
        }

        // Fetch user profile to get role
        const profile = await getUserProfile(data.user.id);

        // State will be updated by onAuthStateChange listener
        return { success: true, role: profile?.role };
      } catch (err) {
        console.error("[useAuth] Sign in exception:", err);
        return {
          success: false,
          error: err instanceof Error ? err.message : "An unexpected error occurred",
        };
      }
    },
    []
  );

  // Sign out
  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("[useAuth] Sign out error:", error);
      }
      // State will be updated by onAuthStateChange listener
    } catch (err) {
      console.error("[useAuth] Sign out exception:", err);
    }
  }, []);

  return {
    ...state,
    signIn,
    signOut,
    isAuthenticated: !!state.session,
    role: state.profile?.role ?? null,
  };
}
