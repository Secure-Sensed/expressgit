-- ExpressGit complete Supabase schema
-- Includes customer shipments, shipment events, drivers and vehicles,
-- location tracking, support threads, and user profiles.

create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  phone text,
  role text not null default 'customer',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint users_email_non_empty check (length(trim(email)) > 0),
  constraint users_name_non_empty check (length(trim(name)) > 0),
  constraint users_role_valid check (role in ('customer','driver','admin'))
);

create table if not exists shipments (
  id uuid primary key default gen_random_uuid(),
  tracking_number text not null unique,
  reference_number text unique,
  tcn text unique,
  status text not null,
  origin text not null,
  origin_lat double precision,
  origin_lng double precision,
  destination text not null,
  destination_lat double precision,
  destination_lng double precision,
  current_lat double precision,
  current_lng double precision,
  customer_email text,
  customer_name text,
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
  timestamp timestamptz not null default timezone('utc', now()),
  location text not null,
  details text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  constraint shipment_events_title_non_empty check (length(trim(title)) > 0),
  constraint shipment_events_location_non_empty check (length(trim(location)) > 0)
);

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  vehicle_number text not null unique,
  vehicle_type text not null,
  status text not null default 'available',
  driver_id uuid references users(id),
  last_location_lat double precision,
  last_location_lng double precision,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint vehicles_number_non_empty check (length(trim(vehicle_number)) > 0),
  constraint vehicles_type_non_empty check (length(trim(vehicle_type)) > 0)
);

create table if not exists location_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid references shipments(id) on delete set null,
  vehicle_id uuid references vehicles(id) on delete set null,
  latitude double precision not null,
  longitude double precision not null,
  accuracy_meters double precision,
  heading double precision,
  speed_kmh double precision,
  address text,
  timestamp timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  constraint location_events_latitude_range check (latitude >= -90 and latitude <= 90),
  constraint location_events_longitude_range check (longitude >= -180 and longitude <= 180)
);

create table if not exists support_threads (
  id uuid primary key default gen_random_uuid(),
  tracking_number text not null unique,
  customer_email text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists support_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references support_threads(id) on delete cascade,
  from_role text not null default 'user',
  message text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint support_messages_from_role_valid check (from_role in ('user', 'admin')),
  constraint support_messages_message_non_empty check (length(trim(message)) > 0)
);

alter table users add column if not exists phone text;
alter table users add column if not exists role text not null default 'customer';
alter table users add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table users add column if not exists updated_at timestamptz not null default timezone('utc', now());
alter table shipments add column if not exists customer_email text;
alter table shipments add column if not exists customer_name text;
alter table support_threads add column if not exists customer_email text;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_users_updated_at on users;
create trigger trg_users_updated_at
before update on users
for each row
execute function set_updated_at();

drop trigger if exists trg_shipments_updated_at on shipments;
create trigger trg_shipments_updated_at
before update on shipments
for each row
execute function set_updated_at();

drop trigger if exists trg_vehicles_updated_at on vehicles;
create trigger trg_vehicles_updated_at
before update on vehicles
for each row
execute function set_updated_at();

drop trigger if exists trg_support_threads_updated_at on support_threads;
create trigger trg_support_threads_updated_at
before update on support_threads
for each row
execute function set_updated_at();

create index if not exists idx_users_email on users (email);
create index if not exists idx_shipments_tracking_number on shipments (tracking_number);
create index if not exists idx_shipments_reference_number on shipments (reference_number);
create index if not exists idx_shipments_tcn on shipments (tcn);
create index if not exists idx_shipments_customer_email on shipments (customer_email);
create index if not exists idx_shipments_updated_at_desc on shipments (updated_at desc);
create index if not exists idx_shipment_events_lookup on shipment_events (shipment_id, timestamp desc);
create index if not exists idx_vehicles_number on vehicles (vehicle_number);
create index if not exists idx_vehicles_driver_id on vehicles (driver_id);
create index if not exists idx_location_events_reference on location_events (shipment_id, vehicle_id, timestamp desc);
create index if not exists idx_support_threads_tracking_number on support_threads (tracking_number);
create index if not exists idx_support_messages_thread_id on support_messages (thread_id);

alter table users enable row level security;
alter table shipments enable row level security;
alter table shipment_events enable row level security;
alter table vehicles enable row level security;
alter table location_events enable row level security;
alter table support_threads enable row level security;
alter table support_messages enable row level security;

drop policy if exists users_public_read on users;
create policy users_public_read
on users
for select
using (true);

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

drop policy if exists vehicles_public_read on vehicles;
create policy vehicles_public_read
on vehicles
for select
using (true);

drop policy if exists location_events_public_read on location_events;
create policy location_events_public_read
on location_events
for select
using (true);

drop policy if exists support_threads_public_read on support_threads;
create policy support_threads_public_read
on support_threads
for select
using (true);

