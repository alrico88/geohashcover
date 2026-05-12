import { describe, test, expect } from "vite-plus/test";

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
    expect(a.length).toBe(b.length);
  });

  test("Type: Feature", () => {
    const f = geojsonExamples.Feature();
    const a = extractCoordinatesFromGeoJSON(f);
    expect(a.length).toBe(1);
    expect(a[0]).toBe((f.geometry as any).coordinates);
  });

  test("Type: Polygon", () => {
    const p = geojsonExamples.Polygon();
    const a = extractCoordinatesFromGeoJSON(p);
    expect(a.length).toBe(1);
    expect(a[0]).toBe(p.coordinates);
  });

  test("Type: MultiPolygon", () => {
    const mp = geojsonExamples.MultiPolygon();
    const a = extractCoordinatesFromGeoJSON(mp);
    expect(a.length).toBe(mp.coordinates.length);
  });

  test("Type: LineString", () => {
    const ls = geojsonExamples.LineString();
    const a = extractCoordinatesFromGeoJSON(ls);
    expect(a.length).toBe(1);
    expect(a[0]).toBe(ls.coordinates);
  });

  test("Type: MultiLineString", () => {
    const mls = geojsonExamples.MultiLineString();
    const a = extractCoordinatesFromGeoJSON(mls);
    expect(a.length).toBe(mls.coordinates.length);
  });

  test("Type: Point", () => {
    const pt = geojsonExamples.Point();
    const a = extractCoordinatesFromGeoJSON(pt);
    expect(a.length).toBe(1);
    expect(a[0]).toBe(pt.coordinates);
  });

  test("Type: MultiPoint", () => {
    const mp = geojsonExamples.MultiPoint();
    const a = extractCoordinatesFromGeoJSON(mp);
    expect(a.length).toBe(mp.coordinates.length);
  });

  test("Type: GeometryCollection", () => {
    const gc = geojsonExamples.GeometryCollection();
    const a = extractCoordinatesFromGeoJSON(gc);
    expect(a.length).toBe(2);
  });
});

describe("Test GeoJSON parsing errors", () => {
  test("Missing type", () => {
    const p = geojsonExamples.Polygon();
    delete (p as any).type;
    expect(() => extractCoordinatesFromGeoJSON(p)).toThrowError();
  });

  test("Missing coordinates (Polygon)", () => {
    const p = geojsonExamples.Polygon();
    delete (p as any).coordinates;
    expect(() => extractCoordinatesFromGeoJSON(p)).toThrowError();
  });

  test("Missing coordinates (MultiPolygon)", () => {
    const mp = geojsonExamples.MultiPolygon();
    delete (mp as any).coordinates;
    expect(() => extractCoordinatesFromGeoJSON(mp)).toThrowError();
  });

  test("Missing coordinates (LineString)", () => {
    const ls = geojsonExamples.LineString();
    delete (ls as any).coordinates;
    expect(() => extractCoordinatesFromGeoJSON(ls)).toThrowError();
  });

  test("Missing coordinates (MultiLineString)", () => {
    const mls = geojsonExamples.MultiLineString();
    delete (mls as any).coordinates;
    expect(() => extractCoordinatesFromGeoJSON(mls)).toThrowError();
  });

  test("Missing coordinates (Point)", () => {
    const pt = geojsonExamples.Point();
    delete (pt as any).coordinates;
    expect(() => extractCoordinatesFromGeoJSON(pt)).toThrowError();
  });

  test("Missing coordinates (MultiPoint)", () => {
    const mp = geojsonExamples.MultiPoint();
    delete (mp as any).coordinates;
    expect(() => extractCoordinatesFromGeoJSON(mp)).toThrowError();
  });

  test("Missing geometry", () => {
    const f = geojsonExamples.Feature();
    delete (f as any).geometry;
    expect(() => extractCoordinatesFromGeoJSON(f)).toThrowError();
  });

  test("Non-Multi MultiPolygon", () => {
    const wrong = geojsonExamples.wrongMultiPolygon();
    expect(() => extractCoordinatesFromGeoJSON(wrong)).toThrowError();
  });
});
