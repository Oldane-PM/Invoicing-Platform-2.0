/**
 * Environment Configuration
 * 
 * This file MUST be imported first in the server entry point
 * to ensure environment variables are loaded before any other modules.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root (one level up from Server/)
const envPath = path.resolve(__dirname, '..', '.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn('[env] Warning: Could not load .env file:', result.error.message);
}

// Log environment status (non-sensitive)
console.log('[env] Environment loaded from:', envPath);
console.log('[env] VITE_SUPABASE_URL present:', !!process.env.VITE_SUPABASE_URL);
console.log('[env] SERVICE_ROLE present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('[env] INVOICES_BUCKET:', process.env.SUPABASE_INVOICES_BUCKET || '(not set)');
