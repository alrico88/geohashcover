import type { Polygon } from "geojson";

import { berlinPolygon } from "./helpers.ts";

const shapes: Record<string, [Polygon, number[]]> = {
  berlin: [berlinPolygon, [5, 6]],
  "aligned with cells": [
    {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [0.3515625, 0],
          [0.3515625, 0.17578125],
          [0, 0.17578125],
          [0, 0],
        ],
      ],
    },
    [4, 5],
  ],
  donut: [
    {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
        [
          [0.3, 0.3],
          [0.3, 0.7],
          [0.7, 0.7],
          [0.7, 0.3],
          [0.3, 0.3],
        ],
      ],
    },
    [4, 5],
  ],
  "C shape": [
    {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 0.2],
          [0.2, 0.2],
          [0.2, 0.8],
          [1, 0.8],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      ],
    },
    [4, 5],
  ],
};

/** One entry per shape and precision checked against the brute-force reference. */
export const referenceCases = Object.entries(shapes).flatMap(([name, [shape, precisions]]) =>
  precisions.map((precision) => ({ key: `${name} p${precision}`, shape, precision })),
);
