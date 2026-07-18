"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { init as csInit, RenderingEngine, StackViewport } from "@cornerstonejs/core";
import { ViewportType } from "@cornerstonejs/core/enums";
import { init as dicomImageLoaderInit } from "@cornerstonejs/dicom-image-loader";
import { DicomViewerToolbar } from "./dicom-viewer-toolbar";
import { DicomCanvasOverlay } from "./dicom-canvas-overlay";
import { AnnotationManager, type ActiveTool } from "./dicom-annotation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001";

interface PatientInfo {
  id: string;
  mrn: string;
  first_name_en: string;
  last_name_en: string;
  date_of_birth?: string;
  sex?: string;
}

interface DicomStudy {
  id: string;
  patient_id: string;
  file_path: string;
  modality: string;
  body_part?: string;
  study_date?: string;
  description?: string;
  created_at: string;
  patient: PatientInfo;
}

interface DicomViewerProps {
  study: DicomStudy;
  onClose: () => void;
}

const VIEWPORT_ID = "dicomStackViewport";
const RENDERING_ENGINE_ID = "dicomViewerEngine";

export function DicomViewer({ study, onClose }: DicomViewerProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const renderingEngineRef = useRef<RenderingEngine | null>(null);
  const viewportRef = useRef<StackViewport | null>(null);
  const [activeTool, setActiveTool] = useState<ActiveTool>("pan");
  const [currentFrame, setCurrentFrame] = useState(1);
  const [totalFrames, setTotalFrames] = useState(1);
  const [initError, setInitError] = useState<string | null>(null);
  const [annotationCount, setAnnotationCount] = useState(0);
  const initializedRef = useRef(false);
  const engineIdRef = useRef(`${RENDERING_ENGINE_ID}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);

  const annotationManagerRef = useRef<AnnotationManager>(new AnnotationManager());

  const imageId = `wadouri:${API_BASE}/api/specialist/dicom/${study.id}/frame/1`;

  const markDirty = useCallback(() => {
    setAnnotationCount(annotationManagerRef.current.getAll().length);
  }, []);

  useEffect(() => {
    annotationManagerRef.current.onChange(markDirty);
  }, [markDirty]);

  const destroyViewer = useCallback(() => {
    if (renderingEngineRef.current) {
      renderingEngineRef.current.destroy();
      renderingEngineRef.current = null;
    }
    viewportRef.current = null;
    initializedRef.current = false;
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Delete" || e.key === "Backspace") {
        const selected = annotationManagerRef.current.getSelected();
        if (selected) {
          annotationManagerRef.current.remove(selected.annotationId);
        }
      }
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    if (initializedRef.current) return;
    let cancelled = false;

    async function initViewer() {
      try {
        const suppressVrWarning = (args: unknown[]) =>
          args.some((a) => typeof a === "string" && /Invalid vr type/i.test(a));

        const origWarn = console.warn.bind(console);
        console.warn = (...args) => {
          if (suppressVrWarning(args)) return;
          origWarn(...args);
        };

        const origError = console.error.bind(console);
        console.error = (...args) => {
          if (suppressVrWarning(args)) return;
          origError(...args);
        };

        await csInit();
        dicomImageLoaderInit({
          maxWebWorkers: Math.min(navigator.hardwareConcurrency || 1, 2),
        });

        if (cancelled || !elementRef.current) return;

        const renderingEngine = new RenderingEngine(engineIdRef.current);
        renderingEngineRef.current = renderingEngine;

        const viewportInput = {
          viewportId: VIEWPORT_ID,
          type: ViewportType.STACK,
          element: elementRef.current,
          defaultOptions: {
            background: [0, 0, 0] as [number, number, number],
          },
        };

        await renderingEngine.enableElement(viewportInput);
        const viewport = renderingEngine.getViewport(VIEWPORT_ID) as StackViewport;
        if (!viewport) {
          throw new Error("Viewport initialization failed");
        }
        viewportRef.current = viewport;

        const imageIds = [imageId];
        await viewport.setStack(imageIds);

        renderingEngine.render();

        setTotalFrames(imageIds.length);
        setCurrentFrame(1);
        initializedRef.current = true;
      } catch (err) {
        console.error("cornerstone3D init error:", err);
        if (!cancelled) {
          setInitError(
            err instanceof Error ? err.message : "Failed to initialize DICOM viewer",
          );
        }
      }
    }

    initViewer();

    return () => {
      cancelled = true;
      destroyViewer();
    };
  }, [imageId, destroyViewer]);

  const handlePrevFrame = useCallback(() => {
    setCurrentFrame((f) => Math.max(1, f - 1));
  }, []);

  const handleNextFrame = useCallback(() => {
    setCurrentFrame((f) => Math.min(totalFrames, f + 1));
  }, [totalFrames]);

  const patient = study.patient;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="relative flex h-[90vh] w-full max-w-6xl flex-col rounded-2xl overflow-hidden bg-[#0C0F12] border border-slate-800 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 bg-[#14181B] px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="rounded bg-[#00D4B2]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#00D4B2]">
              {study.modality}
            </span>
            <span className="text-sm text-slate-400">
              {patient.first_name_en} {patient.last_name_en}
            </span>
            {patient.mrn && (
              <span className="font-mono text-[10px] text-slate-500">
                {patient.mrn}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:bg-red-900 hover:text-white transition-all"
          >
            Close
          </button>
        </div>

        <DicomViewerToolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          currentFrame={currentFrame}
          totalFrames={totalFrames}
          onPrevFrame={handlePrevFrame}
          onNextFrame={handleNextFrame}
        />

        <div className="flex flex-1 overflow-hidden">
          <div className="relative flex flex-1 items-center justify-center bg-black">
            {initError ? (
              <div className="flex flex-col items-center gap-3 text-center px-8">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#FF9900"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-sm text-slate-400 max-w-md">{initError}</p>
              </div>
            ) : (
              <>
                <div
                  ref={elementRef}
                  className="absolute inset-0"
                  style={{ pointerEvents: "none" }}
                />
                <DicomCanvasOverlay
                  viewportRef={viewportRef}
                  activeTool={activeTool}
                  annotationManager={annotationManagerRef.current}
                />
              </>
            )}
          </div>

          <div className="w-64 border-l border-slate-800 bg-[#111416] p-4 text-xs text-slate-400 space-y-4 overflow-y-auto">
            <div>
              <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Patient
              </h4>
              <div className="space-y-1">
                <p className="text-slate-300">
                  {patient.first_name_en} {patient.last_name_en}
                </p>
                <p className="font-mono text-[10px]">{patient.mrn}</p>
                {patient.sex && <p>Sex: {patient.sex}</p>}
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Study
              </h4>
              <div className="space-y-1">
                <p>
                  Modality:{" "}
                  <span className="text-slate-300">{study.modality}</span>
                </p>
                {study.body_part && (
                  <p>
                    Body Part:{" "}
                    <span className="text-slate-300">{study.body_part}</span>
                  </p>
                )}
                {study.study_date && (
                  <p>
                    Date:{" "}
                    <span className="text-slate-300">
                      {new Date(study.study_date).toLocaleDateString()}
                    </span>
                  </p>
                )}
                {study.description && (
                  <p>
                    Description:{" "}
                    <span className="text-slate-300">{study.description}</span>
                  </p>
                )}
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Annotations
              </h4>
              <div className="space-y-1">
                <p>
                  Count:{" "}
                  <span className="text-slate-300">{annotationCount}</span>
                </p>
                <p className="text-[10px] text-slate-500">
                  Left-drag: {activeTool === "pan" ? "Pan" : activeTool === "wl" ? "Window level" : `Draw ${activeTool}`}
                </p>
                <p className="text-[10px] text-slate-500">Right-drag: Window level</p>
                <p className="text-[10px] text-slate-500">Scroll: Zoom</p>
                <p className="text-[10px] text-slate-500">Del: Delete selected</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
