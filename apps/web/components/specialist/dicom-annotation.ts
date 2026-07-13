import type { StackViewport } from "@cornerstonejs/core";

type WorldPoint = [number, number, number];

function toWorldPoint(p: { x: number; y: number }): WorldPoint {
  return [p.x, p.y, 0];
}

export type AnnotationToolType = "distance" | "ellipse" | "arrow";
export type ActiveTool = "pan" | "wl" | "select" | "distance" | "ellipse" | "arrow";

export interface ImageCoordinate {
  x: number;
  y: number;
}

export interface AnnotationMetadata {
  distanceCm?: number;
  areaCm2?: number;
  meanIntensity?: number;
  minIntensity?: number;
  maxIntensity?: number;
  label?: string;
}

export interface IDicomAnnotationState {
  annotationId: string;
  toolType: AnnotationToolType;
  coordinates: ImageCoordinate[];
  metadata: AnnotationMetadata;
}

const DEFAULT_COLOR = "#00FF00";
const LINE_WIDTH = 2;
const CONTROL_POINT_RADIUS = 5;
const HIT_THRESHOLD = 12;

function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function createAnnotation(
  toolType: AnnotationToolType,
  coordinates: ImageCoordinate[],
  metadata: AnnotationMetadata = {},
): IDicomAnnotationState {
  return {
    annotationId: generateId(),
    toolType,
    coordinates,
    metadata,
  };
}

function getPixelSpacing(viewport: StackViewport): { row: number; col: number } {
  const imageData = viewport.getImageData();
  if (imageData && imageData.spacing) {
    return { row: imageData.spacing[1], col: imageData.spacing[0] };
  }
  return { row: 1, col: 1 };
}

function computeDistance(a: ImageCoordinate, b: ImageCoordinate): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function computeEllipseStats(
  viewport: StackViewport,
  center: ImageCoordinate,
  radiusX: number,
  radiusY: number,
): { mean: number; min: number; max: number } {
  const imageData = viewport.getImageData();
  if (!imageData) {
    return { mean: 0, min: 0, max: 0 };
  }

  const scalarData = imageData.scalarData;
  const dims = imageData.dimensions;
  const width = dims[0];
  const height = dims[1];
  const origin = imageData.origin;
  const spacing = imageData.spacing;

  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  let count = 0;

  const minCol = Math.max(0, Math.floor((center.x - radiusX - origin[0]) / spacing[0]));
  const maxCol = Math.min(width - 1, Math.ceil((center.x + radiusX - origin[0]) / spacing[0]));
  const minRow = Math.max(0, Math.floor((center.y - radiusY - origin[1]) / spacing[1]));
  const maxRow = Math.min(height - 1, Math.ceil((center.y + radiusY - origin[1]) / spacing[1]));

  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      const wx = col * spacing[0] + origin[0];
      const wy = row * spacing[1] + origin[1];
      const dx = (wx - center.x) / radiusX;
      const dy = (wy - center.y) / radiusY;
      if (dx * dx + dy * dy <= 1) {
        const value = scalarData[row * width + col] as number;
        sum += value;
        min = Math.min(min, value);
        max = Math.max(max, value);
        count++;
      }
    }
  }

  return {
    mean: count > 0 ? sum / count : 0,
    min: count > 0 ? min : 0,
    max: count > 0 ? max : 0,
  };
}

export class AnnotationManager {
  private annotations: IDicomAnnotationState[] = [];
  private selectedId: string | null = null;
  private onChangeCallback: (() => void) | null = null;

  add(annotation: IDicomAnnotationState): void {
    this.annotations.push(annotation);
    this.notify();
  }

  remove(id: string): void {
    this.annotations = this.annotations.filter((a) => a.annotationId !== id);
    if (this.selectedId === id) {
      this.selectedId = null;
    }
    this.notify();
  }

  clear(): void {
    this.annotations = [];
    this.selectedId = null;
    this.notify();
  }

  select(id: string | null): void {
    this.selectedId = id;
    this.notify();
  }

  getSelected(): IDicomAnnotationState | null {
    if (!this.selectedId) return null;
    return this.annotations.find((a) => a.annotationId === this.selectedId) ?? null;
  }

  getAll(): IDicomAnnotationState[] {
    return [...this.annotations];
  }

  hitTest(worldPoint: ImageCoordinate, viewport: StackViewport): string | null {
    const thresholdWorld = HIT_THRESHOLD * Math.max(
      getPixelSpacing(viewport).col,
      getPixelSpacing(viewport).row,
    );

    for (let i = this.annotations.length - 1; i >= 0; i--) {
      const ann = this.annotations[i]!;
      for (const coord of ann.coordinates) {
        const dist = computeDistance(worldPoint, coord);
        if (dist < thresholdWorld) {
          return ann.annotationId;
        }
      }
    }
    return null;
  }

