-- =============================================================================
-- 0006_is_admin_anon_execute.sql
-- anon role must EXECUTE is_admin() when RLS policies reference it.
-- Without this grant, policies like products_select_active fail with:
--   permission denied for function is_admin (42501)
-- The function is SECURITY DEFINER and returns false for anon (no auth.uid()).
-- =============================================================================

grant execute on function public.is_admin() to anon;
