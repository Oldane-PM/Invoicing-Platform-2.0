/**
 * Notifications Repository
 * 
 * Data access layer for notifications.
 * All Supabase queries for notifications are encapsulated here.
 * 
 * ARCHITECTURE: UI → Hooks → Repos → Supabase
 * This file is the ONLY place where notification Supabase queries exist.
 */

import { getSupabaseClient } from '../../supabase/client';
import type { Notification, GetNotificationsParams } from './notifications.types';
import { mapDbRowsToNotifications } from './notifications.mappers';

/**
 * Get notifications for the current user
 */
export async function getNotifications(
  params: GetNotificationsParams = {}
): Promise<Notification[]> {
  const supabase = getSupabaseClient();
  const { limit = 50, unreadOnly = false } = params;

  let query = supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });

  if (unreadOnly) {
    query = query.eq('is_read', false);
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[Notifications] Error fetching notifications:', error);
    throw error;
  }

  return mapDbRowsToNotifications(data || []);
}

/**
 * Get unread notification count for the current user
 */
export async function getUnreadCount(): Promise<number> {
  const supabase = getSupabaseClient();

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false);

  if (error) {
    console.error('[Notifications] Error fetching unread count:', error);
    throw error;
  }

  return count || 0;
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) {
    console.error('[Notifications] Error marking notification as read:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read for the current user
 */
export async function markAllAsRead(): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('is_read', false);

  if (error) {
    console.error('[Notifications] Error marking all notifications as read:', error);
    throw error;
  }
}
