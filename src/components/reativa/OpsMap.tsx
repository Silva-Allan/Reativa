import "leaflet/dist/leaflet.css";
import { MapContainer, Polygon, Polyline, CircleMarker, Tooltip, Popup, TileLayer, useMap } from "react-leaflet";
import { CITY_CENTER, off, type LatLng } from "@/mock/data";

import { type ReactNode } from "react";
import { useApp } from "@/store/app";
import { mc } from "./mapColors";

const CARTO_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

// CARTO no-labels basemap: the city is fictional, so real place names must not appear on the tiles.
function Basemap() {
  const map = useMap();
  const dark = Boolean(map.getContainer().closest(".dark"));
  const style = dark ? "dark_nolabels" : "light_nolabels";
  return <TileLayer key={style} url={`https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png`} subdomains="abcd" maxZoom={20} attribution={CARTO_ATTRIBUTION} />;
}

export interface MapLayer {
  polygons?: { positions: LatLng[]; color: string; fill?: number; dashed?: boolean; label?: string; popup?: ReactNode }[];
  lines?: { positions: LatLng[]; color: string; weight?: number; dashed?: boolean; label?: string }[];
  points?: { pos: LatLng; color: string; label: string; radius?: number; square?: boolean }[];
}


export default function OpsMap({ layers, zoom = 14, center = CITY_CENTER }: { layers: MapLayer; zoom?: number | undefined; center?: LatLng | undefined }) {
  const extent = useApp((s) => s.floodExtent);
  return (
    <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
      <Basemap />
      <Polygon positions={extent} pathOptions={{ color: mc.blue(), weight: 1, fillOpacity: 0.12 }}><Tooltip sticky>Mancha de alagamento</Tooltip></Polygon>
      {[{ pos: off(-1250, 140), label: "Ribeirinho" }, { pos: off(470, -100), label: "Ponte Velha" }, { pos: off(1550, -780), label: "Jardim das Águas" }, { pos: off(-2200, -280), label: "Rio Sereno" }].map((l) => <CircleMarker key={l.label} center={l.pos} radius={0} opacity={0}><Tooltip permanent direction="center" className="city-label">{l.label}</Tooltip></CircleMarker>)}
      {layers.polygons?.map((p, i) => (
        <Polygon key={`pg${i}`} positions={p.positions} pathOptions={{ color: p.color, weight: 1.5, fillOpacity: p.fill ?? 0.15, dashArray: p.dashed ? "6 4" : undefined }}>
          {p.label && <Tooltip sticky>{p.label}</Tooltip>}
          {p.popup && <Popup maxWidth={300}>{p.popup}</Popup>}
        </Polygon>
      ))}
      {layers.lines?.map((l, i) => (
        <Polyline key={`ln${i}`} positions={l.positions} pathOptions={{ color: l.color, weight: l.weight ?? 4, dashArray: l.dashed ? "8 6" : undefined, opacity: 0.9 }}>
          {l.label && <Tooltip sticky>{l.label}</Tooltip>}
        </Polyline>
      ))}
      {layers.points?.map((p, i) => (
        <CircleMarker key={`pt${i}`} center={p.pos} radius={p.radius ?? 6} pathOptions={{ color: mc.paper(), weight: 1.5, fillColor: p.color, fillOpacity: 1 }}>
          <Tooltip>{p.label}</Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
