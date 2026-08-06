"use client";

import { useEffect, useState } from "react";
import { adminApi, type InvoiceRecord } from "@/lib/admin-api";

function formatBDT(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return `৳${amount.toLocaleString("en-IN")}`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function InvoiceReceiptModal({
  paymentId,
  ticketNo,
  onClose,
  onToast,
}: {
  paymentId: string;
  ticketNo?: string | null;
  onClose: () => void;
  onToast?: (message: string) => void;
}) {
  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .getPaymentInvoice(paymentId)
      .then((inv) => {
        setInvoice(inv);
        setLoading(false);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load invoice.");
        setLoading(false);
      });
  }, [paymentId]);

  const handleDownload = async () => {
    setPdfLoading(true);
    setError(null);
    try {
      const result = await adminApi.getPaymentInvoicePdf(paymentId);
      window.open(result.file_url, "_blank", "noopener,noreferrer");
      onToast?.("Invoice PDF generated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate PDF.");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200/60 px-6 py-4">
          <h2 className="text-base font-bold text-[#0A2540]">Invoice / Receipt</h2>
          <p className="text-xs text-[#2D3A4A]">
            {ticketNo ?? "Payment"}
          </p>
        </div>
        <div className="px-6 py-5">
          {loading ? (
            <div className="flex items-center gap-3 py-6">
              <span className="h-3 w-3 animate-pulse rounded-full bg-[#00D4B2]" />
              <span className="text-sm text-[#2D3A4A]">Loading invoice…</span>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
              {error}
            </div>
          ) : invoice ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-[#F8F9FA] px-4 py-3">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]">
                  Invoice No
                </span>
                <span className="font-mono text-sm font-bold text-[#0A2540]">
                  {invoice.invoice_no}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]/60">
                    Amount
                  </span>
                  <span className="text-base font-bold text-[#0A2540]">
                    {formatBDT(invoice.amount)}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]/60">
                    Status
                  </span>
                  <span className="text-sm font-semibold text-[#0A2540]">
                    {invoice.status.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]/60">
                    Issued
                  </span>
                  <span className="text-sm text-[#2D3A4A]">
                    {formatDate(invoice.issued_at)}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]/60">
                    Paid
                  </span>
                  <span className="text-sm text-[#2D3A4A]">
                    {formatDate(invoice.paid_at)}
                  </span>
                </div>
              </div>
              {invoice.patient && (
                <div className="rounded-xl border border-slate-200/60 px-4 py-3 text-xs text-[#2D3A4A]">
                  <span className="block text-[10px] font-semibold uppercase tracking-widest text-[#2D3A4A]/60">
                    Billed To
                  </span>
                  {invoice.patient.first_name_en} {invoice.patient.last_name_en} ·{" "}
                  <span className="font-mono">{invoice.patient.mrn}</span>
                </div>
              )}
              <button
                onClick={handleDownload}
                disabled={pdfLoading}
                className="w-full rounded-xl bg-[#0A2540] px-5 py-2.5 text-xs font-bold text-[#00D4B2] transition-all hover:opacity-90 disabled:opacity-50"
              >
                {pdfLoading ? "Generating PDF…" : "Download PDF Receipt"}
              </button>
            </div>
          ) : null}
        </div>
        <div className="flex justify-end border-t border-slate-200/60 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-semibold text-[#2D3A4A] transition-all hover:bg-[#F8F9FA]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}