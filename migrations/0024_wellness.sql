create table if not exists daily_logs (
  id serial primary key,
  user_id integer not null references users (id) on delete cascade,
  log_date date not null,
  water_ml integer not null default 0,
  sweaty integer not null default 0,
  low_carb integer not null default 0,
  hunger_before integer,
  hunger_after integer,
  eat_trigger text,
  sleep_hours real,
  stress integer,
  created_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create table if not exists lab_values (
  id serial primary key,
  user_id integer not null references users (id) on delete cascade,
  taken_at date not null,
  marker text not null,
  value real not null,
  unit text not null default '',
  notes text,
  created_at timestamptz not null default now()
);
