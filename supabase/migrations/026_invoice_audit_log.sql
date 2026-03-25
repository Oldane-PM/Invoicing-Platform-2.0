-- Audit trail when an invoice is replaced (e.g. contractor edited submitted hours after invoice existed)

CREATE TABLE IF NOT EXISTS public.invoice_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  previous_invoice_number TEXT,
  previous_invoice_url TEXT,
  previous_total_amount NUMERIC,
  new_invoice_number TEXT,
  new_total_amount NUMERIC,
  actor_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_invoice_audit_log_submission_id ON public.invoice_audit_log(submission_id);
CREATE INDEX IF NOT EXISTS idx_invoice_audit_log_created_at ON public.invoice_audit_log(created_at DESC);

COMMENT ON TABLE public.invoice_audit_log IS 'Invoice lifecycle events including replacement after submission edits';
COMMENT ON COLUMN public.invoice_audit_log.action IS 'e.g. replaced_due_to_submission_edit';
