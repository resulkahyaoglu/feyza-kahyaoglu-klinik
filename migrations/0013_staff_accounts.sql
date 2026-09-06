create table if not exists staff_accounts (
  role text primary key,
  username text not null unique,
  password_hash text not null,
  updated_at timestamptz not null default now()
);

insert into staff_accounts (role, username, password_hash)
select 'admin', 'admin', '5b15d85d94f78a139358294f4c5cae60395fc7c50ef11b90cca669aa77300a6f'
where not exists (select 1 from staff_accounts where role = 'admin');

insert into staff_accounts (role, username, password_hash)
select 'assistant', 'asistan', '20e209320af88010f1fd69284cb66abd69aa765b362ee3f803fc492d9c342573'
where not exists (select 1 from staff_accounts where role = 'assistant');
