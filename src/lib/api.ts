import type {
  User,
  Shipment,
  Stats,
  SupportMessage,
  SupportThread,
  TrackResult,
  TrackingMode,
  Vehicle
} from "@/types";

interface ShipmentNotification {
  sent: boolean;
  skipped?: string;
  error?: string;
}

export async function fetchJson<T>(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const raw = await response.text();
  let data = {} as T & { error?: string };

  if (raw) {
    try {
      data = JSON.parse(raw) as T & { error?: string };
    } catch (_error) {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    }
  }

  if (!response.ok) {
    throw new Error((data && "error" in data && data.error) || `HTTP ${response.status}`);
  }

  return data;
}

export function getSession() {
  return fetchJson<{ user: User | null }>("/api/auth/session");
}

export function getAdminSession() {
  return fetchJson<{ admin: User | null }>("/api/admin/auth/session");
}

export function login(payload: { email: string; password: string }) {
  return fetchJson<{ user: User }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function signup(payload: { name: string; email: string; password: string }) {
  return fetchJson<{ user: User }>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function logout() {
  return fetchJson<{ success?: boolean }>("/api/auth/logout", {
    method: "POST"
  });
}

export function adminLogin(payload: { email: string; password: string }) {
  return fetchJson<{ admin: User }>("/api/admin/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function adminLogout() {
  return fetchJson<{ success?: boolean }>("/api/admin/auth/logout", {
    method: "POST"
  });
}

export function getShipments(owner?: string) {
  const query = owner ? `?owner=${encodeURIComponent(owner)}` : "";
  return fetchJson<{ count: number; shipments: Shipment[] }>(`/api/shipments${query}`);
}

export function getStats() {
  return fetchJson<Stats>("/api/admin/stats");
}

export function trackShipments(mode: TrackingMode, queries: string[]) {
  return fetchJson<{ mode: TrackingMode; results: TrackResult[] }>("/api/track", {
    method: "POST",
    body: JSON.stringify({ mode, queries })
  });
}

export function requestShipment(payload: Partial<Shipment>) {
  return fetchJson<{ shipment: Shipment; message: string }>("/api/shipments/request", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getSupportMessages(trackingNumber: string) {
  return fetchJson<{ messages: SupportMessage[] }>(`/api/support?tracking=${encodeURIComponent(trackingNumber)}`);
}

export function getSupportThreads() {
  return fetchJson<{ threads: SupportThread[] }>("/api/support?all=1");
}

export function sendSupportMessage(
  payload: { trackingNumber: string; message: string; from: "admin" | "user" }
) {
  return fetchJson<{ message: SupportMessage }>("/api/support", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getVehicles() {
  return fetchJson<{ vehicles: Vehicle[] }>("/api/vehicles");
}

export function upsertShipment(shipment: Partial<Shipment>) {
  return fetchJson<{ action: string; shipment: Shipment; notification?: ShipmentNotification }>("/api/admin/upsert", {
    method: "POST",
    body: JSON.stringify({ shipment })
  });
}

export function deleteShipment(trackingNumber: string) {
  return fetchJson<{ action: string; trackingNumber: string }>("/api/admin/delete", {
    method: "POST",
    body: JSON.stringify({ trackingNumber })
  });
}

export function updateShipmentLocation(
  payload: { trackingNumber: string; lastLocation: string }
) {
  return fetchJson<{ action: string; shipment: Shipment; notification?: ShipmentNotification }>("/api/admin/update-location", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getUsers() {
  return fetchJson<{ users: User[] }>("/api/admin/users");
}

export function deleteUser(email: string) {
  return fetchJson<{ action: string; email: string }>("/api/admin/users/delete", {
    method: "POST",
    body: JSON.stringify({ email })
  });
}
