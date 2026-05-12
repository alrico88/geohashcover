/* eslint-disable no-loss-of-precision */
import { describe, test, expect } from "vite-plus/test";
import ngeohash from "ngeohash";

import berlin from "./berlin.json" with { type: "json" };
import { toGeohashes } from "../src/index.ts";
import { ShapeProcessor } from "../src/core.ts";
import * as geojsonExamples from "./geojsonExamples.ts";

const berlinPolygon = (berlin as any).fields.geo_shape;

function checkForDuplicates(geohashes: string[]): string[] | null {
  const geohashesAsSet = new Set(geohashes);
  if (geohashes.length !== geohashesAsSet.size) {
    const duplicates: string[] = [];
    const seen = new Set<string>();
    for (const gh of geohashes) {
      if (seen.has(gh)) {
        duplicates.push(gh);
      } else {
        seen.add(gh);
      }
    }
    return duplicates;
  }
  return null;
}

function bboxToCoordinates(bbox: [number, number, number, number]) {
  return [
    [
      [bbox[1], bbox[2]],
      [bbox[3], bbox[2]],
      [bbox[3], bbox[0]],
      [bbox[1], bbox[0]],
      [bbox[1], bbox[2]],
    ],
  ];
}

describe("Berlin tests", () => {
  test("intersect", () => {
    const geohashes = toGeohashes(berlinPolygon);
    const duplicates = checkForDuplicates(geohashes);
    expect(duplicates).toBe(null);
  });

  test("envelope", () => {
    const geohashes = toGeohashes(berlinPolygon, {
      hashMode: "envelope",
    });
    const duplicates = checkForDuplicates(geohashes);
    expect(duplicates).toBe(null);
  });

  test("insideOnly", () => {
    const expectedGeohashes = [
      "u337n",
      "u337p",
      "u33e0",
      "u33e1",
      "u33e4",
      "u336u",
      "u336v",
      "u336y",
      "u336z",
      "u33db",
      "u33dc",
      "u33df",
      "u33dg",
      "u33du",
      "u336s",
      "u336t",
      "u336w",
      "u336x",
      "u33d8",
      "u33d9",
      "u33dd",
      "u33de",
      "u33ds",
      "u3367",
      "u336k",
      "u336m",
      "u336q",
      "u336r",
      "u33d2",
      "u33d3",
      "u33d6",
      "u33d7",
      "u33dk",
      "u33dn",
    ];
    const geohashes = toGeohashes(berlinPolygon, {
      hashMode: "insideOnly",
      precision: 5,
    });
    for (const gh of geohashes) {
      expect(expectedGeohashes).toContain(gh);
    }
    expect(geohashes.length).toBe(expectedGeohashes.length);
    const duplicates = checkForDuplicates(geohashes);
    expect(duplicates).toBe(null);
  });

  test("border", () => {
    const geohashes = toGeohashes(berlinPolygon, {
      hashMode: "border",
    });
    const duplicates = checkForDuplicates(geohashes);
    expect(duplicates).toBe(null);
  });
});

