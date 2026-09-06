create table if not exists client_feedback (
  id serial primary key,
  user_id integer not null references users (id) on delete cascade,
  message text not null,
  is_read integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists client_feedback_user_idx on client_feedback (user_id, created_at desc);
