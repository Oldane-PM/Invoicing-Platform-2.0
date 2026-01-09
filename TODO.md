# TODO: Fix Manager Add Contractor Search

## Tasks

- [x] Update src/lib/supabase/repos/team.repo.ts: Rename searchAvailableContractors to searchContractors, modify to query profiles with role='CONTRACTOR', fetch contractor details from contractors table using in(contractor_id, ids), merge results, filter out contractors already in manager's team.
- [x] Create new migration: supabase/migrations/011_add_john_smith_manager.sql to insert John Smith profile with role='MANAGER' and email 'john.smith@email.com'.
- [x] Verify RLS policies: Confirm migration 008 is applied, allowing managers to read contractor profiles.
- [x] Ensure contractor profiles exist: Confirm migration 008 trigger creates profiles on signup.

## Testing

- [ ] Test search: Manager can type "Sarah" or email and see contractor results.
- [ ] Test add: Click Add, team list updates.
- [ ] Test login integrity: Contractors/managers cannot access other portals.
