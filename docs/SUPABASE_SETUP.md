# Supabase Setup for Admin Dashboard

## ✅ Configuration Complete

The Supabase configuration has been set up with the following credentials:

- **Project URL**: `https://spxiqijwmrbpafzcwjto.supabase.co`
- **Publishable Key**: Configured in `.env.local`

## Environment Variables

The `.env.local` file has been created with your Supabase credentials. This file is gitignored and will not be committed to version control.

### Important Note About the API Key

The key you provided (`sb_publishable_...`) may need to be the actual **anon key** from your Supabase dashboard. 

**If you encounter authentication errors**, please verify:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/spxiqijwmrbpafzcwjto
2. Navigate to **Settings > API**
3. Copy the **anon public** key (this is typically a JWT token starting with `eyJ...`)
4. Update `.env.local` with the correct key:
   ```env
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your_actual_anon_key
   ```

## Testing the Connection

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Test the connection**:
   - Navigate to http://localhost:3000
   - Try to sign in at http://localhost:3000/sign-in
   - The app should connect to your Supabase project

## Database Setup

Before using the admin dashboard, make sure you have:

1. **Applied the database migrations**:
   ```bash
   cd ../supabase
   supabase db push
   ```

2. **Created an admin user**:
   - Sign up a user via Supabase Auth (or create one in the dashboard)
   - Update the `profiles` table to set `role = 'admin'` for that user
   - You can do this via SQL Editor in Supabase Dashboard:
     ```sql
     UPDATE profiles 
     SET role = 'admin' 
     WHERE id = 'your-user-id';
     ```

## Troubleshooting

### "Invalid API key" errors
- Verify you're using the **anon public** key, not the service_role key
- Check that the key in `.env.local` matches the one in your Supabase dashboard

### "Table does not exist" errors
- Make sure you've run the database migrations
- Check that all tables are created in your Supabase project

### Authentication not working
- Verify the Supabase URL is correct
- Check browser console for CORS errors
- Ensure RLS policies are set up correctly

## Next Steps

1. ✅ Environment variables configured
2. ⏭️ Apply database migrations (if not done)
3. ⏭️ Create admin user
4. ⏭️ Test sign-in functionality
5. ⏭️ Verify admin dashboard access
