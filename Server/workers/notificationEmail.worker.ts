/**
 * Notification Email Worker
 *
 * Background worker that polls for pending notifications and sends emails.
 * Runs inside the Express server process.
 *
 * Features:
 * - Polls every POLL_INTERVAL_MS for pending notifications
 * - Atomically claims notifications to prevent double-sends
 * - Joins user email from profiles table
 * - Updates notification status after send attempt
 */

import { getSupabaseAdmin } from '../clients/supabase.server';
import { sendEmail, getProviderName } from '../services/email';

// Configuration
const POLL_INTERVAL_MS = 15_000; // 15 seconds
const BATCH_SIZE = 10;

// Worker state
let isRunning = false;
let pollIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Notification row from database with joined profile email
 */
interface PendingNotification {
  id: string;
  recipient_user_id: string;
  message: string;
  event_type: string;
  action_url: string | null;
  created_at: string;
  profiles: {
    email: string;
    full_name: string | null;
  } | null;
}

/**
 * Process a batch of pending notifications
 */
async function processPendingNotifications(): Promise<void> {
  const supabase = getSupabaseAdmin();

  try {
    // Fetch pending notifications with user email from profiles
    const { data: notifications, error: fetchError } = await supabase
      .from('notifications')
      .select(`
        id,
        recipient_user_id,
        message,
        event_type,
        action_url,
        created_at,
        profiles!recipient_user_id (
          email,
          full_name
        )
      `)
      .eq('email_enabled', true)
      .eq('email_status', 'PENDING')
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) {
      console.error('[EmailWorker] Error fetching pending notifications:', fetchError);
      return;
    }

    if (!notifications || notifications.length === 0) {
      return; // No pending notifications
    }

    console.log(`[EmailWorker] Processing ${notifications.length} pending notification(s)`);

    for (const notification of notifications as unknown as PendingNotification[]) {
      await processNotification(notification);
    }
  } catch (error) {
    console.error('[EmailWorker] Unexpected error in processPendingNotifications:', error);
  }
}

/**
 * Process a single notification
 */
async function processNotification(notification: PendingNotification): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { id, message, event_type, action_url, profiles } = notification;

  // Validate we have an email address
  if (!profiles?.email) {
    console.warn(`[EmailWorker] No email for notification ${id}, skipping`);
    await updateNotificationStatus(id, 'SKIPPED', 'No email address found for user');
    return;
  }

  const recipientEmail = profiles.email;
  const recipientName = profiles.full_name || 'User';

  // Atomically claim the notification by setting status to SENDING
  // This prevents double-sends if multiple workers are running
  const { data: claimed, error: claimError } = await supabase
    .from('notifications')
    .update({ email_status: 'SENDING' })
    .eq('id', id)
    .eq('email_status', 'PENDING')
    .select('id')
    .single();

  if (claimError || !claimed) {
    // Another worker already claimed this notification
    console.log(`[EmailWorker] Notification ${id} already claimed, skipping`);
    return;
  }

  // Build email content
  const subject = `[Invoicing Platform] ${getSubjectFromEventType(event_type)}`;
  const textBody = buildTextBody(message, action_url, recipientName);
  const htmlBody = buildHtmlBody(message, action_url, recipientName);

  try {
    await sendEmail({
      to: recipientEmail,
      subject,
      text: textBody,
      html: htmlBody,
    });

    // Update to SENT
    await updateNotificationStatus(id, 'SENT', null);
    console.log(`[EmailWorker] Successfully sent email for notification ${id} to ${recipientEmail}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await updateNotificationStatus(id, 'FAILED', errorMessage);
    console.error(`[EmailWorker] Failed to send email for notification ${id}: ${errorMessage}`);
  }
}

/**
 * Update notification email status
 */
async function updateNotificationStatus(
  notificationId: string,
  status: 'SENT' | 'FAILED' | 'SKIPPED',
  errorMessage: string | null
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const updateData: Record<string, unknown> = {
    email_status: status,
    email_error: errorMessage,
  };

  if (status === 'SENT') {
    updateData.emailed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('notifications')
    .update(updateData)
    .eq('id', notificationId);

  if (error) {
    console.error(`[EmailWorker] Failed to update status for notification ${notificationId}:`, error);
  }
}

/**
 * Get a human-readable subject from event type
 */
function getSubjectFromEventType(eventType: string): string {
  const subjects: Record<string, string> = {
    submitted: 'New Timesheet Submitted',
    approved: 'Timesheet Approved',
    rejected: 'Timesheet Rejected',
    needs_clarification: 'Clarification Requested',
    resubmitted: 'Timesheet Resubmitted',
    manager_approved: 'Manager Approved Timesheet',
    manager_rejected: 'Manager Rejected Timesheet',
  };

  return subjects[eventType] || 'Notification';
}

/**
 * Build plain text email body
 */
function buildTextBody(message: string, actionUrl: string | null, recipientName: string): string {
  let body = `Hi ${recipientName},\n\n`;
  body += `${message}\n\n`;

  if (actionUrl) {
    body += `View details: ${actionUrl}\n\n`;
  }

  body += '---\n';
  body += 'Invoicing Platform\n';
  body += 'This is an automated notification. Please do not reply to this email.\n';

  return body;
}

/**
 * Build HTML email body
 */
function buildHtmlBody(message: string, actionUrl: string | null, recipientName: string): string {
  const escapedMessage = escapeHtml(message);
  const escapedName = escapeHtml(recipientName);

  let actionButton = '';
  if (actionUrl) {
    actionButton = `
      <p style="margin: 24px 0;">
        <a href="${escapeHtml(actionUrl)}" 
           style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500;">
          View Details
        </a>
      </p>
    `;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px;">
    <h2 style="margin: 0 0 16px; color: #111827;">Invoicing Platform</h2>
    <p style="margin: 0 0 16px;">Hi ${escapedName},</p>
    <p style="margin: 0 0 16px;">${escapedMessage}</p>
    ${actionButton}
  </div>
  <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
    <p style="margin: 0;">This is an automated notification. Please do not reply to this email.</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Start the notification email worker
 */
export function startNotificationEmailWorker(): void {
  if (isRunning) {
    console.warn('[EmailWorker] Worker is already running');
    return;
  }

  console.log('[EmailWorker] Starting notification email worker...');
  console.log(`[EmailWorker] Provider: ${getProviderName()}`);
  console.log(`[EmailWorker] Poll interval: ${POLL_INTERVAL_MS}ms`);
  console.log(`[EmailWorker] Batch size: ${BATCH_SIZE}`);

  isRunning = true;

  // Run immediately on start
  processPendingNotifications();

  // Then poll at regular intervals
  pollIntervalId = setInterval(() => {
    processPendingNotifications();
  }, POLL_INTERVAL_MS);
}

/**
 * Stop the notification email worker
 */
export function stopNotificationEmailWorker(): void {
  if (!isRunning) {
    console.warn('[EmailWorker] Worker is not running');
    return;
  }

  if (pollIntervalId) {
    clearInterval(pollIntervalId);
    pollIntervalId = null;
  }

  isRunning = false;
  console.log('[EmailWorker] Worker stopped');
}

/**
 * Check if worker is running
 */
export function isWorkerRunning(): boolean {
  return isRunning;
}