  updateAnnotation(id: string, updates: Partial<IDicomAnnotationState>): void {
    const idx = this.annotations.findIndex((a) => a.annotationId === id);
    if (idx !== -1) {
      this.annotations[idx] = { ...this.annotations[idx], ...updates } as IDicomAnnotationState;
      this.notify();
    }
  }

  onChange(cb: () => void): void {
    this.onChangeCallback = cb;
  }

  private notify(): void {
    if (this.onChangeCallback) {
      this.onChangeCallback();
    }
  }
}

function drawDropShadowText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string = DEFAULT_COLOR,
): void {
  ctx.save();
  ctx.font = "bold 13px monospace";
  ctx.textBaseline = "bottom";

  const metrics = ctx.measureText(text);
  const pad = 4;

  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.fillRect(
    x - pad,
    y - metrics.actualBoundingBoxAscent - pad,
    metrics.width + pad * 2,
    metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent + pad * 2,
  );

  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawControlPoint(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  isSelected: boolean,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(sx, sy, CONTROL_POINT_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = DEFAULT_COLOR;
  ctx.fill();
  if (isSelected) {
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

function renderDistance(
  ctx: CanvasRenderingContext2D,
  ann: IDicomAnnotationState,
  viewport: StackViewport,
  isSelected: boolean,
): void {
  if (ann.coordinates.length < 2) return;

  const p1 = viewport.worldToCanvas(toWorldPoint(ann.coordinates[0]!));
  const p2 = viewport.worldToCanvas(toWorldPoint(ann.coordinates[1]!));

  ctx.save();
  ctx.strokeStyle = DEFAULT_COLOR;
  ctx.lineWidth = LINE_WIDTH;
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  ctx.beginPath();
  ctx.moveTo(p1[0], p1[1]);
  ctx.lineTo(p2[0], p2[1]);
  ctx.stroke();
  ctx.restore();

  drawControlPoint(ctx, p1[0], p1[1], isSelected);
  drawControlPoint(ctx, p2[0], p2[1], isSelected);

  const dist = ann.metadata.distanceCm ?? 0;
  const mx = (p1[0] + p2[0]) / 2;
  const my = (p1[1] + p2[1]) / 2;

  drawDropShadowText(ctx, `${dist.toFixed(2)} cm`, mx + 8, my - 4);
}

function renderEllipse(
  ctx: CanvasRenderingContext2D,
  ann: IDicomAnnotationState,
  viewport: StackViewport,
  isSelected: boolean,
): void {
  if (ann.coordinates.length < 2) return;

  const c1 = viewport.worldToCanvas(toWorldPoint(ann.coordinates[0]!));
  const c2 = viewport.worldToCanvas(toWorldPoint(ann.coordinates[1]!));

  const cx = (c1[0] + c2[0]) / 2;
  const cy = (c1[1] + c2[1]) / 2;
  const rx = Math.abs(c2[0] - c1[0]) / 2;
  const ry = Math.abs(c2[1] - c1[1]) / 2;

  ctx.save();
  ctx.strokeStyle = DEFAULT_COLOR;
  ctx.lineWidth = LINE_WIDTH;
  ctx.setLineDash([6, 3]);
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  drawControlPoint(ctx, c1[0], c1[1], isSelected);
  drawControlPoint(ctx, c2[0], c2[1], isSelected);

  const meta = ann.metadata;
  const lines: string[] = [];
  if (meta.areaCm2 != null) {
    lines.push(`Area: ${meta.areaCm2.toFixed(2)} cm²`);
  }
  if (meta.meanIntensity != null) {
    lines.push(`Mean: ${meta.meanIntensity.toFixed(1)}`);
  }
  if (meta.minIntensity != null) {
    lines.push(`Min: ${meta.minIntensity.toFixed(1)}`);
  }
  if (meta.maxIntensity != null) {
    lines.push(`Max: ${meta.maxIntensity.toFixed(1)}`);
  }

  if (lines.length > 0) {
    ctx.save();
    ctx.font = "bold 12px monospace";
    ctx.textBaseline = "top";
    const lineHeight = 16;
    const totalHeight = lines.length * lineHeight;

    let maxWidth = 0;
    for (const line of lines) {
      const m = ctx.measureText(line);
      if (m.width > maxWidth) maxWidth = m.width;
    }

    const bx = cx - rx - maxWidth / 2 - 8;
    const by = cy - totalHeight / 2 - 4;
    const bw = maxWidth + 16;
    const bh = totalHeight + 8;

    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(bx, by, bw, bh);

    ctx.fillStyle = DEFAULT_COLOR;
    lines.forEach((line, i) => {
      ctx.fillText(line, bx + 4, by + 4 + i * lineHeight);
    });
    ctx.restore();
  }
}

function renderArrow(
  ctx: CanvasRenderingContext2D,
  ann: IDicomAnnotationState,
  viewport: StackViewport,
  isSelected: boolean,
): void {
  if (ann.coordinates.length < 2) return;

  const head = viewport.worldToCanvas(toWorldPoint(ann.coordinates[0]!));
  const tail = viewport.worldToCanvas(toWorldPoint(ann.coordinates[1]!));

  ctx.save();
  ctx.strokeStyle = DEFAULT_COLOR;
  ctx.lineWidth = LINE_WIDTH;
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  ctx.beginPath();
  ctx.moveTo(tail[0], tail[1]);
  ctx.lineTo(head[0], head[1]);
  ctx.stroke();

  const angle = Math.atan2(head[1] - tail[1], head[0] - tail[0]);
  const arrowSize = 12;
  ctx.beginPath();
  ctx.moveTo(head[0], head[1]);
  ctx.lineTo(
    head[0] - arrowSize * Math.cos(angle - 0.4),
    head[1] - arrowSize * Math.sin(angle - 0.4),
  );
  ctx.lineTo(
    head[0] - arrowSize * Math.cos(angle + 0.4),
    head[1] - arrowSize * Math.sin(angle + 0.4),
  );
  ctx.closePath();
  ctx.fillStyle = DEFAULT_COLOR;
  ctx.fill();
  ctx.restore();

  drawControlPoint(ctx, head[0], head[1], isSelected);
  drawControlPoint(ctx, tail[0], tail[1], isSelected);

  if (ann.metadata.label) {
    drawDropShadowText(ctx, ann.metadata.label, tail[0] + 10, tail[1]);
  }
}

export function renderAnnotations(
  ctx: CanvasRenderingContext2D,
  annotations: IDicomAnnotationState[],
  selectedId: string | null,
  viewport: StackViewport,
  previewAnnotation: IDicomAnnotationState | null,
): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  for (const ann of annotations) {
    const isSelected = ann.annotationId === selectedId;
    switch (ann.toolType) {
      case "distance":
        renderDistance(ctx, ann, viewport, isSelected);
        break;
      case "ellipse":
        renderEllipse(ctx, ann, viewport, isSelected);
        break;
      case "arrow":
        renderArrow(ctx, ann, viewport, isSelected);
        break;
    }
  }

  if (previewAnnotation) {
    switch (previewAnnotation.toolType) {
      case "distance":
        renderDistance(ctx, previewAnnotation, viewport, false);
        break;
      case "ellipse":
        renderEllipse(ctx, previewAnnotation, viewport, false);
        break;
      case "arrow":
        renderArrow(ctx, previewAnnotation, viewport, false);
        break;
    }
  }
}

export function finalizeDistanceAnnotation(
  viewport: StackViewport,
  worldStart: ImageCoordinate,
  worldEnd: ImageCoordinate,
): IDicomAnnotationState {
  const spacing = getPixelSpacing(viewport);
  const dx = (worldEnd.x - worldStart.x) / spacing.col;
  const dy = (worldEnd.y - worldStart.y) / spacing.row;
  const distanceMm = Math.sqrt(dx * dx * spacing.col * spacing.col + dy * dy * spacing.row * spacing.row);
  const distanceCm = distanceMm / 10;

  return createAnnotation(
    "distance",
    [worldStart, worldEnd],
    { distanceCm },
  );
}

export function finalizeEllipseAnnotation(
  viewport: StackViewport,
  worldCorner1: ImageCoordinate,
  worldCorner2: ImageCoordinate,
): IDicomAnnotationState {
  const center: ImageCoordinate = {
    x: (worldCorner1.x + worldCorner2.x) / 2,
    y: (worldCorner1.y + worldCorner2.y) / 2,
  };
  const radiusX = Math.abs(worldCorner2.x - worldCorner1.x) / 2;
  const radiusY = Math.abs(worldCorner2.y - worldCorner1.y) / 2;

  const areaCm2 = (Math.PI * radiusX * radiusY) / 100;

  const stats = computeEllipseStats(viewport, center, radiusX, radiusY);

  return createAnnotation("ellipse", [worldCorner1, worldCorner2], {
    areaCm2,
    meanIntensity: stats.mean,
    minIntensity: stats.min,
    maxIntensity: stats.max,
  });
}

export function finalizeArrowAnnotation(
  worldHead: ImageCoordinate,
  worldTail: ImageCoordinate,
  label?: string,
): IDicomAnnotationState {
  return createAnnotation("arrow", [worldHead, worldTail], {
    label: label || "",
  });
}
