-- Personeelsregels per afdeling (vervangt de platte staffing_rules op termijn)
create table if not exists department_staffing_rules (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  department_id uuid not null references departments(id) on delete cascade,
  base_staff int not null default 1,
  busy_staff int not null default 1,
  event_guest_threshold int,
  event_staff int,
  unique (location_id, department_id)
);
