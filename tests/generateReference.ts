// Regenerates reference-coverage.json: run `vp run fixtures` after changing referenceShapes.ts.
import { writeFileSync } from "node:fs";
import ngeohash from "ngeohash";
import type { Polygon } from "geojson";
import { area } from "@turf/area";
import { bboxPolygon } from "@turf/bbox-polygon";
import { featureCollection, polygon as turfPolygon } from "@turf/helpers";
import { intersect } from "@turf/intersect";

import { referenceCases } from "./referenceShapes.ts";

/** Brute force: clip every cell of the bbox against the polygon with turf. */
function referenceCover(shape: Polygon, precision: number): Record<string, number> {
  const feature = turfPolygon(shape.coordinates);
  const lons = shape.coordinates[0].map((p) => p[0]);
  const lats = shape.coordinates[0].map((p) => p[1]);
  const cells = ngeohash.bboxes(
    Math.min(...lats),
    Math.min(...lons),
    Math.max(...lats),
    Math.max(...lons),
    precision,
  );

  const coverage: Record<string, number> = {};
  for (const hash of cells) {
    const [s, w, n, e] = ngeohash.decode_bbox(hash);
    const cell = bboxPolygon([w, s, e, n]);
    const clipped = intersect(featureCollection([feature, cell]));
    const fraction = clipped ? area(clipped) / area(cell) : 0;
    if (fraction > 1e-9) {
      coverage[hash] = Number(fraction.toFixed(9));
    }
  }
  return coverage;
}

const reference = Object.fromEntries(
  referenceCases.map(({ key, shape, precision }) => [key, referenceCover(shape, precision)]),
);
writeFileSync(
  new URL("./reference-coverage.json", import.meta.url),
  JSON.stringify(reference, null, 2) + "\n",
);
