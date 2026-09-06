create table if not exists mindful_meals (
  id serial primary key,
  user_id integer not null references users (id) on delete cascade,
  log_date date not null,
  slot text not null,
  hunger_before integer not null,
  hunger_after integer,
  eat_trigger text,
  created_at timestamptz not null default now()
);
create index if not exists mindful_meals_user_day on mindful_meals (user_id, log_date);
