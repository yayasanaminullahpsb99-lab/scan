export interface CropRect {
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  width: number; // percentage 0 - 100
  height: number; // percentage 0 - 100
}

export type DocumentFilter = 'original' | 'magic' | 'bw' | 'grayscale' | 'contrast';

export interface ScannedPage {
  id: string;
  originalDataUrl: string;
  processedDataUrl: string;
  filter: DocumentFilter;
  rotation: number; // 0, 90, 180, 270
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  crop?: CropRect;
  width: number;
  height: number;
  timestamp: number;
}

export type PaperSize = 'a4' | 'f4' | 'letter' | 'legal' | 'fit';
export type PageOrientation = 'auto' | 'portrait' | 'landscape';
export type PageMargin = 'none' | 'thin' | 'normal';

export interface PdfConfig {
  title: string;
  paperSize: PaperSize;
  orientation: PageOrientation;
  margin: PageMargin;
  addPageNumbers: boolean;
  quality: number; // 0.7 - 1.0
}

export interface AiDocAnalysis {
  suggestedFileName: string;
  documentType: string;
  extractedText: string;
  summary: string;
}
