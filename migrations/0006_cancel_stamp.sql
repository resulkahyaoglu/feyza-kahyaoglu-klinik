alter table appointments add column if not exists cancelled_at timestamptz;
alter table appointments add column if not exists cancelled_by text;
