-- Orders Table
create table if not exists public.orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  customer_name text not null,
  customer_phone text,
  status text default 'pending' not null, -- pending, preparing, ready, delivery, completed, cancelled
  total_amount decimal(10,2) not null,
  delivery_type text default 'delivery',
  address text,
  payment_method text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.orders enable row level security;

create policy "Orders are viewable by store owner" on orders for select using (auth.uid() = user_id);
create policy "Store owner can update orders" on orders for update using (auth.uid() = user_id);
create policy "Public can insert orders" on orders for insert with check (true);

-- Order Items Table
create table if not exists public.order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null,
  unit_price decimal(10,2) not null,
  total_price decimal(10,2) not null,
  observation text
);

alter table public.order_items enable row level security;

create policy "Order items viewable by store owner" on order_items for select using (
  exists (select 1 from public.orders where id = order_id and user_id = auth.uid())
);
create policy "Public can insert order items" on order_items for insert with check (true);

-- Order Item Addons Table
create table if not exists public.order_item_addons (
  id uuid default gen_random_uuid() primary key,
  order_item_id uuid references public.order_items(id) on delete cascade not null,
  addon_id uuid references public.addons(id) on delete set null,
  addon_name text not null,
  price decimal(10,2) not null
);

alter table public.order_item_addons enable row level security;

create policy "Order addons viewable by store owner" on order_item_addons for select using (
  exists (select 1 from public.order_items oi join public.orders o on oi.order_id = o.id where oi.id = order_item_id and o.user_id = auth.uid())
);
create policy "Public can insert order addons" on order_item_addons for insert with check (true);
