import { getSupabaseAdmin } from '../clients/supabase.server';

/**
 * Checks and sends invoice reminder notifications to contractors who haven't submitted their invoice yet.
 */
export async function checkAndSendInvoiceReminders(): Promise<void> {
  console.log('[invoiceReminderService] Running invoice reminder checks...');
  
  try {
    const supabase = getSupabaseAdmin();
    
    // 1. Get current date details
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-indexed: 0 = Jan, 11 = Dec
    
    // Last day of current month
    const lastDayObj = new Date(currentYear, currentMonth + 1, 0);
    const endOfMonthDay = lastDayObj.getDate(); // e.g. 30 or 31
    const todayDay = today.getDate();

    // Determine if today is Day Before, Day Of, or Day After end of month
    let targetWorkPeriod: string | null = null;
    let reminderType: 'day_before' | 'day_of' | 'day_after' | null = null;
    let label = '';

    if (todayDay === endOfMonthDay - 1) {
      reminderType = 'day_before';
      const monthStr = String(currentMonth + 1).padStart(2, '0');
      targetWorkPeriod = `${currentYear}-${monthStr}`;
      label = 'day before';
    } else if (todayDay === endOfMonthDay) {
      reminderType = 'day_of';
      const monthStr = String(currentMonth + 1).padStart(2, '0');
      targetWorkPeriod = `${currentYear}-${monthStr}`;
      label = 'day of';
    } else if (todayDay === 1) {
      reminderType = 'day_after';
      // Target period is the previous month that just ended
      let prevYear = currentYear;
      let prevMonth = currentMonth - 1;
      if (prevMonth < 0) {
        prevMonth = 11;
        prevYear -= 1;
      }
      const monthStr = String(prevMonth + 1).padStart(2, '0');
      targetWorkPeriod = `${prevYear}-${monthStr}`;
      label = 'day after';
    }

    if (!targetWorkPeriod || !reminderType) {
      console.log('[invoiceReminderService] Today is not a reminder day (day before, day of, or day after end of month). Skipping checks.');
      return;
    }

    console.log(`[invoiceReminderService] Today is the ${label} end of the month. Target work period: ${targetWorkPeriod}`);

    // 2. Fetch all contractors (profiles with role = 'contractor' and active)
    const { data: contractors, error: contractorsError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .ilike('role', 'contractor')
      .eq('is_active', true);

    if (contractorsError) {
      console.error('[invoiceReminderService] Failed to fetch contractors:', contractorsError);
      return;
    }

    if (!contractors || contractors.length === 0) {
      console.log('[invoiceReminderService] No active contractors found.');
      return;
    }

    console.log(`[invoiceReminderService] Checking ${contractors.length} active contractors for submissions in period ${targetWorkPeriod}...`);

    for (const contractor of contractors) {
      // 3. Check if they have already submitted an invoice/hours for the target period
      const { data: submissions, error: submissionsError } = await supabase
        .from('submissions')
        .select('id')
        .eq('contractor_user_id', contractor.id)
        .eq('work_period', targetWorkPeriod);

      if (submissionsError) {
        console.error(`[invoiceReminderService] Error checking submissions for contractor ${contractor.id}:`, submissionsError);
        continue;
      }

      if (submissions && submissions.length > 0) {
        console.log(`[invoiceReminderService] Contractor ${contractor.full_name || contractor.email} has already submitted an invoice for ${targetWorkPeriod}. Skipping reminder.`);
        continue;
      }

      // 4. Verify that we haven't already sent THIS specific reminder to this contractor today/for this target period
      const friendlyMessage = reminderType === 'day_before' 
        ? `Invoice reminder: Tomorrow is the end of the month. Please submit your invoice for period ${targetWorkPeriod}.`
        : reminderType === 'day_of'
        ? `Invoice reminder: Today is the end of the month. Please submit your invoice for period ${targetWorkPeriod} today.`
        : `Invoice reminder: Yesterday was the end of the month. Please submit your invoice for period ${targetWorkPeriod} as soon as possible.`;
      
      const { data: existingReminders, error: notificationsError } = await supabase
        .from('notifications')
        .select('id')
        .eq('recipient_user_id', contractor.id)
        .eq('event_type', 'invoice_reminder')
        .eq('message', friendlyMessage);

      if (notificationsError) {
        console.error(`[invoiceReminderService] Error checking existing notifications for contractor ${contractor.id}:`, notificationsError);
        continue;
      }

      if (existingReminders && existingReminders.length > 0) {
        console.log(`[invoiceReminderService] Reminder already sent to ${contractor.full_name || contractor.email} for period ${targetWorkPeriod} / type ${reminderType}.`);
        continue;
      }

      // 5. Send reminder notification
      const { error: insertError } = await supabase
        .from('notifications')
        .insert({
          recipient_user_id: contractor.id,
          recipient_role: 'contractor',
          event_type: 'invoice_reminder',
          message: friendlyMessage
        });

      if (insertError) {
        console.error(`[invoiceReminderService] Failed to insert reminder notification for ${contractor.id}:`, insertError);
      } else {
        console.log(`[invoiceReminderService] Successfully sent reminder to ${contractor.full_name || contractor.email} for period ${targetWorkPeriod}`);
      }
    }

  } catch (err) {
    console.error('[invoiceReminderService] Error running reminders:', err);
  }
}

/**
 * Initializes the daily cron interval in the express server
 */
export function startInvoiceReminderScheduler(): void {
  // Check on startup after a small delay
  setTimeout(() => {
    void checkAndSendInvoiceReminders();
  }, 10000);

  // Set interval to run check every 12 hours
  const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
  setInterval(() => {
    void checkAndSendInvoiceReminders();
  }, TWELVE_HOURS_MS);
  
  console.log('[invoiceReminderService] Invoice reminder scheduler started (runs every 12 hours)');
}
