-- Read-only. Run in your QuillGlow SQL editor to reconcile the reported 49 records.
select o.id as opportunity_id,o.title,o.benefactor_id,
  count(*) as all_records,
  count(*) filter(where a.status='saved') as saved,
  count(*) filter(where a.status='in_progress') as in_progress,
  count(*) filter(where a.status in ('submitted','shortlisted','awarded','rejected')) as received,
  count(*) filter(where a.status='withdrawn') as withdrawn,
  count(*) filter(where a.status is null or a.status not in ('saved','in_progress','submitted','shortlisted','awarded','rejected','withdrawn')) as other
from public.opportunities o join public.opportunity_applications a on a.opportunity_id=o.id
group by o.id,o.title,o.benefactor_id order by all_records desc,o.title;

select a.opportunity_id,coalesce(a.status,'<null>') as status,count(*) as records,
  count(*) filter(where a.submitted_at is null) as missing_submission_dates
from public.opportunity_applications a group by a.opportunity_id,a.status order by a.opportunity_id,a.status;
