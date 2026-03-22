-- Migration: add admin plugin columns
-- Run this against existing databases that were created before the admin plugin was added.

alter table "user"
  add column if not exists "role" text not null default 'user',
  add column if not exists "banned" boolean,
  add column if not exists "ban_reason" text,
  add column if not exists "ban_expires" timestamptz;

alter table "session"
  add column if not exists "impersonated_by" text;
