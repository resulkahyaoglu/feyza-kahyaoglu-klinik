create table if not exists client_debts (
  id serial primary key,
  user_id integer not null references users (id) on delete cascade,
  kind text not null,
  amount integer not null,
  notes text,
  payment_id integer references payments (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists client_debts_user_idx on client_debts (user_id);
