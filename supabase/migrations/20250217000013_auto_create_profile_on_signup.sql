-- Auto-create profile when a new user signs up
-- This trigger automatically creates a profile entry with 'customer' role
-- whenever a new user is created in auth.users

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, email, created_at, updated_at)
  VALUES (
    NEW.id,
    'customer', -- Default role for new users
    NEW.email, -- Copy email from auth.users
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent errors if profile already exists
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires after a new user is inserted into auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
-- The function needs to be able to insert into profiles table
-- SECURITY DEFINER allows the function to run with the privileges of the function creator
-- This is safe because the function only inserts data based on the new user's ID

-- Grant execute permission to authenticated users (required for trigger)
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;
