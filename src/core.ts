import type { Feature, Polygon, LineString, MultiPolygon } from "geojson";
import { bbox as turfBbox } from "@turf/bbox";
import { bboxPolygon as turfBboxPolygon } from "@turf/bbox-polygon";
import { booleanOverlap as turfBooleanOverlap } from "@turf/boolean-overlap";
import { booleanPointInPolygon as turfBooleanPointInPolygon } from "@turf/boolean-point-in-polygon";
import { booleanWithin as turfBooleanWithin } from "@turf/boolean-within";
import { envelope as turfEnvelope } from "@turf/envelope";
import { polygon as turfPolygon, lineString as turfLine, featureCollection } from "@turf/helpers";
import { intersect as turfIntersect } from "@turf/intersect";
import { lineSplit as turfLineSplit } from "@turf/line-split";
import { area as turfArea } from "@turf/area";
import ngeohash from "ngeohash";

import { isPoint, switchBbox, isLine, allRectangleEdgesWithin } from "./geo.js";
import type { Shape2geohashOptions } from "./types.js";

export class ShapeProcessor {
  private options: Shape2geohashOptions;
  private shapeIsPoint = false;
  private pointCoordinates: [number, number] = [0, 0];
  private originalShape: Feature<Polygon | LineString> | null = null;
  private rowWidth = 0;
  private geohashHeight = 0;
  private currentPoint: [number, number] = [0, 0];
  private bottomLimit = 0;
  private minIntersectArea = 0;
  private rowProgress = -Infinity;
  private accGeohashes = new Set<string>();

  constructor(shapeCoordinates: unknown[], options: Shape2geohashOptions) {
    this.options = options;

    this.shapeIsPoint = isPoint(shapeCoordinates);
    if (this.shapeIsPoint) {
      this.pointCoordinates = shapeCoordinates as [number, number];
      return;
    }

    this.originalShape = isLine(shapeCoordinates as unknown[][])
      ? turfLine(shapeCoordinates as [number, number][])
      : turfPolygon(shapeCoordinates as [number, number][][]);

    const originalEnvelopeBbox = turfBbox(this.originalShape) as [number, number, number, number];

    const topLeftHash = ngeohash.encode(
      originalEnvelopeBbox[3],
      originalEnvelopeBbox[0],
      this.options.precision,
    );
    const topLeftBbox = switchBbox(ngeohash.decode_bbox(topLeftHash));

    const bottomRightHash = ngeohash.encode(
      originalEnvelopeBbox[1],
      originalEnvelopeBbox[2],
      this.options.precision,
    );
    const bottomRightBbox = switchBbox(ngeohash.decode_bbox(bottomRightHash));

    const geohashEnvelopeBbox: [number, number, number, number] = [
      topLeftBbox[0],
      bottomRightBbox[1],
      bottomRightBbox[2],
      topLeftBbox[3],
    ];

    this.rowWidth = Math.abs(geohashEnvelopeBbox[2] - geohashEnvelopeBbox[0]);
    this.geohashHeight = Math.abs(topLeftBbox[3] - topLeftBbox[1]);

    this.currentPoint = [geohashEnvelopeBbox[0], geohashEnvelopeBbox[3]];
    this.bottomLimit = geohashEnvelopeBbox[1];

    this.minIntersectArea = this.options.minIntersect! * turfArea(turfBboxPolygon(topLeftBbox));
  }

  process(): string[] {
    if (this.shapeIsPoint) {
      return [
        ngeohash.encode(this.pointCoordinates[1], this.pointCoordinates[0], this.options.precision),
      ];
    }

    let rowGeohashes: string[] | null;
    while ((rowGeohashes = this.processNextRow()) !== null) {
      for (const gh of rowGeohashes) {
        this.accGeohashes.add(gh);
      }
    }
    return Array.from(this.accGeohashes);
  }

