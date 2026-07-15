-- Verkoop per uur per locatie (import via CSV of push-API)
create table if not exists hourly_sales (
  id          uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  date        date not null,
  hour        smallint not null check (hour >= 0 and hour <= 23),
  category    text not null,
  quantity    integer not null default 0,
  revenue     numeric(10,2) not null default 0,
  created_at  timestamptz default now(),
  unique (location_id, date, hour, category)
);

create index if not exists hourly_sales_location_date_idx on hourly_sales(location_id, date);

alter table hourly_sales enable row level security;

create policy "hourly_sales_select" on hourly_sales
  for select using (
    location_id in (
      select l.id from locations l
      join companies c on c.id = l.company_id
      join company_users cu on cu.company_id = c.id
      where cu.user_id = auth.uid()
    )
  );

create policy "hourly_sales_insert" on hourly_sales
  for insert with check (
    location_id in (
      select l.id from locations l
      join companies c on c.id = l.company_id
      join company_users cu on cu.company_id = c.id
      where cu.user_id = auth.uid()
    )
  );

create policy "hourly_sales_update" on hourly_sales
  for update using (
    location_id in (
      select l.id from locations l
      join companies c on c.id = l.company_id
      join company_users cu on cu.company_id = c.id
      where cu.user_id = auth.uid()
    )
  );

create policy "hourly_sales_delete" on hourly_sales
  for delete using (
    location_id in (
      select l.id from locations l
      join companies c on c.id = l.company_id
      join company_users cu on cu.company_id = c.id
      where cu.user_id = auth.uid()
    )
  );
