
create type public.app_role as enum ('admin','manager','editor');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.has_any_role(_user_id uuid, _roles public.app_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = any(_roles))
$$;

create policy "Own roles readable" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "Admins manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create or replace function public.bootstrap_first_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles(user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end $$;
create trigger on_auth_user_created_bootstrap after insert on auth.users
  for each row execute function public.bootstrap_first_admin();

create or replace function public.admin_exists()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where role = 'admin')
$$;
grant execute on function public.admin_exists() to anon, authenticated;

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  price numeric(10,2) not null default 0,
  old_price numeric(10,2),
  period_label text not null default '/ mėn.',
  tagline text not null default '',
  features text[] not null default '{}',
  benefit text not null default '',
  promo text not null default '',
  activation_fee numeric(10,2) not null default 9,
  recommended boolean not null default false,
  active boolean not null default true,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);
grant select on public.plans to anon, authenticated;
grant insert, update, delete on public.plans to authenticated;
grant all on public.plans to service_role;
alter table public.plans enable row level security;
create policy "Public reads active plans" on public.plans for select to anon, authenticated using (active or public.has_any_role(auth.uid(), array['admin','manager']::public.app_role[]));
create policy "Staff manage plans" on public.plans for all to authenticated
  using (public.has_any_role(auth.uid(), array['admin','manager']::public.app_role[]))
  with check (public.has_any_role(auth.uid(), array['admin','manager']::public.app_role[]));
create trigger plans_touch before update on public.plans for each row execute function public.touch_updated_at();

insert into public.plans (slug,name,price,old_price,tagline,features,benefit,promo,recommended,sort_order) values
('startas','SGO Startas',0,null,'Matykite savo sistemos veikimą.',
 array['Prieiga prie stebėsenos platformos','Gamybos ir įrangos būklės duomenys','Savarankiška sistemos peržiūra','Serviso darbų koordinavimas','Kaupiklio naudos įvertinimas','Informacija apie planuojamas paramas'],
 'Be mėnesio mokesčio įvertinate, ar verta įsirengti kaupiklį.','',false,1),
('demesys','Dėmesys',5,null,'Apie sutrikimus sužinokite laiku.',
 array['Visos „SGO Starto“ paslaugos','24/7 įrangos įspėjimų stebėsena','Pranešimai apie sutrikimus el. paštu','Mėnesio gamybos ataskaita','Elektros kainos pagal vartojimą','Atsiskaitymo plano rekomendacija'],
 'Apie sutrikimus sužinote anksčiau, o kainų planą renkatės pagal vartojimą.','',false,2),
('saugumas','Saugumas',9,15,'Pagalba nustatant sutrikimo priežastį.',
 array['Visos „Dėmesio“ paketo paslaugos','Metinė objekto apžiūra','Inverterio diagnostika','Kaupiklio būklės analizė','Garantinių atvejų koordinavimas'],
 'Padedame nustatyti priežastį ir koordinuojame garantinius atvejus.','−40 % užsakant iki 12-31 · 12 mėn. sutartis',true,3),
('ramybe','Ramybė',19,null,'Daugiau dėmesio Jūsų sistemai.',
 array['Visos „Saugumo“ paketo paslaugos','Nuotolinis nustatymų optimizavimas','Prioritetinis užklausų nagrinėjimas','Techninės patikros koordinavimas','Generacijos valdymas pagal biržos kainas','Nuotolinė serviso pagalba'],
 'Gedimo atveju padedame nuotoliniu būdu, o prireikus deriname specialisto vizitą.','',false,4);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  phone text not null default '',
  city text not null default '',
  inverter text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.clients to authenticated;
grant all on public.clients to service_role;
alter table public.clients enable row level security;
create policy "Staff manage clients" on public.clients for all to authenticated
  using (public.has_any_role(auth.uid(), array['admin','manager']::public.app_role[]))
  with check (public.has_any_role(auth.uid(), array['admin','manager']::public.app_role[]));
create trigger clients_touch before update on public.clients for each row execute function public.touch_updated_at();

create table public.plan_orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  plan_id uuid references public.plans(id) on delete set null,
  plan_name text not null,
  price_label text not null default '',
  client_id uuid references public.clients(id) on delete set null,
  name text not null,
  email text not null,
  phone text not null,
  city text not null,
  inverter text not null default '',
  status text not null default 'nauja',
  admin_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.plan_orders to authenticated;
grant all on public.plan_orders to service_role;
alter table public.plan_orders enable row level security;
create policy "Staff manage orders" on public.plan_orders for all to authenticated
  using (public.has_any_role(auth.uid(), array['admin','manager']::public.app_role[]))
  with check (public.has_any_role(auth.uid(), array['admin','manager']::public.app_role[]));
create trigger orders_touch before update on public.plan_orders for each row execute function public.touch_updated_at();

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  body text not null default '',
  cover_url text not null default '',
  meta_title text not null default '',
  meta_description text not null default '',
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.articles to anon;
grant select, insert, update, delete on public.articles to authenticated;
grant all on public.articles to service_role;
alter table public.articles enable row level security;
create policy "Public reads published articles" on public.articles for select to anon, authenticated
  using (published or public.has_any_role(auth.uid(), array['admin','editor']::public.app_role[]));
create policy "Editors manage articles" on public.articles for all to authenticated
  using (public.has_any_role(auth.uid(), array['admin','editor']::public.app_role[]))
  with check (public.has_any_role(auth.uid(), array['admin','editor']::public.app_role[]));
create trigger articles_touch before update on public.articles for each row execute function public.touch_updated_at();

create table public.page_views (
  id bigint generated always as identity primary key,
  path text not null,
  referrer text not null default '',
  visitor_id text not null default '',
  device text not null default '',
  created_at timestamptz not null default now()
);
create index page_views_created_idx on public.page_views(created_at);
grant select on public.page_views to authenticated;
grant all on public.page_views to service_role;
alter table public.page_views enable row level security;
create policy "Staff read views" on public.page_views for select to authenticated
  using (public.has_any_role(auth.uid(), array['admin','manager']::public.app_role[]));

create policy "Editors upload article images" on storage.objects for insert to authenticated
  with check (bucket_id = 'articles' and public.has_any_role(auth.uid(), array['admin','editor']::public.app_role[]));
create policy "Editors delete article images" on storage.objects for delete to authenticated
  using (bucket_id = 'articles' and public.has_any_role(auth.uid(), array['admin','editor']::public.app_role[]));
