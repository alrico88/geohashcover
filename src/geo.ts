import type { GeoJSON } from "geojson";

export function isMulti(coordinates: unknown[]): boolean {
  return Array.isArray((coordinates[0] as any)?.[0]?.[0]);
}

export function isLine(coordinates: unknown[]): boolean {
  return !Array.isArray((coordinates[0] as any)?.[0]);
}

export function isPoint(coordinates: unknown[]): boolean {
  return !Array.isArray(coordinates[0]);
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
