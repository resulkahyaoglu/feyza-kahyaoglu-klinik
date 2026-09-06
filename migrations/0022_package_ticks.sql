create table if not exists package_ticks (
  appointment_id integer not null references appointments (id) on delete cascade,
  package_id integer not null references client_packages (id) on delete cascade,
  primary key (appointment_id, package_id)
);
