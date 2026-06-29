-- CloudCast — Rollen & multi-tenant RLS
-- Uitvoeren in: Supabase Dashboard > SQL Editor

-- ─────────────────────────────────────────────
-- USER PROFILES
-- ─────────────────────────────────────────────
create table if not exists user_profiles (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
  role       text not null default 'customer',  -- 'admin' | 'customer'
  created_at timestamptz not null default now(),
  unique(user_id)
);

alter table user_profiles enable row level security;

create policy "user_profiles_read_own"
  on user_profiles for select to authenticated
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- COMPANIES — admin ziet alles, customer alleen eigen
-- ─────────────────────────────────────────────
drop policy if exists "authenticated_read_companies"  on companies;
drop policy if exists "authenticated_write_companies" on companies;

create policy "companies_select"
  on companies for select to authenticated using (
    exists (
      select 1 from user_profiles up
      where up.user_id = auth.uid()
        and (up.role = 'admin' or up.company_id = companies.id)
    )
  );

create policy "companies_write"
  on companies for all to authenticated
  using      (exists (select 1 from user_profiles up where up.user_id = auth.uid() and up.role = 'admin'))
  with check (exists (select 1 from user_profiles up where up.user_id = auth.uid() and up.role = 'admin'));

-- ─────────────────────────────────────────────
-- LOCATIONS
-- ─────────────────────────────────────────────
drop policy if exists "authenticated_read_locations"  on locations;
drop policy if exists "authenticated_write_locations" on locations;

create policy "locations_select"
  on locations for select to authenticated using (
    exists (
      select 1 from user_profiles up
      where up.user_id = auth.uid()
        and (up.role = 'admin' or up.company_id = locations.company_id)
    )
  );

create policy "locations_write"
  on locations for all to authenticated
  using      (exists (select 1 from user_profiles up where up.user_id = auth.uid() and up.role = 'admin'))
  with check (exists (select 1 from user_profiles up where up.user_id = auth.uid() and up.role = 'admin'));

-- ─────────────────────────────────────────────
-- UPLOADED FILES
-- ─────────────────────────────────────────────
drop policy if exists "authenticated_read_uploaded_files"  on uploaded_files;
drop policy if exists "authenticated_write_uploaded_files" on uploaded_files;

create policy "uploaded_files_select"
  on uploaded_files for select to authenticated using (
    exists (
      select 1 from user_profiles up
      where up.user_id = auth.uid()
        and (up.role = 'admin' or up.company_id = uploaded_files.company_id)
    )
  );

create policy "uploaded_files_write"
  on uploaded_files for all to authenticated
  using (
    exists (
      select 1 from user_profiles up
      where up.user_id = auth.uid()
        and (up.role = 'admin' or up.company_id = uploaded_files.company_id)
    )
  )
  with check (
    exists (
      select 1 from user_profiles up
      where up.user_id = auth.uid()
        and (up.role = 'admin' or up.company_id = uploaded_files.company_id)
    )
  );

-- ─────────────────────────────────────────────
-- DAILY OBSERVATIONS
-- ─────────────────────────────────────────────
drop policy if exists "authenticated_read_daily_observations"  on daily_observations;
drop policy if exists "authenticated_write_daily_observations" on daily_observations;

create policy "daily_observations_select"
  on daily_observations for select to authenticated using (
    exists (
      select 1 from user_profiles up
      where up.user_id = auth.uid()
        and (up.role = 'admin' or up.company_id = daily_observations.company_id)
    )
  );

create policy "daily_observations_write"
  on daily_observations for all to authenticated
  using (
    exists (
      select 1 from user_profiles up
      where up.user_id = auth.uid()
        and (up.role = 'admin' or up.company_id = daily_observations.company_id)
    )
  )
  with check (
    exists (
      select 1 from user_profiles up
      where up.user_id = auth.uid()
        and (up.role = 'admin' or up.company_id = daily_observations.company_id)
    )
  );

-- ─────────────────────────────────────────────
-- STAFFING RULES
-- ─────────────────────────────────────────────
drop policy if exists "authenticated_read_staffing_rules"  on staffing_rules;
drop policy if exists "authenticated_write_staffing_rules" on staffing_rules;

create policy "staffing_rules_select"
  on staffing_rules for select to authenticated using (
    exists (
      select 1 from user_profiles up
      where up.user_id = auth.uid()
        and (up.role = 'admin' or up.company_id = staffing_rules.company_id)
    )
  );

create policy "staffing_rules_write"
  on staffing_rules for all to authenticated
  using (
    exists (
      select 1 from user_profiles up
      where up.user_id = auth.uid()
        and (up.role = 'admin' or up.company_id = staffing_rules.company_id)
    )
  )
  with check (
    exists (
      select 1 from user_profiles up
      where up.user_id = auth.uid()
        and (up.role = 'admin' or up.company_id = staffing_rules.company_id)
    )
  );

-- ─────────────────────────────────────────────
-- WEATHER DATA
-- ─────────────────────────────────────────────
drop policy if exists "authenticated_read_weather_data"  on weather_data;
drop policy if exists "authenticated_write_weather_data" on weather_data;

create policy "weather_data_select"
  on weather_data for select to authenticated using (
    exists (
      select 1 from locations l
      join user_profiles up on up.user_id = auth.uid()
      where l.id = weather_data.location_id
        and (up.role = 'admin' or up.company_id = l.company_id)
    )
  );

create policy "weather_data_write"
  on weather_data for all to authenticated
  using (
    exists (
      select 1 from locations l
      join user_profiles up on up.user_id = auth.uid()
      where l.id = weather_data.location_id
        and (up.role = 'admin' or up.company_id = l.company_id)
    )
  )
  with check (
    exists (
      select 1 from locations l
      join user_profiles up on up.user_id = auth.uid()
      where l.id = weather_data.location_id
        and (up.role = 'admin' or up.company_id = l.company_id)
    )
  );