describe("Manual tests", () => {
  test("Test exact geohash", () => {
    const testGeohash = "u336x";
    const bbox = ngeohash.decode_bbox(testGeohash);
    const geohashes = toGeohashes(
      { type: "Polygon", coordinates: bboxToCoordinates(bbox as any) },
      { precision: testGeohash.length },
    );
    expect(geohashes.length).toBe(1);
    expect(geohashes[0]).toBe(testGeohash);
  });

  test("Test polygon", () => {
    const polygon = [
      [
        [13.331187, 52.49439],
        [13.371699, 52.509027],
        [13.4245712, 52.50401228],
        [13.41221166, 52.457175],
        [13.3414871, 52.4504801],
        [13.331187, 52.49439],
      ],
    ];
    const expectedGeohashes = ["u336x", "u33d8", "u33d9", "u336r", "u33d2", "u33d3"];
    const geohashes = toGeohashes(
      { type: "Polygon", coordinates: polygon },
      {
        precision: expectedGeohashes[0].length,
      },
    );
    for (const gh of geohashes) {
      expect(expectedGeohashes).toContain(gh);
    }
    expect(geohashes.length).toBe(expectedGeohashes.length);
    const duplicates = checkForDuplicates(geohashes);
    expect(duplicates).toBe(null);
  });

  test("Test multi polygon", () => {
    const polygon = [
      [13.331187, 52.49439],
      [13.371699, 52.509027],
      [13.4245712, 52.50401228],
      [13.41221166, 52.457175],
      [13.3414871, 52.4504801],
      [13.331187, 52.49439],
    ] as [number, number][];

    const polygon2 = polygon.map(([lon, lat]) => [lon + 0.26, lat] as [number, number]);

    const multiPolygon = [[polygon], [polygon2]];
    const expectedGeohashes = [
      "u336x",
      "u33d8",
      "u33d9",
      "u336r",
      "u33d2",
      "u33d3",
      "u33dt",
      "u33dw",
      "u33dx",
      "u33dm",
      "u33dq",
      "u33dr",
    ];
    const geohashes = toGeohashes(
      { type: "MultiPolygon", coordinates: multiPolygon },
      {
        precision: expectedGeohashes[0].length,
      },
    );
    for (const gh of geohashes) {
      expect(expectedGeohashes).toContain(gh);
    }
    expect(geohashes.length).toBe(expectedGeohashes.length);
    const duplicates = checkForDuplicates(geohashes);
    expect(duplicates).toBe(null);
  });

  test("Test polygon with a hole", () => {
    const polygon = [
      [
        [13.328475952148438, 52.54713081557263],
        [13.330535888671875, 52.4350833510599],
        [13.423233032226562, 52.44178076592579],
        [13.410873413085938, 52.55172368081563],
        [13.328475952148438, 52.54713081557263],
      ],
      [
        [13.336029052734373, 52.5433726592131],
        [13.338775634765625, 52.441362207320445],
        [13.41499328613281, 52.44596613327885],
        [13.40606689453125, 52.54838346285351],
        [13.336029052734373, 52.5433726592131],
      ],
    ];

    const expectedGeohashes = [
      "u336z",
      "u33db",
      "u33dc",
      "u336x",
      "u33d9",
      "u336r",
      "u33d2",
      "u33d3",
    ];
    const geohashes = toGeohashes(
      { type: "Polygon", coordinates: polygon },
      {
        precision: expectedGeohashes[0].length,
      },
    );
    for (const gh of geohashes) {
      expect(expectedGeohashes).toContain(gh);
    }
    expect(geohashes.length).toBe(expectedGeohashes.length);
    const duplicates = checkForDuplicates(geohashes);
    expect(duplicates).toBe(null);
  });

  test("Test polygon with hashMode 'border'", () => {
    const polygon = [
      [
        [13.328475952148438, 52.54713081557263],
        [13.330535888671875, 52.4350833510599],
        [13.423233032226562, 52.44178076592579],
        [13.410873413085938, 52.55172368081563],
        [13.328475952148438, 52.54713081557263],
      ],
    ];

    const expectedGeohashes = [
      "u336z",
      "u33db",
      "u33dc",
      "u336x",
      "u33d9",
      "u336r",
      "u33d2",
      "u33d3",
    ];
    const geohashes = toGeohashes(
      { type: "Polygon", coordinates: polygon },
      {
        precision: expectedGeohashes[0].length,
        hashMode: "border",
      },
    );
    for (const gh of geohashes) {
      expect(expectedGeohashes).toContain(gh);
    }
    expect(geohashes.length).toBe(expectedGeohashes.length);
    const duplicates = checkForDuplicates(geohashes);
    expect(duplicates).toBe(null);
  });

  test("Test polygon with hashMode 'insideOnly'", () => {
    const polygon = [
      [
        [13.328819274902344, 52.510579539510864],
        [13.327960968017578, 52.43351349719224],
        [13.422374725341797, 52.4388507721828],
        [13.41482162475586, 52.549427308276925],
        [13.327789306640625, 52.5481746907895],
        [13.328819274902344, 52.510579539510864],
      ],
    ];

    const expectedGeohashes = ["u33d8"];
    const geohashes = toGeohashes(
      { type: "Polygon", coordinates: polygon },
      {
        precision: expectedGeohashes[0].length,
        hashMode: "insideOnly",
      },
    );
    for (const gh of geohashes) {
      expect(expectedGeohashes).toContain(gh);
    }
    expect(geohashes.length).toBe(expectedGeohashes.length);
    const duplicates = checkForDuplicates(geohashes);
    expect(duplicates).toBe(null);
  });

  test("Test polygon with hashMode 'envelope'", () => {
    const polygon = [
      [
        [13.33740234375, 52.453498792506736],
        [13.407440185546875, 52.45308034523523],
        [13.402633666992188, 52.53919655252312],
        [13.33740234375, 52.453498792506736],
      ],
    ];

    const expectedGeohashes = [
      "u336z",
      "u33db",
      "u33dc",
      "u336x",
      "u33d8",
      "u33d9",
      "u336r",
      "u33d2",
      "u33d3",
    ];
    const geohashes = toGeohashes(
      { type: "Polygon", coordinates: polygon },
      {
        precision: expectedGeohashes[0].length,
        hashMode: "envelope",
      },
    );
    for (const gh of geohashes) {
      expect(expectedGeohashes).toContain(gh);
    }
    expect(geohashes.length).toBe(expectedGeohashes.length);
    const duplicates = checkForDuplicates(geohashes);
    expect(duplicates).toBe(null);
  });

  test("Test line with hashMode 'intersect'", () => {
    const line = [
      [13.286631, 52.501994],
      [13.383104, 52.443386],
      [13.481295, 52.459287],
    ];

    const expectedGeohashes = ["u336w", "u336x", "u336r", "u33d2", "u33d3", "u33d6"];
    const geohashes = toGeohashes(
      { type: "LineString", coordinates: line },
      {
        precision: expectedGeohashes[0].length,
        hashMode: "intersect",
      },
    );
    for (const gh of geohashes) {
      expect(expectedGeohashes).toContain(gh);
    }
    expect(geohashes.length).toBe(expectedGeohashes.length);
    const duplicates = checkForDuplicates(geohashes);
    expect(duplicates).toBe(null);
  });

  test("Test line with hashMode 'border'", () => {
    const line = [
      [13.286631, 52.501994],
      [13.383104, 52.443386],
      [13.481295, 52.459287],
    ];

    const expectedGeohashes = ["u336w", "u336x", "u336r", "u33d2", "u33d3", "u33d6"];
    const geohashes = toGeohashes(
      { type: "LineString", coordinates: line },
      {
        precision: expectedGeohashes[0].length,
        hashMode: "border",
      },
    );
    for (const gh of geohashes) {
      expect(expectedGeohashes).toContain(gh);
    }
    expect(geohashes.length).toBe(expectedGeohashes.length);
    const duplicates = checkForDuplicates(geohashes);
    expect(duplicates).toBe(null);
  });

  test("Test line with hashMode 'insideOnly'", () => {
    const line = [
      [13.286631, 52.501994],
      [13.383104, 52.443386],
      [13.481295, 52.459287],
    ];

    const expectedGeohashes = ["u336w", "u336x", "u336r", "u33d2", "u33d3", "u33d6"];
    const geohashes = toGeohashes(
      { type: "LineString", coordinates: line },
      {
        precision: expectedGeohashes[0].length,
        hashMode: "insideOnly",
      },
    );
    for (const gh of geohashes) {
      expect(expectedGeohashes).toContain(gh);
    }
    expect(geohashes.length).toBe(expectedGeohashes.length);
    const duplicates = checkForDuplicates(geohashes);
    expect(duplicates).toBe(null);
  });

  test("Test line with hashMode 'envelope'", () => {
    const line = [
      [13.286631, 52.501994],
      [13.383104, 52.443386],
      [13.481295, 52.459287],
    ];

    const expectedGeohashes = [
      "u336w",
      "u336x",
      "u33d8",
      "u33d9",
      "u33dd",
      "u336q",
      "u336r",
      "u33d2",
      "u33d3",
      "u33d6",
    ];
    const geohashes = toGeohashes(
      { type: "LineString", coordinates: line },
      {
        precision: expectedGeohashes[0].length,
        hashMode: "envelope",
      },
    );
    for (const gh of geohashes) {
      expect(expectedGeohashes).toContain(gh);
    }
    expect(geohashes.length).toBe(expectedGeohashes.length);
    const duplicates = checkForDuplicates(geohashes);
    expect(duplicates).toBe(null);
  });

  test("Test minIntersect 0.5", () => {
    const polygon = [
      [
        [13.331187, 52.49439],
        [13.371699, 52.509027],
        [13.4245712, 52.50401228],
        [13.41221166, 52.457175],
        [13.3414871, 52.4504801],
        [13.331187, 52.49439],
      ],
    ];
    const expectedGeohashes = ["u33d8"];
    const geohashes = toGeohashes(
      { type: "Polygon", coordinates: polygon },
      {
        precision: expectedGeohashes[0].length,
        minIntersect: 0.5,
      },
    );
    for (const gh of geohashes) {
      expect(expectedGeohashes).toContain(gh);
    }
    expect(geohashes.length).toBe(expectedGeohashes.length);
    const duplicates = checkForDuplicates(geohashes);
    expect(duplicates).toBe(null);
  });

  test("Test minIntersect 0.25", () => {
    const polygon = [
      [
        [13.331187, 52.49439],
        [13.371699, 52.509027],
        [13.4245712, 52.50401228],
        [13.41221166, 52.457175],
        [13.3414871, 52.4504801],
        [13.331187, 52.49439],
      ],
    ];
    const expectedGeohashes = ["u336x", "u33d8", "u33d9", "u33d2"];
    const geohashes = toGeohashes(
      { type: "Polygon", coordinates: polygon },
      {
        precision: expectedGeohashes[0].length,
        minIntersect: 0.25,
      },
    );
    for (const gh of geohashes) {
      expect(expectedGeohashes).toContain(gh);
    }
    expect(geohashes.length).toBe(expectedGeohashes.length);
    const duplicates = checkForDuplicates(geohashes);
    expect(duplicates).toBe(null);
  });

  test("Overlapping polygons -> deduplicates automatically", () => {
    const geohashes = toGeohashes(geojsonExamples.overlappingPolygons());
    const duplicates = checkForDuplicates(geohashes);
    expect(duplicates).toBe(null);
  });

  test("Test point", () => {
    const testGeohash = "u336xps";
    const geohashes = toGeohashes(geojsonExamples.Point(), {
      precision: testGeohash.length,
    });
    expect(geohashes.length).toBe(1);
    expect(geohashes[0]).toBe(testGeohash);
  });

  test("Test multi point", () => {
    const testGeohashes = ["u336xps", "u336xnw"];
    const geohashes = toGeohashes(geojsonExamples.MultiPoint(), {
      precision: testGeohashes[0].length,
    });
    expect(geohashes.length).toBe(2);
    expect(geohashes[0]).toBe(testGeohashes[0]);
    expect(geohashes[1]).toBe(testGeohashes[1]);
  });

  test("Test very small line", () => {
    const testGeohashes = ["ez3cys"];
    const geohashes = toGeohashes({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-8.49468397061034, 41.1146472476304],
          [-8.49468566805409, 41.1146850333377],
        ],
      },
    } as any);
    expect(geohashes.length).toBe(1);
    expect(geohashes[0]).toBe(testGeohashes[0]);
  });

  test("ShapeProcessor point directly", () => {
    const processor = new ShapeProcessor([13.32165, 52.5125], {
      precision: 7,
    });
    const geohashes = processor.process();
    expect(geohashes.length).toBe(1);
    expect(geohashes[0]).toBe("u336xps");
  });
});
