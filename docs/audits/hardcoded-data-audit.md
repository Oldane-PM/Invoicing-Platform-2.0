# Hardcoded Data Audit Report

**Generated:** February 4, 2026  
**Repository:** Invoicing-Platform-2.0  
**Branch:** chore/ui-remove-hardcoded-data

---

## Executive Summary

This audit identified **87 instances** of hardcoded data across the codebase that should be externalized to configuration, constants, environment variables, or fetched from the database/API.

| Category | Count | High Risk | Medium | Low |
|----------|-------|-----------|--------|-----|
| API_URL | 15 | 8 | 5 | 2 |
| UI_PLACEHOLDER | 12 | 0 | 6 | 6 |
| CONFIG_ENV | 8 | 3 | 4 | 1 |
| MONEY_RATE | 11 | 4 | 5 | 2 |
| STATUS_ENUM | 14 | 2 | 8 | 4 |
| ROLE_ENUM | 9 | 1 | 5 | 3 |
| DB_ID | 8 | 6 | 2 | 0 |
| DATE_TIME | 5 | 1 | 3 | 1 |
| MOCK_DATA | 3 | 0 | 2 | 1 |
| SECURITY_RISK | 2 | 2 | 0 | 0 |
| **TOTAL** | **87** | **27** | **40** | **20** |

---

## Table of Contents

