export type HashMode = "intersect" | "envelope" | "insideOnly" | "border";

export interface Shape2geohashOptions {
  precision?: number;
  hashMode?: HashMode;
  minIntersect?: number;
}
