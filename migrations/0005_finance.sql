create table if not exists payments (
  id serial primary key,
  user_id integer not null references users (id) on delete cascade,
  paid_at text not null,
  amount integer not null,
  method text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists expenses (
  id serial primary key,
  spent_at text not null,
  amount integer not null,
  category text not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists payments_date_idx on payments (paid_at);
create index if not exists payments_user_idx on payments (user_id);
create index if not exists expenses_date_idx on expenses (spent_at);
