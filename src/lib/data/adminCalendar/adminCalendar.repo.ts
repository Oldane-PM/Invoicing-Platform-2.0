/**
 * Admin Calendar Repository
 * 
 * Data access layer for holidays/time-off entries.
 * ALL Supabase queries for calendar data are encapsulated here.
 */

import { getSupabaseClient } from "../../supabase/client";
import type {
  CalendarEntry,
  CreateCalendarEntryInput,
  UpdateCalendarEntryInput,
  HolidayDbRow,
} from "./adminCalendar.types";
import {
  mapDbRowToCalendarEntry,
  mapCreateInputToDbRow,
  mapUpdateInputToDbRow,
} from "./adminCalendar.mappers";

/**
 * Get current user ID from Supabase auth
 */
async function getCurrentUserId(): Promise<string> {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    throw new Error("User not authenticated. Please log in.");
  }

  return user.id;
}

/**
 * Get current user's organization ID
 */
async function getCurrentUserOrganizationId(): Promise<string> {
  const supabase = getSupabaseClient();
  const userId = await getCurrentUserId();

  const { data: appUser, error } = await supabase
    .from("app_users")
    .select("organization_id")
    .eq("id", userId)
    .single();

  if (error || !appUser) {
    throw new Error("Unable to determine user organization");
  }

  return appUser.organization_id;
}

/**
 * Get calendar entries for a specific month range
 * @param monthStartISO - Start of month in ISO format (YYYY-MM-DD)
 * @param monthEndISO - End of month in ISO format (YYYY-MM-DD)
 */
export async function getEntriesForMonth(
  monthStartISO: string,
  monthEndISO: string
): Promise<CalendarEntry[]> {
  const supabase = getSupabaseClient();
  const organizationId = await getCurrentUserOrganizationId();

  const { data, error } = await supabase
    .from("holidays")
    .select("*")
    .eq("organization_id", organizationId)
    .gte("holiday_date", monthStartISO)
    .lte("holiday_date", monthEndISO)
    .order("holiday_date", { ascending: true });

  if (error) {
    console.error("[AdminCalendarRepo] Error fetching entries:", error);
    throw error;
  }

  return (data || []).map((row) => mapDbRowToCalendarEntry(row as HolidayDbRow));
}

/**
 * Get upcoming calendar entries (next N days)
 * @param days - Number of days to look ahead (default: 90)
 */
export async function getUpcomingEntries(days: number = 90): Promise<CalendarEntry[]> {
  const supabase = getSupabaseClient();
  const organizationId = await getCurrentUserOrganizationId();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString().split("T")[0];

  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + days);
  const futureDateISO = futureDate.toISOString().split("T")[0];

  // TODO: If a view or RPC exists for upcoming entries with affected contractor count,
  // use it here instead of direct table query. For now, querying table directly.
  const { data, error } = await supabase
    .from("holidays")
    .select("*")
    .eq("organization_id", organizationId)
    .gte("holiday_date", todayISO)
    .lte("holiday_date", futureDateISO)
    .order("holiday_date", { ascending: true });

  if (error) {
    console.error("[AdminCalendarRepo] Error fetching upcoming entries:", error);
    throw error;
  }

  // TODO: Fetch affected contractor count from a view/RPC if available
  // For now, affectedContractorCount will be null
  return (data || []).map((row) => mapDbRowToCalendarEntry(row as HolidayDbRow));
}

/**
 * Create a new calendar entry
 */
export async function createEntry(
  input: CreateCalendarEntryInput
): Promise<CalendarEntry> {
  const supabase = getSupabaseClient();
  const userId = await getCurrentUserId();
  const organizationId = await getCurrentUserOrganizationId();

  const dbRow = mapCreateInputToDbRow(input, organizationId, userId);

  const { data, error } = await supabase
    .from("holidays")
    .insert(dbRow)
    .select()
    .single();

  if (error) {
    console.error("[AdminCalendarRepo] Error creating entry:", error);
    throw error;
  }

  return mapDbRowToCalendarEntry(data as HolidayDbRow);
}

/**
 * Update an existing calendar entry
 */
export async function updateEntry(
  input: UpdateCalendarEntryInput
): Promise<CalendarEntry> {
  const supabase = getSupabaseClient();

  const dbUpdate = mapUpdateInputToDbRow(input);

  const { data, error } = await supabase
    .from("holidays")
    .update(dbUpdate)
    .eq("id", input.id)
    .select()
    .single();

  if (error) {
    console.error("[AdminCalendarRepo] Error updating entry:", error);
    throw error;
  }

  return mapDbRowToCalendarEntry(data as HolidayDbRow);
}

/**
 * Delete a calendar entry
 */
export async function deleteEntry(id: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from("holidays").delete().eq("id", id);

  if (error) {
    console.error("[AdminCalendarRepo] Error deleting entry:", error);
    throw error;
  }
}
