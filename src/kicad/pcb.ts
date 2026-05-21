import { readDesignFile } from "./parsers/project-files.js";
import { extractBlocks } from "./schematic.js";

interface PcbFootprint {
  reference: string;
  footprint: string;
  dnp: boolean;
  boardOnly: boolean;
  layers: string[];
}

export interface ParsedPcb {
  footprints: PcbFootprint[];
  revision?: string | undefined;
  drillSizes: string[];
  copperLayers: string[];
  copperAreas: Map<string, number>;
  boardArea?: number | undefined;
  outlineClosed: boolean;
  copperLayerCount: number;
  stackupLayerCount?: number | undefined;
  designBlockInstances: number;
}

export async function parsePcb(file: string): Promise<ParsedPcb> {
  const text = (await readDesignFile(file)) ?? "";
  const footprints: PcbFootprint[] = [];
  for (const block of extractBlocks(text, "footprint")) {
    const name = firstQuoted(block) ?? "";
    const reference = propertyValue(block, "Reference");
    if (!reference) {
      continue;
    }
    footprints.push({
      reference,
      footprint: name,
      dnp: /\(attr\b[^)]*\bdnp\b/.test(block) || /not\s+populated/i.test(block),
      boardOnly: /\(attr\b[^)]*\bboard_only\b/.test(block),
      layers: [...block.matchAll(/\(layer\s+"([^"]+)"/g)].map((match) => match[1] ?? "").filter(Boolean),
    });
  }
  return {
    footprints,
    revision: /\(rev\s+"([^"]+)"/.exec(text)?.[1] ?? /\(revision\s+"([^"]+)"/.exec(text)?.[1],
    drillSizes: [...text.matchAll(/\(drill\s+([0-9.]+)/g)].map((match) => match[1] ?? "").filter(Boolean),
    copperLayers: copperLayers(text),
    copperAreas: copperAreas(text),
    boardArea: boardArea(text),
    outlineClosed: isOutlineClosed(text),
    copperLayerCount: copperLayers(text).length,
    stackupLayerCount: stackupLayerCount(text),
    designBlockInstances: extractBlocks(text, "design_block_instance").length,
  };
}

function propertyValue(block: string, property: string): string | undefined {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\(property\\s+"${escaped}"\\s+"([^"]+)"`).exec(block)?.[1];
}

function firstQuoted(block: string): string | undefined {
  return /\(footprint\s+"([^"]+)"/.exec(block)?.[1];
}

function copperAreas(text: string): Map<string, number> {
  const areas = new Map<string, number>();
  for (const zone of extractBlocks(text, "zone")) {
    const layer = layerName(zone);
    if (!layer) {
      continue;
    }
    for (const polygon of extractBlocks(zone, "filled_polygon")) {
      const area = polygonAreaFromBlock(polygon);
      if (area > 0) {
        areas.set(layer, (areas.get(layer) ?? 0) + area);
      }
    }
  }
  return areas;
}

function boardArea(text: string): number | undefined {
  const rect = edgePrimitiveBlocks(text, "gr_rect")
    .map((block) => startEndFromBlock(block))
    .find((segment): segment is Segment => Boolean(segment));
  if (rect) {
    return Math.abs((rect.end.x - rect.start.x) * (rect.end.y - rect.start.y));
  }
  const circle = edgePrimitiveBlocks(text, "gr_circle")
    .map((block) => circleRadiusPoints(block))
    .find((segment): segment is Segment => Boolean(segment));
  if (circle) {
    const radius = distance(circle.start, circle.end);
    return Math.PI * radius * radius;
  }
  return orderedLoopArea(edgeSegments(text));
}

function isOutlineClosed(text: string): boolean {
  if (edgePrimitiveBlocks(text, "gr_rect").length > 0 || edgePrimitiveBlocks(text, "gr_circle").length > 0) {
    return true;
  }
  const counts = new Map<string, number>();
  for (const segment of edgeSegments(text)) {
    for (const point of [segment.start, segment.end]) {
      const key = `${point.x.toFixed(4)},${point.y.toFixed(4)}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts.size > 0 && [...counts.values()].every((count) => count === 2);
}

function stackupLayerCount(text: string): number | undefined {
  const block = extractBlocks(text, "stackup")[0];
  if (!block) {
    return undefined;
  }
  return [...block.matchAll(/\(layer\s+"([^"]+\.Cu)"/g)].length;
}

interface Point {
  x: number;
  y: number;
}

interface Segment {
  start: Point;
  end: Point;
}

function copperLayers(text: string): string[] {
  const layerBlock = extractBlocks(text, "layers")[0] ?? "";
  const layers = [...layerBlock.matchAll(/\(\s*\d+\s+"([^"]+)"\s+(?:signal|power)\b/g)].map((match) => match[1] ?? "");
  if (layers.length > 0) {
    return [...new Set(layers)];
  }
  return [...new Set([...text.matchAll(/\(layer\s+"([^"]+\.Cu)"/g)].map((match) => match[1] ?? ""))].filter(Boolean);
}

function edgeSegments(text: string): Segment[] {
  return [...edgePrimitiveBlocks(text, "gr_line"), ...edgePrimitiveBlocks(text, "gr_arc")]
    .map(startEndFromBlock)
    .filter((segment): segment is Segment => Boolean(segment));
}

function edgePrimitiveBlocks(text: string, head: string): string[] {
  return extractBlocks(text, head).filter((block) => layerName(block) === "Edge.Cuts");
}

function startEndFromBlock(block: string): Segment | undefined {
  const start = /\(start\s+([0-9.-]+)\s+([0-9.-]+)\)/.exec(block);
  const end = /\(end\s+([0-9.-]+)\s+([0-9.-]+)\)/.exec(block);
  if (!start || !end) {
    return undefined;
  }
  return {
    start: { x: Number(start[1]), y: Number(start[2]) },
    end: { x: Number(end[1]), y: Number(end[2]) },
  };
}

function circleRadiusPoints(block: string): Segment | undefined {
  const center = /\(center\s+([0-9.-]+)\s+([0-9.-]+)\)/.exec(block);
  const end = /\(end\s+([0-9.-]+)\s+([0-9.-]+)\)/.exec(block);
  if (!center || !end) {
    return undefined;
  }
  return {
    start: { x: Number(center[1]), y: Number(center[2]) },
    end: { x: Number(end[1]), y: Number(end[2]) },
  };
}

function layerName(block: string): string | undefined {
  return /\(layer\s+"([^"]+)"/.exec(block)?.[1];
}

function polygonAreaFromBlock(block: string): number {
  const pointSets = extractBlocks(block, "pts")
    .map(pointsFromText)
    .filter((points) => points.length >= 3);
  if (pointSets.length === 0) {
    return 0;
  }
  const outer = pointSets[0] as Point[];
  const holes = pointSets.slice(1);
  return Math.max(0, polygonArea(outer) - holes.reduce((sum, points) => sum + polygonArea(points), 0));
}

function orderedLoopArea(segments: Segment[]): number | undefined {
  if (segments.length < 3) {
    return undefined;
  }
  const unused = [...segments];
  const areas: number[] = [];
  while (unused.length > 0) {
    const first = unused.shift() as Segment;
    const points = [first.start, first.end];
    while (!samePoint(points[0] as Point, points.at(-1) as Point)) {
      const tail = points.at(-1) as Point;
      const nextIndex = unused.findIndex((segment) => samePoint(segment.start, tail) || samePoint(segment.end, tail));
      if (nextIndex === -1) {
        return undefined;
      }
      const [next] = unused.splice(nextIndex, 1) as [Segment];
      points.push(samePoint(next.start, tail) ? next.end : next.start);
    }
    areas.push(polygonArea(points.slice(0, -1)));
  }
  const [outer, ...holes] = areas.sort((left, right) => right - left);
  if (!outer) {
    return undefined;
  }
  return Math.max(0, outer - holes.reduce((sum, area) => sum + area, 0));
}

function samePoint(left: Point, right: Point): boolean {
  return Math.abs(left.x - right.x) < 0.0001 && Math.abs(left.y - right.y) < 0.0001;
}

function distance(left: Point, right: Point): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function pointsFromText(text: string): Point[] {
  return [...text.matchAll(/\(xy\s+([0-9.-]+)\s+([0-9.-]+)\)/g)].map((match) => ({
    x: Number(match[1]),
    y: Number(match[2]),
  }));
}

function polygonArea(points: Point[]): number {
  let sum = 0;
  for (const [index, point] of points.entries()) {
    const next = points[(index + 1) % points.length];
    if (next) {
      sum += point.x * next.y - next.x * point.y;
    }
  }
  return Math.abs(sum / 2);
}
