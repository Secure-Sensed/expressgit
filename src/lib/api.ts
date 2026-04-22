import type {
  Shipment,
  Stats,
  SupportMessage,
  SupportThread,
  TrackResult,
  TrackingMode,
  User,
  Vehicle
} from "@/types";

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
  const data = raw ? (JSON.parse(raw) as T & { error?: string }) : ({} as T & { error?: string });

  if (!response.ok) {
    throw new Error((data && "error" in data && data.error) || `HTTP ${response.status}`);
  }

  return data;
}

export function getSession() {
  return fetchJson<{ user: User | null }>("/api/auth/session");
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

export function getSupportThreads(adminToken: string) {
  return fetchJson<{ threads: SupportThread[] }>("/api/support?all=1", {
    headers: {
      "x-admin-token": adminToken
    }
  });
}

export function sendSupportMessage(
  payload: { trackingNumber: string; message: string; from: "admin" | "user" },
  adminToken?: string
) {
  return fetchJson<{ message: SupportMessage }>("/api/support", {
    method: "POST",
    headers: adminToken
      ? {
          "x-admin-token": adminToken
        }
      : undefined,
    body: JSON.stringify(payload)
  });
}

export function getVehicles() {
  return fetchJson<{ vehicles: Vehicle[] }>("/api/vehicles");
}

export function upsertShipment(shipment: Partial<Shipment>, adminToken: string) {
  return fetchJson<{ action: string; shipment: Shipment }>("/api/admin/upsert", {
    method: "POST",
    headers: {
      "x-admin-token": adminToken
    },
    body: JSON.stringify({ shipment })
  });
}

export function deleteShipment(trackingNumber: string, adminToken: string) {
  return fetchJson<{ action: string; trackingNumber: string }>("/api/admin/delete", {
    method: "POST",
    headers: {
      "x-admin-token": adminToken
    },
    body: JSON.stringify({ trackingNumber })
  });
}

export function updateShipmentLocation(
  payload: { trackingNumber: string; lastLocation: string; currentLat?: number | null; currentLng?: number | null },
  adminToken: string
) {
  return fetchJson<{ action: string; shipment: Shipment }>("/api/admin/update-location", {
    method: "POST",
    headers: {
      "x-admin-token": adminToken
    },
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
