create table if not exists offplan_logs (
  id serial primary key,
  user_id integer not null references users (id) on delete cascade,
  slot text not null,
  kind text not null,
  detail text not null,
  amount text,
  note text,
  is_read integer not null default 0,
  created_at timestamptz not null default now()
);
