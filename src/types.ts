export type TrackingMode = "tracking" | "reference" | "tcn" | "pod";

export interface User {
  email: string;
  name: string;
}

export interface ShipmentEvent {
  title: string;
  timestamp: string;
  location: string;
  details?: string;
}

export interface ProofOfDelivery {
  deliveredAt?: string | null;
  receivedBy?: string | null;
  signature?: string | null;
}

export type TransportMode = "air" | "express" | "ground" | "sea";

export type ShipmentPhase = "scheduled" | "processing" | "in_transit" | "customs" | "out_for_delivery" | "delivered";

// Server-computed motion data for a live shipment. All timestamps are ISO strings.
export interface ShipmentMotion {
  mode: TransportMode;
  modeLabel: string;
  phase: ShipmentPhase;
  progress: number;
  legProgress: number;
  heading: number;
  distanceKm: number;
  remainingKm: number;
  speedKmh: number;
  departedAt: string;
  legStart: string;
  legEnd: string;
  customsEnd: string;
  arrivesAt: string;
}

export interface Shipment {
  id?: string;
  trackingNumber: string;
  referenceNumber?: string | null;
  tcn?: string | null;
  status: string;
  origin: string;
  originLat?: number | null;
  originLng?: number | null;
  destination: string;
  destinationLat?: number | null;
  destinationLng?: number | null;
  currentLat?: number | null;
  currentLng?: number | null;
  lastLocation: string;
  customerEmail?: string | null;
  customerName?: string | null;
  estimatedDelivery?: string | null;
  proofOfDelivery?: ProofOfDelivery | null;
  transportMode?: TransportMode | null;
  departedAt?: string | null;
  liveRoute?: boolean;
  motion?: ShipmentMotion;
  events: ShipmentEvent[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TrackResult {
  query: string;
  found: boolean;
  shipment: Shipment | null;
}

export interface Stats {
  total: number;
  inTransit: number;
  delivered: number;
  customers: number;
}

export interface SupportMessage {
  id: string;
  trackingNumber: string;
  from: "admin" | "user";
  body: string;
  timestamp: string;
}

export interface SupportThread {
  trackingNumber: string;
  lastMessage: string;
  from: "admin" | "user";
  timestamp: string;
}

export interface Vehicle {
  id: string | number;
  vehicleNumber: string;
  vehicleType: string;
  status: string;
  lastLocationLat?: number | null;
  lastLocationLng?: number | null;
  lastUpdated?: string;
  driver?: {
    id?: string | number;
    name?: string;
    email?: string;
    phone?: string;
  } | null;
}
