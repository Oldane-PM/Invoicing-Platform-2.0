/**
 * Admin Calendar Mappers
 * 
 * Transform data between database format (snake_case) and frontend format (camelCase)
 */

import type {
  CalendarEntry,
  CreateCalendarEntryInput,
  UpdateCalendarEntryInput,
  HolidayDbRow,
} from "./adminCalendar.types";

/**
 * Map database row to frontend CalendarEntry
 */
export function mapDbRowToCalendarEntry(row: HolidayDbRow): CalendarEntry {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    holidayDate: row.holiday_date,
    appliesToAll: row.applies_to_all,
    country: row.country,
    teamId: row.team_id,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // These will be populated by joins or separate queries if needed
    teamName: null,
    affectedContractorCount: null,
  };
}

/**
 * Map CreateCalendarEntryInput to database insert object
 */
export function mapCreateInputToDbRow(
  input: CreateCalendarEntryInput,
  organizationId: string,
  userId: string
): Omit<HolidayDbRow, "id" | "created_at" | "updated_at"> {
  return {
    organization_id: organizationId,
    name: input.name,
    holiday_date: input.holidayDate,
    applies_to_all: input.appliesToAll,
    country: input.country || null,
    team_id: input.teamId || null,
    notes: input.notes || null,
    created_by: userId,
  };
}

/**
 * Map UpdateCalendarEntryInput to database update object
 */
export function mapUpdateInputToDbRow(
  input: UpdateCalendarEntryInput
): Partial<Omit<HolidayDbRow, "id" | "organization_id" | "created_by" | "created_at">> {
  const update: Partial<Omit<HolidayDbRow, "id" | "organization_id" | "created_by" | "created_at">> = {};

  if (input.name !== undefined) update.name = input.name;
  if (input.holidayDate !== undefined) update.holiday_date = input.holidayDate;
  if (input.appliesToAll !== undefined) update.applies_to_all = input.appliesToAll;
  if (input.country !== undefined) update.country = input.country;
  if (input.teamId !== undefined) update.team_id = input.teamId;
  if (input.notes !== undefined) update.notes = input.notes;

  return update;
}
