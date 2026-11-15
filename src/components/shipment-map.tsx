import { useEffect, useMemo } from "react";
import { AdvancedMarker, APIProvider, InfoWindow, Map, useMap } from "@vis.gl/react-google-maps";
import { useState } from "react";
import { MapPinOff } from "lucide-react";

import type { Shipment, Vehicle } from "@/types";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
const MAP_ID = (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined) || "DEMO_MAP_ID";
const US_CENTER = { lat: 39.8283, lng: -98.5795 };

type Point = { lat: number; lng: number };

function pointOf(lat?: number | null, lng?: number | null): Point | null {
  return lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function shipmentPoints(shipment: Shipment) {
  return {
    origin: pointOf(shipment.originLat, shipment.originLng),
    current: pointOf(shipment.currentLat, shipment.currentLng),
    destination: pointOf(shipment.destinationLat, shipment.destinationLng)
  };
}

interface ShipmentMapProps {
  shipments: Shipment[];
  selectedTracking?: string;
  vehicles?: Vehicle[];
  onSelect?: (trackingNumber: string) => void;
  className?: string;
}

export function ShipmentMap(props: ShipmentMapProps) {
  if (!API_KEY) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 bg-[#f4f4f4] p-6 text-center text-sm text-[color:var(--muted-foreground)] ${props.className || ""}`}>
        <MapPinOff className="h-6 w-6" />
        <p className="font-medium text-[color:var(--foreground)]">Map unavailable</p>
        <p>Set <code>VITE_GOOGLE_MAPS_API_KEY</code> (Maps JavaScript API) and rebuild.</p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY}>
      <div className={props.className}>
        <Map
          mapId={MAP_ID}
          defaultCenter={US_CENTER}
          defaultZoom={4}
          gestureHandling="greedy"
          streetViewControl={false}
          mapTypeControl={false}
          fullscreenControl
          style={{ width: "100%", height: "100%" }}
        >
          <MapContents {...props} />
        </Map>
      </div>
    </APIProvider>
  );
}

function MapContents({ shipments, selectedTracking, vehicles = [], onSelect }: ShipmentMapProps) {
  const map = useMap();
  const [openInfo, setOpenInfo] = useState<string | null>(null);

  const selected = useMemo(
    () => shipments.find((item) => item.trackingNumber === selectedTracking) || (shipments.length === 1 ? shipments[0] : null),
    [shipments, selectedTracking]
  );

  // Fit the viewport to the selected shipment, or to everything when nothing is selected.
  const fitKey = selected
    ? `${selected.trackingNumber}|${selected.currentLat}|${selected.currentLng}|${selected.destinationLat}|${selected.originLat}`
    : `all|${shipments.length}`;

  useEffect(() => {
    if (!map) return;
    const bounds = new google.maps.LatLngBounds();
    let count = 0;
    const targets = selected ? [selected] : shipments;
    for (const shipment of targets) {
      const { origin, current, destination } = shipmentPoints(shipment);
      for (const point of [origin, current, destination]) {
        if (point) {
          bounds.extend(point);
          count += 1;
        }
      }
    }
    if (count === 0) return;
    if (count === 1) {
      map.setCenter(bounds.getCenter());
      map.setZoom(9);
    } else {
      map.fitBounds(bounds, 56);
    }
  }, [map, fitKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {shipments.map((shipment) => (
        <ShipmentLayer
          key={shipment.trackingNumber}
          shipment={shipment}
          active={shipment.trackingNumber === selected?.trackingNumber}
          showEndpoints={shipment.trackingNumber === selected?.trackingNumber}
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
  active,
  showEndpoints,
  onSelect,
  infoOpen,
  onCloseInfo
}: {
  shipment: Shipment;
  active: boolean;
  showEndpoints: boolean;
  onSelect: () => void;
  infoOpen: boolean;
  onCloseInfo: () => void;
}) {
  const map = useMap();
  const { origin, current, destination } = shipmentPoints(shipment);
  const delivered = /delivered/i.test(shipment.status);

  useEffect(() => {
    if (!map) return;
    const lines: google.maps.Polyline[] = [];

    // travelled: origin -> current (solid)
    if (origin && current) {
      lines.push(
        new google.maps.Polyline({
          map,
          path: [origin, current],
          strokeColor: "#0f3d5e",
          strokeOpacity: active ? 0.95 : 0.35,
          strokeWeight: active ? 5 : 3,
          geodesic: true
        })
      );
    }

    // remaining: current -> destination (dashed)
    if (current && destination && !delivered) {
      lines.push(
        new google.maps.Polyline({
          map,
          path: [current, destination],
          geodesic: true,
          strokeOpacity: 0,
          icons: [
            {
              icon: { path: "M 0,-1 0,1", strokeOpacity: active ? 0.9 : 0.35, strokeColor: "#f59e0b", scale: active ? 3 : 2 },
              offset: "0",
              repeat: "14px"
            }
          ]
        })
      );
    }

    return () => lines.forEach((line) => line.setMap(null));
  }, [map, origin?.lat, origin?.lng, current?.lat, current?.lng, destination?.lat, destination?.lng, active, delivered]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {showEndpoints && origin ? (
        <AdvancedMarker position={origin} title={`Origin: ${shipment.origin}`}>
          <div className="h-3 w-3 rounded-full border-2 border-white bg-[#0f3d5e] shadow" />
        </AdvancedMarker>
      ) : null}
      {showEndpoints && destination ? (
        <AdvancedMarker position={destination} title={`Destination: ${shipment.destination}`}>
          <div className="h-4 w-4 rotate-45 border-2 border-white bg-[#f59e0b] shadow" />
        </AdvancedMarker>
      ) : null}
      {current ? (
        <AdvancedMarker position={current} title={`${shipment.trackingNumber} · ${shipment.lastLocation}`} onClick={onSelect} zIndex={active ? 10 : 1}>
          <div className="relative flex items-center justify-center">
            {active && !delivered ? <span className="absolute h-8 w-8 animate-ping rounded-full bg-[#f59e0b]/50" /> : null}
            <span
              className={`relative rounded-full border-2 border-white shadow-lg ${active ? "h-5 w-5" : "h-3.5 w-3.5"} ${
                delivered ? "bg-emerald-500" : "bg-[#f59e0b]"
              }`}
            />
          </div>
        </AdvancedMarker>
      ) : null}
      {infoOpen && current ? (
        <InfoWindow position={current} onCloseClick={onCloseInfo} pixelOffset={[0, -14]}>
          <div className="space-y-0.5 text-sm text-[#333]">
            <p className="font-semibold">{shipment.trackingNumber}</p>
            <p>{shipment.lastLocation}</p>
            <p className="text-xs uppercase tracking-wide text-[#6a6a6a]">{shipment.status}</p>
          </div>
        </InfoWindow>
      ) : null}
    </>
  );
}
