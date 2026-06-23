ALTER TABLE public.submissions
DROP CONSTRAINT IF EXISTS submissions_manager_id_fkey;

ALTER TABLE public.submissions
ADD CONSTRAINT submissions_manager_id_fkey
FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
