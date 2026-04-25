"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { FaSearch, FaTimes } from "react-icons/fa";

const API = "http://localhost:8000";

const TYPE_COLORS: Record<string, string> = {
  depot: "#f4511e",
  hospital: "#e53935",
  clinic: "#8e24aa",
  pharmacy: "#1e88e5",
  lab: "#43a047",
};

const TYPE_SVG: Record<string, string> = {
  depot: `<path d="M504 352H136.4c-4.4 0-8 3.6-8 8l-.1 48c0 4.4 3.6 8 8 8H504c4.4 0 8-3.6 8-8v-48c0-4.4-3.6-8-8-8zm0 96H136.1c-4.4 0-8 3.6-8 8l-.1 48c0 4.4 3.6 8 8 8h368c4.4 0 8-3.6 8-8v-48c0-4.4-3.6-8-8-8zm0-192H136.6c-4.4 0-8 3.6-8 8l-.1 48c0 4.4 3.6 8 8 8H504c4.4 0 8-3.6 8-8v-48c0-4.4-3.6-8-8-8zM60 352H8c-4.4 0-8 3.6-8 8v48c0 4.4 3.6 8 8 8h52c4.4 0 8-3.6 8-8v-48c0-4.4-3.6-8-8-8zm0 96H8c-4.4 0-8 3.6-8 8v48c0 4.4 3.6 8 8 8h52c4.4 0 8-3.6 8-8v-48c0-4.4-3.6-8-8-8zm0-192H8c-4.4 0-8 3.6-8 8v48c0 4.4 3.6 8 8 8h52c4.4 0 8-3.6 8-8v-48c0-4.4-3.6-8-8-8zM510.6 169.4l-238-99.7C268.3 67.9 262.2 64 256 64s-12.3 3.9-16.6 5.7l-238 99.7C.6 169.4 0 176 0 176v16c0 4.4 3.6 8 8 8h16c0 0 0 128 0 128h480V200h16c4.4 0 8-3.6 8-8v-16c0 0-.6-6.6-17.4-6.6zM256 136c13.3 0 24 10.7 24 24s-10.7 24-24 24-24-10.7-24-24 10.7-24 24-24z"/>`,
  hospital: `<path d="M464 0H48C21.49 0 0 21.49 0 48v416c0 26.51 21.49 48 48 48h416c26.51 0 48-21.49 48-48V48c0-26.51-21.49-48-48-48zm-136 344c0 4.418-3.582 8-8 8h-48v48c0 4.418-3.582 8-8 8h-48c-4.418 0-8-3.582-8-8v-48h-48c-4.418 0-8-3.582-8-8v-48c0-4.418 3.582-8 8-8h48v-48c0-4.418 3.582-8 8-8h48c4.418 0 8 3.582 8 8v48h48c4.418 0 8 3.582 8 8v48zm24-208H232v-48c0-4.418-3.582-8-8-8h-48c-4.418 0-8 3.582-8 8v48H48c-4.418 0-8-3.582-8-8V88c0-4.418 3.582-8 8-8h416c4.418 0 8 3.582 8 8v48c0 4.418-3.582 8-8 8z"/>`,
  clinic: `<path d="M496 128H384V16c0-8.8-7.2-16-16-16H144c-8.8 0-16 7.2-16 16v112H16C7.2 128 0 135.2 0 144v352c0 8.8 7.2 16 16 16h480c8.8 0 16-7.2 16-16V144c0-8.8-7.2-16-16-16zM224 384h-64v-64h64v64zm0-128h-64v-64h64v64zm96 128h-64v-64h64v64zm0-128h-64v-64h64v64zm32-160h-32v-32h-64v32h-32V32h128v96zm64 288h-64v-64h64v64zm0-128h-64v-64h64v64z"/>`,
  pharmacy: `<path d="M112 32C50.1 32 0 82.1 0 144v224c0 61.9 50.1 112 112 112s112-50.1 112-112V144c0-61.9-50.1-112-112-112zm48 224H64v-32h96v32zm208-224c-61.9 0-112 50.1-112 112v4.6l119.7 119.7c7.4-18 11.3-37.5 11.3-57.3V144c0-61.9-50.1-112-112-112zm-10.3 200.9L238.9 253.7c.7-3.2 1.1-6.5 1.1-9.7 0-26.5 21.5-48 48-48s48 21.5 48 48c0 26.5-21.5 48-48 48-3.2 0-6.5-.4-9.7-1.1z"/>`,
  lab: `<path d="M492.3 358.2L336 96V32h8c8.8 0 16-7.2 16-16V16c0-8.8-7.2-16-16-16H168c-8.8 0-16 7.2-16 16v.1c0 8.8 7.2 16 16 16h8v64L19.7 358.2C-8.3 406.5 27.1 468 83.6 468h344.8c56.5 0 91.9-61.5 63.9-109.8zM336 384H176l-42.7-64H192l32 32h64l32-32h58.7L336 384z"/>`,
};

