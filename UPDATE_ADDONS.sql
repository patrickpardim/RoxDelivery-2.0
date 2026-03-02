-- Run this script to add the new tables for Addons
-- This is for users who have already run the initial setup

-- Addon Categories
create table if not exists public.addon_categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  name text not null,
  is_mandatory boolean default false,
  min_quantity integer default 0,
  max_quantity integer default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.addon_categories enable row level security;

create policy "Addon categories are viewable by everyone." on addon_categories for select using ( true );
create policy "Users can insert their own addon categories." on addon_categories for insert with check ( auth.uid() = user_id );
create policy "Users can update their own addon categories." on addon_categories for update using ( auth.uid() = user_id );
create policy "Users can delete their own addon categories." on addon_categories for delete using ( auth.uid() = user_id );

-- Addons
create table if not exists public.addons (
  id uuid default gen_random_uuid() primary key,
  category_id uuid references public.addon_categories(id) on delete cascade not null,
  name text not null,
  price decimal(10,2) default 0,
  max_quantity integer default 1,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.addons enable row level security;

create policy "Addons are viewable by everyone." on addons for select using ( true );
create policy "Users can insert their own addons." on addons for insert with check ( 
  exists (select 1 from public.addon_categories where id = category_id and user_id = auth.uid())
);
create policy "Users can update their own addons." on addons for update using (
  exists (select 1 from public.addon_categories where id = category_id and user_id = auth.uid())
);
create policy "Users can delete their own addons." on addons for delete using (
  exists (select 1 from public.addon_categories where id = category_id and user_id = auth.uid())
);

-- Product Addon Categories (Many-to-Many)
create table if not exists public.product_addon_categories (
  product_id uuid references public.products(id) on delete cascade not null,
  addon_category_id uuid references public.addon_categories(id) on delete cascade not null,
  primary key (product_id, addon_category_id)
);

alter table public.product_addon_categories enable row level security;

create policy "Product addons are viewable by everyone." on product_addon_categories for select using ( true );
create policy "Users can manage their own product addons." on product_addon_categories for all using (
  exists (select 1 from public.products where id = product_id and user_id = auth.uid())
);
