-- Migration: Fixed-rate (salary) support
--
-- Fixed-wage contractors are paid a constant monthly amount; hours are tracked
-- for reporting but do NOT affect pay. Before this migration the fixed amount
-- had nowhere to live:
--   - contracts had contract_type ('hourly'/'fixed') but no fixed amount column
--   - submissions stored hourly rates but no fixed amount snapshot
-- As a result fixed submissions stored total_amount = 0 and invoices were
-- rendered as if hourly. These columns give the fixed amount a home on the
-- contract (authoring) and a snapshot on the submission (consistency).

-- 1) Authoring location: the constant monthly fee on the contract.
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS fixed_monthly_rate NUMERIC(10,2);

COMMENT ON COLUMN public.contracts.fixed_monthly_rate IS
  'Constant monthly amount for fixed/salary contracts. NULL for hourly contracts. Hours do not affect pay when contract_type = fixed.';

-- 2) Snapshot location: the monthly amount used to compute this submission's
--    total, stored at submission time so later contract edits never retroactively
--    change an already-generated invoice (mirrors regular_rate/overtime_rate).
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS monthly_rate NUMERIC(10,2);

COMMENT ON COLUMN public.submissions.monthly_rate IS
  'Fixed monthly rate used to calculate total_amount (snapshot at submission time). NULL for hourly submissions; rate_type indicates which applies.';