1. [Security Risks (Immediate Action)](#1-security-risks-immediate-action)
2. [High-Risk Findings](#2-high-risk-findings)
3. [API URLs & Endpoints](#3-api-urls--endpoints)
4. [Hardcoded Rates & Money](#4-hardcoded-rates--money)
5. [Status & Role Enums](#5-status--role-enums)
6. [Database IDs & UUIDs](#6-database-ids--uuids)
7. [Date/Time Values](#7-datetime-values)
8. [UI Placeholders & Fallbacks](#8-ui-placeholders--fallbacks)
9. [Top 10 Quick Wins](#9-top-10-quick-wins)
10. [Remediation Plan](#10-remediation-plan)

---

## 1. Security Risks (Immediate Action)

### SECURITY_RISK-001: Hardcoded Company Domain
| Field | Value |
|-------|-------|
| **File** | `src/components/modals/NewUserModal.tsx:84,86` |
| **File** | `Server/controllers/user.controller.ts:42,44` |
| **Value** | `@intellibus.com` |
| **Severity** | HIGH |
| **Issue** | Company email domain is hardcoded in validation regex and error messages |
| **Fix** | Move to environment variable: `ALLOWED_EMAIL_DOMAIN=intellibus.com` |

```typescript
// Current (NewUserModal.tsx:84)
const emailRegex = /^[^\s@]+@intellibus\.com$/;

// Should be
const allowedDomain = import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN;
const emailRegex = new RegExp(`^[^\\s@]+@${allowedDomain}$`);
```

### SECURITY_RISK-002: Default Company Info with Placeholder Values
| Field | Value |
|-------|-------|
| **File** | `Server/controllers/invoice.controller.ts:20-24` |
| **Value** | `'Client Company'`, `'123 Business Street'`, `'United States'` |
| **Severity** | HIGH |
| **Issue** | Fallback company info could appear on production invoices if env vars missing |
| **Fix** | Throw error if env vars not set, or use validated config layer |

```typescript
// Current
const DEFAULT_COMPANY_INFO = {
  companyName: process.env.COMPANY_NAME || 'Client Company',
  address: process.env.COMPANY_ADDRESS || '123 Business Street',
  country: process.env.COMPANY_COUNTRY || 'United States',
};

// Should be: Fail fast if not configured
function getCompanyInfo() {
  const companyName = process.env.COMPANY_NAME;
  if (!companyName) throw new Error('COMPANY_NAME env var is required');
  // ...
}
```

---

## 2. High-Risk Findings

### API_URL-001: Hardcoded localhost URLs in Production Code
| Severity | HIGH |
|----------|------|
| **Instances** | 8 |

| File | Line | Value | Fix |
|------|------|-------|-----|
| `src/pages/auth/OAuthCallback.tsx` | 43 | `http://localhost:5001/api/callback/supabase` | Use `import.meta.env.VITE_API_URL` |
| `src/lib/auth.ts` | 16,43-46 | `http://localhost:5001`, `http://localhost:5173` | Use env vars |
| `src/lib/auth-client.ts` | 4 | `const baseURL = "http://localhost:5001"` | Use `import.meta.env.VITE_AUTH_BASE_URL` |
| `src/components/modals/NewUserModal.tsx` | 127 | `http://localhost:5001/api/users` | Use `${API_BASE_URL}/api/users` |
| `src/pages/auth/Login.tsx` | 22 | `http://localhost:5173/auth/callback` | Use `${window.location.origin}/auth/callback` |
| `Server/server.ts` | 17-18 | CORS origins hardcoded | Use `ALLOWED_ORIGINS` env var |
| `vite.config.ts` | 42 | `http://localhost:5001` | Use env var for dev proxy |

### MONEY_RATE-001: Hardcoded Default Rates
| Severity | HIGH |
|----------|------|
| **File** | `src/lib/calculations/submissions.ts:276-277` |

```typescript
// Current
export const DEFAULT_HOURLY_RATE = 75;
export const DEFAULT_OT_MULTIPLIER = 1.5;
```

**Issue:** These defaults are used as fallbacks throughout the app:
- `src/lib/data/submissionsDataSource.ts:117,121,307,502`
- `src/lib/data/adminDashboard/adminDashboard.mappers.ts:38-39,98-99`
- `Server/controllers/invoice.controller.ts:188-189`

**Fix:** 
1. Move to `src/constants/rates.ts` 
2. Load from database config table for tenant-specific rates
3. Throw errors instead of using fallbacks in production

### DB_ID-001: Hardcoded UUIDs in Seed Data
| Severity | HIGH (if used in production) |
|----------|------|

| File | Line | Value |
|------|------|-------|
| `supabase/migrations/seed.sql` | 24-25 | `00000000-0000-0000-0000-000000000001` |
| `supabase/migrations/seed.sql` | 45 | `e7e9c80f-57e8-4636-a167-6576defe89fd` |
| `supabase/migrations/006_manager_seed_data.sql` | 19-22 | Placeholder UUIDs |
| `supabase/migrations/010_upsert_sarah_contractor.sql` | 24 | `e7e9c80f-57e8-4636-a167-6576defe89fd` |
| `supabase/migrations/011_add_john_smith_manager.sql` | 14 | Placeholder UUID |
| `supabase/migrations/022_add_peter_adams_manager.sql` | 14 | Placeholder UUID |

**Note:** Seed data UUIDs are OK for development. Mark as **OK** if these files are not used in production.

---

## 3. API URLs & Endpoints

### API_URL-002: Port Numbers
| Severity | MEDIUM |
|----------|------|

| File | Line | Value | Purpose |
|------|------|-------|---------|
| `Server/server.ts` | 11 | `5001` | Server port default |
| `.env.example` | 28 | `PORT=5001` | Documented (OK) |

**Status:** The port uses `process.env.PORT ?? 5001` which is acceptable, but the hardcoded fallback should match deployment requirements.

### API_URL-003: API Path Patterns
| Severity | LOW |
|----------|------|

| File | Line | Pattern |
|------|------|---------|
| `src/lib/hooks/invoices/useInvoice.ts` | 34 | `/api/invoices/${submissionId}` |

**Note:** API path prefixes like `/api/` are acceptable as they're part of the API contract.

---

## 4. Hardcoded Rates & Money

### MONEY_RATE-002: Currency Defaults
| Severity | MEDIUM |
|----------|------|

| File | Line | Value |
|------|------|-------|
| `src/lib/calculations/submissions.ts` | 80 | `currency = "USD"` |
| `Server/services/invoices/generateInvoicePdf.ts` | 353 | `currency: string = 'USD'` |
| `Server/controllers/invoice.controller.ts` | 197 | `'USD'` fallback |
| `supabase/migrations/019_contractor_profiles_table.sql` | 29,79 | `DEFAULT 'USD'` |
| `supabase/migrations/025_add_invoice_columns.sql` | 9 | `DEFAULT 'USD'` |
| `src/pages/contractor/Profile.tsx` | 38 | `useState("USD")` |

**Fix:** Centralize currency defaults in `src/constants/money.ts`:
```typescript
export const DEFAULT_CURRENCY = process.env.VITE_DEFAULT_CURRENCY || 'USD';
export const SUPPORTED_CURRENCIES = ['USD', 'JMD', 'CAD'] as const;
```

### MONEY_RATE-003: Invoice Due Days
| Severity | MEDIUM |
|----------|------|

| File | Line | Value |
|------|------|-------|
| `Server/controllers/invoice.controller.ts` | 196 | `'15'` default |
| `src/components/pdf/PDFInvoiceViewer.tsx` | 87 | `30 * 24 * 60 * 60 * 1000` (30 days hardcoded) |

**Fix:** Consistent env var: `INVOICE_DUE_DAYS=15`

### MONEY_RATE-004: Overtime Multiplier
| Severity | MEDIUM |
|----------|------|

| File | Line | Value |
|------|------|-------|
| `Server/controllers/invoice.controller.ts` | 173,189 | `hourlyRate * 1.5` |
| `src/components/drawers/ContractorDetailDrawer.tsx` | 418 | `formData.hourly_rate * 1.5` |
| `src/lib/calculations/submissions.ts` | 277 | `DEFAULT_OT_MULTIPLIER = 1.5` |

**Fix:** All should reference `DEFAULT_OT_MULTIPLIER` constant.

### MONEY_RATE-005: Seed Data Hourly Rate
| Severity | LOW |
|----------|------|

| File | Line | Value |
|------|------|-------|
| `supabase/migrations/010_upsert_sarah_contractor.sql` | 65 | `hourly_rate = 75.00` |

**Note:** Seed data is OK for development.

---

## 5. Status & Role Enums

### STATUS_ENUM-001: Duplicated Status Definitions
| Severity | MEDIUM |
|----------|------|

Status strings are defined in multiple places:

| File | Status Values |
|------|---------------|
| `src/lib/types/index.ts:100-115` | Centralized `SUBMISSION_STATUS_LABELS` (OK) |
| `src/pages/manager/Dashboard.tsx:36-56` | Local `DisplayStatus` type + `getDisplayStatus()` |
| `src/pages/contractor/Dashboard.tsx:43-56` | Local `DisplayStatus` type + `getDisplayStatus()` |
| `src/lib/supabase/repos/managerSubmissions.repo.ts:37-40,162-171` | Status mapping |
| `src/lib/data/adminDashboard/adminDashboard.repo.ts:114-147` | Status derivation |
| `src/components/drawers/ManagerSubmissionDrawer.tsx:28,70-96` | Status type + colors |

**Positive:** `src/lib/types/index.ts` has centralized status definitions. 
**Issue:** Components still define local status types and mappings.
**Fix:** Import from `src/lib/types/index.ts` everywhere.

### STATUS_ENUM-002: Status Color Definitions
| Severity | LOW |
|----------|------|

`statusStyles` objects are duplicated across 6+ files:
- `src/pages/manager/Dashboard.tsx:60`
- `src/pages/contractor/Dashboard.tsx:60`
- `src/pages/admin/Dashboard.tsx:28`
- `src/components/drawers/ContractorDetailDrawer.tsx:31`
- `src/components/drawers/ContractorSubmissionDrawer.tsx:39`
- `src/components/drawers/SubmissionReviewDrawer.tsx:80`

**Fix:** Create `src/constants/statusStyles.ts`:
```typescript
export const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Approved: "bg-green-50 text-green-700 border-green-200",
  // ...
};
```

### ROLE_ENUM-001: Role Definitions
| Severity | MEDIUM |
|----------|------|

Role arrays are defined multiple times:

| File | Line | Value |
|------|------|-------|
| `src/pages/admin/UserAccessManagement.tsx` | 36-38 | `[{ value: "Contractor", label: "Contractor" }, ...]` |
| `src/components/modals/NewUserModal.tsx` | 27-29 | Same role options array |
| `Server/controllers/user.controller.ts` | 49 | `validRoles = ["unassigned", "contractor", "manager", "admin"]` |
| `src/lib/data/userAccess/userAccess.mappers.ts` | 14 | `validRoles = ['unassigned', 'admin', 'manager', 'contractor']` |
| `src/App.tsx` | 46,107-112 | `UserRole` type + role mapping |

**Fix:** Create single source of truth in `src/constants/roles.ts`:
```typescript
export const ROLES = ['unassigned', 'contractor', 'manager', 'admin'] as const;
export type Role = typeof ROLES[number];
export const ROLE_OPTIONS = ROLES.filter(r => r !== 'unassigned').map(r => ({
  value: r.charAt(0).toUpperCase() + r.slice(1),
  label: r.charAt(0).toUpperCase() + r.slice(1),
}));
```

---

## 6. Database IDs & UUIDs

### DB_ID-002: Test User UUIDs
| Severity | LOW (seed data only) |
|----------|------|

| File | Value | Purpose |
|------|-------|---------|
| `supabase/migrations/seed.sql` | Various placeholder UUIDs | Test data |
| `supabase/migrations/006_manager_seed_data.sql` | `00000000-0000-0000-0000-00000000000X` | Placeholder comments |

**Status:** OK - These are clearly marked as placeholders in seed files.

---

## 7. Date/Time Values

### DATE_TIME-001: Hardcoded Time Windows
| Severity | MEDIUM |
|----------|------|

| File | Line | Value | Purpose |
|------|------|-------|---------|
| `src/lib/hooks/adminCalendar/useUpcomingDaysOff.ts` | 16 | `days: number = 90` | Default lookahead |
| `src/components/pdf/PDFInvoiceViewer.tsx` | 87 | `30 * 24 * 60 * 60 * 1000` | Due date calculation |

**Fix:** Move to constants:
```typescript
export const DEFAULT_CALENDAR_LOOKAHEAD_DAYS = 90;
export const DEFAULT_INVOICE_DUE_DAYS = 30;
```

### DATE_TIME-002: Month Arrays
| Severity | LOW |
|----------|------|

Month name arrays are duplicated:
- `src/pages/contractor/SubmitHours.tsx:50`
- `src/components/shared/MultiMonthSelector.tsx:13`
- `src/components/modals/SubmitHoursModal.tsx:25`

**Fix:** Create `src/constants/dates.ts`:
```typescript
export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
] as const;
```

---

## 8. UI Placeholders & Fallbacks

### UI_PLACEHOLDER-001: Form Placeholders (OK)
| Severity | LOW |
|----------|------|

These are intentional UI copy:
- `placeholder="John"` - First name example
- `placeholder="john.doe@intellibus.com"` - Email format example
- `placeholder="Search..."` - Search hint

**Status:** OK - These are standard UX patterns.

### UI_PLACEHOLDER-002: Fallback Display Values
| Severity | MEDIUM |
|----------|------|

| File | Line | Value | Issue |
|------|------|-------|-------|
| `src/pages/manager/Dashboard.tsx` | 429,470 | `\|\| "Unknown"` | Missing data fallback |
| `src/lib/supabase/repos/managerSubmissions.repo.ts` | 193,340 | `\|\| "Unknown"` | Missing profile fallback |
| `src/lib/supabase/repos/team.repo.ts` | 116,208,281 | `\|\| "Unknown"` | Missing name fallback |
| `src/lib/data/adminDashboard/adminDashboard.repo.ts` | 152,155,282,286,297 | `\|\| 'Unknown Contractor'`, `'Unknown Manager'`, `'No description provided'` | |
| `src/lib/data/submissionsDataSource.ts` | 123,241,303,539 | `\|\| "General Work"` | Default project name |
| `Server/controllers/invoice.controller.ts` | 241 | `\|\| 'Contractor'` | Invoice name fallback |

**Fix:** Centralize fallback strings:
```typescript
// src/constants/fallbacks.ts
export const FALLBACK_STRINGS = {
  UNKNOWN: 'Unknown',
  UNKNOWN_CONTRACTOR: 'Unknown Contractor',
  UNKNOWN_MANAGER: 'Unknown Manager',
  NO_DESCRIPTION: 'No description provided',
  GENERAL_WORK: 'General Work',
} as const;
```

---

## 9. Top 10 Quick Wins

| Priority | Task | Files Affected | Effort | Impact |
|----------|------|----------------|--------|--------|
| 1 | Move `DEFAULT_HOURLY_RATE` and `DEFAULT_OT_MULTIPLIER` to env vars with validation | 6 files | Low | High |
| 2 | Fix hardcoded localhost URLs in auth flow | 4 files | Low | High |
| 3 | Create `/src/constants/roles.ts` and import everywhere | 5 files | Low | Medium |
| 4 | Create `/src/constants/statusStyles.ts` and import everywhere | 6 files | Low | Medium |
| 5 | Move company email domain to env var | 2 files | Low | High |
| 6 | Create `/src/constants/fallbacks.ts` for "Unknown" strings | 8 files | Low | Medium |
| 7 | Create `/src/constants/dates.ts` for MONTHS array | 3 files | Low | Low |
| 8 | Fix hardcoded currency default, use env var | 5 files | Low | Medium |
| 9 | Add validation for `DEFAULT_COMPANY_INFO` env vars | 1 file | Low | High |
| 10 | Create config validation layer that fails fast on missing required vars | New file | Medium | High |

---

## 10. Remediation Plan

### Phase 1: Constants Centralization (Quick Wins)

**Create new files:**

```
src/constants/
├── index.ts          # Re-exports all constants
├── roles.ts          # Role types and options
├── statuses.ts       # Status enums and labels (extend existing types)
├── statusStyles.ts   # Status badge styling
├── rates.ts          # Rate defaults and validation
├── dates.ts          # Month names, date utilities
├── fallbacks.ts      # Fallback display strings
└── money.ts          # Currency defaults
```

**Example: `src/constants/roles.ts`**
```typescript
export const ROLES = ['unassigned', 'contractor', 'manager', 'admin'] as const;
export type UserRole = typeof ROLES[number];

export const ASSIGNABLE_ROLES = ROLES.filter(r => r !== 'unassigned');

export const ROLE_OPTIONS = ASSIGNABLE_ROLES.map(role => ({
  value: role.charAt(0).toUpperCase() + role.slice(1),
  label: role.charAt(0).toUpperCase() + role.slice(1),
}));

export function isValidRole(role: string): role is UserRole {
  return ROLES.includes(role.toLowerCase() as UserRole);
}
```

### Phase 2: Environment Variable Consolidation

**Required `.env` variables for production:**

```bash
# Required (app will fail to start if missing)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=
VITE_AUTH_BASE_URL=
BETTER_AUTH_SECRET=
JWT_SECRET=

# Invoice Configuration
COMPANY_NAME=
COMPANY_ADDRESS=
COMPANY_COUNTRY=
INVOICE_CURRENCY=USD
INVOICE_DUE_DAYS=15

# Rate Defaults (override in DB for tenant-specific)
DEFAULT_HOURLY_RATE=75
DEFAULT_OVERTIME_MULTIPLIER=1.5

# Email Validation
ALLOWED_EMAIL_DOMAIN=intellibus.com

# CORS
ALLOWED_ORIGINS=
```

**Create config validation layer:**

```typescript
// src/lib/config.ts
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_API_URL',
] as const;

export function validateConfig() {
  const missing = requiredEnvVars.filter(key => !import.meta.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export const config = {
  apiUrl: import.meta.env.VITE_API_URL,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  // ...
};
```

### Phase 3: Database-Driven Configuration

For tenant-specific or frequently changing values, create a `config` table:

```sql
CREATE TABLE app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Example entries
INSERT INTO app_config (key, value) VALUES
  ('default_hourly_rate', '75'),
  ('default_ot_multiplier', '1.5'),
  ('invoice_due_days', '15'),
  ('supported_currencies', '["USD", "JMD", "CAD"]');
```

### Phase 4: Lint Rules (Optional)

Add ESLint rules to prevent reintroducing hardcoded values:

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: 'Literal[value="localhost"]',
        message: 'Do not hardcode localhost. Use environment variables.',
      },
      {
        selector: 'Literal[value=/^http:\\/\\/localhost/]',
        message: 'Do not hardcode localhost URLs. Use environment variables.',
      },
    ],
  },
};
```

---

## Appendix: Files Changed Summary

| File | Changes Needed |
|------|----------------|
| `src/lib/auth.ts` | Replace localhost URLs with env vars |
| `src/lib/auth-client.ts` | Use `VITE_AUTH_BASE_URL` |
| `src/pages/auth/OAuthCallback.tsx` | Use `VITE_API_URL` |
| `src/pages/auth/Login.tsx` | Use `window.location.origin` |
| `src/components/modals/NewUserModal.tsx` | Use `VITE_API_URL`, `VITE_ALLOWED_EMAIL_DOMAIN` |
| `src/lib/calculations/submissions.ts` | Export defaults but load from config |
| `src/pages/manager/Dashboard.tsx` | Import statusStyles, DisplayStatus from constants |
| `src/pages/contractor/Dashboard.tsx` | Import statusStyles, DisplayStatus from constants |
| `src/pages/admin/Dashboard.tsx` | Import statusStyles from constants |
| `src/pages/admin/UserAccessManagement.tsx` | Import ROLE_OPTIONS from constants |
| `Server/controllers/invoice.controller.ts` | Validate company info env vars |
| `Server/controllers/user.controller.ts` | Use `ALLOWED_EMAIL_DOMAIN` env var |
| `Server/server.ts` | Parse ALLOWED_ORIGINS from env |

---

## Conclusion

This audit identified 87 instances of hardcoded data, with 27 classified as high-risk. The most critical issues are:

1. **Hardcoded localhost URLs** in production auth flow
2. **Hardcoded company domain** for email validation
3. **Default rate values** that could affect invoicing
4. **Company info fallbacks** that could appear on production invoices

The recommended approach is to:
1. Start with the **Top 10 Quick Wins** (low effort, high impact)
2. Create centralized constants in `/src/constants/`
3. Add config validation that fails fast on missing required env vars
4. Move frequently-changing values to database configuration

---

*Report generated by automated audit scan. Manual review recommended for edge cases.*
