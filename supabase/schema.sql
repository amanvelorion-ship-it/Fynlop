create extension if not exists pgcrypto;

create table if not exists public.products (
  id text primary key,
  title text not null,
  description text not null,
  cover_image_url text not null,
  price_inr integer not null check (price_inr > 0),
  price_usd numeric(10, 2) not null check (price_usd > 0),
  file_url text,
  category text not null check (category in ('Comics', 'Books', 'Manga')),
  popularity integer not null default 0,
  author text not null default 'FYNLOP Creator',
  pages integer not null default 0 check (pages >= 0),
  featured boolean not null default false,
  preview_images text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.products
  add column if not exists popularity integer not null default 0;
alter table public.products
  add column if not exists author text not null default 'FYNLOP Creator',
  add column if not exists pages integer not null default 0,
  add column if not exists featured boolean not null default false,
  add column if not exists preview_images text[] not null default '{}';

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id text not null references public.products (id),
  payment_id text not null,
  amount integer not null check (amount > 0),
  razorpay_mode text not null default 'test' check (razorpay_mode in ('test', 'live')),
  status text not null,
  created_at timestamptz not null default now(),
  unique (payment_id, product_id)
);

alter table public.orders
  add column if not exists razorpay_mode text not null default 'test'
  check (razorpay_mode in ('test', 'live'));

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('created', 'paid', 'failed', 'refunding', 'refunded'));

create table if not exists public.admin_settings (
  id integer primary key default 1 check (id = 1),
  site_name text not null default 'FYNLOP',
  tagline text not null default 'Stories Beyond Reality',
  logo_url text,
  support_email text not null default 'hello@fynlop.com',
  razorpay_mode text not null default 'test' check (razorpay_mode in ('test', 'live')),
  maintenance_mode boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.admin_settings enable row level security;

grant select on public.products to anon, authenticated;
grant select on public.orders to authenticated;
grant all on public.products, public.orders, public.admin_settings to service_role;

create policy "Products are visible to everyone"
  on public.products for select
  using (true);

create policy "Users can view their own orders"
  on public.orders for select
  to authenticated
  using (auth.uid() = user_id);

insert into public.admin_settings (id)
values (1)
on conflict (id) do nothing;

insert into public.products (
  id, title, description, cover_image_url, price_inr, price_usd, category, popularity, author, pages, featured, created_at
) values
  ('the-last-light', 'The Last Light', 'A signal keeper follows one impossible transmission toward the last place anyone expected to find hope.', 'https://picsum.photos/seed/fynlop-last-light/720/1000', 299, 3.99, 'Comics', 96, 'Mara Sol', 48, true, '2026-11-17T00:00:00Z'),
  ('moss-and-moon', 'Moss & Moon', 'A little witch, an old fox, and a city garden with a secret set out to bring the missing moon back home.', 'https://picsum.photos/seed/fynlop-moss-moon/720/1000', 249, 3.49, 'Comics', 92, 'Ivy Wren', 36, true, '2026-11-12T00:00:00Z'),
  ('neon-saints', 'Neon Saints', 'A crew of unlikely heroes takes a job that could change the shape of the night.', 'https://picsum.photos/seed/fynlop-neon-saints/720/1000', 349, 4.49, 'Comics', 88, 'Ren Ito', 52, true, '2026-11-09T00:00:00Z'),
  ('atlas-of-impossible-places', 'Atlas of Impossible Places', 'A field guide to the strange places that appear only when the world is quiet enough to notice them.', 'https://picsum.photos/seed/fynlop-impossible-atlas/720/1000', 399, 4.99, 'Books', 81, 'A. Rowan', 184, true, '2026-10-28T00:00:00Z'),
  ('small-rituals-for-big-feelings', 'Small Rituals for Big Feelings', 'An illustrated collection of gentle prompts for finding a little wonder in an ordinary day.', 'https://picsum.photos/seed/fynlop-small-rituals/720/1000', 279, 3.79, 'Books', 77, 'Jo Park', 112, true, '2026-10-20T00:00:00Z'),
  ('the-orbit-of-everything', 'The Orbit of Everything', 'A heartfelt journey through deep space and closer-to-home questions about belonging and home.', 'https://picsum.photos/seed/fynlop-orbit-everything/720/1000', 329, 4.29, 'Books', 73, 'Niko Bell', 156, true, '2026-10-14T00:00:00Z')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  cover_image_url = excluded.cover_image_url,
  price_inr = excluded.price_inr,
  price_usd = excluded.price_usd,
  category = excluded.category,
  popularity = excluded.popularity,
  author = excluded.author,
  pages = excluded.pages,
  featured = excluded.featured;

insert into storage.buckets (id, name, public)
values ('digital-editions', 'digital-editions', false)
on conflict (id) do update set public = false;

insert into storage.buckets (id, name, public)
values ('product-covers', 'product-covers', true)
on conflict (id) do update set public = true;
