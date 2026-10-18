import { calcDomain } from "math-helper-functions";

import { columnAt, gridX, gridY, rowAt } from "./grid.js";
import type { GeohashGrid } from "./grid.js";

export type Position = [number, number];

/** Called once per cell; `coverage` is the fraction (0-1] of the cell inside the polygon. */
type CoverageVisitor = (column: number, row: number, coverage: number) => void;
export type CellVisitor = (column: number, row: number) => void;

/** Sparse per-row accumulation buffer: column -> signed area delta. */
type RowDeltas = Map<number, number>;

function addDelta(row: RowDeltas, column: number, delta: number): void {
  row.set(column, (row.get(column) ?? 0) + delta);
}

/**
 * Signed-area accumulation for one polygon edge (the font-rs rasterizer).
 * For every row the edge crosses, it records how much the edge changes the
 * covered area of each cell it passes through. A left-to-right running sum of
 * these deltas then gives the exact coverage of every cell in the row.
 */
function accumulateEdge(
  rows: RowDeltas[],
  sign: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): void {
  if (ay === by) {
    return;
  }

  let dir = sign;
  let [x0, y0, x1, y1] = [ax, ay, bx, by];
  if (y0 > y1) {
    dir = -sign;
    [x0, y0, x1, y1] = [bx, by, ax, ay];
  }

  const dxdy = (x1 - x0) / (y1 - y0);
  let x = x0;
  const rowEnd = Math.ceil(y1);

  for (let r = Math.floor(y0); r < rowEnd; r++) {
    const dy = Math.min(r + 1, y1) - Math.max(r, y0);
    const xNext = x + dxdy * dy;
    const d = dy * dir;
    const row = rows[r];

    const xa = Math.min(x, xNext);
    const xb = Math.max(x, xNext);
    const ia = Math.floor(xa);
    const ib = Math.ceil(xb);

    if (ib <= ia + 1) {
      // Edge stays within one cell in this row.
      const xmf = 0.5 * (x + xNext) - ia;
      addDelta(row, ia, d - d * xmf);
      addDelta(row, ia + 1, d * xmf);
    } else {
      const s = 1 / (xb - xa);
      const xaf = xa - ia;
      const a0 = 0.5 * s * (1 - xaf) * (1 - xaf);
      const xbf = xb - ib + 1;
      const am = 0.5 * s * xbf * xbf;
      addDelta(row, ia, d * a0);
      if (ib === ia + 2) {
        addDelta(row, ia + 1, d * (1 - a0 - am));
      } else {
        const a1 = s * (1.5 - xaf);
        addDelta(row, ia + 1, d * (a1 - a0));
        for (let c = ia + 2; c < ib - 1; c++) {
          addDelta(row, c, d * s);
        }
        const a2 = a1 + (ib - ia - 3) * s;
        addDelta(row, ib - 1, d * (1 - a2 - am));
      }
      addDelta(row, ib, d * am);
    }

    x = xNext;
  }
}

function signedArea(ring: Position[]): number {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    sum += (ring[j][0] - ring[i][0]) * (ring[j][1] + ring[i][1]);
  }
  return sum / 2;
}

const EPSILON = 1e-9;

/**
 * Visits every cell with non-zero coverage by the polygon (`rings[0]` is the
 * exterior, the rest are holes). Cost is proportional to the cells crossed by
 * edges plus the cells visited, independent of how they are classified.
 */
export function polygonCoverage(
  rings: Position[][],
  grid: GeohashGrid,
  visit: CoverageVisitor,
): void {
  const local = rings.map((ring) =>
    ring.map(([lon, lat]): Position => [gridX(grid, lon), gridY(grid, lat)]),
  );
  const points = local.flat();
  if (points.length === 0) {
    return;
  }
  const [minX, maxX] = calcDomain(points, "0");
  const [minY, maxY] = calcDomain(points, "1");

  // Work relative to the bbox so the area math stays precise at high precisions.
  const column0 = Math.floor(minX);
  const row0 = Math.floor(minY);
  const columns = Math.ceil(maxX) - column0;
  const rowCount = Math.ceil(maxY) - row0;
  const rows: RowDeltas[] = Array.from({ length: rowCount }, () => new Map());

  local.forEach((ring, index) => {
    // Exterior and holes must wind in opposite directions so holes subtract.
    const wanted = index === 0 ? 1 : -1;
    const sign = Math.sign(signedArea(ring)) === wanted ? 1 : -1;
    for (let i = 1; i < ring.length; i++) {
      accumulateEdge(
        rows,
        sign,
        ring[i - 1][0] - column0,
        ring[i - 1][1] - row0,
        ring[i][0] - column0,
        ring[i][1] - row0,
      );
    }
  });

  for (let r = 0; r < rowCount; r++) {
    const row = rows[r];
    if (row.size === 0) {
      continue;
    }
    const keys = [...row.keys()].sort((a, b) => a - b);
    let acc = 0;
    for (let k = 0; k < keys.length; k++) {
      acc += row.get(keys[k])!;
      const coverage = Math.min(1, Math.abs(acc));
      if (coverage <= EPSILON) {
        continue;
      }
      // Between two recorded deltas the running sum, and so the coverage, is constant.
      const end = Math.min(columns, k + 1 < keys.length ? keys[k + 1] : keys[k] + 1);
      for (let c = keys[k]; c < end; c++) {
        visit(column0 + c, row0 + r, coverage >= 1 - EPSILON ? 1 : coverage);
      }
    }
  }
}

/** Cells for a span [lo, hi] along one axis; a degenerate span falls back to the point rule. */
function span(lo: number, hi: number, cellOf: (v: number) => number): [number, number] {
  if (lo === hi) {
    const cell = cellOf(lo);
    return [cell, cell];
  }
  return [Math.floor(lo), Math.ceil(hi) - 1];
}

/** Visits every cell whose interior the line passes through (cells may repeat at vertices). */
export function lineCells(line: Position[], grid: GeohashGrid, visit: CellVisitor): void {
  // A single-position line is treated as a zero-length segment.
  const segments = Math.max(1, line.length - 1);
  for (let i = 0; i < segments; i++) {
    const end = line[Math.min(i + 1, line.length - 1)];
    const [ax, ay] = [gridX(grid, line[i][0]), gridY(grid, line[i][1])];
    const [bx, by] = [gridX(grid, end[0]), gridY(grid, end[1])];

    const [rowLo, rowHi] = span(Math.min(ay, by), Math.max(ay, by), (y) => rowAt(grid, y));
    for (let r = Math.max(0, rowLo); r <= Math.min(grid.maxRow, rowHi); r++) {
      let xa = ax;
      let xb = bx;
      if (ay !== by) {
        const ta = Math.min(1, Math.max(0, (r - ay) / (by - ay)));
        const tb = Math.min(1, Math.max(0, (r + 1 - ay) / (by - ay)));
        xa = ax + (bx - ax) * ta;
        xb = ax + (bx - ax) * tb;
      }
      const [colLo, colHi] = span(Math.min(xa, xb), Math.max(xa, xb), (x) => columnAt(grid, x));
      for (let c = Math.max(0, colLo); c <= Math.min(grid.maxColumn, colHi); c++) {
        visit(c, r);
      }
    }
  }
}
