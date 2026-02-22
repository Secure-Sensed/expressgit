-- FedEx tracking schema for Supabase
-- Supports public tracking reads and admin shipment management through server-side APIs.

create extension if not exists pgcrypto;

create table if not exists shipments (
  id uuid primary key default gen_random_uuid(),
  tracking_number text not null unique,
  reference_number text unique,
  tcn text unique,
  status text not null,
  origin text not null,
  destination text not null,
  estimated_delivery timestamptz,
  last_location text not null,
  proof_of_delivery jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint shipments_tracking_non_empty check (length(trim(tracking_number)) > 0),
  constraint shipments_status_non_empty check (length(trim(status)) > 0),
  constraint shipments_origin_non_empty check (length(trim(origin)) > 0),
  constraint shipments_destination_non_empty check (length(trim(destination)) > 0),
  constraint shipments_last_location_non_empty check (length(trim(last_location)) > 0)
);

create table if not exists shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references shipments(id) on delete cascade,
  title text not null,
  "timestamp" timestamptz not null default timezone('utc', now()),
  location text not null,
  details text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  constraint shipment_events_title_non_empty check (length(trim(title)) > 0),
  constraint shipment_events_location_non_empty check (length(trim(location)) > 0)
);

create index if not exists idx_shipments_tracking_number on shipments (tracking_number);
create index if not exists idx_shipments_reference_number on shipments (reference_number);
create index if not exists idx_shipments_tcn on shipments (tcn);
create index if not exists idx_shipments_updated_at_desc on shipments (updated_at desc);
create index if not exists idx_shipment_events_lookup on shipment_events (shipment_id, "timestamp" desc);
create unique index if not exists idx_shipment_events_unique_scan on shipment_events (shipment_id, title, "timestamp");

create or replace function set_shipments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_shipments_updated_at on shipments;
create trigger trg_shipments_updated_at
before update on shipments
for each row
execute function set_shipments_updated_at();

alter table shipments enable row level security;
alter table shipment_events enable row level security;

drop policy if exists shipments_public_read on shipments;
create policy shipments_public_read
on shipments
for select
using (true);

drop policy if exists shipment_events_public_read on shipment_events;
create policy shipment_events_public_read
on shipment_events
for select
using (true);

-- Server-side APIs use the service-role key for write operations.
drop policy if exists shipments_service_manage on shipments;
create policy shipments_service_manage
on shipments
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists shipment_events_service_manage on shipment_events;
create policy shipment_events_service_manage
on shipment_events
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

-- Seed sample shipments.
insert into shipments (
  tracking_number,
  reference_number,
  tcn,
  status,
  origin,
  destination,
  estimated_delivery,
  last_location,
  proof_of_delivery
)
values
  (
    '771975185243',
    'REF-INTL-1001',
    'TCN-99450001',
    'In Transit',
    'Memphis, TN',
    'Lagos, NG',
    '2026-02-10T16:30:00Z',
    'Paris, FR',
    null
  ),
  (
    '794848183811',
    'REF-NA-7730',
    'TCN-99450002',
    'Delivered',
    'Indianapolis, IN',
    'Atlanta, GA',
    '2026-02-06T18:00:00Z',
    'Atlanta, GA',
    '{"deliveredAt":"2026-02-06T15:42:00Z","receivedBy":"M. DANIELS","signature":"M. Daniels"}'::jsonb
  ),
  (
    '802516839204',
    'REF-OPS-2208',
    'TCN-99450003',
    'Out for Delivery',
    'Dallas, TX',
    'Austin, TX',
    '2026-02-07T20:00:00Z',
    'Austin, TX',
    null
  ),
  (
    '612837450901',
    'REF-MED-3310',
    'TCN-99450004',
    'Exception',
    'Phoenix, AZ',
    'Newark, NJ',
    '2026-02-09T23:59:00Z',
    'St. Louis, MO',
    null
  )
on conflict (tracking_number) do update
set
  reference_number = excluded.reference_number,
  tcn = excluded.tcn,
  status = excluded.status,
  origin = excluded.origin,
  destination = excluded.destination,
  estimated_delivery = excluded.estimated_delivery,
  last_location = excluded.last_location,
  proof_of_delivery = excluded.proof_of_delivery,
  updated_at = timezone('utc', now());

insert into shipment_events (shipment_id, title, "timestamp", location, details)
select
  s.id,
  e.title,
  e.event_time,
  e.location,
  e.details
from (
  values
    ('771975185243', 'In transit', '2026-02-07T07:25:00Z'::timestamptz, 'Paris, FR', 'Departed FedEx location'),
    ('771975185243', 'At local facility', '2026-02-06T19:10:00Z'::timestamptz, 'Paris, FR', 'Arrived at FedEx hub'),
    ('771975185243', 'Shipment information sent to FedEx', '2026-02-05T14:02:00Z'::timestamptz, 'Memphis, TN', 'Label created'),
    ('794848183811', 'Delivered', '2026-02-06T15:42:00Z'::timestamptz, 'Atlanta, GA', 'Delivered to front desk'),
    ('794848183811', 'Out for delivery', '2026-02-06T10:18:00Z'::timestamptz, 'Atlanta, GA', 'On FedEx vehicle'),
    ('794848183811', 'At destination sort facility', '2026-02-06T04:11:00Z'::timestamptz, 'Atlanta, GA', 'Package sorted'),
    ('802516839204', 'Out for delivery', '2026-02-07T12:28:00Z'::timestamptz, 'Austin, TX', 'Courier dispatched'),
    ('802516839204', 'At destination sort facility', '2026-02-07T08:15:00Z'::timestamptz, 'Austin, TX', 'Ready for delivery'),
    ('612837450901', 'Operational delay', '2026-02-07T02:31:00Z'::timestamptz, 'St. Louis, MO', 'Weather exception')
) as e(tracking_number, title, event_time, location, details)
join shipments s on s.tracking_number = e.tracking_number
on conflict do nothing;
