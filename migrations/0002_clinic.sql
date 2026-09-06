-- Clinic schema: clients (users), appointments, diet lists, measurements,
-- i-Shape sessions, messages, appointment change requests.

create table if not exists users (
  id serial primary key,
  full_name text not null,
  phone text not null unique,
  email text,
  password text not null,
  has_ishape integer not null default 0,
  is_active integer not null default 1,
  notes text,
  target_weight double precision,
  last_panel_visit timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists appointments (
  id serial primary key,
  user_id integer references users (id) on delete set null,
  service_key text not null,
  service_name text not null,
  duration integer not null,
  price integer not null,
  client_name text not null,
  client_phone text not null,
  client_email text,
  appointment_date text not null,
  appointment_time text not null,
  notes text,
  status text not null default 'beklemede',
  admin_notes text,
  created_at timestamptz not null default now()
);

create table if not exists diet_lists (
  id serial primary key,
  user_id integer not null references users (id) on delete cascade,
  title text not null,
  content text not null,
  is_active integer not null default 1,
  is_new integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists measurements (
  id serial primary key,
  user_id integer not null references users (id) on delete cascade,
  measure_date text not null,
  weight double precision,
  height double precision,
  waist double precision,
  hip double precision,
  chest double precision,
  arm double precision,
  leg double precision,
  bmi double precision,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists ishape_sessions (
  id serial primary key,
  user_id integer not null references users (id) on delete cascade,
  session_date text not null,
  calories integer,
  duration_min integer,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id serial primary key,
  user_id integer not null references users (id) on delete cascade,
  sender text not null,
  message text not null,
  is_read integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists appointment_requests (
  id serial primary key,
  appointment_id integer not null references appointments (id) on delete cascade,
  user_id integer not null references users (id) on delete cascade,
  request_type text not null,
  preferred_date text,
  preferred_time text,
  reason text,
  status text not null default 'beklemede',
  created_at timestamptz not null default now()
);

create index if not exists appointments_date_idx on appointments (appointment_date, appointment_time);
create index if not exists appointments_status_idx on appointments (status);
create index if not exists appointments_phone_idx on appointments (client_phone);
create index if not exists diet_lists_user_idx on diet_lists (user_id, created_at desc);
create index if not exists measurements_user_idx on measurements (user_id, measure_date);
create index if not exists ishape_user_idx on ishape_sessions (user_id, session_date);
create index if not exists messages_user_idx on messages (user_id, created_at desc);
create index if not exists requests_status_idx on appointment_requests (status);
