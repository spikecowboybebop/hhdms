"use client";

import { useEffect, useRef, useState } from "react";
import type { PatientDocument } from "@/lib/mbbs-api";
import { mbbsApi } from "@/lib/mbbs-api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001";

interface DocumentViewerModalProps {
  document: PatientDocument;
  patientId: string;
  onClose: () => void;
}

export function DocumentViewerModal({ document: doc, patientId, onClose }: DocumentViewerModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(true);
  const [textError, setTextError] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";

    mbbsApi.getDocumentText(patientId, doc.id)
      .then((res) => {
        setExtractedText(res.text);
        setTextLoading(false);
      })
      .catch(() => {
        setTextError(true);
        setTextLoading(false);
      });

    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose, patientId, doc.id]);

  const isImage = doc.file_type.startsWith("image/");
  const isPdf = doc.file_type === "application/pdf";
  const isDocx = doc.file_type.includes("wordprocessingml") || doc.file_type === "application/msword";
  const fileUrl = doc.file_url.startsWith("http") ? doc.file_url : `${API_BASE}${doc.file_url}`;
  const officeViewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fileUrl)}`;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="relative w-full max-w-5xl max-h-[90vh] rounded-2xl bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-200/60 px-6 py-4">
          <div className="flex flex-col">
            <h3 className="text-sm font-bold text-[#0A2540]">{doc.file_name}</h3>
            <span className="text-[10px] text-[#2D3A4A]">
              {(doc.file_size / 1024).toFixed(1)} KB &middot; {doc.file_type}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200/60 px-3 py-1.5 text-xs font-semibold text-[#2D3A4A] hover:border-[#0A2540] hover:text-[#0A2540] transition-all"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden flex-1">
          <div className="border-r border-slate-200/60 p-4 flex items-start justify-center overflow-auto bg-[#F8F9FA] min-h-[300px] max-h-[70vh]">
            {isImage ? (
              <img
                src={fileUrl}
                alt={doc.file_name}
                className="max-w-full max-h-[65vh] rounded-lg object-contain shadow-sm"
              />
            ) : isPdf ? (
              <iframe
                src={fileUrl}
                className="w-full h-[65vh] rounded-lg border border-slate-200/60"
                title={doc.file_name}
              />
            ) : isDocx ? (
              <iframe
                src={officeViewerUrl}
                className="w-full h-[65vh] rounded-lg border border-slate-200/60"
                title={doc.file_name}
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 text-[#2D3A4A] py-12">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <span className="text-sm font-medium">Preview not available for this file type</span>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-[#0A2540] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0A2540]/90 transition-all"
                >
                  Open File
                </a>
              </div>
            )}
          </div>

          <div className="p-4 overflow-auto max-h-[70vh] bg-white">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#2D3A4A] mb-3">
              Extracted Text
            </h4>
            {textLoading ? (
              <div className="flex flex-col items-center justify-center gap-2 text-[#2D3A4A] py-12">
                <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-xs font-medium">Extracting text...</span>
              </div>
            ) : textError ? (
              <div className="flex flex-col items-center justify-center gap-2 text-[#2D3A4A] py-12">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <span className="text-xs font-medium">Text extraction failed</span>
              </div>
            ) : extractedText ? (
              <div className="space-y-1">
                {extractedText.split('\n').map((line, i) => {
                  if (line === '') return <div key={i} className="h-3" />;
                  const isHeader = /^[A-Z][A-Z\s]+$/.test(line) || /^[A-Z][A-Za-z\s]+:$/.test(line);
                  if (isHeader) {
                    return <p key={i} className="text-sm font-bold text-[#0A2540] mt-4 mb-1">{line}</p>;
                  }
                  const parts = line.split(/(\b(?:HIGH|LOW|CRITICAL|ABNORMAL|ELEVATED|DECREASED|NORMAL|BORDERLINE)\b)/gi);
                  if (parts.length > 1) {
                    return (
                      <p key={i} className="text-sm text-[#2D3A4A] leading-relaxed">
                        {parts.map((part, j) => {
                          const upper = part.toUpperCase();
                          if (['HIGH', 'CRITICAL', 'ABNORMAL', 'ELEVATED'].includes(upper)) {
                            return <span key={j} className="text-red-500 font-semibold">{part}</span>;
                          }
                          if (['LOW', 'DECREASED'].includes(upper)) {
                            return <span key={j} className="text-orange-500 font-semibold">{part}</span>;
                          }
                          if (['NORMAL', 'BORDERLINE'].includes(upper)) {
                            return <span key={j} className="text-emerald-600 font-semibold">{part}</span>;
                          }
                          return <span key={j}>{part}</span>;
                        })}
                      </p>
                    );
                  }
                  const refMatch = line.match(/(.*?)([<>=]+\s*\d+[\d\s.,]*\s*(?:mg\/dL|mmol\/L|g\/dL|u\/L|mEq\/L|%|cells\/uL|fL|pg|pg\/mL|ng\/mL|IU\/L|mm\/hr|ratio))/i);
                  if (refMatch) {
                    return (
                      <p key={i} className="text-sm text-[#2D3A4A] leading-relaxed">
                        <span>{refMatch[1]}</span>
                        <span className="text-gray-400 ml-1">{refMatch[2]}</span>
                      </p>
                    );
                  }
                  return <p key={i} className="text-sm text-[#2D3A4A] leading-relaxed">{line}</p>;
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 text-[#2D3A4A] py-12">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
                <span className="text-xs font-medium">No text available</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
