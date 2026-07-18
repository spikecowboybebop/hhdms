"use client";

import type { ReactNode } from "react";
import type { ActiveTool } from "./dicom-annotation";

interface DicomViewerToolbarProps {
  activeTool: ActiveTool;
  onToolChange: (tool: ActiveTool) => void;
  currentFrame: number;
  totalFrames: number;
  onPrevFrame: () => void;
  onNextFrame: () => void;
}

const tools: { key: ActiveTool; label: string; icon: ReactNode }[] = [
  {
    key: "pan",
    label: "Pan",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="5 9 2 12 5 15" />
        <polyline points="9 5 12 2 15 5" />
        <polyline points="15 19 12 22 9 19" />
        <polyline points="19 9 22 12 19 15" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <line x1="12" y1="2" x2="12" y2="22" />
      </svg>
    ),
  },
  {
    key: "wl",
    label: "WL",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    ),
  },
  {
    key: "select",
    label: "Select",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
        <path d="M13 13l6 6" />
      </svg>
    ),
  },
  {
    key: "distance",
    label: "Dist",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="20" x2="20" y2="4" />
        <circle cx="4" cy="20" r="2" />
        <circle cx="20" cy="4" r="2" />
        <text x="8" y="16" fontSize="8" fill="currentColor" stroke="none">cm</text>
      </svg>
    ),
  },
  {
    key: "ellipse",
    label: "ROI",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="12" rx="9" ry="6" strokeDasharray="3 2" />
        <text x="8" y="15" fontSize="8" fill="currentColor" stroke="none">ROI</text>
      </svg>
    ),
  },
  {
    key: "arrow",
    label: "Arrow",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="6" y1="18" x2="18" y2="6" />
        <polyline points="18 6 10 7 18 6 17 14" />
      </svg>
    ),
  },
];

export function DicomViewerToolbar({
  activeTool,
  onToolChange,
  currentFrame,
  totalFrames,
  onPrevFrame,
  onNextFrame,
}: DicomViewerToolbarProps) {
  return (
    <div className="flex items-center justify-between border-b border-slate-800 bg-[#14181B] px-4 py-2">
      <div className="flex items-center gap-1">
        {tools.map((t) => (
          <button
            key={t.key}
            onClick={() => onToolChange(t.key)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
              activeTool === t.key
                ? "bg-[#00D4B2]/20 text-[#00D4B2]"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {totalFrames > 1 && (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <button
            onClick={onPrevFrame}
            disabled={currentFrame <= 1}
            className="rounded px-2 py-1 font-mono hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            ‹ Prev
          </button>
          <span className="font-mono text-slate-300">
            {currentFrame} / {totalFrames}
          </span>
          <button
            onClick={onNextFrame}
            disabled={currentFrame >= totalFrames}
            className="rounded px-2 py-1 font-mono hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Next ›
          </button>
        </div>
      )}
    </div>
  );
}
