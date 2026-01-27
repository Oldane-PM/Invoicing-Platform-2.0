/**
 * Console Email Provider
 *
 * Development/testing provider that logs emails to the console.
 * Use this when no SMTP server is available or for local development.
 */

import type { EmailMessage, EmailProvider } from '../types';

export class ConsoleEmailProvider implements EmailProvider {
  readonly name = 'console';

  async send(message: EmailMessage): Promise<void> {
    const timestamp = new Date().toISOString();
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`[EMAIL] ${timestamp}`);
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`To:      ${message.to}`);
    console.log(`Subject: ${message.subject}`);
    console.log('───────────────────────────────────────────────────────────────');
    console.log('Body (Text):');
    console.log(message.text);
    if (message.html) {
      console.log('───────────────────────────────────────────────────────────────');
      console.log('Body (HTML):');
      console.log(message.html);
    }
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
  }
}
