-- set_updated_at() only needs to touch the row already being updated by its
-- own trigger — no elevated privileges required, so it should never have
-- been SECURITY DEFINER. As written it was also exposed as a callable public
-- RPC endpoint (/rest/v1/rpc/set_updated_at) to anon/authenticated, which the
-- Supabase security advisor flagged. Switch to SECURITY INVOKER and revoke
-- direct execute access — it's for trigger use only.

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security invoker set search_path = '';

revoke execute on function public.set_updated_at() from public, anon, authenticated;
