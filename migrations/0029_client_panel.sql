alter table users add column if not exists panel_theme text not null default 'dogal';
alter table daily_logs add column if not exists mood text;
alter table daily_logs add column if not exists energy integer;
