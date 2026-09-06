create table if not exists assistant_logs (
  id serial primary key,
  kind text not null,
  title text not null,
  body text,
  href text,
  created_at timestamptz not null default now()
);
create index if not exists assistant_logs_created_idx on assistant_logs (created_at desc);

create table if not exists delete_requests (
  id serial primary key,
  target_table text not null,
  target_id integer not null,
  summary text not null,
  status text not null default 'beklemede',
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists delete_requests_status_idx on delete_requests (status, created_at desc);
