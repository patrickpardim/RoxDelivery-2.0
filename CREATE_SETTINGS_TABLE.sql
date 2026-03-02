-- Create restaurant_settings table
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

-- Enable RLS
alter table restaurant_settings enable row level security;

-- Policies
create policy "Settings are viewable by everyone"
  on restaurant_settings for select
  using (true);

create policy "Settings are insertable by authenticated users"
  on restaurant_settings for insert
  with check (auth.uid() = user_id);

create policy "Settings are updatable by owner"
  on restaurant_settings for update
  using (auth.uid() = user_id);
