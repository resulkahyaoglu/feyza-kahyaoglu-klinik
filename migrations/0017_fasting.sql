create table if not exists fasting_plans (
  user_id integer primary key references users (id) on delete cascade,
  enabled integer not null default 0,
  protocol text not null default 'kapali',
  window_start text not null default '12:00',
  window_end text not null default '20:00',
  days text not null default '1,2,3,4,5,6,7',
  notes text,
  updated_at timestamptz not null default now()
);
