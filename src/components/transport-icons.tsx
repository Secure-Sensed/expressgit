import type { SVGProps } from "react";

import type { TransportMode } from "@/types";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 24, ...rest }: IconProps) {
  return { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true, ...rest } as SVGProps<SVGSVGElement>;
}

// Top-down aircraft, nose pointing up (north). Rotate it by the heading.
export function PlaneIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        fill="currentColor"
        d="M12 1.6c.9 0 1.5 1 1.5 2.3v5.1l8.4 5v2.1l-8.4-2.4v4.6l2.3 1.8v1.7L12 20.9l-3.8 1v-1.7l2.3-1.8v-4.6l-8.4 2.4V14l8.4-5V3.9c0-1.3.6-2.300 1.500-2.300z"
      />
    </svg>
  );
}

export function TruckIcon(props: IconProps) {
  return (
    <svg {...base(props)} stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 6.5h11v9h-11z" />
      <path d="M13.5 9.5h4l3 3.2v2.800h-7z" />
      <circle cx="7" cy="17.500" r="1.900" fill="currentColor" stroke="none" />
      <circle cx="17" cy="17.500" r="1.900" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ShipIcon(props: IconProps) {
  return (
    <svg {...base(props)} stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 15.500l1.600 3.500h14.800L21 15.500z" />
      <path d="M6 15.500V11h12v4.500" />
      <path d="M9 11V7.500h6V11" />
      <path d="M12 4v3.500" />
    </svg>
  );
}

export function ParcelIcon(props: IconProps) {
  return (
    <svg {...base(props)} stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l8 4.200v9.600L12 21l-8-4.200V7.200z" />
      <path d="M4 7.200l8 4.300 8-4.300" />
      <path d="M12 11.500V21" />
      <path d="M8 5.100l8 4.300" />
    </svg>
  );
}

export function RouteIcon(props: IconProps) {
  return (
    <svg {...base(props)} stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5.500" cy="18" r="2" />
      <circle cx="18.500" cy="6" r="2" />
      <path d="M7.500 18h6.500a3.500 3.500 0 000-7h-4a3.500 3.500 0 010-7H16.500" />
    </svg>
  );
}

export function CustomsIcon(props: IconProps) {
  return (
    <svg {...base(props)} stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v5.500c0 4.300-2.900 7.600-7 9.500-4.100-1.900-7-5.200-7-9.500V6z" />
      <path d="M9 12l2.200 2.200L15.500 10" />
    </svg>
  );
}

export const MODE_META: Record<
  TransportMode,
  { label: string; short: string; color: string; Icon: (props: IconProps) => React.ReactElement; rotates: boolean }
> = {
  air: { label: "Air freight", short: "Air", color: "#0f3d5e", Icon: PlaneIcon, rotates: true },
  express: { label: "Express air", short: "Express", color: "#d97706", Icon: PlaneIcon, rotates: true },
  ground: { label: "Road freight", short: "Road", color: "#0f766e", Icon: TruckIcon, rotates: false },
  sea: { label: "Ocean freight", short: "Sea", color: "#1d4ed8", Icon: ShipIcon, rotates: false }
};

export function modeMeta(mode?: TransportMode | null) {
  return MODE_META[mode || "ground"] || MODE_META.ground;
}
