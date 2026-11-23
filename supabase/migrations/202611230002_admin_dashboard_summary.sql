-- Aggregate the admin dashboard in one database round trip.
create or replace function public.admin_dashboard_summary(p_start date default null, p_end date default null)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
declare result jsonb;
begin
  if not public.is_admin(auth.uid()) then raise exception 'FORBIDDEN'; end if;

  select jsonb_build_object(
    'members', (select count(*) from public.profiles where role='member'),
    'bookings', (select count(*) from public.bookings),
    'new_bookings', (select count(*) from public.bookings where status='PENDING_ADMIN'),
    'awaiting_payment', (select count(*) from public.bookings where status='AWAITING_PAYMENT'),
    'payment_review', (select count(*) from public.bookings where status='PAYMENT_REVIEW'),
    'confirmed', (select count(*) from public.bookings where status='CONFIRMED'),
    'today_classes', (select count(*) from public.class_dates where class_date=(now() at time zone 'Asia/Jakarta')::date),
    'period_course_income', coalesce((select sum(amount_received) from public.payments where status='VERIFIED' and (p_start is null or (paid_at at time zone 'Asia/Jakarta')::date >= p_start) and (p_end is null or (paid_at at time zone 'Asia/Jakarta')::date <= p_end)),0),
    'period_manual_income', coalesce((select sum(amount) from public.cash_transactions where transaction_type='INCOME' and (p_start is null or transaction_date >= p_start) and (p_end is null or transaction_date <= p_end)),0),
    'period_expense', coalesce((select sum(amount) from public.cash_transactions where transaction_type='EXPENSE' and (p_start is null or transaction_date >= p_start) and (p_end is null or transaction_date <= p_end)),0),
    'current_balance',
      coalesce((select sum(amount_received) from public.payments where status='VERIFIED'),0)
      + coalesce((select sum(amount) from public.cash_transactions where transaction_type='INCOME'),0)
      - coalesce((select sum(amount) from public.cash_transactions where transaction_type='EXPENSE'),0)
  ) into result;
  return result;
end;
$$;

revoke all on function public.admin_dashboard_summary(date,date) from public;
grant execute on function public.admin_dashboard_summary(date,date) to authenticated;
