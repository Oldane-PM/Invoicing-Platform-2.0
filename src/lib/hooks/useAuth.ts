/**
 * useAuth Hook
 *
 * Provides Supabase authentication state and methods.
 * Used for Contractor login - Admin/Manager still use mock auth.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "../supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: Error | null;
}

interface UseAuthResult extends AuthState {
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

export function useAuth(): UseAuthResult {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

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
          loading: false,
          error: null,
        });
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
      (_event, session) => {
        setState({
          user: session?.user ?? null,
          session,
          loading: false,
          error: null,
        });
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign in with email and password
  const signIn = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
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

        // State will be updated by onAuthStateChange listener
        return { success: true };
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
  };
}
