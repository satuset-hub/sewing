-- Simple cashbook for manual income and expenses.
create type public.cash_transaction_type as enum ('INCOME', 'EXPENSE');
create type public.cash_transaction_source as enum ('MANUAL', 'RECEIPT');

create table public.cash_transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_type public.cash_transaction_type not null,
  source public.cash_transaction_source not null default 'MANUAL',
  transaction_date date not null default (now() at time zone 'Asia/Jakarta')::date,
  amount numeric(12,2) not null check (amount > 0),
  category text not null check (char_length(trim(category)) between 2 and 50),
  description text not null check (char_length(trim(description)) between 2 and 200),
  receipt_path text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cash_transactions_date_idx on public.cash_transactions(transaction_date desc, created_at desc);
create trigger cash_transactions_updated before update on public.cash_transactions for each row execute function public.set_updated_at();

alter table public.cash_transactions enable row level security;
create policy "cash transactions admin read" on public.cash_transactions for select to authenticated using (public.is_admin());
create policy "cash transactions admin insert" on public.cash_transactions for insert to authenticated with check (public.is_admin() and created_by = auth.uid());
create policy "cash transactions admin update" on public.cash_transactions for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "cash transactions admin delete" on public.cash_transactions for delete to authenticated using (public.is_admin());
grant select,insert,update,delete on public.cash_transactions to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('cash-receipts','cash-receipts',false,5242880,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do nothing;

create policy "cash receipts admin read" on storage.objects for select to authenticated using (bucket_id='cash-receipts' and public.is_admin());
create policy "cash receipts admin insert" on storage.objects for insert to authenticated with check (bucket_id='cash-receipts' and public.is_admin());
create policy "cash receipts admin update" on storage.objects for update to authenticated using (bucket_id='cash-receipts' and public.is_admin()) with check (bucket_id='cash-receipts' and public.is_admin());
create policy "cash receipts admin delete" on storage.objects for delete to authenticated using (bucket_id='cash-receipts' and public.is_admin());
