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
  | 'manager_rejected'
  | 'paid'
  | 'work_order_sent'
  | 'w8ben_uploaded';

export interface Notification {
  id: string;
  submissionId?: string | null;
  workOrderId?: string | null;
  w8benId?: string | null;
  eventType: NotificationEventType;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface GetNotificationsParams {
  limit?: number;
  unreadOnly?: boolean;
}
