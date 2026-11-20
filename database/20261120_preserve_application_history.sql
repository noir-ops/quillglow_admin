-- Apply once to the shared QuillGlow database before deploying either updated portal.
-- Existing scholarship, learner and audit records are preserved.
begin;
create or replace function public.protect_opportunity_application_history()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from public.opportunity_applications a where a.opportunity_id=old.id) then
    raise exception 'This opportunity has saved or application records. Close it to preserve learner history.'
      using errcode='PT409';
  end if;
  return old;
end;
$$;
revoke all on function public.protect_opportunity_application_history() from public,anon,authenticated;
drop trigger if exists protect_opportunity_application_history on public.opportunities;
create trigger protect_opportunity_application_history before delete on public.opportunities
  for each row execute function public.protect_opportunity_application_history();
commit;
