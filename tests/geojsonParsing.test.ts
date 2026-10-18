import { describe, test, expect } from "vite-plus/test";
import type { Polygon } from "geojson";

import { extractCoordinatesFromGeoJSON } from "../src/geo.ts";
import * as geojsonExamples from "./geojsonExamples.ts";

describe("Test GeoJSON parsing", () => {
  test("Type: FeatureCollection", () => {
    const fc = geojsonExamples.FeatureCollection();
    const a = extractCoordinatesFromGeoJSON(fc);
    const b = [];
    for (const feature of fc.features) {
      b.push(feature.geometry);
    }
    expect(a).toHaveLength(b.length);
  });

  test("Type: Feature", () => {
    const f = geojsonExamples.Feature();
    const a = extractCoordinatesFromGeoJSON(f);
    expect(a).toHaveLength(1);
    expect(a[0]).toBe((f.geometry as Polygon).coordinates);
  });

  test("Type: Polygon", () => {
    const p = geojsonExamples.Polygon();
    const a = extractCoordinatesFromGeoJSON(p);
    expect(a).toHaveLength(1);
    expect(a[0]).toBe(p.coordinates);
  });

  test("Type: MultiPolygon", () => {
    const mp = geojsonExamples.MultiPolygon();
    const a = extractCoordinatesFromGeoJSON(mp);
    expect(a).toHaveLength(mp.coordinates.length);
  });

  test("Type: LineString", () => {
    const ls = geojsonExamples.LineString();
    const a = extractCoordinatesFromGeoJSON(ls);
    expect(a).toHaveLength(1);
    expect(a[0]).toBe(ls.coordinates);
  });

  test("Type: MultiLineString", () => {
    const mls = geojsonExamples.MultiLineString();
    const a = extractCoordinatesFromGeoJSON(mls);
    expect(a).toHaveLength(mls.coordinates.length);
  });

  test("Type: Point", () => {
    const pt = geojsonExamples.Point();
    const a = extractCoordinatesFromGeoJSON(pt);
    expect(a).toHaveLength(1);
    expect(a[0]).toBe(pt.coordinates);
  });

  test("Type: MultiPoint", () => {
    const mp = geojsonExamples.MultiPoint();
    const a = extractCoordinatesFromGeoJSON(mp);
    expect(a).toHaveLength(mp.coordinates.length);
  });

  test("Type: GeometryCollection", () => {
    const gc = geojsonExamples.GeometryCollection();
    const a = extractCoordinatesFromGeoJSON(gc);
    expect(a).toHaveLength(2);
  });
});

describe("Test GeoJSON parsing errors", () => {
  test("Missing type", () => {
    const p = geojsonExamples.Polygon();
    Reflect.deleteProperty(p, "type");
    expect(() => extractCoordinatesFromGeoJSON(p)).toThrowError("missing type property");
  });

  test.each([
    ["Polygon", geojsonExamples.Polygon],
    ["MultiPolygon", geojsonExamples.MultiPolygon],
    ["LineString", geojsonExamples.LineString],
    ["MultiLineString", geojsonExamples.MultiLineString],
    ["Point", geojsonExamples.Point],
    ["MultiPoint", geojsonExamples.MultiPoint],
  ] as const)("Missing coordinates (%s)", (type, create) => {
    const geometry = create();
    Reflect.deleteProperty(geometry, "coordinates");
    expect(() => extractCoordinatesFromGeoJSON(geometry)).toThrowError(
      `${type} is missing "coordinates" property`,
    );
  });

  test("Missing geometry", () => {
    const f = geojsonExamples.Feature();
    Reflect.deleteProperty(f, "geometry");
    expect(() => extractCoordinatesFromGeoJSON(f)).toThrowError(
      "Feature is missing geometry property",
    );
  });

  test("Non-Multi MultiPolygon", () => {
    const wrong = geojsonExamples.wrongMultiPolygon();
    expect(() => extractCoordinatesFromGeoJSON(wrong)).toThrowError(
      "MultiPolygon is actually not a MultiPolygon",
    );
  });
});
