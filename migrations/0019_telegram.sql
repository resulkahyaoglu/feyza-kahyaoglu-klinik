create table if not exists clinic_telegram (
  id integer primary key default 1,
  bot_token text,
  bot_username text,
  updated_at timestamptz not null default now()
);

create table if not exists telegram_links (
  role text primary key,
  chat_id text,
  telegram_name text,
  pending_code text,
  pending_until timestamptz,
  linked_at timestamptz
);
