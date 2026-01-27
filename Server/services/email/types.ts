/**
 * Email Service Types
 *
 * Provider-agnostic interfaces for email functionality.
 * These types define the contract that all email providers must implement.
 */

/**
 * Email message payload
 */
export interface EmailMessage {
  /** Recipient email address */
  to: string;
  /** Email subject line */
  subject: string;
  /** Plain text body (required for accessibility) */
  text: string;
  /** Optional HTML body */
  html?: string;
}

/**
 * Email provider interface
 * All email providers must implement this contract
 */
export interface EmailProvider {
  /** Provider identifier for logging */
  readonly name: string;
  /** Send an email message */
  send(message: EmailMessage): Promise<void>;
}

/**
 * Email send result (for future extensions like tracking)
 */
export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
