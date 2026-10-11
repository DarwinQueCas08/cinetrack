-- Run ONLY in the Supabase SQL Editor as project administrator after verifying
-- the account holder. Replaces the existing recovery code, leaving lists intact.
-- The returned secret must be delivered privately; do not share result screenshots.
-- UUIDs provide 244 random bits combined; SHA-256 matches the application's hash.
-- Put the target username between the quotes below, e.g. 'Eli'.
-- An empty username deliberately makes no changes and returns no rows.
WITH input AS (
  SELECT lower(btrim('')) AS username
), secret AS MATERIALIZED (
  SELECT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '') AS code
), saved AS (
  INSERT INTO public.kv_store_da14cc3d (key, value)
  SELECT 'auth:recovery:' || i.username,
    jsonb_build_object(
      'userId', u.id::text,
      'hash', encode(sha256(convert_to(s.code, 'UTF8')), 'hex')
    )
  FROM auth.users u CROSS JOIN secret s CROSS JOIN input i
  WHERE i.username <> ''
    AND lower(u.email) = i.username || '@cinetrack.local'
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  RETURNING key
)
SELECT i.username AS usuario, s.code AS codigo_recuperacion
FROM secret s CROSS JOIN saved CROSS JOIN input i
WHERE saved.key = 'auth:recovery:' || i.username;
