-- Migration: add jwks table for JWT plugin
-- Run this against existing databases that were created before the jwt plugin was added.

create table if not exists "jwks" (
  "id" text not null primary key,
  "public_key" text not null,
  "private_key" text not null,
  "created_at" timestamptz default CURRENT_TIMESTAMP not null,
  "expires_at" timestamptz
);
