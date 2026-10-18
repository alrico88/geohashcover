import { calcDomain } from "math-helper-functions";
import ngeohash from "ngeohash";

import { isPoint, isLine } from "./geo.js";
import { cellHash, columnAt, createGrid, gridX, gridY, rowAt } from "./grid.js";
import type { GeohashGrid } from "./grid.js";
import { lineCells, polygonCoverage } from "./scanline.js";
import type { CellVisitor, Position } from "./scanline.js";
import type { HashMode, Shape2geohashOptions } from "./types.js";

export interface ResolvedOptions {
  precision: number;
  hashMode: HashMode;
  minIntersect: number;
}

const hashModes: readonly HashMode[] = ["intersect", "envelope", "insideOnly", "border"];

export function resolveOptions(options: Shape2geohashOptions = {}): ResolvedOptions {
  const precision = options.precision ?? 6;
  const hashMode = options.hashMode ?? "intersect";
  const minIntersect = options.minIntersect ?? 0;

  if (!Number.isInteger(precision) || precision < 1 || precision > 12) {
    throw new RangeError(`precision must be an integer between 1 and 12, got ${precision}`);
  }
  if (!hashModes.includes(hashMode)) {
    throw new RangeError(`hashMode must be one of ${hashModes.join(", ")}, got ${hashMode}`);
  }
  if (!(minIntersect >= 0 && minIntersect <= 1)) {
    throw new RangeError(`minIntersect must be between 0 and 1, got ${minIntersect}`);
  }

  return { precision, hashMode, minIntersect };
}

export function shapeToGeohashes(
  coordinates: unknown[],
  options: ResolvedOptions,
  grid: GeohashGrid = createGrid(options.precision),
): string[] {
  if (isPoint(coordinates)) {
    const [lon, lat] = coordinates as Position;
    return [ngeohash.encode(lat, lon, options.precision)];
  }

  const hashes = new Set<string>();
  const add: CellVisitor = (column, row) => {
    hashes.add(cellHash(grid, column, row));
  };

  if (options.hashMode === "envelope") {
    envelopeCells(coordinates, grid, add);
  } else if (isLine(coordinates)) {
    lineCells(coordinates as Position[], grid, add);
  } else {
    polygonCoverage(coordinates as Position[][], grid, (column, row, coverage) => {
      if (keepCell(coverage, options)) {
        add(column, row);
      }
    });
  }

  return Array.from(hashes);
}

function keepCell(coverage: number, { hashMode, minIntersect }: ResolvedOptions): boolean {
  switch (hashMode) {
    case "insideOnly":
      return coverage === 1;
    case "border":
      return coverage < 1;
    default:
      return coverage >= minIntersect;
  }
}

function envelopeCells(coordinates: unknown[], grid: GeohashGrid, add: CellVisitor): void {
  const positions = (isLine(coordinates) ? coordinates : coordinates[0]) as Position[];

  const [minLon, maxLon] = calcDomain(positions, "0");
  const [minLat, maxLat] = calcDomain(positions, "1");

  const columnEnd = columnAt(grid, gridX(grid, maxLon));
  const rowEnd = rowAt(grid, gridY(grid, maxLat));
  for (let row = rowAt(grid, gridY(grid, minLat)); row <= rowEnd; row++) {
    for (let column = columnAt(grid, gridX(grid, minLon)); column <= columnEnd; column++) {
      add(column, row);
    }
  }
}
