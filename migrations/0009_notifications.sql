create table if not exists admin_notifications (
  id serial primary key,
  user_id integer references users (id) on delete set null,
  kind text not null,
  title text not null,
  body text,
  href text,
  is_read integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists admin_notifications_unread_idx
  on admin_notifications (is_read, created_at desc);
