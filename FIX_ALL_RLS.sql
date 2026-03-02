-- 1. Create restaurant_settings table if it doesn't exist
create table if not exists restaurant_settings (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  restaurant_name text not null default 'Meu Restaurante',
  delivery_fee numeric not null default 0,
  min_order_value numeric not null default 0,
  free_shipping_threshold numeric, -- null means no free shipping
  address_cep text,
  address_street text,
  address_number text,
  address_neighborhood text,
  address_city text,
  address_state text,
  address_complement text,
  payment_methods jsonb default '["pix", "credit_card", "debit_card", "cash"]'::jsonb,
  opening_hours jsonb default '{
    "monday": [{"open": "08:00", "close": "22:00"}],
    "tuesday": [{"open": "08:00", "close": "22:00"}],
    "wednesday": [{"open": "08:00", "close": "22:00"}],
    "thursday": [{"open": "08:00", "close": "22:00"}],
    "friday": [{"open": "08:00", "close": "23:00"}],
    "saturday": [{"open": "08:00", "close": "23:00"}],
    "sunday": [{"open": "08:00", "close": "22:00"}]
  }'::jsonb,
  user_id uuid references auth.users(id)
);

-- 2. Enable RLS on restaurant_settings
alter table restaurant_settings enable row level security;

-- 3. Policies for restaurant_settings
drop policy if exists "Settings are viewable by everyone" on restaurant_settings;
create policy "Settings are viewable by everyone"
  on restaurant_settings for select
  using (true);

drop policy if exists "Settings are insertable by authenticated users" on restaurant_settings;
create policy "Settings are insertable by authenticated users"
  on restaurant_settings for insert
  with check (auth.uid() = user_id);

drop policy if exists "Settings are updatable by owner" on restaurant_settings;
create policy "Settings are updatable by owner"
  on restaurant_settings for update
  using (auth.uid() = user_id);

-- 4. Fix RLS for Orders (The 401 Error Fix)

-- Drop OLD policies (cleanup)
drop policy if exists "Orders are viewable by store owner" on orders;
drop policy if exists "Store owner can update orders" on orders;
drop policy if exists "Public can insert orders" on orders;
drop policy if exists "Order items viewable by store owner" on order_items;
drop policy if exists "Public can insert order items" on order_items;
drop policy if exists "Order addons viewable by store owner" on order_item_addons;
drop policy if exists "Public can insert order addons" on order_item_addons;

-- Drop NEW policies (to ensure idempotency and fix "already exists" error)
drop policy if exists "Enable read access for all users" on orders;
drop policy if exists "Enable insert access for all users" on orders;
drop policy if exists "Enable update for store owners" on orders;

drop policy if exists "Enable read access for all users" on order_items;
drop policy if exists "Enable insert access for all users" on order_items;

drop policy if exists "Enable read access for all users" on order_item_addons;
drop policy if exists "Enable insert access for all users" on order_item_addons;

-- Orders Policies
create policy "Enable read access for all users" on orders for select using (true);
create policy "Enable insert access for all users" on orders for insert with check (true);
create policy "Enable update for store owners" on orders for update using (auth.uid() = user_id);

-- Order Items Policies
create policy "Enable read access for all users" on order_items for select using (true);
create policy "Enable insert access for all users" on order_items for insert with check (true);

-- Order Item Addons Policies
create policy "Enable read access for all users" on order_item_addons for select using (true);
create policy "Enable insert access for all users" on order_item_addons for insert with check (true);
