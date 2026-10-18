# geohashcover

Converts any GeoJSON shape into a list of geohashes.

Fork of [shape2geohash](https://github.com/marcelreppi/shape2geohash) by Marcel Reppenhagen.

## Differences from shape2geohash

- **TypeScript** — full type safety with strict mode
- **Scanline rasterizer** — exact per-cell coverage, no turf dependency
- **No streams** — Removed streams support
- **ESM-only** — no CJS build

## Install

```bash
npm install geohashcover
```

## Usage

```ts
import { toGeohashes } from "geohashcover";

const polygon = {
  type: "Polygon",
  coordinates: [
    [
      [13.0, 52.5],
      [13.3, 52.5],
      [13.3, 52.2],
      [13.0, 52.2],
      [13.0, 52.5],
    ],
  ],
};

const hashes = toGeohashes(polygon, { precision: 5 });
// 64 geohashes
```

### Examples

**LineString:**

```ts
toGeohashes(
  {
    type: "LineString",
    coordinates: [
      [13.286631, 52.501994],
      [13.383104, 52.443386],
      [13.481295, 52.459287],
    ],
  },
  { precision: 5 },
);
// ["u336r", "u33d2", "u336w", "u336x", "u33d3", "u33d6"]
```

**Point:**

```ts
toGeohashes({
  type: "Point",
  coordinates: [13.32165, 52.5125],
});
// ["u336xp"]
```

**Only cells mostly covered by the shape:**

```ts
toGeohashes(polygon, { precision: 5, minIntersect: 0.5 });
// 48 of the 64 geohashes above
```

## API

### `toGeohashes(shapes, options?)`

| Param     | Type                   | Description                                                                                                                                                          |
| --------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shapes`  | `GeoJSON`              | Any GeoJSON object. Accepts `FeatureCollection`, `Feature`, `Polygon`, `MultiPolygon`, `LineString`, `MultiLineString`, `Point`, `MultiPoint`, `GeometryCollection`. |
| `options` | `Shape2geohashOptions` | Optional configuration (see below).                                                                                                                                  |

Returns: `string[]` — array of geohash strings (always deduplicated).

Throws:

- `RangeError` if an option is out of range.
- `Error` if the GeoJSON is malformed (missing `type`, `coordinates` or `geometry`).

The `Shape2geohashOptions` and `HashMode` types are exported for TypeScript users.

### Options

| Option         | Type       | Default       | Description                                                                                                                    |
| -------------- | ---------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `precision`    | `number`   | `6`           | Length of the returned geohashes, an integer from 1 to 12. Higher values mean smaller cells.                                   |
| `hashMode`     | `HashMode` | `"intersect"` | Which geohashes to include: `"intersect"`, `"envelope"`, `"insideOnly"` or `"border"`.                                         |
| `minIntersect` | `number`   | `0`           | Only with `"intersect"`: minimum fraction (0–1) of each cell that must be covered by a polygon. Drops cells it barely touches. |

### hashMode details

| Mode           | Polygons                                                                 | Lines and points                |
| -------------- | ------------------------------------------------------------------------ | ------------------------------- |
| `"intersect"`  | Cells that share any area with the polygon. Best for most use cases.     | Cells the line passes through.  |
| `"envelope"`   | Every cell in the rectangular bounding box, including cells outside.     | Every cell in the bounding box. |
| `"insideOnly"` | Cells entirely inside the polygon. Cells containing a hole are left out. | Same as `"intersect"`.          |
| `"border"`     | Cells crossed by the polygon's outline or by the outline of a hole.      | Same as `"intersect"`.          |

Cells that only touch the shape along an edge or at a corner are not included. A point, or a line running exactly along a cell boundary, gets the cell `ngeohash.encode` assigns: the one to the west or south.

## How it works

Geohashes of one precision form a regular longitude/latitude grid. For each polygon, every edge is walked once and records, in each row it crosses, how much it changes the covered area of the cells it passes through. A left-to-right running sum along each row then gives the exact fraction of every cell inside the polygon. Interior cells are filled in runs without any geometric test, so the cost grows with the number of edges and output cells, not with the area.

## Limitations

- Coordinates are treated as planar longitude/latitude: edges are straight lines in degrees, not great circles, and `minIntersect` fractions are measured in degrees within each cell.
- Shapes crossing the antimeridian (±180°) are not split. Split them into two shapes first.

## Development

```bash
vp install
vp test
vp check
vp pack
```