function makeFaIcon(type: string, color: string) {
  const path = TYPE_SVG[type] ?? TYPE_SVG["hospital"];
  return L.divIcon({
    className: "",
    html: `<div style="width:30px;height:30px;border-radius:50%;background:white;border:2.5px solid ${color};box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="14" height="14" fill="${color}">${path}</svg>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -18],
  });
}

const truckIcon = L.divIcon({
  className: "",
  html: `<div style="font-size:24px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">🚑</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

interface Props {
  isActive: boolean;
  pendingRoute: number[][] | null;
  onRouteConsumed: () => void;
}

export default function MapTab({
  isActive,
  pendingRoute,
  onRouteConsumed,
}: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const vehicleRef = useRef<L.Marker | null>(null);
  const blockedLinesRef = useRef<L.Polyline[]>([]);
  const coordsRef = useRef<Record<string, [number, number]>>({});
  const nodesLoadedRef = useRef(false);

  const [status, setStatus] = useState("Idle");
  const [search, setSearch] = useState("");
  const [facilities, setFacilities] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);

  // ── Init map once ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      preferCanvas: true, // better performance
    }).setView([4.055, 9.73], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(map);

    mapRef.current = map;

    loadNodes(map).then(() => {
      nodesLoadedRef.current = true;
      // invalidate after nodes load to fix any sizing issues
      map.invalidateSize();
      drawBlockedRoads();
      setInterval(drawBlockedRoads, 5000);
    });

    (window as any).__routeTo = (name: string) => {
      const c = coordsRef.current[name];
      if (c) flyAndRoute(name, c);
    };
  }, []);

  // ── When tab becomes visible, invalidate size so tiles render correctly ────
  useEffect(() => {
    if (!isActive || !mapRef.current) return;
    // slight delay ensures visibility:visible has taken effect
    const t = setTimeout(() => {
      mapRef.current?.invalidateSize({ animate: false });
    }, 100);
    return () => clearTimeout(t);
  }, [isActive]);

  // ── Consume pending route from AppShell ────────────────────────────────────
  useEffect(() => {
    if (!pendingRoute || !isActive || !mapRef.current) return;
    const t = setTimeout(() => {
      drawRouteOnMap(pendingRoute);
      onRouteConsumed();
    }, 400);
    return () => clearTimeout(t);
  }, [pendingRoute, isActive]);

  // ── Search filter ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!search) {
      setFiltered([]);
      return;
    }
    setFiltered(
      facilities.filter((f) =>
        f.name.toLowerCase().includes(search.toLowerCase()),
      ),
    );
  }, [search, facilities]);

  // ── Load nodes ─────────────────────────────────────────────────────────────
  async function loadNodes(map: L.Map) {
    const res = await fetch(`${API}/nodes`);
    const data = await res.json();
    setFacilities(data.nodes.filter((n: any) => n.type !== "depot"));

    data.nodes.forEach(({ name, coords, type, arrondissement }: any) => {
      coordsRef.current[name] = coords;
      const color = TYPE_COLORS[type] ?? "#888";
      const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
      const isDepot = type === "depot";

      L.marker(coords, { icon: makeFaIcon(type, color) })
        .addTo(map)
        .bindPopup(
          `
          <div style="font-family:sans-serif;min-width:160px;">
            <b style="font-size:13px;color:#1e293b;">${name}</b><br/>
            <span style="color:${color};font-size:11px;font-weight:600;">${typeLabel}</span>
            <span style="font-size:11px;color:#94a3b8;"> · ${arrondissement}</span>
            ${
              !isDepot
                ? `<br/><span style="font-size:11px;color:#14b8a6;cursor:pointer;font-weight:500;"
                   onclick="window.__routeTo('${name.replace(/'/g, "\\'")}')">→ Route here</span>`
                : ""
            }
          </div>`,
        )
        .on("click", () => {
          if (!isDepot) flyAndRoute(name, coords);
        });
    });
  }

  function flyAndRoute(name: string, coords: [number, number]) {
    mapRef.current?.flyTo(coords, 15, { duration: 1.2 });
    setTimeout(() => routeTo(name), 1300);
  }

  async function routeTo(destination: string) {
    if (!mapRef.current) return;
    setStatus("Routing…");
    try {
      const res = await fetch(
        `${API}/route/${encodeURIComponent(destination)}`,
      );
      const data = await res.json();
      if (data.error) {
        setStatus("No route found");
        return;
      }
      drawRouteOnMap(data.coords);
    } catch {
      setStatus("Error fetching route");
    }
  }

  function drawRouteOnMap(coords: number[][]) {
    const map = mapRef.current;
    if (!map || !coords?.length) return;

    if (routeLineRef.current) {
      map.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }

    const line = L.polyline(coords as L.LatLngExpression[], {
      color: "#14b8a6",
      weight: 5,
      opacity: 0.9,
    }).addTo(map);
    routeLineRef.current = line;
    map.fitBounds(line.getBounds(), { padding: [60, 60] });

    animateDelivery(coords);
  }

  async function drawBlockedRoads() {
    const map = mapRef.current;
    if (!map || !nodesLoadedRef.current) return;
    try {
      const res = await fetch(`${API}/roads/blocked`);
      const data = await res.json();
      blockedLinesRef.current.forEach((l) => map.removeLayer(l));
      blockedLinesRef.current = [];
      data.blocked.forEach(([from, to]: string[]) => {
        const f = coordsRef.current[from];
        const t = coordsRef.current[to];
        if (!f || !t) return;
        const line = L.polyline([f, t], {
          color: "#ef4444",
          weight: 5,
          dashArray: "8 5",
        })
          .addTo(map)
          .bindPopup(`🚫 Blocked: ${from} → ${to}`);
        blockedLinesRef.current.push(line);
      });
    } catch {}
  }

  function interpolate(s: number[], e: number[], steps = 60) {
    const pts: number[][] = [];
    for (let i = 0; i <= steps; i++)
      pts.push([
        s[0] + (e[0] - s[0]) * (i / steps),
        s[1] + (e[1] - s[1]) * (i / steps),
      ]);
    return pts;
  }

  function animateDelivery(path: number[][]) {
    const map = mapRef.current;
    if (!map || !path?.length) return;

    let smooth: number[][] = [];
    for (let i = 0; i < path.length - 1; i++)
      smooth = smooth.concat(interpolate(path[i], path[i + 1]));

    if (vehicleRef.current) {
      map.removeLayer(vehicleRef.current);
      vehicleRef.current = null;
    }

    const marker = L.marker(smooth[0] as L.LatLngExpression, {
      icon: truckIcon,
    })
      .addTo(map)
      .bindPopup("🚑 En route…")
      .openPopup();
    vehicleRef.current = marker;
    setStatus("Delivering…");

    let i = 0;
    function move() {
      if (!vehicleRef.current) return;
      if (i < smooth.length) {
        marker.setLatLng(smooth[i++] as L.LatLngExpression);
        setTimeout(move, 80);
      } else {
        setStatus("Delivered ✅");
      }
    }
    move();
  }

  function clearRoute() {
    const map = mapRef.current;
    if (!map) return;
    if (routeLineRef.current) {
      map.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }
    if (vehicleRef.current) {
      map.removeLayer(vehicleRef.current);
      vehicleRef.current = null;
    }
    setStatus("Idle");
  }

  const statusColor =
    status === "Delivered ✅"
      ? "#10b981"
      : status === "Delivering…"
        ? "#f59e0b"
        : status === "Idle"
          ? "#94a3b8"
          : "#3b82f6";

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Map container — explicit pixel fill */}
      <div ref={mapContainerRef} style={{ position: "absolute", inset: 0 }} />

      {/* Search */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-80">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search facility…"
            className="w-full pl-8 pr-8 py-2.5 text-xs rounded-xl border-0 outline-none"
            style={{
              background: "white",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              color: "#1e293b",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <FaTimes size={10} />
            </button>
          )}
        </div>
        {filtered.length > 0 && (
          <div
            className="mt-1 rounded-xl overflow-hidden shadow-xl"
            style={{ background: "white", maxHeight: 220, overflowY: "auto" }}
          >
            {filtered.map((f) => (
              <button
                key={f.name}
                onClick={() => {
                  flyAndRoute(f.name, coordsRef.current[f.name]);
                  setSearch("");
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-50 last:border-0"
              >
                <p className="text-xs font-medium text-slate-700">{f.name}</p>
                <p className="text-xs" style={{ color: TYPE_COLORS[f.type] }}>
                  {f.type} · {f.arrondissement}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Status pill */}
      <div className="absolute top-4 right-4 z-[1000]">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium shadow-lg"
          style={{ background: "white", color: statusColor }}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: statusColor }}
          />
          {status}
          {status !== "Idle" && (
            <button onClick={clearRoute} className="ml-1 hover:opacity-70">
              <FaTimes size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div
        className="absolute bottom-6 right-4 z-[1000] rounded-xl px-4 py-3 text-xs shadow-lg"
        style={{ background: "white" }}
      >
        <p className="font-semibold mb-2 text-slate-600">Facility types</p>
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2 mb-1">
            <div
              className="w-3 h-3 rounded-full border-2"
              style={{ borderColor: color, background: "white" }}
            />
            <span className="capitalize text-slate-500">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
