-- Enable necessary extensions
create extension if not exists "pgcrypto";

-- 1. Create profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  store_name text,
  store_slug text unique,
  whatsapp_number text,
  currency text default 'BRL',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Create policies for profiles
create policy "Public profiles are viewable by everyone." on profiles for select using ( true );
create policy "Users can insert their own profile." on profiles for insert with check ( auth.uid() = id );
create policy "Users can update own profile." on profiles for update using ( auth.uid() = id );

-- 2. Create categories table
create table if not exists public.categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  name text not null,
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.categories enable row level security;

create policy "Categories are viewable by everyone." on categories for select using ( true );
create policy "Users can insert their own categories." on categories for insert with check ( auth.uid() = user_id );
create policy "Users can update their own categories." on categories for update using ( auth.uid() = user_id );
create policy "Users can delete their own categories." on categories for delete using ( auth.uid() = user_id );

-- 3. Create products table
create table if not exists public.products (
  id uuid default gen_random_uuid() primary key,
  category_id uuid references public.categories(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  name text not null,
  description text,
  price decimal(10,2) not null,
  image_url text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.products enable row level security;

create policy "Products are viewable by everyone." on products for select using ( true );
create policy "Users can insert their own products." on products for insert with check ( auth.uid() = user_id );
create policy "Users can update their own products." on products for update using ( auth.uid() = user_id );
create policy "Users can delete their own products." on products for delete using ( auth.uid() = user_id );

-- 4. Create Addons Tables
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

-- 5. AUTOMATION: Create Profile Trigger
-- This function automatically creates a profile entry when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, store_name, store_slug, whatsapp_number)
  values (
    new.id, 
    'Rox Delivery', 
    'rox-delivery', 
    '5511999999999'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger execution
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. SEED ADMIN USER
-- This attempts to insert your admin user directly into auth.users
-- Password: CachoeiroAçaí@2026
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'acaicachoeiro@gmail.com',
  crypt('CachoeiroAçaí@2026', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  '',
  '',
  '',
  ''
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'acaicachoeiro@gmail.com'
);
