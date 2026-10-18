import ngeohash from "ngeohash";

/**
 * The geohash cells of one precision form a regular lon/lat grid. Columns are
 * counted from -180° and rows from -90°, so a cell is just a (column, row) pair.
 */
export interface GeohashGrid {
  precision: number;
  cellWidth: number;
  cellHeight: number;
  maxColumn: number;
  maxRow: number;
}

export function createGrid(precision: number): GeohashGrid {
  const [minLat, minLon, maxLat, maxLon] = ngeohash.decode_bbox(ngeohash.encode(0, 0, precision));
  const cellWidth = maxLon - minLon;
  const cellHeight = maxLat - minLat;
  return {
    precision,
    cellWidth,
    cellHeight,
    maxColumn: Math.round(360 / cellWidth) - 1,
    maxRow: Math.round(180 / cellHeight) - 1,
  };
}

/** Longitude in column units (fractional). */
export function gridX(grid: GeohashGrid, lon: number): number {
  return (lon + 180) / grid.cellWidth;
}

/** Latitude in row units (fractional). */
export function gridY(grid: GeohashGrid, lat: number): number {
  return (lat + 90) / grid.cellHeight;
}

/** Column holding `x`, matching ngeohash: a point on a boundary belongs to the western cell. */
export function columnAt(grid: GeohashGrid, x: number): number {
  return Math.min(grid.maxColumn, Math.max(0, Math.ceil(x) - 1));
}

/** Row holding `y`, matching ngeohash: a point on a boundary belongs to the southern cell. */
export function rowAt(grid: GeohashGrid, y: number): number {
  return Math.min(grid.maxRow, Math.max(0, Math.ceil(y) - 1));
}

export function cellHash(grid: GeohashGrid, column: number, row: number): string {
  return ngeohash.encode(
    -90 + (row + 0.5) * grid.cellHeight,
    -180 + (column + 0.5) * grid.cellWidth,
    grid.precision,
  );
}
