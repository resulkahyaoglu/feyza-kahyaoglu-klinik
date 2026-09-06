alter table measurements add column if not exists arm_right double precision;
alter table measurements add column if not exists arm_left double precision;
alter table measurements add column if not exists leg_right double precision;
alter table measurements add column if not exists leg_left double precision;

update measurements set arm_right = arm where arm_right is null;
update measurements set arm_left = arm where arm_left is null;
update measurements set leg_right = leg where leg_right is null;
update measurements set leg_left = leg where leg_left is null;
