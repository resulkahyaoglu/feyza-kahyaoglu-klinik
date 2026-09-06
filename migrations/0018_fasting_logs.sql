create table if not exists fasting_logs (
  id serial primary key,
  user_id integer not null references users (id) on delete cascade,
  log_date date not null,
  kind text not null,
  reason text,
  detail text,
  created_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create index if not exists fasting_logs_user_idx on fasting_logs (user_id, log_date desc);

alter table fasting_logs add column if not exists detail text;
