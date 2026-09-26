import { jsPDF } from 'jspdf';
import { ScannedPage, PdfConfig, PaperSize } from '../types';

const PAPER_DIMENSIONS: Record<Exclude<PaperSize, 'fit'>, [number, number]> = {
  a4: [210, 297], // mm
  f4: [215, 330], // mm (Folio/HVS panjang)
  letter: [215.9, 279.4], // mm
  legal: [215.9, 355.6], // mm
};

const MARGIN_SIZES = {
  none: 0,
  thin: 5, // 5mm
  normal: 10, // 10mm
};

export interface GeneratedPdfResult {
  blob: Blob;
  blobUrl: string;
  fileSizeFormatted: string;
  totalBytes: number;
  fileName: string;
}

export async function generatePdf(
  pages: ScannedPage[],
  config: PdfConfig
): Promise<GeneratedPdfResult> {
  if (pages.length === 0) {
    throw new Error('Tidak ada halaman untuk dibuat PDF');
  }

  const marginMm = MARGIN_SIZES[config.margin] || 0;
  const totalPages = pages.length;

  let doc: jsPDF | null = null;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const imgWidthPx = page.width;
    const imgHeightPx = page.height;
    const imgAspect = imgWidthPx / imgHeightPx;

    // Determine Orientation
    let isLandscape = false;
    if (config.orientation === 'landscape') {
      isLandscape = true;
    } else if (config.orientation === 'portrait') {
      isLandscape = false;
    } else {
      // auto: follow image aspect ratio
      isLandscape = imgAspect > 1.05;
    }

    // Determine Page Width and Height in mm
    let pageWidthMm: number;
    let pageHeightMm: number;

    if (config.paperSize === 'fit') {
      // Fit to image dimensions (scaled to standard document size ~210mm on base)
      if (isLandscape) {
        pageHeightMm = 210;
        pageWidthMm = 210 * imgAspect;
      } else {
        pageWidthMm = 210;
        pageHeightMm = 210 / imgAspect;
      }
    } else {
      const [dimW, dimH] = PAPER_DIMENSIONS[config.paperSize] || PAPER_DIMENSIONS.a4;
      if (isLandscape) {
        pageWidthMm = Math.max(dimW, dimH);
        pageHeightMm = Math.min(dimW, dimH);
      } else {
        pageWidthMm = Math.min(dimW, dimH);
        pageHeightMm = Math.max(dimW, dimH);
      }
    }

    // Create or add page to jsPDF
    if (i === 0) {
      doc = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [pageWidthMm, pageHeightMm],
        compress: true,
      });
    } else if (doc) {
      doc.addPage([pageWidthMm, pageHeightMm], isLandscape ? 'landscape' : 'portrait');
    }

    if (!doc) continue;

    // Printable Area
    const bottomReserved = config.addPageNumbers ? 10 : marginMm;
    const printableW = Math.max(10, pageWidthMm - 2 * marginMm);
    const printableH = Math.max(10, pageHeightMm - marginMm - bottomReserved);

    // Calculate dimensions to fit inside printable area while keeping aspect ratio
    let targetW = printableW;
    let targetH = targetW / imgAspect;

    if (targetH > printableH) {
      targetH = printableH;
      targetW = targetH * imgAspect;
    }

    // Center image
    const posX = marginMm + (printableW - targetW) / 2;
    const posY = marginMm + (printableH - targetH) / 2;

    // Add image
    doc.addImage(
      page.processedDataUrl,
      'JPEG',
      posX,
      posY,
      targetW,
      targetH,
      undefined,
      'FAST'
    );

    // Add Page Numbering if enabled
    if (config.addPageNumbers) {
      doc.setFontSize(8.5);
      doc.setTextColor(120, 120, 120);
      const pageText = `Halaman ${i + 1} dari ${totalPages}`;
      const textX = pageWidthMm / 2;
      const textY = pageHeightMm - 4;
      doc.text(pageText, textX, textY, { align: 'center' });
    }
  }

  if (!doc) {
    throw new Error('Gagal menginisialisasi dokumen PDF');
  }

  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);
  const totalBytes = pdfBlob.size;

  let fileSizeFormatted = `${(totalBytes / 1024).toFixed(1)} KB`;
  if (totalBytes > 1024 * 1024) {
    fileSizeFormatted = `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  let finalName = config.title.trim();
  if (!finalName) {
    finalName = `Scan_Dokumen_${new Date().toISOString().slice(0, 10)}`;
  }
  if (!finalName.toLowerCase().endsWith('.pdf')) {
    finalName += '.pdf';
  }

  return {
    blob: pdfBlob,
    blobUrl,
    fileSizeFormatted,
    totalBytes,
    fileName: finalName,
  };
}

/**
 * Trigger file download directly in browser
 */
export function triggerPdfDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

/**
 * Share PDF file using Web Share API on mobile devices
 */
export async function sharePdfFile(blob: Blob, fileName: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      const file = new File([blob], fileName, { type: 'application/pdf' });
      const canShareFiles = typeof navigator.canShare === 'function' ? navigator.canShare({ files: [file] }) : true;
      if (canShareFiles) {
        await navigator.share({
          files: [file],
          title: fileName,
          text: 'Berikut adalah dokumen hasil scan PDF.',
        });
        return true;
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Gagal membagikan file via Web Share API:', err);
      }
    }
  }
  return false;
}
