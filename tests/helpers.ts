import type { Polygon } from "geojson";

import berlin from "./berlin.json" with { type: "json" };

export const berlinPolygon = berlin.fields.geo_shape as Polygon;

export function sorted(hashes: string[]): string[] {
  return [...hashes].sort();
}
