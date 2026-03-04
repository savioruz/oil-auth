-- Migration: add jwks table for JWT plugin
-- Run this against existing databases that were created before the jwt plugin was added.

create table if not exists "jwks" (
  "id" text not null primary key,
  "publicKey" text not null,
  "privateKey" text not null,
  "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
  "expiresAt" timestamptz
);
