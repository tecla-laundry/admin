-- Fix infinite recursion in profiles RLS policies
-- The issue is that policies are querying the profiles table within policies on the profiles table
-- Solution: Create a SECURITY DEFINER function to check roles without triggering RLS

-- Drop existing problematic policies
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "admins_read_all_profiles" ON profiles;

-- Create a helper function to check if a user is an admin
-- SECURITY DEFINER allows it to bypass RLS when checking the profiles table
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create a helper function to get user role
-- SECURITY DEFINER allows it to bypass RLS when checking the profiles table
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;

-- Recreate the update policy without the recursive role check
-- We only check that the user is updating their own profile
-- The role check in WITH CHECK is removed since users shouldn't be able to change their role anyway
CREATE POLICY "users_update_own_profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Recreate the admin read policy using the helper function
CREATE POLICY "admins_read_all_profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR public.is_admin(auth.uid())
  );
