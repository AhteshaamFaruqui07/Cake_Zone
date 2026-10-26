create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. PROFILES TABLE (User Profile Details & Files)
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade default auth.uid(),
  full_name text not null default '',
  email text not null default '',
  phone text default '+91',
  city_code text default '',
  address text default '',
  dietary_notes text default '',
  uploaded_files jsonb not null default '[]'::jsonb,
  role text not null default 'VIP Member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own profile" on public.profiles;
create policy "Users can delete their own profile"
  on public.profiles for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- 2. CART_ITEMS TABLE (User Shopping Bag)
-- ============================================================================
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  cake_id text,
  name text not null,
  price numeric(10, 2) not null check (price >= 0),
  quantity integer not null default 1 check (quantity > 0),
  image text not null default '',
  details text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cart_items enable row level security;

drop policy if exists "Users can view their own cart items" on public.cart_items;
create policy "Users can view their own cart items"
  on public.cart_items for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own cart items" on public.cart_items;
create policy "Users can insert their own cart items"
  on public.cart_items for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own cart items" on public.cart_items;
create policy "Users can update their own cart items"
  on public.cart_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own cart items" on public.cart_items;
create policy "Users can delete their own cart items"
  on public.cart_items for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- 3. ORDERS TABLE (Checkout Orders & Patisserie Queue)
-- ============================================================================
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  order_code text not null,
  customer text not null,
  cake_item text not null,
  items jsonb not null default '[]'::jsonb,
  special_instructions text default '',
  status text not null default 'Pending' check (status in ('Pending', 'Baking', 'Delivered')),
  amount numeric(10, 2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders enable row level security;

drop policy if exists "Users can view their own orders" on public.orders;
create policy "Users can view their own orders"
  on public.orders for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own orders" on public.orders;
create policy "Users can insert their own orders"
  on public.orders for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own orders" on public.orders;
create policy "Users can update their own orders"
  on public.orders for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own orders" on public.orders;
create policy "Users can delete their own orders"
  on public.orders for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- 4. CUSTOM_CAKES TABLE (Bespoke Cake Configurator Creations)
-- ============================================================================
create table if not exists public.custom_cakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  tiers integer not null default 3 check (tiers between 1 and 4),
  sponge_flavor text not null,
  filling text not null,
  exterior_finish text not null,
  accents text[] not null default '{}',
  inscription text default '',
  event_date date,
  estimated_price numeric(10, 2) not null check (estimated_price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.custom_cakes enable row level security;

drop policy if exists "Users can view their own custom cakes" on public.custom_cakes;
create policy "Users can view their own custom cakes"
  on public.custom_cakes for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own custom cakes" on public.custom_cakes;
create policy "Users can insert their own custom cakes"
  on public.custom_cakes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own custom cakes" on public.custom_cakes;
create policy "Users can update their own custom cakes"
  on public.custom_cakes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own custom cakes" on public.custom_cakes;
create policy "Users can delete their own custom cakes"
  on public.custom_cakes for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- 5. INVENTORY_ITEMS TABLE (Kitchen Stock & Restock Management)
-- ============================================================================
create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  remaining text not null,
  count integer not null default 0,
  unit text not null default 'units',
  icon text not null default 'inventory_2',
  is_restocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.inventory_items enable row level security;

drop policy if exists "Users can view their own inventory items" on public.inventory_items;
create policy "Users can view their own inventory items"
  on public.inventory_items for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own inventory items" on public.inventory_items;
create policy "Users can insert their own inventory items"
  on public.inventory_items for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own inventory items" on public.inventory_items;
create policy "Users can update their own inventory items"
  on public.inventory_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own inventory items" on public.inventory_items;
create policy "Users can delete their own inventory items"
  on public.inventory_items for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- 6. AUTOMATIC UPDATED_AT TRIGGER
-- ============================================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

drop trigger if exists set_cart_items_updated_at on public.cart_items;
create trigger set_cart_items_updated_at
  before update on public.cart_items
  for each row execute function public.handle_updated_at();

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
  before update on public.orders
  for each row execute function public.handle_updated_at();

drop trigger if exists set_custom_cakes_updated_at on public.custom_cakes;
create trigger set_custom_cakes_updated_at
  before update on public.custom_cakes
  for each row execute function public.handle_updated_at();

drop trigger if exists set_inventory_items_updated_at on public.inventory_items;
create trigger set_inventory_items_updated_at
  before update on public.inventory_items
  for each row execute function public.handle_updated_at();
