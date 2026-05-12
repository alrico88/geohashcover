import type { GeoJSON } from "geojson";
import ngeohash from "ngeohash";

import { ShapeProcessor } from "./core.js";
import { isPoint, extractCoordinatesFromGeoJSON } from "./geo.js";
import type { Shape2geohashOptions } from "./types.js";

const defaultOptions: Shape2geohashOptions = {
  precision: 6,
  hashMode: "intersect",
  minIntersect: 0,
};

/**
 * Converts a GeoJSON shape into an array of intersecting geohashes.
 *
 * @param shapes - GeoJSON object (FeatureCollection, Feature, Polygon,
 * MultiPolygon, LineString, MultiLineString, Point, MultiPoint,
 * GeometryCollection)
 * @param options - Configuration options
 * @param options.precision - Geohash length (default 6)
 * @param options.hashMode - "intersect" | "envelope" | "insideOnly" | "border" (default "intersect")
 * @param options.minIntersect - Minimum overlap fraction 0-1 for edge cells (default 0)
 * @returns Array of geohash strings
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
  const opts = { ...defaultOptions, ...options };

  const allShapes = extractCoordinatesFromGeoJSON(shapes);
  const allGeohashes = new Set<string>();

  for (const shape of allShapes) {
    if (isPoint(shape as unknown[])) {
      allGeohashes.add(
        ngeohash.encode(
          (shape as [number, number])[1],
          (shape as [number, number])[0],
          opts.precision,
        ),
      );
    } else {
      const processor = new ShapeProcessor(shape as unknown[], opts);
      for (const gh of processor.process()) {
        allGeohashes.add(gh);
      }
    }
  }

  return Array.from(allGeohashes);
}
