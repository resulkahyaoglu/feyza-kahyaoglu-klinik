alter table offplan_logs add column if not exists photo_b64 text;
alter table offplan_logs add column if not exists photo_mime text;
alter table offplan_logs add column if not exists photo_name text;
alter table offplan_logs alter column detail drop not null;
alter table offplan_logs alter column detail set default '';
