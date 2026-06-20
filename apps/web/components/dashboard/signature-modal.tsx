"use client";

import { useState, useRef, useCallback } from "react";
import { mbbsApi } from "@/lib/mbbs-api";

const IMGBB_API_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY || "a6ff5c63541cad880f7b03aeca9060be";
const MAX_WIDTH = 450;
const MAX_HEIGHT = 150;

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SignatureUploadModal({ open, onClose }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ w: number; h: number } | null>(null);
  const [dimensionError, setDimensionError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = useCallback(() => {
    setPreview(null);
    setRawFile(null);
    setError(null);
    setDimensions(null);
    setDimensionError(null);
    setSuccess(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const validateImage = (file: File): Promise<{ valid: boolean; w: number; h: number }> =>
    new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ valid: img.width <= MAX_WIDTH && img.height <= MAX_HEIGHT, w: img.width, h: img.height });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ valid: false, w: 0, h: 0 });
      };
      img.src = url;
    });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setDimensionError(null);
    setSuccess(false);

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be smaller than 2MB.");
      return;
    }

    const { valid, w, h } = await validateImage(file);
    setDimensions({ w, h });

    if (!valid) {
      setDimensionError(`Image dimensions must be within ${MAX_WIDTH}x${MAX_HEIGHT}px (yours: ${w}x${h}px). Please crop and try again.`);
      setPreview(null);
      setRawFile(null);
      return;
    }

    setRawFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!rawFile) return;

    setUploading(true);
    setError(null);

    try {
      // Convert to base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1] ?? "");
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(rawFile);
      });

      // Upload to ImageBB
      const formData = new URLSearchParams();
      formData.append("key", IMGBB_API_KEY);
      formData.append("image", base64);

      const imgbbRes = await fetch("https://api.imgbb.com/1/upload", {
        method: "POST",
        body: formData,
      });

      const imgbbData = await imgbbRes.json();

      if (!imgbbData.success) {
        throw new Error(imgbbData.error?.message || "Image upload failed");
      }

      const imageUrl = imgbbData.data.url;

      // Save to backend
      await mbbsApi.updateSignature(imageUrl);

      setSuccess(true);
      setTimeout(handleClose, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold tracking-tight text-[#0A2540]">Add Digital Signature</h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Disclaimer */}
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-[11px] leading-relaxed text-amber-800">
            <strong>Disclaimer:</strong> By uploading your signature, you acknowledge that it will be used on official prescription documents and medical records issued through this system. This signature represents your digital consent and attestation as a registered medical practitioner. Please ensure the signature is clear and matches your official records.
          </p>
        </div>

        {/* Upload area */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`mb-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 transition-colors ${
            preview
              ? "border-[#00D4B2] bg-[#00D4B2]/5"
              : "border-slate-200 bg-[#F8F9FA] hover:border-[#00D4B2]/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {preview ? (
            <div className="flex flex-col items-center gap-3">
              <img
                src={preview}
                alt="Signature preview"
                className="max-h-[120px] rounded-lg border border-slate-200 object-contain"
              />
              {dimensions && (
                <span className="text-[10px] text-slate-500">
                  {dimensions.w} × {dimensions.h}px
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  reset();
                }}
                className="text-[11px] font-medium text-red-500 hover:underline"
              >
                Remove & re-select
              </button>
            </div>
          ) : (
            <>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="mt-2 text-xs font-medium text-slate-500">
                Click to upload signature
              </p>
              <p className="mt-1 text-[10px] text-slate-400">
                PNG, JPG up to 2MB · Max {MAX_WIDTH}×{MAX_HEIGHT}px
              </p>
            </>
          )}
        </div>

        {/* Dimension error */}
        {dimensionError && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
            <p className="text-[11px] text-red-600">{dimensionError}</p>
          </div>
        )}

        {/* General error */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
            <p className="text-[11px] text-red-600">{error}</p>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mb-4 rounded-xl border border-green-100 bg-green-50 px-4 py-3">
            <p className="text-[11px] font-medium text-green-700">Signature saved successfully!</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleClose}
            disabled={uploading}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!rawFile || uploading || !!dimensionError}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0A2540] px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-[#0A2540]/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Uploading...
              </>
            ) : (
              "Upload Signature"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
