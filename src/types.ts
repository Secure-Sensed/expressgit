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
