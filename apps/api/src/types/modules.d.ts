declare module 'pdf-parse' {
  interface PdfData {
    text: string;
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: Record<string, unknown>;
    version: string;
  }
  function pdfParse(
    dataBuffer: Buffer,
    options?: Record<string, unknown>,
  ): Promise<PdfData>;
  export default pdfParse;
}

declare module 'mammoth' {
  interface MammothResult {
    value: string;
    messages: unknown[];
  }
  export function extractRawText(input: {
    buffer: Buffer;
  }): Promise<MammothResult>;
  export function convertToHtml(input: {
    buffer: Buffer;
  }): Promise<MammothResult>;
}

declare module 'tesseract.js' {
  interface RecognizeResult {
    data: {
      text: string;
      words: unknown[];
      lines: unknown[];
      paragraphs: unknown[];
    };
  }
  export function recognize(
    image: Buffer | string,
    language?: string,
    options?: Record<string, unknown>,
  ): Promise<RecognizeResult>;
  export function createWorker(language?: string): Promise<{
    recognize: (image: Buffer | string) => Promise<RecognizeResult>;
    terminate: () => Promise<void>;
  }>;
}
