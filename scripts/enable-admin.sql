-- Run once from Supabase SQL Editor as project owner.
-- Create the Admin account normally in CineTrack BEFORE running this query.
-- Only app metadata grants access; the username alone never grants privileges.
UPDATE auth.users
SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('cinetrack_admin', true)
WHERE lower(email) = 'admin@cinetrack.local'
RETURNING id, email;
