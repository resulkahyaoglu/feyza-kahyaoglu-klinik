create table if not exists lab_uploads (
  id serial primary key,
  user_id integer not null references users (id) on delete cascade,
  title text not null,
  note text,
  staff_note text,
  kind text not null,
  file_name text,
  mime text,
  file_path text,
  file_b64 text,
  is_read integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists lab_uploads_user_idx on lab_uploads (user_id, created_at desc);
