create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null default '',
  city text not null default '',
  service text not null default '',
  power text not null default '',
  message text not null,
  page text not null default '',
  status text not null default 'nauja',
  notes text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.inquiries to authenticated;
grant all on public.inquiries to service_role;
alter table public.inquiries enable row level security;
create policy "Staff manage inquiries" on public.inquiries for all to authenticated
  using (public.has_any_role(auth.uid(), array['admin','manager']::public.app_role[]))
  with check (public.has_any_role(auth.uid(), array['admin','manager']::public.app_role[]));
create index inquiries_created_idx on public.inquiries (created_at desc);