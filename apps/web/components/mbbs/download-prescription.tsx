"use client";

import { useState, useCallback } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { mbbsApi, type Patient, type Prescription } from "@/lib/mbbs-api";

interface Props {
  patient: Patient;
  prescription?: Prescription | null;
}

export default function DownloadPrescriptionBtn({ patient, prescription }: Props) {
  const [busy, setBusy] = useState(false);

  const handleDownload = useCallback(async () => {
    setBusy(true);
    const container = document.createElement("div");
    container.style.cssText = "position:fixed;left:-9999px;top:0;z-index:-1";
    document.body.appendChild(container);
    try {
      const doc = await mbbsApi.getDoctorProfile();

      const sigHtml = doc.signature_url
        ? `<img src="${doc.signature_url}" alt="Signature" style="height:36px;object-fit:contain" crossorigin="anonymous" />`
        : "";

      const medRows = prescription?.medications?.length
        ? prescription.medications.map((m, i) => `
            <tr>
              <td style="padding:6px 4px;border-bottom:1px solid #eee">${i + 1}</td>
              <td style="padding:6px 4px;border-bottom:1px solid #eee">${m.generic_name}${m.brand_name ? ` (${m.brand_name})` : ""}</td>
              <td style="padding:6px 4px;border-bottom:1px solid #eee">${m.dosage}</td>
              <td style="padding:6px 4px;border-bottom:1px solid #eee">${m.frequency}</td>
              <td style="padding:6px 4px;border-bottom:1px solid #eee">${m.duration_days}d</td>
              <td style="padding:6px 4px;border-bottom:1px solid #eee;text-transform:lowercase">${m.route}</td>
            </tr>`).join("")
        : `<tr>
            <td style="padding:8px 4px;color:#999;font-style:italic" colspan="6">
              (No medications listed)
            </td>
          </tr>`;

      container.innerHTML = `
        <div style="width:595px;padding:32px 36px;font-family:serif;color:#1a1a1a;line-height:1.5;background:#fff">
          <div style="text-align:center;border-bottom:2px solid #0A2540;padding-bottom:16px;margin-bottom:20px">
            <h1 style="font-size:22px;font-weight:bold;color:#0A2540;margin:0;letter-spacing:1px">
              Aastha Tele-HealthCare
            </h1>
            <p style="font-size:11px;color:#555;margin:2px 0 0 0">
              Digital Telemedicine Platform — Prescription
            </p>
          </div>

          <div style="margin-bottom:20px">
            <p style="font-size:14px;font-weight:bold;margin:0">
              Dr. ${doc.first_name_en} ${doc.last_name_en}
            </p>
            <p style="font-size:11px;color:#555;margin:2px 0">${doc.qualification || ""}</p>
            <p style="font-size:11px;color:#555;margin:2px 0">${doc.specialization || ""}</p>
            <p style="font-size:11px;color:#555;margin:2px 0">BMDC: ${doc.bmdc_registration || "—"}</p>
          </div>

          <div style="display:flex;justify-content:space-between;border-bottom:1px solid #ccc;padding-bottom:10px;margin-bottom:20px;font-size:12px">
            <span><strong>Patient:</strong> ${patient.first_name_en} ${patient.last_name_en}</span>
            <span><strong>MRN:</strong> ${patient.mrn}</span>
            <span><strong>Date:</strong> ${new Date().toLocaleDateString("en-GB")}</span>
          </div>

          <div style="min-height:260px">
            <p style="font-size:12px;font-style:italic;color:#888">Rx</p>
            <div style="margin-top:8px;font-size:13px;color:#333">
              <p style="margin:0 0 16px 0">
                This is to certify that the above-named patient has been examined
                and the following treatment is prescribed:
              </p>
              <table style="width:100%;border-collapse:collapse;font-size:12px">
                <thead>
                  <tr style="border-bottom:1px solid #ccc">
                    <th style="text-align:left;padding:6px 4px;font-weight:bold">#</th>
                    <th style="text-align:left;padding:6px 4px;font-weight:bold">Medication</th>
                    <th style="text-align:left;padding:6px 4px;font-weight:bold">Dosage</th>
                    <th style="text-align:left;padding:6px 4px;font-weight:bold">Frequency</th>
                    <th style="text-align:left;padding:6px 4px;font-weight:bold">Duration</th>
                    <th style="text-align:left;padding:6px 4px;font-weight:bold">Route</th>
                  </tr>
                </thead>
                <tbody>
                  ${medRows}
                </tbody>
              </table>
              ${prescription?.notes ? `<p style="margin-top:12px;font-size:11px;color:#555;font-style:italic">${prescription.notes}</p>` : ""}
            </div>
          </div>

          <div style="margin-top:40px;border-top:1px solid #ccc;padding-top:16px;display:flex;justify-content:space-between;align-items:end">
            <div>
              <p style="font-size:12px;margin:0">Dr. ${doc.first_name_en} ${doc.last_name_en}</p>
              <p style="font-size:10px;color:#555;margin:2px 0">BMDC: ${doc.bmdc_registration || "—"}</p>
            </div>
            ${sigHtml}
          </div>

          <div style="margin-top:32px;text-align:center;font-size:9px;color:#aaa;border-top:1px solid #eee;padding-top:10px">
            This is a computer-generated prescription. No physical signature required.
          </div>
        </div>
      `;

      await new Promise((r) => setTimeout(r, 300));

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      const suffix = prescription ? `_${prescription.id.slice(0, 8)}` : "";
      pdf.save(`prescription_${patient.mrn}${suffix}.pdf`);
    } catch (e) {
      console.error("PDF generation failed", e);
    } finally {
      document.body.removeChild(container);
      setBusy(false);
    }
  }, [patient, prescription]);

  return (
    <button
      onClick={handleDownload}
      disabled={busy}
      className="flex items-center gap-1.5 rounded-lg border border-slate-200/60 bg-[#F8F9FA] px-2.5 py-1.5 text-center hover:border-[#0A2540]/40 transition-all"
    >
      <span className="text-[13px]">💊</span>
      <span className="text-[9px] font-semibold text-[#0A2540]">
        {busy ? "..." : "Download Rx"}
      </span>
    </button>
  );
}
