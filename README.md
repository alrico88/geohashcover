# geohashcover

Converts any GeoJSON shape into a list of geohashes.

Fork of [shape2geohash](https://github.com/marcelreppi/shape2geohash) by Marcel Reppenhagen.

## Differences from shape2geohash

- **TypeScript** — full type safety with strict mode
- **Modern turf v7** — updated to latest API
- **No streams** — Removed streams support
- **ESM-only** — no CJS build

## Install

```bash
npm install geohashcover
```

## Usage

```ts
import { toGeohashes } from "geohashcover";

const hashes = toGeohashes({
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
});
```

### Examples

**Polygon:**

```ts
const hashes = toGeohashes({
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
});
```

**LineString:**

```ts
const hashes = toGeohashes({
  type: "LineString",
  coordinates: [
    [13.286631, 52.501994],
    [13.383104, 52.443386],
    [13.481295, 52.459287],
  ],
});
```

**Point:**

```ts
const hashes = toGeohashes({
  type: "Point",
  coordinates: [13.32165, 52.5125],
});
```

## API

### `toGeohashes(shapes, options?)`

| Param     | Type      | Description                                                                                                                                                          |
| --------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shapes`  | `GeoJSON` | Any GeoJSON object. Accepts `FeatureCollection`, `Feature`, `Polygon`, `MultiPolygon`, `LineString`, `MultiLineString`, `Point`, `MultiPoint`, `GeometryCollection`. |
| `options` | `object`  | Optional configuration (see below).                                                                                                                                  |

Returns: `string[]` — array of geohash strings (always deduplicated).

### Options

| Option         | Type     | Default       | Description                                                                                                  |
| -------------- | -------- | ------------- | ------------------------------------------------------------------------------------------------------------ |
| `precision`    | `number` | `6`           | Length of the returned geohashes (geohash level). Higher values mean smaller cells.                          |
| `hashMode`     | `string` | `"intersect"` | Determines which geohashes are included: `"intersect"`, `"envelope"`, `"insideOnly"`, or `"border"`.         |
| `minIntersect` | `number` | `0`           | Minimum overlap fraction (0–1) for a geohash to be included. Filters edge cells that barely touch the shape. |

### hashMode details

| Mode           | Behavior                                                                                                                |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `"intersect"`  | Includes all geohashes that intersect with the shape. Best for most use cases.                                          |
| `"envelope"`   | Includes all geohashes inside the rectangular bounding box of the shape. Fastest, but includes cells outside the shape. |
| `"insideOnly"` | Includes only geohashes fully contained within the polygon. Most precise, but may miss edge areas.                      |
| `"border"`     | Includes only geohashes that intersect the border of the polygon (excludes fully interior cells).                       |

## Development

```bash
pnpm install
vp test
vp check
vp pack
```
