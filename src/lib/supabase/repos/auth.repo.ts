/**
 * Auth Repository
 *
 * Handles authentication and profile queries.
 * ONLY this file imports the Supabase client for auth operations.
 */

import { getSupabaseClient, supabase } from "../client";

export type UserRole = "ADMIN" | "MANAGER" | "CONTRACTOR";

export interface UserProfile {
  id: string;
  role: UserRole;
  fullName: string;
  email: string;
}

export interface AuthSession {
  userId: string;
  email: string;
  accessToken: string;
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthSession> {
  const supabaseClient = getSupabaseClient();

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("[auth.repo] signInWithEmail error:", error);
    throw error;
  }

  if (!data.session || !data.user) {
    throw new Error("No session returned");
  }

  return {
    userId: data.user.id,
    email: data.user.email || "",
    accessToken: data.session.access_token,
  };
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
  const supabaseClient = getSupabaseClient();

  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    console.error("[auth.repo] signOut error:", error);
    throw error;
  }
}

/**
 * Get current session
 */
export async function getSession(): Promise<AuthSession | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error("[auth.repo] getSession error:", error);
    return null;
  }

  if (!data.session || !data.session.user) {
    return null;
  }

  return {
    userId: data.session.user.id,
    email: data.session.user.email || "",
    accessToken: data.session.access_token,
  };
}

/**
 * Get user profile by ID
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabaseClient = getSupabaseClient();

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("[auth.repo] getUserProfile error:", error);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    role: data.role as UserRole,
    fullName: data.full_name || "",
    email: data.email || "",
  };
}

/**
 * Create or update user profile
 */
export async function upsertProfile(profile: {
  id: string;
  role: UserRole;
  fullName: string;
  email: string;
}): Promise<void> {
  const supabaseClient = getSupabaseClient();

  const { error } = await supabaseClient.from("profiles").upsert({
    id: profile.id,
    role: profile.role,
    full_name: profile.fullName,
    email: profile.email,
  });

  if (error) {
    console.error("[auth.repo] upsertProfile error:", error);
    throw error;
  }
}

/**
 * Listen for auth state changes
 */
export function onAuthStateChange(
  callback: (event: string, session: AuthSession | null) => void
): { unsubscribe: () => void } {
  if (!supabase) {
    return { unsubscribe: () => {} };
  }

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      callback(event, {
        userId: session.user.id,
        email: session.user.email || "",
        accessToken: session.access_token,
      });
    } else {
      callback(event, null);
    }
  });

  return { unsubscribe: () => data.subscription.unsubscribe() };
}
