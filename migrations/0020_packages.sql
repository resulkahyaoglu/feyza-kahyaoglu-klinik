alter table appointments add column if not exists is_measure integer not null default 0;

create table if not exists client_packages (
  id serial primary key,
  user_id integer not null references users (id) on delete cascade,
  kind text not null,
  title text not null,
  total integer not null,
  next_no integer not null default 1,
  unit text not null default 'seans',
  notes text,
  is_active integer not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists client_packages_user_idx on client_packages (user_id);
