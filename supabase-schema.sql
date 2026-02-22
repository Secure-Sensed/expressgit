-- Supabase schema for users, shipments, and shipment events

-- Enable pgcrypto extension (for gen_random_uuid)
create extension if not exists pgcrypto;

-- Users table
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  password_hash text not null,
  created_at timestamp default now()
);

-- Shipments table
create table if not exists shipments (
  id uuid primary key default gen_random_uuid(),
  tracking_number text unique not null,
  reference_number text,
  tcn text,
  status text not null,
  origin text not null,
  destination text not null,
  estimated_delivery timestamp,
  last_location text,
  proof_of_delivery jsonb,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Events table (for shipment tracking history)
create table if not exists shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references shipments(id) on delete cascade,
  title text not null,
  timestamp timestamp not null,
  location text,
  details text,
  created_at timestamp default now()
);

create index if not exists idx_shipments_tracking on shipments(tracking_number);
create index if not exists idx_shipments_reference on shipments(reference_number);
create index if not exists idx_shipments_tcn on shipments(tcn);
create index if not exists idx_events_shipment on shipment_events(shipment_id);
