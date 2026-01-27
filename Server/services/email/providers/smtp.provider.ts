/**
 * SMTP Email Provider
 *
 * Production provider using nodemailer for SMTP-based email delivery.
 * Works with any SMTP server: Gmail, Outlook, SendGrid, SES, Mailgun, etc.
 *
 * Required environment variables:
 * - SMTP_HOST: SMTP server hostname
 * - SMTP_PORT: SMTP server port (default: 587)
 * - SMTP_SECURE: Use TLS (default: false for STARTTLS on port 587)
 * - SMTP_USER: SMTP username (optional for some servers)
 * - SMTP_PASS: SMTP password (optional for some servers)
 * - SMTP_FROM: From address (default: "Invoicing Platform <no-reply@example.com>")
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { EmailMessage, EmailProvider } from '../types';

export class SmtpEmailProvider implements EmailProvider {
  readonly name = 'smtp';
  private transporter: Transporter;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host) {
      throw new Error(
        'SMTP_HOST environment variable is required when using SMTP provider. ' +
        'Set EMAIL_PROVIDER=console for development without SMTP.'
      );
    }

    // Build auth config only if credentials are provided
    const auth = user ? { user, pass: pass || '' } : undefined;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth,
      // Connection pool for better performance
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });

    console.log(`[SMTP] Provider initialized: ${host}:${port} (secure: ${secure})`);
  }

  async send(message: EmailMessage): Promise<void> {
    const from = process.env.SMTP_FROM || 'Invoicing Platform <no-reply@example.com>';

    try {
      const info = await this.transporter.sendMail({
        from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });

      console.log(`[SMTP] Email sent successfully: ${info.messageId} -> ${message.to}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[SMTP] Failed to send email to ${message.to}: ${errorMessage}`);
      throw new Error(`SMTP send failed: ${errorMessage}`);
    }
  }

  /**
   * Verify SMTP connection (useful for health checks)
   */
  async verify(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('[SMTP] Connection verified successfully');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[SMTP] Connection verification failed: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Close the connection pool
   */
  close(): void {
    this.transporter.close();
    console.log('[SMTP] Connection pool closed');
  }
}
