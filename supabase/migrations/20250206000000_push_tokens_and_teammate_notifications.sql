-- Store Expo push tokens per profile (one row per device).
-- Run this in Supabase SQL Editor if you don't use Supabase CLI migrations.

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, token)
);

-- RLS: users can only insert/update/delete their own tokens (matching profile by auth).
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own push tokens"
  ON public.push_tokens
  FOR ALL
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE supabase_uid = auth.uid()
    )
  )
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.profiles WHERE supabase_uid = auth.uid()
    )
  );

-- RPC: return push tokens of all other profiles that share at least one team with the current user.
-- Used to send "someone in your team checked out X" notifications.
CREATE OR REPLACE FUNCTION public.get_teammate_push_tokens()
RETURNS SETOF text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pt.token
  FROM push_tokens pt
  JOIN profiles me ON me.supabase_uid = auth.uid()
  JOIN profiles p ON p.id = pt.profile_id
  WHERE p.id != me.id
    AND p.teams IS NOT NULL
    AND me.teams IS NOT NULL
    AND p.teams && me.teams  -- array overlap: at least one team in common
    AND p.deleted_at IS NULL;
$$;

-- Allow authenticated users to call the RPC.
GRANT EXECUTE ON FUNCTION public.get_teammate_push_tokens() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_teammate_push_tokens() TO service_role;

COMMENT ON TABLE public.push_tokens IS 'Expo push tokens per profile for team checkout notifications';
COMMENT ON FUNCTION public.get_teammate_push_tokens() IS 'Returns push tokens of users who share a team with the current user (excluding current user)';
