/**
 * Notifications Types
 * 
 * Type definitions for in-app notifications.
 */

export type NotificationEventType =
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'needs_clarification'
  | 'resubmitted'
  | 'manager_approved'
  | 'manager_rejected';

export interface Notification {
  id: string;
  submissionId: string;
  eventType: NotificationEventType;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface GetNotificationsParams {
  limit?: number;
  unreadOnly?: boolean;
}
