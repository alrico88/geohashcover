import { describe, test, expect } from "vite-plus/test";
import ngeohash from "ngeohash";
import type { Point, Polygon } from "geojson";

import { toGeohashes } from "../src/index.ts";
import { sorted } from "./helpers.ts";
import reference from "./reference-coverage.json" with { type: "json" };
import { referenceCases } from "./referenceShapes.ts";

function select(coverage: Record<string, number>, keep: (fraction: number) => boolean): string[] {
  return Object.entries(coverage)
    .filter(([, fraction]) => keep(fraction))
    .map(([hash]) => hash);
}

// Expected coverage comes from clipping every cell with turf (see generateReference.ts).
describe.each(referenceCases)("$key matches brute-force clipping", ({ key, shape, precision }) => {
  const coverage: Record<string, number> = (reference as Record<string, Record<string, number>>)[
    key
  ];

  test("intersect", () => {
    expect(sorted(toGeohashes(shape, { precision }))).toEqual(sorted(Object.keys(coverage)));
  });

  test("insideOnly", () => {
    expect(sorted(toGeohashes(shape, { precision, hashMode: "insideOnly" }))).toEqual(
      sorted(select(coverage, (f) => f > 1 - 1e-6)),
    );
  });

  test("border", () => {
    expect(sorted(toGeohashes(shape, { precision, hashMode: "border" }))).toEqual(
      sorted(select(coverage, (f) => f <= 1 - 1e-6)),
    );
  });

  test("minIntersect 0.4", () => {
    expect(sorted(toGeohashes(shape, { precision, minIntersect: 0.4 }))).toEqual(
      sorted(select(coverage, (f) => f >= 0.4)),
    );
  });
});

describe("Regressions", () => {
  test("polygon inside a single cell is not dropped", () => {
    const tiny: Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [0.1, 0.05],
          [0.2, 0.05],
          [0.2, 0.1],
          [0.1, 0.1],
          [0.1, 0.05],
        ],
      ],
    };
    expect(toGeohashes(tiny, { precision: 4 })).toEqual(["s000"]);
    expect(toGeohashes(tiny, { precision: 4, hashMode: "border" })).toEqual(["s000"]);
  });

  test("a cell containing a hole is not insideOnly", () => {
    const holed: Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [-1, -1],
          [2, -1],
          [2, 2],
          [-1, 2],
          [-1, -1],
        ],
        [
          [0.1, 0.05],
          [0.1, 0.1],
          [0.2, 0.1],
          [0.2, 0.05],
          [0.1, 0.05],
        ],
      ],
    };
    expect(toGeohashes(holed, { precision: 4, hashMode: "insideOnly" })).not.toContain("s000");
    expect(toGeohashes(holed, { precision: 4, hashMode: "border" })).toContain("s000");
  });

  test("minIntersect is a fraction of each cell, whatever its latitude", () => {
    // Every precision-3 cell is exactly half covered.
    const half: Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [0.703125, 0],
          [0.703125, 70.3125],
          [0, 70.3125],
          [0, 0],
        ],
      ],
    };
    expect(toGeohashes(half, { precision: 3, minIntersect: 0.6 })).toEqual([]);
    expect(toGeohashes(half, { precision: 3, minIntersect: 0.5 })).toHaveLength(50);
  });

  test("lines keep every cell at high precision", () => {
    const [lat0, lon0, lat1, lon1] = [52.5, 13.4, 52.5, 13.40005];
    const hashes = toGeohashes(
      {
        type: "LineString",
        coordinates: [
          [lon0, lat0],
          [lon1, lat1],
        ],
      },
      { precision: 11 },
    );
    expect(sorted(hashes)).toEqual(sorted(ngeohash.bboxes(lat0, lon0, lat1, lon1, 11)));
  });

  test("explicit undefined options fall back to defaults", () => {
    const point: Point = { type: "Point", coordinates: [13.32165, 52.5125] };
    expect(toGeohashes(point, { precision: undefined })).toEqual(["u336xp"]);
  });

  test("invalid options throw", () => {
    const point: Point = { type: "Point", coordinates: [0, 0] };
    expect(() => toGeohashes(point, { precision: 0 })).toThrow(RangeError);
    expect(() => toGeohashes(point, { precision: 4.5 })).toThrow(RangeError);
    expect(() => toGeohashes(point, { minIntersect: 2 })).toThrow(RangeError);
    // @ts-expect-error invalid hashMode on purpose
    expect(() => toGeohashes(point, { hashMode: "nope" })).toThrow(RangeError);
  });
});
