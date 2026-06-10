-- Allow a single submission to be tagged with multiple projects (shared-hours model).
--
-- The contractor enters one hours total + description and tags the submission with
-- one or more projects. We keep the existing scalar columns for backwards
-- compatibility:
--   * project_id   -> the PRIMARY (first selected) project, preserves the FK used by
--                     invoice generation and all existing single-project reads.
--   * project_name -> a comma-joined label of all tagged projects, so existing
--                     displays/invoices show every project without code changes.
-- and add structured array columns so the edit form can re-populate the picker exactly.

ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS project_ids UUID[],
  ADD COLUMN IF NOT EXISTS project_names TEXT[];

COMMENT ON COLUMN public.submissions.project_ids IS 'All projects tagged on this submission (shared-hours model). project_id mirrors project_ids[1] as the primary project.';
COMMENT ON COLUMN public.submissions.project_names IS 'Names of all tagged projects, aligned by index with project_ids. project_name is the comma-joined label.';

-- Backfill existing rows so array columns are consistent with the scalar columns.
UPDATE public.submissions
SET project_ids = ARRAY[project_id]
WHERE project_id IS NOT NULL
  AND project_ids IS NULL;

UPDATE public.submissions
SET project_names = ARRAY[project_name]
WHERE project_name IS NOT NULL
  AND project_names IS NULL;
