-- ================================================================
-- CLARITY ANALYTICS — SCHEMA SUPABASE
-- Ejecutar en: https://supabase.com/dashboard/project/uxcguzqbzvewrhlxpvug/sql
-- ================================================================

-- EXTENSIONES
create extension if not exists "uuid-ossp";

-- ================================================================
-- TABLA: users (perfil extendido de Supabase Auth)
-- ================================================================
create table if not exists public.users (
  id        uuid primary key references auth.users(id) on delete cascade,
  email     text not null,
  role      text not null default 'client' check (role in ('admin', 'client')),
  created_at timestamptz default now()
);

-- Trigger para crear user profile automáticamente
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, role)
  values (new.id, new.email, 'client')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ================================================================
-- TABLA: clients
-- ================================================================
create table if not exists public.clients (
  id         uuid primary key default uuid_generate_v4(),
  nombre     text not null,
  email      text not null,
  owner_id   uuid references auth.users(id) on delete set null,
  plan       text not null default 'free' check (plan in ('free', 'pro', 'agency')),
  api_key    text unique,
  estado     text not null default 'active' check (estado in ('active', 'inactive')),
  created_at timestamptz default now()
);

-- ================================================================
-- TABLA: sites
-- ================================================================
create table if not exists public.sites (
  id         uuid primary key default uuid_generate_v4(),
  client_id  uuid not null references public.clients(id) on delete cascade,
  dominio    text not null,
  created_at timestamptz default now()
);

-- ================================================================
-- TABLA: sessions
-- ================================================================
create table if not exists public.sessions (
  id         uuid primary key default uuid_generate_v4(),
  site_id    uuid not null references public.sites(id) on delete cascade,
  user_id    text,
  start_time timestamptz default now(),
  end_time   timestamptz,
  device     text,
  country    text,
  created_at timestamptz default now()
);

-- ================================================================
-- TABLA: events
-- ================================================================
create table if not exists public.events (
  id          uuid primary key default uuid_generate_v4(),
  session_id  uuid not null references public.sessions(id) on delete cascade,
  site_id     uuid references public.sites(id) on delete cascade,
  event_type  text not null check (event_type in ('pageview', 'click', 'scroll', 'conversion')),
  timestamp   timestamptz default now(),
  metadata    jsonb default '{}'
);

-- ================================================================
-- TABLA: funnels
-- ================================================================
create table if not exists public.funnels (
  id         uuid primary key default uuid_generate_v4(),
  site_id    uuid not null references public.sites(id) on delete cascade,
  name       text not null,
  created_at timestamptz default now()
);

-- ================================================================
-- TABLA: funnel_steps
-- ================================================================
create table if not exists public.funnel_steps (
  id          uuid primary key default uuid_generate_v4(),
  funnel_id   uuid not null references public.funnels(id) on delete cascade,
  step_order  integer not null,
  url         text not null,
  created_at  timestamptz default now()
);

-- ================================================================
-- ÍNDICES para performance
-- ================================================================
create index if not exists idx_sessions_site_id on public.sessions(site_id);
create index if not exists idx_events_session_id on public.events(session_id);
create index if not exists idx_events_site_id on public.events(site_id);
create index if not exists idx_events_type on public.events(event_type);
create index if not exists idx_events_timestamp on public.events(timestamp desc);
create index if not exists idx_clients_owner on public.clients(owner_id);
create index if not exists idx_sites_client on public.sites(client_id);
create index if not exists idx_clients_apikey on public.clients(api_key);

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

alter table public.users        enable row level security;
alter table public.clients      enable row level security;
alter table public.sites        enable row level security;
alter table public.sessions     enable row level security;
alter table public.events       enable row level security;
alter table public.funnels      enable row level security;
alter table public.funnel_steps enable row level security;

-- Helper function: es admin?
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Helper function: client_id del usuario actual
create or replace function public.my_client_id()
returns uuid language sql security definer stable as $$
  select id from public.clients where owner_id = auth.uid() limit 1;
$$;

-- ── USERS policies ──
create policy "users_select_own" on public.users
  for select using (id = auth.uid() or public.is_admin());

create policy "users_update_own" on public.users
  for update using (id = auth.uid());

-- ── CLIENTS policies ──
create policy "clients_select" on public.clients
  for select using (public.is_admin() or owner_id = auth.uid());

create policy "clients_insert_admin" on public.clients
  for insert with check (public.is_admin());

create policy "clients_update_admin" on public.clients
  for update using (public.is_admin());

create policy "clients_delete_admin" on public.clients
  for delete using (public.is_admin());

-- ── SITES policies ──
create policy "sites_select" on public.sites
  for select using (
    public.is_admin() or
    client_id = public.my_client_id()
  );

create policy "sites_insert" on public.sites
  for insert with check (
    public.is_admin() or
    client_id = public.my_client_id()
  );

create policy "sites_delete" on public.sites
  for delete using (
    public.is_admin() or
    client_id = public.my_client_id()
  );

-- ── SESSIONS policies ──
create policy "sessions_select" on public.sessions
  for select using (
    public.is_admin() or
    exists (
      select 1 from public.sites s
      join public.clients c on c.id = s.client_id
      where s.id = sessions.site_id and c.owner_id = auth.uid()
    )
  );

create policy "sessions_insert_tracker" on public.sessions
  for insert with check (true);  -- el tracker inserta via service role

