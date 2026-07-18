"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { StackViewport } from "@cornerstonejs/core";
import {
  type ActiveTool,
  type ImageCoordinate,
  type IDicomAnnotationState,
  AnnotationManager,
  renderAnnotations,
  finalizeDistanceAnnotation,
  finalizeEllipseAnnotation,
  finalizeArrowAnnotation,
} from "./dicom-annotation";

interface CanvasOverlayProps {
  viewportRef: React.MutableRefObject<StackViewport | null>;
  activeTool: ActiveTool;
  annotationManager: AnnotationManager;
}

export function DicomCanvasOverlay({
  viewportRef,
  activeTool,
  annotationManager,
}: CanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const needsRender = useRef(true);
  const renderRef = useRef<() => void>(() => {});
  const [arrowLabelModal, setArrowLabelModal] = useState<{
    isOpen: boolean;
    worldHead: ImageCoordinate;
    worldTail: ImageCoordinate;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    annotationId: string;
  } | null>(null);
  const interactionRef = useRef<{
    active: boolean;
    type: "pan" | "windowing" | "drawing" | "none";
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    initialPan?: { x: number; y: number };
    initialVoi?: { lower: number; upper: number };
    drawingTool?: ActiveTool;
    drawingStartWorld?: ImageCoordinate;
  }>({
    active: false,
    type: "none",
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });

  const previewAnnotation = useRef<IDicomAnnotationState | null>(null);

  const markDirty = useCallback(() => {
    needsRender.current = true;
  }, []);

  useEffect(() => {
    annotationManager.onChange(markDirty);
  }, [annotationManager, markDirty]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width = width;
        canvas.height = height;
        markDirty();
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [viewportRef, markDirty]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!canvas || !viewport) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    renderAnnotations(
      ctx,
      annotationManager.getAll(),
      annotationManager.getSelected()?.annotationId ?? null,
      viewport,
      previewAnnotation.current,
    );

    needsRender.current = false;
  }, [viewportRef, annotationManager]);

  renderRef.current = render;

  useEffect(() => {
    let running = true;
    function loop() {
      if (!running) return;
      if (needsRender.current) {
        render();
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [render]);

  const getWorldPoint = useCallback(
    (clientX: number, clientY: number): ImageCoordinate | null => {
      const canvas = canvasRef.current;
      const viewport = viewportRef.current;
      if (!canvas || !viewport) return null;

      const rect = canvas.getBoundingClientRect();
      const canvasX = clientX - rect.left;
      const canvasY = clientY - rect.top;

      const world = viewport.canvasToWorld([canvasX, canvasY]);
      return { x: world[0], y: world[1] };
    },
    [viewportRef],
  );

  const handleDeleteAnnotation = useCallback(() => {
    if (contextMenu) {
      annotationManager.remove(contextMenu.annotationId);
      setContextMenu(null);
      needsRender.current = true;
      renderRef.current();
    }
  }, [contextMenu, annotationManager]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setContextMenu(null);

      const viewport = viewportRef.current;
      const canvas = canvasRef.current;
      if (!viewport || !canvas) return;

      const rect = canvas.getBoundingClientRect();
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;

      if (e.button === 2) {
        if (activeTool === "select") {
          const selected = annotationManager.getSelected();
          if (selected) {
            setContextMenu({
              x: e.clientX,
              y: e.clientY,
              annotationId: selected.annotationId,
            });
            return;
          }
        }
        const voiRange = viewport.getProperties()?.voiRange;
        const initialLower = voiRange?.lower ?? 0;
        const initialUpper = voiRange?.upper ?? 0;
        interactionRef.current = {
          active: true,
          type: "windowing",
          startX: canvasX,
          startY: canvasY,
          currentX: canvasX,
          currentY: canvasY,
          initialVoi: { lower: initialLower, upper: initialUpper },
        };
        return;
      }

      if (e.button !== 0) return;

      if (activeTool === "pan") {
        const currentPan = viewport.getPan();
        interactionRef.current = {
          active: true,
          type: "pan",
          startX: canvasX,
          startY: canvasY,
          currentX: canvasX,
          currentY: canvasY,
          initialPan: { x: currentPan[0], y: currentPan[1] },
        };
        return;
      }

      if (activeTool === "select") {
        const worldPoint = getWorldPoint(e.clientX, e.clientY);
        if (!worldPoint) return;
        const hitId = annotationManager.hitTest(worldPoint, viewport);
        if (hitId) {
          annotationManager.select(hitId);
        } else {
          annotationManager.select(null);
        }
        return;
      }

      if (
        activeTool === "distance" ||
        activeTool === "ellipse" ||
        activeTool === "arrow"
      ) {
        const worldPoint = getWorldPoint(e.clientX, e.clientY);
        if (!worldPoint) return;

        interactionRef.current = {
          active: true,
          type: "drawing",
          startX: canvasX,
          startY: canvasY,
          currentX: canvasX,
          currentY: canvasY,
          drawingTool: activeTool,
          drawingStartWorld: worldPoint,
        };
        return;
      }
    },
    [viewportRef, activeTool, annotationManager, getWorldPoint],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const viewport = viewportRef.current;
      const canvas = canvasRef.current;
      if (!viewport || !canvas) return;

      const rect = canvas.getBoundingClientRect();
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;

      const interaction = interactionRef.current;
      if (!interaction.active) {
        e.preventDefault();
        return;
      }

      interaction.currentX = canvasX;
      interaction.currentY = canvasY;

      if (interaction.type === "pan" && interaction.initialPan) {
        const dx = canvasX - interaction.startX;
        const dy = canvasY - interaction.startY;
        viewport.setPan([
          interaction.initialPan.x + dx,
          interaction.initialPan.y + dy,
        ]);
        viewport.render();
        markDirty();
        e.preventDefault();
        return;
      }

      if (interaction.type === "windowing" && interaction.initialVoi) {
        const dx = (canvasX - interaction.startX) * 0.5;
        const dy = (interaction.startY - canvasY) * 0.5;
        const center = (interaction.initialVoi.lower + interaction.initialVoi.upper) / 2;
        const width = interaction.initialVoi.upper - interaction.initialVoi.lower;
        const newWidth = Math.max(1, width + dx);
        const newCenter = center + dy;
        const newLower = newCenter - newWidth / 2;
        const newUpper = newCenter + newWidth / 2;
        viewport.setProperties({ voiRange: { lower: newLower, upper: newUpper } });
        viewport.render();
        markDirty();
        e.preventDefault();
        return;
      }

      if (interaction.type === "drawing" && interaction.drawingStartWorld) {
        const worldEnd = getWorldPoint(e.clientX, e.clientY);
        if (!worldEnd) return;

        const tool = interaction.drawingTool as ActiveTool;
        if (tool === "distance") {
          const temp = finalizeDistanceAnnotation(
            viewport,
            interaction.drawingStartWorld,
            worldEnd,
          );
          previewAnnotation.current = temp;
          markDirty();
        } else if (tool === "ellipse") {
          const temp = finalizeEllipseAnnotation(
            viewport,
            interaction.drawingStartWorld,
            worldEnd,
          );
          previewAnnotation.current = temp;
          markDirty();
        } else if (tool === "arrow") {
          const temp = finalizeArrowAnnotation(
            interaction.drawingStartWorld,
            worldEnd,
          );
          previewAnnotation.current = temp;
          markDirty();
        }
        e.preventDefault();
        return;
      }
    },
    [viewportRef, getWorldPoint, markDirty],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      const interaction = interactionRef.current;

      if (
        interaction.type === "drawing" &&
        interaction.drawingStartWorld &&
        previewAnnotation.current
      ) {
        if (
          activeTool === "distance" ||
          activeTool === "ellipse" ||
          activeTool === "arrow"
        ) {
          const worldEnd = getWorldPoint(e.clientX, e.clientY);
          if (worldEnd) {
            let finalAnn: IDicomAnnotationState;
            if (activeTool === "distance") {
              finalAnn = finalizeDistanceAnnotation(
                viewport,
                interaction.drawingStartWorld,
                worldEnd,
              );
            } else if (activeTool === "ellipse") {
              finalAnn = finalizeEllipseAnnotation(
                viewport,
                interaction.drawingStartWorld,
                worldEnd,
              );
            } else {
              setArrowLabelModal({
                isOpen: true,
                worldHead: interaction.drawingStartWorld,
                worldTail: worldEnd,
              });
              previewAnnotation.current = null;
              interactionRef.current = {
                active: false,
                type: "none",
                startX: 0,
                startY: 0,
                currentX: 0,
                currentY: 0,
              };
              markDirty();
              return;
            }
            annotationManager.add(finalAnn);
          }
        }
      }

      previewAnnotation.current = null;
      interactionRef.current = {
        active: false,
        type: "none",
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
      };
      markDirty();
    },
    [viewportRef, activeTool, annotationManager, getWorldPoint, markDirty],
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      const viewport = viewportRef.current;
      const canvas = canvasRef.current;
      if (!viewport || !canvas) return;

      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;

      const currentZoom = viewport.getZoom();
      const delta = -e.deltaY * 0.001;
      const newZoom = Math.max(0.1, Math.min(20, currentZoom * (1 + delta)));

      const worldBefore = viewport.canvasToWorld([canvasX, canvasY]);
      viewport.setZoom(newZoom);
      const worldAfter = viewport.canvasToWorld([canvasX, canvasY]);

      const currentPan = viewport.getPan();
      viewport.setPan([
        currentPan[0] + (worldAfter[0] - worldBefore[0]),
        currentPan[1] + (worldAfter[1] - worldBefore[1]),
      ]);

      viewport.render();
      markDirty();
    },
    [viewportRef, markDirty],
  );

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const handleArrowLabelSubmit = useCallback(
    (label: string) => {
      if (!arrowLabelModal) return;
      const finalAnn = finalizeArrowAnnotation(
        arrowLabelModal.worldHead,
        arrowLabelModal.worldTail,
        label || undefined,
      );
      annotationManager.add(finalAnn);
      setArrowLabelModal(null);
    },
    [arrowLabelModal, annotationManager],
  );

  const handleArrowLabelCancel = useCallback(() => {
    setArrowLabelModal(null);
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-10"
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
      />
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[120px] rounded-lg border border-slate-700 bg-[#1A1D23] py-1 shadow-xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={handleDeleteAnnotation}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900/30 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Delete
          </button>
        </div>
      )}
      {arrowLabelModal && (
        <ArrowLabelModal
          onSubmit={handleArrowLabelSubmit}
          onCancel={handleArrowLabelCancel}
        />
      )}
    </div>
  );
}

function ArrowLabelModal({
  onSubmit,
  onCancel,
}: {
  onSubmit: (label: string) => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSubmit(value);
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div className="w-80 rounded-xl border border-slate-700 bg-[#1A1D23] p-5 shadow-2xl">
        <h3 className="mb-1 text-sm font-bold text-slate-200">Annotation Label</h3>
        <p className="mb-3 text-[11px] text-slate-400">
          Enter a label for this arrow annotation
        </p>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. Calcification noted"
          className="w-full rounded-lg bg-[#0C0F12] px-3 py-2 text-xs text-slate-200 outline-none transition-all placeholder:text-slate-500"
        />
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-400 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(value)}
            disabled={!value.trim()}
            className="rounded-lg bg-[#00D4B2] px-3 py-1.5 text-xs font-semibold text-[#0A2540] hover:bg-[#00c2a2] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Save
          </button>
        </div>
      </div>
      </div>
    );
  }

