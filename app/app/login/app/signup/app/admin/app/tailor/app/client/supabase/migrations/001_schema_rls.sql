create table tenants (id uuid primary key default gen_random_uuid(), name text not null, slug text unique not null,
  tailor_signup_open boolean not null default true, created_at timestamptz default now());
create table profiles (id uuid primary key references auth.users on delete cascade, tenant_id uuid not null references tenants,
  role text not null check (role in ('admin','tailor','client')), full_name text, phone text, active boolean not null default true);

create function my_tenant() returns uuid language sql stable security definer set search_path=public as $$ select tenant_id from profiles where id=auth.uid() $$;
create function my_role() returns text language sql stable security definer set search_path=public as $$ select role from profiles where id=auth.uid() and active $$;

create table measurements (id uuid primary key default gen_random_uuid(), tenant_id uuid not null default my_tenant() references tenants,
  client_id uuid not null default auth.uid() references profiles, data jsonb not null, created_at timestamptz default now());
create table gallery_posts (id uuid primary key default gen_random_uuid(), tenant_id uuid not null default my_tenant() references tenants,
  title text not null, description text, category text, materials text, image_url text not null, created_at timestamptz default now());
create table orders (id uuid primary key default gen_random_uuid(), tenant_id uuid not null default my_tenant() references tenants,
  client_id uuid not null default auth.uid() references profiles, status text not null default 'new'
    check (status in ('new','assigned','in_progress','completed','delivered')),
  description text not null, materials text, reference_images text[], gallery_post_id uuid references gallery_posts,
  delivery_type text not null default 'delivery' check (delivery_type in ('delivery','pickup')), delivery_address text,
  measurement_id uuid references measurements, measurement_request boolean not null default false, created_at timestamptz default now());
create table assignments (id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants,
  order_id uuid not null references orders on delete cascade, tailor_id uuid not null references profiles,
  status text not null default 'pending' check (status in ('pending','accepted','rejected','completed')), reject_reason text,
  created_at timestamptz default now());
create table order_status_history (id uuid primary key default gen_random_uuid(), tenant_id uuid not null, order_id uuid not null,
  status text, changed_at timestamptz default now());

create function log_status() returns trigger language plpgsql security definer as $$
begin if new.status is distinct from old.status then insert into order_status_history(tenant_id,order_id,status) values (new.tenant_id,new.id,new.status); end if; return new; end $$;
create trigger orders_log after update on orders for each row execute function log_status();

-- RLS everywhere
alter table tenants enable row level security; alter table profiles enable row level security;
alter table measurements enable row level security; alter table gallery_posts enable row level security;
alter table orders enable row level security; alter table assignments enable row level security;
alter table order_status_history enable row level security;

create policy t_read on tenants for select using (id = my_tenant());
create policy t_admin_update on tenants for update using (id = my_tenant() and my_role()='admin');

create policy p_self on profiles for select using (id = auth.uid());
create policy p_admin_read on profiles for select using (my_role()='admin' and tenant_id = my_tenant());
create policy p_admin_update on profiles for update using (my_role()='admin' and tenant_id = my_tenant());

create policy m_client on measurements for all using (client_id = auth.uid() and my_role()='client') with check (client_id = auth.uid() and tenant_id = my_tenant());
create policy m_admin on measurements for select using (my_role()='admin' and tenant_id = my_tenant());

create policy g_read on gallery_posts for select using (tenant_id = my_tenant() and my_role() in ('admin','client'));
create policy g_admin on gallery_posts for all using (my_role()='admin' and tenant_id = my_tenant()) with check (my_role()='admin' and tenant_id = my_tenant());

create policy o_client_read on orders for select using (client_id = auth.uid() and my_role()='client');
create policy o_client_insert on orders for insert with check (client_id = auth.uid() and my_role()='client' and tenant_id = my_tenant() and status='new');
create policy o_admin on orders for all using (my_role()='admin' and tenant_id = my_tenant()) with check (tenant_id = my_tenant());

create policy a_admin on assignments for all using (my_role()='admin' and tenant_id = my_tenant()) with check (tenant_id = my_tenant());
create policy a_tailor_read on assignments for select using (tailor_id = auth.uid() and my_role()='tailor');
create policy a_tailor_update on assignments for update using (tailor_id = auth.uid() and my_role()='tailor') with check (tailor_id = auth.uid());

create policy h_admin on order_status_history for select using (my_role()='admin' and tenant_id = my_tenant());

-- Tailor-safe view: no client name, phone, address or id
create view tailor_jobs as
  select a.id as assignment_id, a.status, o.description, o.materials, o.reference_images, m.data as measurements
  from assignments a join orders o on o.id=a.order_id left join measurements m on m.id=o.measurement_id
  where a.tailor_id = auth.uid() and my_role()='tailor';
grant select on tailor_jobs to authenticated;
