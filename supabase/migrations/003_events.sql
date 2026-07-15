-- Events per locatie (feesten, sportevenementen, concerten, enz.)
create table if not exists events (
  id             uuid primary key default gen_random_uuid(),
  location_id    uuid not null references locations(id) on delete cascade,
  date           date not null,
  name           text not null,
  expected_guests integer not null default 0,
  department_id  uuid references departments(id) on delete set null,
  type           text check (type in ('Feest','Sport','Markt','Concert','Overig')),
  note           text,
  created_at     timestamptz default now()
);

create index if not exists events_location_date_idx on events(location_id, date);

alter table events enable row level security;

-- Authenticated users zien alleen events van hun eigen locaties
create policy "events_select" on events
  for select using (
    location_id in (
      select l.id from locations l
      join companies c on c.id = l.company_id
      join company_users cu on cu.company_id = c.id
      where cu.user_id = auth.uid()
    )
  );

create policy "events_insert" on events
  for insert with check (
    location_id in (
      select l.id from locations l
      join companies c on c.id = l.company_id
      join company_users cu on cu.company_id = c.id
      where cu.user_id = auth.uid()
    )
  );

create policy "events_update" on events
  for update using (
    location_id in (
      select l.id from locations l
      join companies c on c.id = l.company_id
      join company_users cu on cu.company_id = c.id
      where cu.user_id = auth.uid()
    )
  );

create policy "events_delete" on events
  for delete using (
    location_id in (
      select l.id from locations l
      join companies c on c.id = l.company_id
      join company_users cu on cu.company_id = c.id
      where cu.user_id = auth.uid()
    )
  );
