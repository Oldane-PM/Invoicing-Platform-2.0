/**
 * Notifications Mappers
 * 
 * Maps database rows to domain types (snake_case → camelCase).
 */

import type { Notification } from './notifications.types';

/**
 * Map database row to Notification domain type
 */
export function mapDbRowToNotification(row: any): Notification {
  return {
    id: row.id,
    submissionId: row.submission_id,
    eventType: row.event_type,
    message: row.message,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

/**
 * Map array of database rows to Notification array
 */
export function mapDbRowsToNotifications(rows: any[]): Notification[] {
  return rows.map(mapDbRowToNotification);
}
