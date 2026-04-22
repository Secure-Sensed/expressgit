import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer } from "react-leaflet";
import { Loader2, RefreshCcw, Route, Truck } from "lucide-react";
import { toast } from "sonner";

import { MetricCard } from "@/components/metric-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import * as api from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { Shipment, Vehicle } from "@/types";

export function OperationsPage() {
  const [searchParams] = useSearchParams();
  const requestedTracking = searchParams.get("tracking") || "";
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedTracking, setSelectedTracking] = useState(requestedTracking);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadOperations(true);

    const timer = window.setInterval(() => {
      void loadOperations();
    }, 15000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (requestedTracking) {
      setSelectedTracking(requestedTracking);
    }
  }, [requestedTracking]);

  async function loadOperations(initial = false) {
    if (initial) {
      setLoading(true);
    }

    try {
      const [shipmentsResponse, vehiclesResponse] = await Promise.all([api.getShipments(), api.getVehicles()]);
      const nextShipments = shipmentsResponse.shipments || [];
      setShipments(nextShipments);
      setVehicles(vehiclesResponse.vehicles || []);

      if (!selectedTracking && nextShipments[0]?.trackingNumber) {
        setSelectedTracking(nextShipments[0].trackingNumber);
      }
    } catch (error) {
      if (initial) {
        toast.error(error instanceof Error ? error.message : "Unable to load operations data.");
      }
    } finally {
      if (initial) {
        setLoading(false);
      }
    }
  }

  const selectedShipment =
    shipments.find((shipment) => shipment.trackingNumber === selectedTracking) || shipments[0] || null;

  const center: [number, number] =
    selectedShipment?.currentLat != null && selectedShipment?.currentLng != null
      ? [selectedShipment.currentLat, selectedShipment.currentLng]
      : [39.8283, -98.5795];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard accent="orange" label="Tracked parcels" value={shipments.length} detail="Shipments visible on the operational board." />
        <MetricCard accent="blue" label="Vehicles" value={vehicles.length} detail="Courier and fleet units currently available." />
        <MetricCard
          accent="green"
          label="Delivering today"
          value={shipments.filter((shipment) => /out for delivery|delivered/i.test(shipment.status)).length}
          detail="Shipments in final-mile or completed state."
        />
        <MetricCard
          accent="rose"
          label="Exceptions"
          value={shipments.filter((shipment) => /exception/i.test(shipment.status)).length}
          detail="Shipments needing operator attention."
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle>Live operations map</CardTitle>
              <CardDescription>Current shipment positions, route anchors, and vehicle locations rendered from the current API state.</CardDescription>
            </div>
            <Button variant="outline" onClick={() => void loadOperations(true)} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[560px]">
              <MapContainer key={selectedShipment?.trackingNumber || "overview"} center={center} zoom={selectedShipment ? 5 : 4} scrollWheelZoom>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {shipments.map((shipment) => {
                  const points: Array<[number, number]> = [];
                  if (shipment.originLat != null && shipment.originLng != null) {
                    points.push([shipment.originLat, shipment.originLng]);
                  }
                  if (shipment.currentLat != null && shipment.currentLng != null) {
                    points.push([shipment.currentLat, shipment.currentLng]);
                  }
                  if (shipment.destinationLat != null && shipment.destinationLng != null) {
                    points.push([shipment.destinationLat, shipment.destinationLng]);
                  }

                  return (
                    <div key={shipment.trackingNumber}>
                      {points.length > 1 ? (
                        <Polyline
                          pathOptions={{
                            color: shipment.trackingNumber === selectedShipment?.trackingNumber ? "#ff7f29" : "#69b7ff",
                            opacity: shipment.trackingNumber === selectedShipment?.trackingNumber ? 0.85 : 0.35,
                            weight: shipment.trackingNumber === selectedShipment?.trackingNumber ? 4 : 2
                          }}
                          positions={points}
                        />
                      ) : null}

                      {shipment.currentLat != null && shipment.currentLng != null ? (
                        <CircleMarker
                          center={[shipment.currentLat, shipment.currentLng]}
                          eventHandlers={{
                            click: () => setSelectedTracking(shipment.trackingNumber)
                          }}
                          pathOptions={{
                            color: shipment.trackingNumber === selectedShipment?.trackingNumber ? "#fff4d9" : "#ff7f29",
                            fillColor: shipment.trackingNumber === selectedShipment?.trackingNumber ? "#ffd8a9" : "#ff7f29",
                            fillOpacity: 0.95
                          }}
                          radius={shipment.trackingNumber === selectedShipment?.trackingNumber ? 12 : 8}
                        >
                          <Popup>
                            <div className="space-y-1">
                              <p className="font-semibold">{shipment.trackingNumber}</p>
                              <p>{shipment.lastLocation}</p>
                              <p>{shipment.status}</p>
                            </div>
                          </Popup>
                        </CircleMarker>
                      ) : null}
                    </div>
                  );
                })}

                {vehicles.map((vehicle) =>
                  vehicle.lastLocationLat != null && vehicle.lastLocationLng != null ? (
                    <CircleMarker
                      key={vehicle.id}
                      center={[vehicle.lastLocationLat, vehicle.lastLocationLng]}
                      pathOptions={{
                        color: "#8ef0b2",
                        fillColor: "#2ad376",
                        fillOpacity: 0.8
                      }}
                      radius={6}
                    >
                      <Popup>
                        <div className="space-y-1">
                          <p className="font-semibold">{vehicle.vehicleNumber}</p>
                          <p>{vehicle.vehicleType}</p>
                          <p>{vehicle.driver?.name || "Unassigned driver"}</p>
                        </div>
                      </Popup>
                    </CircleMarker>
                  ) : null
                )}
              </MapContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Shipment board</CardTitle>
              <CardDescription>Click a parcel to focus the map and its route metadata.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {shipments.map((shipment) => (
                <button
                  key={shipment.trackingNumber}
                  type="button"
                  className={`flex w-full items-center justify-between rounded-[22px] border px-4 py-4 text-left transition-colors ${
                    shipment.trackingNumber === selectedShipment?.trackingNumber
                      ? "border-[color:var(--accent)]/50 bg-[color:var(--accent)]/12"
                      : "border-white/8 bg-white/4 hover:bg-white/7"
                  }`}
                  onClick={() => setSelectedTracking(shipment.trackingNumber)}
                >
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">{shipment.trackingNumber}</p>
                    <p className="font-semibold">{shipment.lastLocation}</p>
                    <p className="text-sm text-[color:var(--muted-foreground)]">ETA {formatDateTime(shipment.estimatedDelivery)}</p>
                  </div>
                  <StatusBadge status={shipment.status} />
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Focused shipment</CardTitle>
              <CardDescription>{selectedShipment ? "Detailed route data for the selected parcel." : "Select a shipment to inspect it."}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedShipment ? (
                <>
                  <div className="rounded-[24px] border border-white/8 bg-white/4 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">Tracking number</p>
                        <p className="mt-2 text-xl font-semibold">{selectedShipment.trackingNumber}</p>
                      </div>
                      <StatusBadge status={selectedShipment.status} />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailCard label="Origin" value={selectedShipment.origin} />
                    <DetailCard label="Destination" value={selectedShipment.destination} />
                    <DetailCard label="Current position" value={selectedShipment.lastLocation} />
                    <DetailCard label="Estimated delivery" value={formatDateTime(selectedShipment.estimatedDelivery)} />
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted-foreground)]">Recent movement</p>
                    {selectedShipment.events.slice(0, 4).map((event) => (
                      <div key={`${event.timestamp}-${event.title}`} className="rounded-[22px] border border-white/8 bg-white/4 px-4 py-3">
                        <div className="flex items-center justify-between gap-4">
                          <p className="font-medium">{event.title}</p>
                          <p className="text-xs text-[color:var(--muted-foreground)]">{formatDateTime(event.timestamp)}</p>
                        </div>
                        <p className="mt-2 text-sm text-[color:var(--muted-foreground)]">{event.location}</p>
                        {event.details ? <p className="mt-1 text-sm leading-6 text-[color:var(--muted-foreground)]">{event.details}</p> : null}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-[color:var(--muted-foreground)]">No shipment selected.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fleet presence</CardTitle>
              <CardDescription>Vehicles returned by `/api/vehicles`.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {vehicles.length ? (
                vehicles.map((vehicle) => (
                  <div key={vehicle.id} className="flex items-center gap-4 rounded-[22px] border border-white/8 bg-white/4 px-4 py-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400/14 text-emerald-200">
                      <Truck className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{vehicle.vehicleNumber}</p>
                      <p className="text-sm text-[color:var(--muted-foreground)]">
                        {vehicle.driver?.name || "Unassigned driver"} · {vehicle.vehicleType}
                      </p>
                    </div>
                    <div className="rounded-full border border-emerald-400/25 bg-emerald-400/12 px-3 py-1 text-xs uppercase tracking-[0.18em] text-emerald-200">
                      {vehicle.status}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[22px] border border-dashed border-white/10 px-4 py-8 text-center text-sm text-[color:var(--muted-foreground)]">
                  No vehicle data returned by the current backend.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-white/8 bg-white/4 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">{label}</p>
      <p className="mt-2 text-sm font-medium">{value}</p>
    </div>
  );
}
