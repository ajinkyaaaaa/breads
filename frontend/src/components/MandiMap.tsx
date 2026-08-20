import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MandiMap.css';
import type { Mandi } from '../data/types';

export interface RouteInfo {
  distanceKm: number;
  durationMin: number;
}

interface MandiMapProps {
  pointA: Mandi;
  pointB: Mandi;
  onRouteChange?: (route: RouteInfo | null) => void;
}

// Dark CARTO basemap instead of default OSM tiles -- a bright map would read
// as a foreign rectangle dropped into this near-black UI. No API key needed.
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>';

// Free public OSRM demo instance -- driving directions with no API key.
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

const POINT_A_COLOR = '#FFFFFF';
const POINT_B_COLOR = '#39FF14';

function dotIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<span class="mandi-map-dot" style="--dot-color:${color}"></span>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

export function MandiMap({ pointA, pointB, onRouteChange }: MandiMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Held in a ref so the map-lifecycle effect below doesn't need this in its
  // dependency array -- callers typically pass a fresh inline function each
  // render, which would otherwise tear down and rebuild the map every time.
  const onRouteChangeRef = useRef(onRouteChange);
  useEffect(() => {
    onRouteChangeRef.current = onRouteChange;
  });

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true });
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19, subdomains: 'abcd' }).addTo(map);

    const hasA = typeof pointA.lat === 'number' && typeof pointA.lon === 'number';
    const hasB = typeof pointB.lat === 'number' && typeof pointB.lon === 'number';
    const points: [number, number][] = [];

    if (hasA) {
      const p: [number, number] = [pointA.lat as number, pointA.lon as number];
      L.marker(p, { icon: dotIcon(POINT_A_COLOR) })
        .addTo(map)
        .bindTooltip(pointA.name, {
          permanent: true,
          direction: 'top',
          offset: [0, -8],
          className: 'mandi-map-tooltip mandi-map-tooltip--a',
        });
      points.push(p);
    }
    if (hasB) {
      const p: [number, number] = [pointB.lat as number, pointB.lon as number];
      L.marker(p, { icon: dotIcon(POINT_B_COLOR) })
        .addTo(map)
        .bindTooltip(pointB.name, {
          permanent: true,
          direction: 'top',
          offset: [0, -8],
          className: 'mandi-map-tooltip mandi-map-tooltip--b',
        });
      points.push(p);
    }

    if (points.length === 2) {
      map.fitBounds(L.latLngBounds(points), { padding: [36, 36] });
    } else if (points.length === 1) {
      map.setView(points[0], 9);
    }

    onRouteChangeRef.current?.(null);

    // Draw the actual driving route (not just a straight line) and report its
    // real distance/duration back up, when both ends are geocoded.
    if (hasA && hasB) {
      const url = `${OSRM_URL}/${pointA.lon},${pointA.lat};${pointB.lon},${pointB.lat}?overview=full&geometries=geojson`;
      fetch(url)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (cancelled) return;
          const route = data?.routes?.[0];
          if (!route) {
            onRouteChangeRef.current?.(null);
            return;
          }
          const coords: [number, number][] = route.geometry.coordinates.map(([lon, lat]: [number, number]) => [lat, lon]);
          L.polyline(coords, { color: '#D9CFB8', weight: 3, opacity: 0.55, dashArray: '1 7', lineCap: 'round' }).addTo(map);
          map.fitBounds(L.latLngBounds(coords), { padding: [36, 36] });
          onRouteChangeRef.current?.({ distanceKm: route.distance / 1000, durationMin: route.duration / 60 });
        })
        .catch(() => {
          if (!cancelled) onRouteChangeRef.current?.(null);
        });
    }

    // The container is sized by flex layout, so it reports zero height at the
    // instant Leaflet measures it on construction -- re-measure once painted.
    const raf = requestAnimationFrame(() => map.invalidateSize());

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      map.remove();
    };
  }, [pointA.code, pointA.lat, pointA.lon, pointA.name, pointB.code, pointB.lat, pointB.lon, pointB.name]);

  return <div ref={containerRef} className="h-full w-full" />;
}
