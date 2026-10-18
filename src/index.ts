import type { GeoJSON } from "geojson";

import { resolveOptions, shapeToGeohashes } from "./core.js";
import { extractCoordinatesFromGeoJSON } from "./geo.js";
import { createGrid } from "./grid.js";
import type { Shape2geohashOptions } from "./types.js";

export type { HashMode, Shape2geohashOptions } from "./types.js";

/**
 * Converts a GeoJSON shape into an array of intersecting geohashes.
 *
 * @param shapes - GeoJSON object (FeatureCollection, Feature, Polygon,
 * MultiPolygon, LineString, MultiLineString, Point, MultiPoint,
 * GeometryCollection)
 * @param options - Configuration options
 * @param options.precision - Geohash length, 1-12 (default 6)
 * @param options.hashMode - "intersect" | "envelope" | "insideOnly" | "border" (default "intersect")
 * @param options.minIntersect - Minimum covered fraction 0-1 of each cell, "intersect" only (default 0)
 * @returns Array of geohash strings
 * @throws {RangeError} If an option is out of range
 * @throws {Error} If the GeoJSON is malformed
 *
 * @example
 * ```ts
 * const hashes = toGeohashes({
 *   type: "Polygon",
 *   coordinates: [[[13.0, 52.5], [13.3, 52.5], [13.3, 52.2], [13.0, 52.2], [13.0, 52.5]]],
 * });
 * ```
 */
export function toGeohashes(shapes: GeoJSON, options: Shape2geohashOptions = {}): string[] {
  const opts = resolveOptions(options);
  const grid = createGrid(opts.precision);

  const allShapes = extractCoordinatesFromGeoJSON(shapes);
  const allGeohashes = new Set<string>();

  for (const shape of allShapes) {
    for (const gh of shapeToGeohashes(shape, opts, grid)) {
      allGeohashes.add(gh);
    }
  }

  return Array.from(allGeohashes);
}
