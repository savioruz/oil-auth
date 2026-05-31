-- Migration: add two-factor authentication tables
-- Run this against existing databases that were created before the twoFactor plugin was added.

alter table "user"
  add column if not exists "two_factor_enabled" boolean;

create table if not exists "two_factor" (
  "id" text not null primary key,
  "secret" text not null,
  "backup_codes" text not null,
  "user_id" text not null references "user"("id") on delete cascade,
  "verified" boolean
);
