import { useEffect, useMemo, useRef, useState } from "react";
import { AdvancedMarker, APIProvider, InfoWindow, Map, useMap } from "@vis.gl/react-google-maps";
import { MapPinOff } from "lucide-react";

import { MODE_META, modeMeta } from "@/components/transport-icons";
import { useNow } from "@/hooks/use-now";
import { arcPoints, formatCountdown, liveState, pointOf, type LatLng } from "@/lib/geo";
import { formatStatusLabel } from "@/lib/utils";
import type { Shipment, Vehicle } from "@/types";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
const MAP_ID = (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined) || "DEMO_MAP_ID";
const WORLD_CENTER = { lat: 22, lng: 12 };

interface ShipmentMapProps {
  shipments: Shipment[];
  selectedTracking?: string;
  vehicles?: Vehicle[];
  onSelect?: (trackingNumber: string) => void;
  className?: string;
  /** Zoom to the selected shipment's whole route instead of showing the world. */
  focusSelected?: boolean;
  /** Hide the controls and lock gestures, for decorative maps. */
  quiet?: boolean;
}

export function ShipmentMap(props: ShipmentMapProps) {
  if (!API_KEY) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 bg-[var(--surface-2)] p-6 text-center text-sm text-[color:var(--muted-foreground)] ${props.className || ""}`}>
        <MapPinOff className="h-6 w-6" />
        <p className="font-medium text-[color:var(--foreground)]">Map unavailable</p>
        <p>
          Set <code>VITE_GOOGLE_MAPS_API_KEY</code> (Maps JavaScript API) and rebuild.
        </p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY}>
      <div className={props.className}>
        <Map
          mapId={MAP_ID}
          defaultCenter={WORLD_CENTER}
          defaultZoom={2}
          minZoom={2}
          gestureHandling={props.quiet ? "cooperative" : "greedy"}
          disableDefaultUI={props.quiet}
          streetViewControl={false}
          mapTypeControl={false}
          fullscreenControl={!props.quiet}
          zoomControl={!props.quiet}
          clickableIcons={false}
          style={{ width: "100%", height: "100%" }}
        >
          <MapContents {...props} />
        </Map>
      </div>
    </APIProvider>
  );
}

function MapContents({ shipments, selectedTracking, vehicles = [], onSelect, focusSelected }: ShipmentMapProps) {
  const map = useMap();
  const now = useNow(1000);
  const [openInfo, setOpenInfo] = useState<string | null>(null);

  const selected = useMemo(
    () => shipments.find((item) => item.trackingNumber === selectedTracking) || (shipments.length === 1 ? shipments[0] : null),
    [shipments, selectedTracking]
  );

  // Frame the selected route (or all routes) when the selection or the set of shipments changes,
  // not on every tick, so the user can pan and zoom freely while things move.
  const fitKey = selected && focusSelected !== false ? `sel|${selected.trackingNumber}|${selected.originLat}|${selected.destinationLat}` : `all|${shipments.length}`;

  useEffect(() => {
    if (!map) return;
    const bounds = new google.maps.LatLngBounds();
    let count = 0;
    const targets = selected && focusSelected !== false ? [selected] : shipments;

    for (const shipment of targets) {
      for (const point of [pointOf(shipment.originLat, shipment.originLng), pointOf(shipment.destinationLat, shipment.destinationLng)]) {
        if (point) {
          bounds.extend(point);
          count += 1;
        }
      }
    }

    if (count === 0) return;
    if (count === 1) {
      map.setCenter(bounds.getCenter());
      map.setZoom(8);
    } else {
      map.fitBounds(bounds, targets.length === 1 ? 72 : 24);
    }
  }, [map, fitKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {shipments.map((shipment) => (
        <ShipmentLayer
          key={shipment.trackingNumber}
          shipment={shipment}
          now={now}
          active={shipment.trackingNumber === selected?.trackingNumber}
          dim={Boolean(selected) && shipments.length > 1 && shipment.trackingNumber !== selected?.trackingNumber}
          onSelect={() => {
            onSelect?.(shipment.trackingNumber);
            setOpenInfo(shipment.trackingNumber);
          }}
          infoOpen={openInfo === shipment.trackingNumber}
          onCloseInfo={() => setOpenInfo(null)}
        />
      ))}

      {vehicles.map((vehicle) => {
        const position = pointOf(vehicle.lastLocationLat, vehicle.lastLocationLng);
        if (!position) return null;
        return (
          <AdvancedMarker key={`vehicle-${vehicle.id}`} position={position} title={`${vehicle.vehicleNumber} · ${vehicle.driver?.name || "Unassigned"}`}>
            <div className="h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 shadow" />
          </AdvancedMarker>
        );
      })}
    </>
  );
}

function ShipmentLayer({
  shipment,
  now,
  active,
  dim,
  onSelect,
  infoOpen,
  onCloseInfo
}: {
  shipment: Shipment;
  now: number;
  active: boolean;
  dim: boolean;
  onSelect: () => void;
  infoOpen: boolean;
  onCloseInfo: () => void;
}) {
  const map = useMap();
  const meta = modeMeta(shipment.transportMode);
  const state = liveState(shipment, now);
  const origin = pointOf(shipment.originLat, shipment.originLng);
  const destination = pointOf(shipment.destinationLat, shipment.destinationLng);
  const delivered = state.phase === "delivered";
  const moving = state.phase === "in_transit";

  // The route curve only changes when the endpoints change.
  const arc = useMemo<LatLng[]>(() => (origin && destination ? arcPoints(origin, destination, 72) : []), [origin?.lat, origin?.lng, destination?.lat, destination?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  const travelled = useRef<google.maps.Polyline | null>(null);
  const remaining = useRef<google.maps.Polyline | null>(null);

  // Create the polylines once per route, then only move their paths on each tick.
  useEffect(() => {
    if (!map || arc.length === 0) return;

    travelled.current = new google.maps.Polyline({ map, strokeColor: meta.color, strokeWeight: 4, geodesic: false, zIndex: 2 });
    remaining.current = new google.maps.Polyline({
      map,
      strokeOpacity: 0,
      geodesic: false,
      zIndex: 1,
      icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, strokeColor: meta.color, scale: 2.4 }, offset: "0", repeat: "12px" }]
    });

    return () => {
      travelled.current?.setMap(null);
      remaining.current?.setMap(null);
      travelled.current = null;
      remaining.current = null;
    };
  }, [map, arc, meta.color]);

  useEffect(() => {
    if (!travelled.current || !remaining.current || arc.length === 0 || !state.position) return;

    const index = Math.min(arc.length - 1, Math.max(0, Math.round(state.fraction * (arc.length - 1))));
    const opacity = active ? 0.95 : dim ? 0.18 : 0.5;
    const dashOpacity = active ? 0.85 : dim ? 0.15 : 0.45;

    travelled.current.setOptions({ strokeOpacity: opacity, strokeWeight: active ? 5 : 3 });
    travelled.current.setPath([...arc.slice(0, index + 1), state.position]);

    const icons = remaining.current.get("icons") as google.maps.IconSequence[];
    if (icons?.[0]) {
      icons[0].icon = { ...icons[0].icon!, strokeOpacity: dashOpacity, scale: active ? 2.8 : 2 };
      remaining.current.set("icons", icons);
    }
    remaining.current.setPath(delivered ? [] : [state.position, ...arc.slice(index + 1)]);
  }, [now, arc, active, dim, delivered]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!state.position) return null;

  const Icon = meta.Icon;
  const size = active ? 40 : 30;

  return (
    <>
      {active && origin ? (
        <AdvancedMarker position={origin} title={`Origin: ${shipment.origin}`} zIndex={2}>
          <EndpointPin label={shipment.origin} tone="origin" />
        </AdvancedMarker>
      ) : null}
      {active && destination ? (
        <AdvancedMarker position={destination} title={`Destination: ${shipment.destination}`} zIndex={2}>
          <EndpointPin label={shipment.destination} tone="destination" />
        </AdvancedMarker>
      ) : null}

      <AdvancedMarker position={state.position} title={`${shipment.trackingNumber} · ${shipment.lastLocation}`} onClick={onSelect} zIndex={active ? 20 : 5}>
        <div className="relative flex items-center justify-center" style={{ width: size, height: size, opacity: dim ? 0.45 : 1 }}>
          {moving ? <span className="vessel-pulse" style={{ color: meta.color }} /> : null}
          <span
            className="relative flex items-center justify-center rounded-full border-2 border-white shadow-[0_4px_14px_rgba(15,61,94,0.45)]"
            style={{ width: size, height: size, background: delivered ? "#15803d" : meta.color, color: "#fff" }}
          >
            <span style={{ transform: meta.rotates && moving ? `rotate(${state.heading}deg)` : undefined, display: "flex", transition: "transform 0.6s linear" }}>
              <Icon size={active ? 22 : 16} />
            </span>
          </span>
        </div>
      </AdvancedMarker>

      {infoOpen ? (
        <InfoWindow position={state.position} onCloseClick={onCloseInfo} pixelOffset={[0, -22]}>
          <div className="min-w-[190px] space-y-1 text-[13px] text-[#1b2733]">
            <p className="font-semibold tracking-wide">{shipment.trackingNumber}</p>
            <p>
              {shipment.origin} → {shipment.destination}
            </p>
            <p className="text-[#5b6b7a]">
              {meta.label} · {formatStatusLabel(state.phase as string)}
            </p>
            {!delivered ? <p className="font-medium">Arrives in {formatCountdown(state.remainingMs)}</p> : null}
          </div>
        </InfoWindow>
      ) : null}
    </>
  );
}

function EndpointPin({ label, tone }: { label: string; tone: "origin" | "destination" }) {
  return (
    <div className="flex -translate-y-1 flex-col items-center">
      <span className="whitespace-nowrap rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-[#0f3d5e] shadow-md">{label.split(",")[0]}</span>
      <span
        className="mt-1 h-3 w-3 rounded-full border-2 border-white shadow"
        style={{ background: tone === "origin" ? "#0f3d5e" : "#f59e0b" }}
      />
    </div>
  );
}

export function ModeLegend({ className = "" }: { className?: string }) {
  return (
    <ul className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs ${className}`}>
      {Object.entries(MODE_META).map(([key, meta]) => (
        <li key={key} className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: meta.color }} />
          {meta.short}
        </li>
      ))}
    </ul>
  );
}
