/**
 * Email Service
 *
 * Provider-agnostic email sending service.
 * Selects the appropriate provider based on EMAIL_PROVIDER environment variable.
 *
 * Supported providers:
 * - console: Development mode, logs emails to console (default)
 * - smtp: Production mode, uses SMTP via nodemailer
 */

import type { EmailMessage, EmailProvider } from './types';
import { ConsoleEmailProvider } from './providers/console.provider';
import { SmtpEmailProvider } from './providers/smtp.provider';

// Singleton provider instance
let providerInstance: EmailProvider | null = null;

/**
 * Get or create the email provider based on configuration
 */
function getProvider(): EmailProvider {
  if (providerInstance) {
    return providerInstance;
  }

  const providerName = (process.env.EMAIL_PROVIDER || 'console').toLowerCase();

  switch (providerName) {
    case 'smtp':
      providerInstance = new SmtpEmailProvider();
      break;
    case 'console':
    default:
      if (providerName !== 'console') {
        console.warn(
          `[Email] Unknown provider "${providerName}", falling back to console provider`
        );
      }
      providerInstance = new ConsoleEmailProvider();
      break;
  }

  console.log(`[Email] Using provider: ${providerInstance.name}`);
  return providerInstance;
}

/**
 * Send an email using the configured provider
 *
 * @param message - The email message to send
 * @throws Error if sending fails
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  const provider = getProvider();
  await provider.send(message);
}

/**
 * Get the current provider name (useful for logging/debugging)
 */
export function getProviderName(): string {
  return getProvider().name;
}

/**
 * Reset the provider instance (useful for testing)
 */
export function resetProvider(): void {
  providerInstance = null;
}

// Re-export types for convenience
export type { EmailMessage, EmailProvider } from './types';
