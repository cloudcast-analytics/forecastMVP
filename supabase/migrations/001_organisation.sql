create table departments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table roles (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references departments(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table location_departments (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  department_id uuid not null references departments(id) on delete cascade,
  is_active boolean not null default true,
  unique(location_id, department_id)
);

create table location_roles (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  headcount integer not null default 0,
  unique(location_id, role_id)
);

create table daily_staffing_evaluations (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  department_id uuid not null references departments(id) on delete cascade,
  date date not null,
  rating text not null check (rating in ('understaffed', 'adequate', 'overstaffed')),
  created_at timestamptz not null default now(),
  unique(location_id, department_id, date)
);