drop policy if exists support_messages_public_read on support_messages;
create policy support_messages_public_read
on support_messages
for select
using (true);

drop policy if exists users_service_manage on users;
create policy users_service_manage
on users
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

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

drop policy if exists vehicles_service_manage on vehicles;
create policy vehicles_service_manage
on vehicles
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists location_events_service_manage on location_events;
create policy location_events_service_manage
on location_events
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists support_threads_service_manage on support_threads;
create policy support_threads_service_manage
on support_threads
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists support_messages_service_manage on support_messages;
create policy support_messages_service_manage
on support_messages
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

-- Seed data for local development and demo purposes.
insert into users (email, name, phone, role)
values
  ('ariel.foster@example.com', 'Ariel Foster', '555-0123', 'customer'),
  ('hazel.turner@example.com', 'Hazel Turner', '555-0456', 'customer'),
  ('john.driver@example.com', 'John Smith', '555-0001', 'driver'),
  ('jane.driver@example.com', 'Jane Doe', '555-0002', 'driver')
on conflict (email) do nothing;

insert into vehicles (vehicle_number, vehicle_type, status, driver_id, last_location_lat, last_location_lng)
select 'FDX-001', 'van', 'in_transit', id, 40.7128, -74.006 from users where email = 'john.driver@example.com'
on conflict (vehicle_number) do nothing;

insert into vehicles (vehicle_number, vehicle_type, status, driver_id, last_location_lat, last_location_lng)
select 'FDX-002', 'truck', 'in_transit', id, 34.0522, -118.2437 from users where email = 'jane.driver@example.com'
on conflict (vehicle_number) do nothing;

insert into shipments (
  tracking_number,
  reference_number,
  tcn,
  status,
  origin,
  origin_lat,
  origin_lng,
  destination,
  destination_lat,
  destination_lng,
  current_lat,
  current_lng,
  customer_email,
  customer_name,
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
    35.1495,
    -90.0490,
    'Los Angeles, CA',
    34.0522,
    -118.2437,
    48.8566,
    2.3522,
    'ariel.foster@example.com',
    'Ariel Foster',
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
    39.7684,
    -86.1581,
    'Atlanta, GA',
    33.7490,
    -84.3880,
    33.7490,
    -84.3880,
    'hazel.turner@example.com',
    'Hazel Turner',
    '2026-02-06T18:00:00Z',
    'Atlanta, GA',
    '{"deliveredAt":"2026-02-06T15:42:00Z","receivedBy":"H. TURNER","signature":"Hazel Turner"}'::jsonb
  ),
  (
    '802516839204',
    'REF-OPS-2208',
    'TCN-99450003',
    'Out for Delivery',
    'Dallas, TX',
    32.7767,
    -96.7970,
    'Austin, TX',
    30.2672,
    -97.7431,
    30.2672,
    -97.7431,
    'support.ops@example.com',
    'Ops Customer',
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
    33.4484,
    -112.0740,
    'Newark, NJ',
    40.7357,
    -74.1724,
    38.6270,
    -90.1994,
    'hazel.turner@example.com',
    'Hazel Turner',
    '2026-02-09T23:59:00Z',
    'St. Louis, MO',
    null
  )
on conflict (tracking_number) do update set
  reference_number = excluded.reference_number,
  tcn = excluded.tcn,
  status = excluded.status,
  origin = excluded.origin,
  origin_lat = excluded.origin_lat,
  origin_lng = excluded.origin_lng,
  destination = excluded.destination,
  destination_lat = excluded.destination_lat,
  destination_lng = excluded.destination_lng,
  current_lat = excluded.current_lat,
  current_lng = excluded.current_lng,
  customer_email = excluded.customer_email,
  customer_name = excluded.customer_name,
  estimated_delivery = excluded.estimated_delivery,
  last_location = excluded.last_location,
  proof_of_delivery = excluded.proof_of_delivery,
  updated_at = timezone('utc', now());

insert into shipment_events (shipment_id, title, timestamp, location, details)
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

insert into support_threads (tracking_number, customer_email)
values
  ('771975185243', 'ariel.foster@example.com'),
  ('794848183811', 'hazel.turner@example.com');

insert into support_messages (thread_id, from_role, message)
select id, 'user', 'When will my package arrive?' from support_threads where tracking_number = '771975185243';

insert into support_messages (thread_id, from_role, message)
select id, 'admin', 'Your shipment is moving through the Paris hub and is expected to arrive on time.' from support_threads where tracking_number = '771975185243';

insert into location_events (shipment_id, vehicle_id, latitude, longitude, address, timestamp)
select s.id, v.id, 48.8566, 2.3522, 'Paris, FR', '2026-02-07T07:25:00Z'::timestamptz
from shipments s cross join vehicles v
where s.tracking_number = '771975185243' and v.vehicle_number = 'FDX-001';
