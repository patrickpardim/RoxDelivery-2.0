-- Drop existing policies to ensure clean slate
drop policy if exists "Orders are viewable by store owner" on orders;
drop policy if exists "Store owner can update orders" on orders;
drop policy if exists "Public can insert orders" on orders;

drop policy if exists "Order items viewable by store owner" on order_items;
drop policy if exists "Public can insert order items" on order_items;

drop policy if exists "Order addons viewable by store owner" on order_item_addons;
drop policy if exists "Public can insert order addons" on order_item_addons;

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
