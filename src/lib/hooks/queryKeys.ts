/**
 * Query Keys
 *
 * Centralized query key constants for consistent cache management.
 * All React Query hooks should use these keys.
 */

export const QUERY_KEYS = {
  // Admin views
  EMPLOYEE_DIRECTORY: "employeeDirectory",
  ADMIN_DASHBOARD: "adminDashboard",
  ADMIN_SUBMISSIONS: "adminSubmissions",
  
  // Contractor views
  CONTRACTOR_PROFILE: "contractorProfile",
  CONTRACTOR_SUBMISSIONS: "contractorSubmissions",
  
  // Manager views
  MANAGER_DASHBOARD: "managerDashboard",
  MANAGER_TEAM: "managerTeam",
  
  // Shared/general
  CONTRACTORS: "contractors",
  MANAGERS: "managers",
  MANAGER_OPTIONS: "managerOptions",
  NOTIFICATIONS: "notifications",
  CALENDAR_ENTRIES: "calendarEntries",
  USERS: "users",
} as const;

export type QueryKey = typeof QUERY_KEYS[keyof typeof QUERY_KEYS];