  private processNextRow(): string[] | null {
    if (this.currentPoint[1] <= this.bottomLimit) {
      return null;
    }

    const rowPolygon = turfBboxPolygon([
      this.currentPoint[0],
      this.currentPoint[1] - this.geohashHeight,
      this.currentPoint[0] + this.rowWidth,
      this.currentPoint[1],
    ]);

    const geohashes: string[] = [];

    if (this.options.hashMode === "envelope") {
      geohashes.push(
        ...this.processRowSegment(rowPolygon.geometry.coordinates as [number, number][][]),
      );
    } else if (this.originalShape!.geometry.type === "LineString") {
      const lineSegments = turfLineSplit(
        this.originalShape as Feature<LineString>,
        rowPolygon,
      ).features;

      if (lineSegments.length === 0) {
        lineSegments.push(this.originalShape as Feature<LineString>);
      }

      const firstPoint = lineSegments[0].geometry.coordinates[0];
      const evenPairs = turfBooleanPointInPolygon(firstPoint, rowPolygon);

      for (let i = evenPairs ? 0 : 1; i < lineSegments.length; i += 2) {
        const lsEnvelope = turfEnvelope(lineSegments[i]).geometry.coordinates as [
          number,
          number,
        ][][];
        geohashes.push(...this.processRowSegment(lsEnvelope));
      }
    } else {
      const intersectionGeoJSON = turfIntersect(
        featureCollection([this.originalShape as Feature<Polygon>, rowPolygon]),
      );
      if (intersectionGeoJSON !== null) {
        let coordinates: unknown = intersectionGeoJSON.geometry.coordinates;
        if (intersectionGeoJSON.geometry.type === "Polygon") {
          coordinates = [coordinates];
        }
        for (const polygon of coordinates as [number, number][][][]) {
          geohashes.push(...this.processRowSegment(polygon));
        }
      }
    }

    this.currentPoint[1] -= this.geohashHeight;
    this.rowProgress = -Infinity;
    return geohashes;
  }

  private processRowSegment(coordinates: [number, number][][]): string[] {
    const segmentPolygon = turfPolygon(coordinates);
    const envelopeBbox = turfBbox(segmentPolygon) as [number, number, number, number];

    const startingGeohash = ngeohash.encode(
      envelopeBbox[3],
      Math.max(this.rowProgress, envelopeBbox[0] + 0.00001),
      this.options.precision,
    );

    const geohashList: string[] = [];
    let currentGeohash: string | null = startingGeohash;

    while (currentGeohash !== null) {
      const ghBbox = switchBbox(ngeohash.decode_bbox(currentGeohash));
      const geohashPolygon = turfBboxPolygon(ghBbox);

      let addGeohash = false;

      if (this.originalShape!.geometry.type === "LineString") {
        addGeohash = true;
      } else {
        switch (this.options.hashMode) {
          case "intersect":
            addGeohash = turfBooleanOverlap(segmentPolygon, geohashPolygon);
            if (addGeohash && this.options.minIntersect! > 0) {
              const intersection = turfIntersect(
                featureCollection([this.originalShape as Feature<Polygon>, geohashPolygon]),
              );
              addGeohash = intersection !== null && turfArea(intersection) >= this.minIntersectArea;
            }
            break;
          case "envelope":
            addGeohash = true;
            break;
          case "insideOnly":
            addGeohash =
              turfBooleanWithin(
                geohashPolygon,
                this.originalShape as Feature<Polygon | MultiPolygon>,
              ) && allRectangleEdgesWithin(geohashPolygon, this.originalShape as Feature<Polygon>);
            break;
          case "border":
            addGeohash =
              turfBooleanOverlap(segmentPolygon, geohashPolygon) &&
              !turfBooleanWithin(
                geohashPolygon,
                this.originalShape as Feature<Polygon | MultiPolygon>,
              );
            break;
        }
      }

      if (addGeohash) {
        geohashList.push(currentGeohash);
      }

      const ghBboxResult = turfBbox(geohashPolygon) as [number, number, number, number];
      this.rowProgress = ghBboxResult[2] + 0.00001;

      const maxX = geohashPolygon.bbox![2] as number;
      if (maxX >= envelopeBbox[2]) {
        currentGeohash = null;
        break;
      }

      currentGeohash = ngeohash.neighbor(currentGeohash, [0, 1]);
    }

    return geohashList;
  }
}
