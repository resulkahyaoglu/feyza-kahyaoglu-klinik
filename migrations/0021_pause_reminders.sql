alter table fasting_plans add column if not exists pause_reason text;
alter table fasting_plans add column if not exists pause_until date;

create table if not exists appointment_reminders (
  appointment_id integer not null references appointments (id) on delete cascade,
  kind text not null,
  sent_at timestamptz not null default now(),
  primary key (appointment_id, kind)
);
