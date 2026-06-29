-- CloudCast Analytics — Database Schema
-- Uitvoeren in: Supabase Dashboard > SQL Editor

-- ─────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- COMPANIES
-- ─────────────────────────────────────────────
create table if not exists companies (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  sector        text not null default '',
  contact_name  text not null default '',
  contact_email text not null default '',
  phone         text not null default '',
  website       text not null default '',
  notes         text not null default '',
  created_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- LOCATIONS
-- ─────────────────────────────────────────────
create table if not exists locations (
  id            uuid primary key default uuid_generate_v4(),
  company_id    uuid not null references companies(id) on delete cascade,
  name          text not null,
  address       text not null default '',
  city          text not null default '',
  country       text not null default 'België',
  location_type text not null default '',
  max_capacity  integer not null default 0,
  notes         text not null default '',
  created_at    timestamptz not null default now()
);

create index if not exists locations_company_id_idx on locations(company_id);

-- ─────────────────────────────────────────────
-- UPLOADED FILES
-- ─────────────────────────────────────────────
create table if not exists uploaded_files (
  id           uuid primary key default uuid_generate_v4(),
  company_id   uuid not null references companies(id) on delete cascade,
  location_id  uuid not null references locations(id) on delete cascade,
  filename     text not null,
  file_type    text not null default 'csv',
  storage_path text not null default '',
  row_count    integer not null default 0,
  uploaded_by  text not null default '',
  status       text not null default 'imported',
  created_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create index if not exists uploaded_files_location_id_idx on uploaded_files(location_id);

-- ─────────────────────────────────────────────
-- DAILY OBSERVATIONS
-- ─────────────────────────────────────────────
create table if not exists daily_observations (
  id                 uuid primary key default uuid_generate_v4(),
  company_id         uuid not null references companies(id) on delete cascade,
  location_id        uuid not null references locations(id) on delete cascade,
  upload_file_id     uuid references uploaded_files(id) on delete set null,
  date               date not null,
  revenue            numeric(12, 2),
  visitors           integer,
  transactions       integer,
  staff_scheduled    integer,
  staff_needed       integer,
  occupancy_rate     numeric(5, 2),
  notes              text,
  day_of_week        smallint not null,  -- 0=zondag, 6=zaterdag
  month              smallint not null,
  year               smallint not null,
  week_number        smallint not null,
  season             text not null default '',
  is_weekend         boolean not null default false,
  is_holiday         boolean not null default false,
  is_school_holiday  boolean not null default false,
  is_public_holiday  boolean not null default false,
  special_event_name text,
  deleted_at         timestamptz,
  created_at         timestamptz not null default now(),

  unique(location_id, date)
);

create index if not exists daily_obs_location_date_idx on daily_observations(location_id, date);
create index if not exists daily_obs_deleted_at_idx on daily_observations(deleted_at) where deleted_at is null;

-- ─────────────────────────────────────────────
-- STAFFING RULES
-- ─────────────────────────────────────────────
create table if not exists staffing_rules (
  id                uuid primary key default uuid_generate_v4(),
  company_id        uuid not null references companies(id) on delete cascade,
  location_id       uuid not null references locations(id) on delete cascade,
  min_visitors      integer not null default 0,
  max_visitors      integer,
  recommended_staff integer not null default 1,
  label             text not null default '',
  created_at        timestamptz not null default now()
);

create index if not exists staffing_rules_location_id_idx on staffing_rules(location_id);

-- ─────────────────────────────────────────────
-- WEATHER DATA
-- ─────────────────────────────────────────────
create table if not exists weather_data (
  id                uuid primary key default uuid_generate_v4(),
  location_id       uuid not null references locations(id) on delete cascade,
  date              date not null,
  temperature_avg   numeric(5, 1),
  temperature_max   numeric(5, 1),
  rainfall_mm       numeric(6, 1),
  wind_speed        numeric(5, 1),
  weather_condition text,
  source            text not null default 'manual',
  created_at        timestamptz not null default now(),

  unique(location_id, date)
);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
-- Alle tabellen beveiligd: alleen ingelogde gebruikers kunnen lezen/schrijven.
-- In een multi-tenant opzet voeg je hier company_id checks toe per user.

alter table companies           enable row level security;
alter table locations           enable row level security;
alter table uploaded_files      enable row level security;
alter table daily_observations  enable row level security;
alter table staffing_rules      enable row level security;
alter table weather_data        enable row level security;

-- Tijdelijk open beleid voor authenticated users (aanpassen bij multi-tenant uitrol)
create policy "authenticated_read_companies"
  on companies for select to authenticated using (true);
create policy "authenticated_write_companies"
  on companies for all to authenticated using (true) with check (true);

create policy "authenticated_read_locations"
  on locations for select to authenticated using (true);
create policy "authenticated_write_locations"
  on locations for all to authenticated using (true) with check (true);

create policy "authenticated_read_uploaded_files"
  on uploaded_files for select to authenticated using (true);
create policy "authenticated_write_uploaded_files"
  on uploaded_files for all to authenticated using (true) with check (true);

create policy "authenticated_read_daily_observations"
  on daily_observations for select to authenticated using (true);
create policy "authenticated_write_daily_observations"
  on daily_observations for all to authenticated using (true) with check (true);

create policy "authenticated_read_staffing_rules"
  on staffing_rules for select to authenticated using (true);
create policy "authenticated_write_staffing_rules"
  on staffing_rules for all to authenticated using (true) with check (true);

create policy "authenticated_read_weather_data"
  on weather_data for select to authenticated using (true);
create policy "authenticated_write_weather_data"
  on weather_data for all to authenticated using (true) with check (true);
