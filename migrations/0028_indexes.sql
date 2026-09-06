-- Sık kullanılan sorgular: danışan randevusu, paket, öğün, tahlil, mesaj.

create index if not exists appointments_user_date_idx
  on appointments (user_id, appointment_date, appointment_time);

create index if not exists appointments_status_date_idx
  on appointments (status, appointment_date);

create index if not exists offplan_logs_user_idx
  on offplan_logs (user_id, created_at desc);

create index if not exists offplan_logs_unread_idx
  on offplan_logs (is_read, created_at desc);

create index if not exists messages_unread_idx
  on messages (user_id, is_read);

create index if not exists lab_values_user_idx
  on lab_values (user_id, taken_at, marker);

create index if not exists client_packages_active_idx
  on client_packages (user_id, kind, is_active);

create index if not exists package_ticks_pkg_idx
  on package_ticks (package_id);

create index if not exists fasting_logs_date_idx
  on fasting_logs (log_date);
