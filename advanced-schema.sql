-- ============================================================================
-- FedEx Real-Time Tracking Platform Schema
-- ============================================================================
-- This schema supports a complete tracking system with real-time location updates,
-- driver management, vehicle tracking, and live shipment monitoring.

-- ============================================================================
-- Users & Authentication
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'customer', -- customer, driver, admin
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================================================
-- Vehicles & Drivers (for delivery fleet)
-- ============================================================================

CREATE TABLE IF NOT EXISTS vehicles (
  id BIGSERIAL PRIMARY KEY,
  vehicle_number VARCHAR(50) UNIQUE NOT NULL, -- License plate
  vehicle_type VARCHAR(50) NOT NULL, -- van, truck, car, drone
  capacity_kg DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'available', -- available, in_transit, maintenance, offline
  driver_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  last_location_lat DECIMAL(10, 8),
  last_location_lng DECIMAL(11, 8),
  last_updated TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vehicles_driver_id ON vehicles(driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_location ON vehicles(last_location_lat, last_location_lng);

-- ============================================================================
-- Shipments (Core tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS shipments (
  id BIGSERIAL PRIMARY KEY,
  tracking_number VARCHAR(50) UNIQUE NOT NULL,
  reference_number VARCHAR(100),
  tcn VARCHAR(50),
  customer_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id BIGINT REFERENCES vehicles(id) ON DELETE SET NULL,
  
  origin VARCHAR(255) NOT NULL,
  origin_lat DECIMAL(10, 8),
  origin_lng DECIMAL(11, 8),
  
  destination VARCHAR(255) NOT NULL,
  destination_lat DECIMAL(10, 8),
  destination_lng DECIMAL(11, 8),
  
  status VARCHAR(50) DEFAULT 'pending', -- pending, picked_up, in_transit, out_for_delivery, delivered, exception
  weight_kg DECIMAL(10, 2),
  estimated_delivery TIMESTAMP,
  actual_delivery TIMESTAMP,
  
  current_lat DECIMAL(10, 8),
  current_lng DECIMAL(11, 8),
  last_location VARCHAR(255),
  
  proof_of_delivery JSONB, -- {deliveredAt, receivedBy, signature, photoUrl}
  priority VARCHAR(20) DEFAULT 'standard', -- standard, express, overnight
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shipments_tracking_number ON shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipments_reference_number ON shipments(reference_number);
CREATE INDEX IF NOT EXISTS idx_shipments_customer_id ON shipments(customer_id);
CREATE INDEX IF NOT EXISTS idx_shipments_vehicle_id ON shipments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_location ON shipments(current_lat, current_lng);

-- ============================================================================
-- Real-Time Location Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS location_events (
  id BIGSERIAL PRIMARY KEY,
  shipment_id BIGINT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  vehicle_id BIGINT REFERENCES vehicles(id) ON DELETE SET NULL,
  
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy_meters INT,
  heading DECIMAL(5, 2), -- Direction in degrees (0-360)
  speed_kmh DECIMAL(6, 2),
  
  address VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_location_events_shipment ON location_events(shipment_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_location_events_vehicle ON location_events(vehicle_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_location_events_timestamp ON location_events(timestamp DESC);

-- ============================================================================
-- Shipment Events (Status updates & milestones)
-- ============================================================================

CREATE TABLE IF NOT EXISTS shipment_events (
  id BIGSERIAL PRIMARY KEY,
  shipment_id BIGINT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_type VARCHAR(50), -- pickup, in_transit, arrival, delivery, exception, custom
  
  location VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shipment_events_shipment ON shipment_events(shipment_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_shipment_events_type ON shipment_events(event_type);

-- ============================================================================
-- Routes (Planned delivery routes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS routes (
  id BIGSERIAL PRIMARY KEY,
  vehicle_id BIGINT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  route_number VARCHAR(50) UNIQUE NOT NULL,
  
  status VARCHAR(50) DEFAULT 'planned', -- planned, in_progress, completed, cancelled
  total_distance_km DECIMAL(10, 2),
  estimated_duration_minutes INT,
  actual_duration_minutes INT,
  
  planned_start TIMESTAMP,
  actual_start TIMESTAMP,
  planned_end TIMESTAMP,
  actual_end TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_routes_vehicle_id ON routes(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_routes_status ON routes(status);

-- ============================================================================
-- Route Stops (Individual stops on a route)
-- ============================================================================

CREATE TABLE IF NOT EXISTS route_stops (
  id BIGSERIAL PRIMARY KEY,
  route_id BIGINT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  shipment_id BIGINT REFERENCES shipments(id) ON DELETE SET NULL,
  
  stop_number INT NOT NULL,
  address VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  stop_type VARCHAR(50), -- pickup, delivery
  estimated_arrival TIMESTAMP,
  actual_arrival TIMESTAMP,
  actual_departure TIMESTAMP,
  duration_minutes INT,
  
  status VARCHAR(50) DEFAULT 'pending', -- pending, arrived, completed, skipped
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_route_stops_route_id ON route_stops(route_id, stop_number);
CREATE INDEX IF NOT EXISTS idx_route_stops_shipment_id ON route_stops(shipment_id);

-- ============================================================================
-- Notifications & Alerts
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shipment_id BIGINT REFERENCES shipments(id) ON DELETE CASCADE,
  
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  notification_type VARCHAR(50), -- delivery, delay, exception, update
  
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read) WHERE NOT read;

-- ============================================================================
-- Delivery Exceptions
-- ============================================================================

CREATE TABLE IF NOT EXISTS delivery_exceptions (
  id BIGSERIAL PRIMARY KEY,
  shipment_id BIGINT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  
  exception_type VARCHAR(50), -- address_issue, customer_unavailable, weather, traffic, vehicle_issue, etc
  severity VARCHAR(20), -- low, medium, high, critical
  description TEXT NOT NULL,
  
  status VARCHAR(50) DEFAULT 'open', -- open, investigating, resolved, escalated
  resolution_notes TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_delivery_exceptions_shipment ON delivery_exceptions(shipment_id);
CREATE INDEX IF NOT EXISTS idx_delivery_exceptions_status ON delivery_exceptions(status);

-- ============================================================================
-- Analytics & Performance
-- ============================================================================

CREATE TABLE IF NOT EXISTS delivery_analytics (
  id BIGSERIAL PRIMARY KEY,
  vehicle_id BIGINT REFERENCES vehicles(id) ON DELETE CASCADE,
  driver_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  
  date DATE NOT NULL,
  shipments_delivered INT DEFAULT 0,
  total_distance_km DECIMAL(10, 2),
  avg_delivery_time_minutes INT,
  on_time_deliveries INT,
  failed_deliveries INT,
  exceptions INT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analytics_vehicle ON delivery_analytics(vehicle_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_driver ON delivery_analytics(driver_id, date DESC);

-- ============================================================================
-- Triggers & Updates
-- ============================================================================

-- Update shipment's updated_at when status changes
CREATE OR REPLACE FUNCTION update_shipment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shipment_update_timestamp BEFORE UPDATE ON shipments
FOR EACH ROW EXECUTE FUNCTION update_shipment_timestamp();

-- Update vehicle's updated_at when location changes
CREATE OR REPLACE FUNCTION update_vehicle_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vehicle_update_timestamp BEFORE UPDATE ON vehicles
FOR EACH ROW EXECUTE FUNCTION update_vehicle_timestamp();

-- Auto-update shipment's current location from latest location event
CREATE OR REPLACE FUNCTION sync_shipment_location()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE shipments
  SET current_lat = NEW.latitude,
      current_lng = NEW.longitude,
      last_location = NEW.address,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.shipment_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER location_event_sync_shipment AFTER INSERT ON location_events
FOR EACH ROW EXECUTE FUNCTION sync_shipment_location();

-- ============================================================================
-- Views for Real-Time Dashboard
-- ============================================================================

CREATE OR REPLACE VIEW active_deliveries AS
SELECT 
  s.id,
  s.tracking_number,
  s.status,
  s.current_lat,
  s.current_lng,
  s.last_location,
  v.vehicle_number,
  v.vehicle_type,
  u.name as driver_name,
  u.phone as driver_phone,
  s.destination,
  s.estimated_delivery,
  EXTRACT(EPOCH FROM (s.estimated_delivery - CURRENT_TIMESTAMP))/60 as minutes_until_delivery
FROM shipments s
LEFT JOIN vehicles v ON s.vehicle_id = v.id
LEFT JOIN users u ON v.driver_id = u.id
WHERE s.status IN ('picked_up', 'in_transit', 'out_for_delivery')
ORDER BY s.estimated_delivery ASC;

CREATE OR REPLACE VIEW fleet_status AS
SELECT 
  v.id,
  v.vehicle_number,
  v.vehicle_type,
  v.status,
  v.last_location_lat,
  v.last_location_lng,
  v.last_updated,
  u.name as driver_name,
  COUNT(DISTINCT s.id) as active_shipments
FROM vehicles v
LEFT JOIN users u ON v.driver_id = u.id
LEFT JOIN shipments s ON v.id = s.vehicle_id AND s.status IN ('picked_up', 'in_transit', 'out_for_delivery')
GROUP BY v.id, v.vehicle_number, v.vehicle_type, v.status, v.last_location_lat, v.last_location_lng, v.last_updated, u.name;