-- ── EVENTS policies ──
create policy "events_select" on public.events
  for select using (
    public.is_admin() or
    exists (
      select 1 from public.sessions ss
      join public.sites s on s.id = ss.site_id
      join public.clients c on c.id = s.client_id
      where ss.id = events.session_id and c.owner_id = auth.uid()
    )
  );

create policy "events_insert_tracker" on public.events
  for insert with check (true);  -- el tracker inserta via service role

-- ── FUNNELS policies ──
create policy "funnels_select" on public.funnels
  for select using (
    public.is_admin() or
    exists (
      select 1 from public.sites s
      join public.clients c on c.id = s.client_id
      where s.id = funnels.site_id and c.owner_id = auth.uid()
    )
  );

create policy "funnels_insert" on public.funnels
  for insert with check (
    public.is_admin() or
    exists (
      select 1 from public.sites s
      join public.clients c on c.id = s.client_id
      where s.id = site_id and c.owner_id = auth.uid()
    )
  );

-- ── FUNNEL STEPS policies ──
create policy "funnel_steps_select" on public.funnel_steps
  for select using (
    public.is_admin() or
    exists (
      select 1 from public.funnels f
      join public.sites s on s.id = f.site_id
      join public.clients c on c.id = s.client_id
      where f.id = funnel_steps.funnel_id and c.owner_id = auth.uid()
    )
  );

create policy "funnel_steps_insert" on public.funnel_steps
  for insert with check (true);

-- ================================================================
-- DATOS INICIALES: Admin user
-- ================================================================
-- IMPORTANTE: Primero crea el usuario en Supabase Auth Dashboard
-- con email: admin@clarity.app y la contraseña que desees
-- Luego actualiza su rol manualmente:

-- UPDATE public.users SET role = 'admin' WHERE email = 'admin@clarity.app';

-- ================================================================
-- TABLA: integrations
-- ================================================================
create table if not exists public.integrations (
  id            uuid primary key default uuid_generate_v4(),
  client_id     uuid not null references public.clients(id) on delete cascade,
  platform      text not null check (platform in ('facebook', 'tiktok', 'linkedin', 'google_analytics', 'google_ads')),
  access_token  text not null,
  refresh_token text,
  expires_at    timestamptz,
  account_id    text,
  created_at    timestamptz default now(),
  unique(client_id, platform)
);

-- ================================================================
-- TABLA: marketing_data
-- ================================================================
create table if not exists public.marketing_data (
  id                 uuid primary key default uuid_generate_v4(),
  client_id          uuid not null references public.clients(id) on delete cascade,
  platform           text not null check (platform in ('facebook', 'tiktok', 'linkedin', 'google_analytics', 'google_ads')),
  date               date not null,
  campaign_name      text,
  adset_name         text,
  ad_name            text,
  impressions        integer default 0,
  reach              integer default 0,
  frequency          numeric default 0,
  cpm                numeric default 0,
  ctr                numeric default 0,
  clicks             integer default 0,
  landing_page_views integer default 0,
  add_to_cart        integer default 0,
  checkout           integer default 0,
  purchases          integer default 0,
  revenue            numeric default 0,
  users              integer default 0,
  sessions           integer default 0,
  bounce_rate        numeric default 0,
  avg_time           numeric default 0,
  conversions        integer default 0,
  created_at         timestamptz default now()
);

-- Índices de marketing
create index if not exists idx_marketing_data_client_date on public.marketing_data(client_id, date);
create index if not exists idx_marketing_data_platform on public.marketing_data(platform);

-- ================================================================
-- ROW LEVEL SECURITY: integraciones y marketing
-- ================================================================
alter table public.integrations   enable row level security;
alter table public.marketing_data enable row level security;

create policy "integrations_select" on public.integrations
  for select using (
    public.is_admin() or client_id = public.my_client_id()
  );

create policy "integrations_insert" on public.integrations
  for insert with check (
    public.is_admin() or client_id = public.my_client_id()
  );

create policy "integrations_update" on public.integrations
  for update using (
    public.is_admin() or client_id = public.my_client_id()
  );

create policy "marketing_data_select" on public.marketing_data
  for select using (
    public.is_admin() or client_id = public.my_client_id()
  );

-- Insert/Update lo hace el sistema con su Service Role, pero damos insert por si lo hace desde UI
create policy "marketing_data_insert" on public.marketing_data
  for insert with check (
    client_id in (
      select id from public.clients where owner_id = auth.uid()
    )
  );

-- ================================================================
-- CORRECCIÓN: Políticas de ELIMINACIÓN (DELETE) para Administradores
-- Necesarias para que el borrado en cascada (CASCADE) funcione cuando
-- se elimina un cliente desde el panel admin.
-- ================================================================
create policy "sites_delete_admin" on public.sites for delete using ( public.is_admin() );
create policy "sessions_delete_admin" on public.sessions for delete using ( public.is_admin() );
create policy "events_delete_admin" on public.events for delete using ( public.is_admin() );
create policy "funnels_delete_admin" on public.funnels for delete using ( public.is_admin() );
create policy "funnel_steps_delete_admin" on public.funnel_steps for delete using ( public.is_admin() );
create policy "integrations_delete_admin" on public.integrations for delete using ( public.is_admin() );
create policy "marketing_data_delete_admin" on public.marketing_data for delete using ( public.is_admin() );

-- ================================================================
-- FIN DEL SCHEMA
-- ================================================================
