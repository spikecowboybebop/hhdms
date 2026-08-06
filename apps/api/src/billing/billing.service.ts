// Billing module (BP-002 / BP-005) — invoices + digital receipts + price engine.
// Invoices are created lazily (one per payment) on first admin view, then a PDF
// is generated and stored on UploadCare. Price resolution reads the
// `service_prices` table and falls back to a typed constant map.
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Fallback canonical prices — used only when a service_type is missing from the
// service_prices table. Kept in sync with prisma/seed-billing.ts.
const DEFAULT_PRICES: Record<string, number> = {
  MBBS: 800,
  SPECIALIST: 1200,
  NURSE: 1500,
  CAREGIVER: 2500,
  NUTRITIONIST: 1000,
  USG: 1200,
  SONOLOGIST: 1200,
  XRAY: 500,
};

const SERVICE_LABELS: Record<string, string> = {
  MBBS: 'MBBS Doctor Home Visit',
  SPECIALIST: 'Specialist Consultation',
  NURSE: 'Nursing Care',
  CAREGIVER: 'Caregiver Service',
  NUTRITIONIST: 'Diet & Nutrition Consultation',
  USG: 'Ultrasound Examination',
  SONOLOGIST: 'Sonologist Examination',
  XRAY: 'X-Ray Examination',
};

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve the canonical price for a service type. Prefers the service_prices
   * table; falls back to the typed constant map so unmapped types never throw.
   */
  async resolveServicePrice(serviceType: string): Promise<number> {
    const row = await this.prisma.service_prices.findUnique({
      where: { service_type: serviceType },
    });
    if (row) return Number(row.price);
    return DEFAULT_PRICES[serviceType] ?? 0;
  }

  async listServicePrices() {
    const rows = await this.prisma.service_prices.findMany({
      orderBy: { service_type: 'asc' },
    });
    return rows.map((r) => ({
      service_type: r.service_type,
      price: Number(r.price),
      currency: r.currency,
      updated_at: r.updated_at,
    }));
  }

  /**
   * Return the invoice for a payment, creating it idempotently on first access.
   * One invoice per payment (enforced by the unique payment_id on invoices).
   */
  async getInvoiceForPayment(paymentId: string) {
    const existing = await this.prisma.invoices.findUnique({
      where: { payment_id: paymentId },
      include: {
        payment: {
          select: {
            id: true,
            status: true,
            amount: true,
            currency: true,
            service_type: true,
            completed_at: true,
          },
        },
        booking_session: {
          select: {
            tickets: {
              select: { ticket_no: true, price: true },
              take: 1,
              orderBy: { created_at: 'desc' },
            },
          },
        },
        patient: {
          select: {
            id: true,
            mrn: true,
            first_name_en: true,
            last_name_en: true,
            phone_number: true,
          },
        },
      },
    });
    if (existing) return this.toInvoiceRecord(existing);

    const payment = await this.prisma.payments.findUnique({
      where: { id: paymentId },
      include: {
        booking_session: {
          select: {
            tickets: {
              select: { ticket_no: true, price: true },
              take: 1,
              orderBy: { created_at: 'desc' },
            },
          },
        },
      },
    });
    if (!payment) throw new NotFoundException('Payment not found.');

    const invoice = await this.prisma.invoices.create({
      data: {
        invoice_no: await this.generateInvoiceNo(),
        booking_session_id: payment.booking_session_id,
        payment_id: payment.id,
        patient_id: payment.patient_id,
        service_type: payment.service_type,
        amount: payment.amount,
        currency: payment.currency,
        status: 'issued',
        paid_at: payment.completed_at,
      },
    });

    const created = await this.prisma.invoices.findUnique({
      where: { id: invoice.id },
      include: {
        payment: {
          select: {
            id: true,
            status: true,
            amount: true,
            currency: true,
            service_type: true,
            completed_at: true,
          },
        },
        booking_session: {
          select: {
            tickets: {
              select: { ticket_no: true, price: true },
              take: 1,
              orderBy: { created_at: 'desc' },
            },
          },
        },
        patient: {
          select: {
            id: true,
            mrn: true,
            first_name_en: true,
            last_name_en: true,
            phone_number: true,
          },
        },
      },
    });

    return this.toInvoiceRecord(created!);
  }

  /**
   * Generate (or reuse) the PDF for an invoice and upload it to UploadCare.
   * Stores file_url/file_name/file_size on the invoice row and returns the URL.
   */
  async generateInvoicePdf(invoiceId: string) {
    const invoice = await this.getInvoiceById(invoiceId);
    if (invoice.file_url) return { file_url: invoice.file_url };

    const pdfBuffer = await this.buildInvoicePdf(invoiceId);
    const fileName = `invoice_${invoice.invoice_no}.pdf`;

    const cdnBase = process.env.UPLOADCARE_CDN_BASE || 'https://ucarecdn.com';
    const formData = new FormData();
    formData.append('UPLOADCARE_PUB_KEY', process.env.UPLOADCARE_PUB_KEY!);
    const blob = new Blob([new Uint8Array(pdfBuffer)], {
      type: 'application/pdf',
    });
    formData.append('file', blob, fileName);

    const ucRes = await fetch('https://upload.uploadcare.com/base/', {
      method: 'POST',
      body: formData,
    });

    if (!ucRes.ok) {
      const body = await ucRes.text().catch(() => '');
      throw new NotFoundException(
        'UploadCare upload failed: ' + ucRes.status + ' ' + body,
      );
    }

    const ucData = (await ucRes.json()) as { file: string };
    const fileUrl = `${cdnBase}/${ucData.file}/${fileName}`;

    await this.prisma.invoices.update({
      where: { id: invoiceId },
      data: {
        file_url: fileUrl,
        file_name: fileName,
        file_size: pdfBuffer.length,
      },
    });

    return { file_url: fileUrl };
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private async getInvoiceById(invoiceId: string) {
    const invoice = await this.prisma.invoices.findUnique({
      where: { id: invoiceId },
      include: {
        payment: true,
        booking_session: {
          select: {
            tickets: {
              select: { ticket_no: true, price: true },
              take: 1,
              orderBy: { created_at: 'desc' },
            },
          },
        },
        patient: {
          select: {
            id: true,
            mrn: true,
            first_name_en: true,
            last_name_en: true,
            first_name_bn: true,
            last_name_bn: true,
            phone_number: true,
            email: true,
            address_line1: true,
            address_line2: true,
            district: true,
          },
        },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found.');
    return invoice;
  }

  private async buildInvoicePdf(invoiceId: string): Promise<Buffer> {
    const invoice = await this.getInvoiceById(invoiceId);
    const { default: PDFDocument } = await import('pdfkit');
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));

    const patient = invoice.patient;
    const amount = Number(invoice.amount);
    const paidAt = invoice.paid_at;
    const ticketNo =
      invoice.booking_session?.tickets?.[0]?.ticket_no ?? '—';

    const headerColor = '#0A2540';
    const teal = '#00D4B2';
    const muted = '#475569';

    // Header
    doc
      .fillColor(headerColor)
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('HHDMS - INVOICE', { align: 'center' });
    doc
      .fillColor(teal)
      .fontSize(11)
      .font('Helvetica')
      .text('Home Healthcare & Diagnostic Services', { align: 'center' });
    doc.moveDown(0.8);

    // Invoice meta box
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor(headerColor)
      .text('Invoice No:', { continued: true })
      .font('Helvetica')
      .fillColor(muted)
      .text(`  ${invoice.invoice_no}`);
    doc
      .font('Helvetica-Bold')
      .fillColor(headerColor)
      .text('Status:', { continued: true })
      .font('Helvetica')
      .fillColor(muted)
      .text(`  ${invoice.status.toUpperCase()}`);
    doc
      .font('Helvetica-Bold')
      .fillColor(headerColor)
      .text('Issued:', { continued: true })
      .font('Helvetica')
      .fillColor(muted)
      .text(`  ${this.formatDate(invoice.issued_at)}`);
    doc
      .font('Helvetica-Bold')
      .fillColor(headerColor)
      .text('Paid:', { continued: true })
      .font('Helvetica')
      .fillColor(muted)
      .text(`  ${paidAt ? this.formatDate(paidAt) : '—'}`);
    doc.moveDown(1);

    // Patient block
    doc.fontSize(11).font('Helvetica-Bold').fillColor(headerColor).text('Billed To');
    doc.moveDown(0.3);
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor(muted)
      .text(`${patient.first_name_en} ${patient.last_name_en}`);
    doc.text(`MRN: ${patient.mrn}`);
    if (patient.phone_number) doc.text(`Phone: ${patient.phone_number}`);
    if (patient.email) doc.text(`Email: ${patient.email}`);
    const address = [
      patient.address_line1,
      patient.address_line2,
      patient.district,
    ]
      .filter(Boolean)
      .join(', ');
    if (address) doc.text(`Address: ${address}`);
    doc.moveDown(1.2);

    // Line items table
    const serviceLabel =
      SERVICE_LABELS[invoice.service_type] ?? invoice.service_type;

    // --- Header row (navy bar) ---
    const hdrY = doc.y;
    doc.rect(40, hdrY, 530, 24).fill(headerColor);
    doc
      .fillColor('#ffffff')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Description', 50, hdrY + 7, { width: 330 });
    doc.text('Amount (BDT)', 400, hdrY + 7, { align: 'right', width: 160 });
    doc.y = hdrY + 30;

    // --- Data row ---
    const rowY = doc.y;
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor(muted)
      .text(serviceLabel, 50, rowY, { width: 330 });
    doc.text(`${amount.toFixed(2)}`, 400, rowY, { align: 'right', width: 160 });
    doc.y = rowY + 14;

    doc
      .fontSize(9)
      .fillColor(muted)
      .text(`Ticket: ${ticketNo}`, 50, doc.y);

    doc.moveDown(1);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#cbd5e1').stroke();
    doc.moveDown(0.6);

    // --- Total row ---
    const totalY = doc.y;
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor(headerColor)
      .text('Total', 50, totalY, { width: 330 });
    doc.text(`${amount.toFixed(2)} BDT`, 400, totalY, { align: 'right', width: 160 });
    doc.y = totalY + 18;

    // Footer — pinned to page bottom
    const footerText = 'Thank you for choosing HHDMS. This is a computer-generated receipt.';
    const footerLineHeight = 12;
    const footerY = doc.page.height - doc.options.margin - footerLineHeight - 4;
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor(muted)
      .text(footerText, 40, footerY, {
        align: 'center',
        width: 530,
        lineBreak: false,
      });

    doc.end();
    return new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  private async generateInvoiceNo(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const count = await this.prisma.invoices.count({
      where: { invoice_no: { startsWith: prefix } },
    });
    return `${prefix}${String(count + 1).padStart(5, '0')}`;
  }

  private formatDate(value: Date | null | undefined): string {
    if (!value) return '—';
    return value.toISOString().slice(0, 10);
  }

  private toInvoiceRecord(invoice: {
    id: string;
    invoice_no: string;
    service_type: string;
    amount: unknown;
    currency: string;
    status: string;
    issued_at: Date;
    paid_at: Date | null;
    file_url: string | null;
    patient: {
      id: string;
      mrn: string;
      first_name_en: string;
      last_name_en: string;
      phone_number: string | null;
    };
    booking_session: {
      tickets: { ticket_no: string }[];
    } | null;
    payment: {
      id: string;
      status: string;
      amount: unknown;
      currency: string;
      service_type: string;
      completed_at: Date | null;
    } | null;
  }) {
    return {
      id: invoice.id,
      invoice_no: invoice.invoice_no,
      service_type: invoice.service_type,
      amount: Number(invoice.amount),
      currency: invoice.currency,
      status: invoice.status,
      issued_at: invoice.issued_at,
      paid_at: invoice.paid_at,
      file_url: invoice.file_url,
      patient: {
        id: invoice.patient.id,
        mrn: invoice.patient.mrn,
        first_name_en: invoice.patient.first_name_en,
        last_name_en: invoice.patient.last_name_en,
        phone_number: invoice.patient.phone_number,
      },
      ticket_no:
        invoice.booking_session?.tickets?.[0]?.ticket_no ?? null,
      payment: invoice.payment
        ? {
            id: invoice.payment.id,
            status: invoice.payment.status,
            amount: Number(invoice.payment.amount),
            currency: invoice.payment.currency,
            service_type: invoice.payment.service_type,
            completed_at: invoice.payment.completed_at,
          }
        : null,
    };
  }
}
