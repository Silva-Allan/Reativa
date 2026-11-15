import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";
import type { MapLayer } from "./OpsMap";
import type { LatLng } from "@/mock/data";

const OpsMap = lazy(() => import("./OpsMap"));
export type { MapLayer };

export function LazyMap({ layers, className = "h-[420px]", zoom, center }: { layers: () => MapLayer; className?: string; zoom?: number | undefined; center?: LatLng | undefined }) {
  const fallback = <div className="h-full w-full animate-pulse bg-muted" />;
  return (
    <div className={`overflow-hidden rounded-lg border bg-muted ${className}`}>
      <ClientOnly fallback={fallback}>
        <Suspense fallback={fallback}>
          <OpsMap layers={layers()} zoom={zoom} center={center} />
        </Suspense>
      </ClientOnly>
    </div>
  );
}
