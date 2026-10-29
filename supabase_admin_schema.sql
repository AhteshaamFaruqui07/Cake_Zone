-- ============================================================================
-- CAKEZONE ADMIN DASHBOARD & STOREFRONT SUPABASE SQL SCHEMA
-- Copy and paste this entire script into the Supabase SQL Editor and click RUN
-- ============================================================================

create extension if not exists "pgcrypto";

-- Helper function to check if the current authenticated user (auth.uid()) is Admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (
        lower(coalesce(role, '')) = 'admin'
        or lower(coalesce(email, '')) = 'ateeqfaruqui@gmail.com'
      )
  )
  or lower(coalesce(auth.jwt() ->> 'email', '')) = 'ateeqfaruqui@gmail.com';
$$;

-- ============================================================================
-- 1. PROFILES TABLE (Logged-In Users, Customer Contact Info & Admin Role)
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text default '',
  email text default '',
  phone text default '',
  role text default 'customer',
  address text default '',
  city text default '',
  postal_code text default '',
  favorite_flavor text default 'Belgian Dark Chocolate Ganache',
  celebration_date date,
  dietary_notes text default '',
  avatar_url text default '',
  cover_url text default '',
  last_login_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ensure columns exist if table was created earlier
alter table public.profiles add column if not exists role text default 'customer';
alter table public.profiles add column if not exists last_login_at timestamptz default now();
alter table public.profiles add column if not exists avatar_url text default '';
alter table public.profiles add column if not exists cover_url text default '';

-- Set ateeqfaruqui@gmail.com as Admin
update public.profiles
set role = 'admin'
where lower(email) = 'ateeqfaruqui@gmail.com';

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile or Admin can view all logged-in users" on public.profiles;
create policy "Users can view own profile or Admin can view all logged-in users"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id or public.is_admin());

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

drop policy if exists "Users can delete own profile" on public.profiles;
create policy "Users can delete own profile"
  on public.profiles for delete
  to authenticated
  using (auth.uid() = id or public.is_admin());

-- ============================================================================
-- 2. PRODUCTS TABLE (Admin Insert / Update / Delete Cake Items)
-- ============================================================================
create table if not exists public.products (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  caption text default 'Signature',
  price numeric(10, 2) not null default 899.00,
  rating numeric(3, 1) not null default 4.8,
  reviews_count integer not null default 50,
  category text not null default 'Chocolate',
  description text not null default '',
  image text not null default '/assets/aistudio/cake_chocolate_truffle.png',
  storage_path text,
  ingredients text default '',
  servings text default '8 - 10 Servings',
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.products enable row level security;

drop policy if exists "Anyone can view storefront products" on public.products;
create policy "Anyone can view storefront products"
  on public.products for select
  to anon, authenticated
  using (true);

drop policy if exists "Authenticated user can insert own products" on public.products;
create policy "Authenticated user can insert own products"
  on public.products for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Authenticated user can update own products" on public.products;
create policy "Authenticated user can update own products"
  on public.products for update
  to authenticated
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Authenticated user can delete own products" on public.products;
create policy "Authenticated user can delete own products"
  on public.products for delete
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

-- ============================================================================
-- 3. ORDERS TABLE (Order History: Name, Email, Phone No., Item, Date & Time)
-- ============================================================================
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  order_code text not null,
  customer text not null,
  customer_email text default '',
  customer_phone text default '',
  cake_item text not null,
  items jsonb not null default '[]'::jsonb,
  special_instructions text default '',
  status text not null default 'Pending',
  amount numeric(10, 2) not null default 0.00,
  created_at timestamptz default now()
);

alter table public.orders add column if not exists customer_email text default '';
alter table public.orders add column if not exists customer_phone text default '';

alter table public.orders enable row level security;

drop policy if exists "Users can view own orders or Admin can view all order history" on public.orders;
create policy "Users can view own orders or Admin can view all order history"
  on public.orders for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users can insert own orders" on public.orders;
create policy "Users can insert own orders"
  on public.orders for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own orders or Admin can update status" on public.orders;
create policy "Users can update own orders or Admin can update status"
  on public.orders for update
  to authenticated
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users can delete own orders or Admin can delete orders" on public.orders;
create policy "Users can delete own orders or Admin can delete orders"
  on public.orders for delete
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

-- ============================================================================
-- 4. CUSTOM CAKES & CUSTOM CAKE SETTINGS TABLES (Design Custom Cake & Pricing)
-- ============================================================================
create table if not exists public.custom_cakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tiers integer not null default 3,
  sponge_flavor text not null,
  filling text not null,
  exterior_finish text not null,
  accents text[] default '{}',
  inscription text default '',
  event_date date,
  estimated_price numeric(10, 2) not null default 0.00,
  created_at timestamptz default now()
);

alter table public.custom_cakes enable row level security;

drop policy if exists "Users can view own custom cakes or Admin can view all" on public.custom_cakes;
create policy "Users can view own custom cakes or Admin can view all"
  on public.custom_cakes for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users can insert own custom cakes" on public.custom_cakes;
create policy "Users can insert own custom cakes"
  on public.custom_cakes for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own custom cakes or Admin can update price" on public.custom_cakes;
create policy "Users can update own custom cakes or Admin can update price"
  on public.custom_cakes for update
  to authenticated
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users can delete own custom cakes or Admin can delete" on public.custom_cakes;
create policy "Users can delete own custom cakes or Admin can delete"
  on public.custom_cakes for delete
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

-- Custom Cake Configurator Pricing & Options Table
create table if not exists public.custom_cake_settings (
  id text primary key default 'default',
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table public.custom_cake_settings enable row level security;

drop policy if exists "Anyone can view custom cake settings" on public.custom_cake_settings;
create policy "Anyone can view custom cake settings"
  on public.custom_cake_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "Authenticated user can insert custom cake settings" on public.custom_cake_settings;
create policy "Authenticated user can insert custom cake settings"
  on public.custom_cake_settings for insert
  to authenticated
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Authenticated user can update custom cake settings" on public.custom_cake_settings;
create policy "Authenticated user can update custom cake settings"
  on public.custom_cake_settings for update
  to authenticated
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

-- ============================================================================
-- 5. INVENTORY ITEMS & CART ITEMS TABLES
-- ============================================================================
create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  remaining text not null,
  count numeric(10, 2) not null default 0,
  unit text not null default 'units',
  icon text default 'inventory_2',
  is_restocked boolean not null default false,
  created_at timestamptz default now()
);

alter table public.inventory_items enable row level security;

drop policy if exists "Users can manage own inventory items" on public.inventory_items;
create policy "Users can manage own inventory items"
  on public.inventory_items for all
  to authenticated
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cake_id text,
  name text not null,
  price numeric(10, 2) not null default 0.00,
  quantity integer not null default 1,
  image text default '',
  storage_path text,
  details text default '',
  created_at timestamptz default now()
);

alter table public.cart_items enable row level security;

drop policy if exists "Users can manage own cart items" on public.cart_items;
create policy "Users can manage own cart items"
  on public.cart_items for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
