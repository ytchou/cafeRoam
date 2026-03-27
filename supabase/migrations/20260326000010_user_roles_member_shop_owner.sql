-- 20260326000010_user_roles_member_shop_owner.sql
-- Rename paid_user → member, add shop_owner role

-- Step 1: Drop the existing CHECK constraint
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- Step 2: Rename existing paid_user rows to member
UPDATE public.user_roles SET role = 'member' WHERE role = 'paid_user';

-- Step 3: Add updated CHECK constraint with member + shop_owner
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('blogger', 'partner', 'admin', 'shop_owner', 'member'));
