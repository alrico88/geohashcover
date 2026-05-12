import type { Feature, Polygon, GeoJSON } from "geojson";
import { bbox as turfBbox } from "@turf/bbox";
import { lineString as turfLine } from "@turf/helpers";
import { lineSplit as turfLineSplit } from "@turf/line-split";

export function switchBbox(
  bbox: [number, number, number, number],
): [number, number, number, number] {
  const [y1, x1, y2, x2] = bbox;
  return [x1, y1, x2, y2];
}

export function isMulti(coordinates: unknown[]): boolean {
  return Array.isArray((coordinates[0] as any)?.[0]?.[0]);
}

export function isLine(coordinates: unknown[]): boolean {
  return !Array.isArray((coordinates[0] as any)?.[0]);
}

export function isPoint(coordinates: unknown[]): boolean {
  return !Array.isArray(coordinates[0]);
}

export function allRectangleEdgesWithin(
  polygon1: Feature<Polygon>,
  polygon2: Feature<Polygon>,
): boolean {
  const bbox = turfBbox(polygon1) as [number, number, number, number];
  const edge = turfLine([
    [bbox[0], bbox[3]],
    [bbox[2], bbox[3]],
    [bbox[2], bbox[1]],
    [bbox[0], bbox[1]],
    [bbox[0], bbox[3]],
  ]);
  return turfLineSplit(edge, polygon2).features.length === 0;
}

function hasCoordinates(type: string): boolean {
  return [
    "Polygon",
    "MultiPolygon",
    "LineString",
    "MultiLineString",
    "Point",
    "MultiPoint",
  ].includes(type);
}

export function extractCoordinatesFromGeoJSON(geoJSON: GeoJSON): unknown[][] {
  const result: unknown[][] = [];

  if (!geoJSON.type) {
    throw new Error("GeoJSON Error: GeoJSON object is missing type property");
  }

  if (hasCoordinates(geoJSON.type) && !("coordinates" in geoJSON)) {
    throw new Error(`GeoJSON Error: ${geoJSON.type} is missing "coordinates" property`);
  }

  switch (geoJSON.type) {
    case "FeatureCollection":
      for (const f of geoJSON.features) {
        result.push(...extractCoordinatesFromGeoJSON(f));
      }
      break;
    case "GeometryCollection":
      for (const g of geoJSON.geometries) {
        result.push(...extractCoordinatesFromGeoJSON(g));
      }
      break;
    case "Feature":
      if (!geoJSON.geometry) {
        throw new Error("GeoJSON Error: Feature is missing geometry property");
      }
      result.push(...extractCoordinatesFromGeoJSON(geoJSON.geometry));
      break;
    case "Polygon":
      result.push(geoJSON.coordinates as unknown[]);
      break;
    case "MultiPolygon":
      if (!isMulti(geoJSON.coordinates as unknown[][])) {
        throw new Error("GeoJSON Error: MultiPolygon is actually not a MultiPolygon");
      }
      result.push(...(geoJSON.coordinates as unknown[][]));
      break;
    case "LineString":
      result.push(geoJSON.coordinates as unknown[]);
      break;
    case "MultiLineString":
      result.push(...(geoJSON.coordinates as unknown[][]));
      break;
    case "Point":
      result.push(geoJSON.coordinates as unknown[]);
      break;
    case "MultiPoint":
      result.push(...(geoJSON.coordinates as unknown[][]));
      break;
  }

  return result;
}
