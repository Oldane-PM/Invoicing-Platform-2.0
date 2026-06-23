-- Fix contracts referencing contractor_user_id
ALTER TABLE public.contracts
DROP CONSTRAINT IF EXISTS contracts_contractor_user_id_fkey;

ALTER TABLE public.contracts
ADD CONSTRAINT contracts_contractor_user_id_fkey
FOREIGN KEY (contractor_user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;

-- Also fix submissions referencing contractor_user_id just in case
ALTER TABLE public.submissions
DROP CONSTRAINT IF EXISTS submissions_contractor_user_id_fkey;

ALTER TABLE public.submissions
ADD CONSTRAINT submissions_contractor_user_id_fkey
FOREIGN KEY (contractor_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Also fix system_work_orders referencing contractor_user_id just in case
ALTER TABLE public.system_work_orders
DROP CONSTRAINT IF EXISTS system_work_orders_contractor_user_id_fkey;

ALTER TABLE public.system_work_orders
ADD CONSTRAINT system_work_orders_contractor_user_id_fkey
FOREIGN KEY (contractor_user_id) REFERENCES public.app_users(id) ON DELETE CASCADE;

-- Fix manager_teams
ALTER TABLE public.manager_teams
DROP CONSTRAINT IF EXISTS manager_teams_contractor_id_fkey;

ALTER TABLE public.manager_teams
ADD CONSTRAINT manager_teams_contractor_id_fkey
FOREIGN KEY (contractor_id) REFERENCES public.app_users(id) ON DELETE CASCADE;
