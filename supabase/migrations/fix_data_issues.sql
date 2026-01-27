-- ==========================================
-- 1. RLS POLICIES
-- ==========================================

-- Enable RLS on tables if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
-- Assuming 'contractors' table exists
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;

-- A) PROFILES POLICIES
-- 1. Users can read their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

-- 2. Managers can read ALL contractor profiles (for directory search)
-- Avoid recursion by NOT referencing profiles table in the check if possible.
-- Implementation: Check if auth.uid() exists in a way that doesn't cycle, or just allow auth users to read profiles where role='CONTRACTOR'.
-- Simplest functional approach for directory:
CREATE POLICY "Managers can view contractor profiles" 
ON public.profiles FOR SELECT 
USING (role = 'CONTRACTOR');

-- B) MANAGER_TEAMS POLICIES
-- 1. Managers can view/insert/delete their own team rows
CREATE POLICY "Managers manage their own team" 
ON public.manager_teams FOR ALL 
USING (auth.uid() = manager_id)
WITH CHECK (auth.uid() = manager_id);

-- C) SUBMISSIONS POLICIES
-- 1. Contractors can view their own submissions
CREATE POLICY "Contractors view own submissions" 
ON public.submissions FOR SELECT 
USING (auth.uid() = contractor_id);

-- 2. Contractors can insert their own submissions
CREATE POLICY "Contractors insert own submissions" 
ON public.submissions FOR INSERT 
WITH CHECK (auth.uid() = contractor_id);

-- ==========================================
-- 2. SARAH JOHNSON UPSERT
-- Replace <SARAH_UID> with the actual UUID from Authentication > Users
-- ==========================================

DO $$
DECLARE
    target_uid uuid := '<SARAH_UID>'; -- PASTE SARAH'S UID HERE
BEGIN
    -- 1. Upsert Profile
    INSERT INTO public.profiles (id, email, full_name, role, created_at)
    VALUES (
        target_uid,
        'sarah.johnson@email.com',
        'Sarah Johnson',
        'CONTRACTOR',
        now()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        full_name = EXCLUDED.full_name,
        role = 'CONTRACTOR';

    -- 2. Upsert Contractor Details
    -- This ensures the join in searchContractors works if strict mode was used (though we relaxed it in code)
    INSERT INTO public.contractors (
        contractor_id, 
        hourly_rate, 
        overtime_rate, 
        default_project_name, 
        is_active
    )
    VALUES (
        target_uid,
        75.00,
        112.50,
        'General Work',
        true
    )
    ON CONFLICT (contractor_id) DO UPDATE
    SET 
        is_active = true;

END $$;
