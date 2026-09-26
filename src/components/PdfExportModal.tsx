import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Share2,
  Printer,
  FileText,
  Settings,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { ScannedPage, PdfConfig, PaperSize, PageOrientation, PageMargin } from '../types';
import { generatePdf, triggerPdfDownload, sharePdfFile, GeneratedPdfResult } from '../utils/pdfGenerator';

interface PdfExportModalProps {
  pages: ScannedPage[];
  initialTitle?: string;
  onClose: () => void;
  onAutoTitleRequest?: () => Promise<string | null>;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  pages,
  initialTitle = '',
  onClose,
  onAutoTitleRequest,
}) => {
  const [config, setConfig] = useState<PdfConfig>({
    title: initialTitle || `Scan_Dokumen_${new Date().toISOString().slice(0, 10)}`,
    paperSize: 'a4',
    orientation: 'auto',
    margin: 'none',
    addPageNumbers: false,
    quality: 0.92,
  });

  const [pdfResult, setPdfResult] = useState<GeneratedPdfResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [isSuggestingTitle, setIsSuggestingTitle] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  // Generate or re-generate PDF when config or pages change
  useEffect(() => {
    let isCancelled = false;

    async function makePdf() {
      setIsGenerating(true);
      try {
        const result = await generatePdf(pages, config);
        if (!isCancelled) {
          setPdfResult(result);
        }
      } catch (err) {
        console.error('Gagal membuat PDF:', err);
      } finally {
        if (!isCancelled) {
          setIsGenerating(false);
        }
      }
    }

    makePdf();

    return () => {
      isCancelled = true;
    };
  }, [pages, config]);

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (pdfResult?.blobUrl) {
        URL.revokeObjectURL(pdfResult.blobUrl);
      }
    };
  }, [pdfResult]);

  const handleDownload = () => {
    if (!pdfResult) return;
    triggerPdfDownload(pdfResult.blob, pdfResult.fileName);
  };

  const handleShare = async () => {
    if (!pdfResult) return;
    const shared = await sharePdfFile(pdfResult.blob, pdfResult.fileName);
    if (!shared) {
      // Fallback: prompt download
      triggerPdfDownload(pdfResult.blob, pdfResult.fileName);
    }
  };

  const handlePrint = () => {
    if (!pdfResult) return;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = pdfResult.blobUrl;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 2000);
    };
  };

  const handleAutoTitle = async () => {
    if (!onAutoTitleRequest) return;
    setIsSuggestingTitle(true);
    try {
      const suggested = await onAutoTitleRequest();
      if (suggested) {
        setConfig((prev) => ({ ...prev, title: suggested }));
      }
    } finally {
      setIsSuggestingTitle(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Ekspor Dokumen PDF</h2>
              <p className="text-xs text-slate-400">
                {pages.length} Halaman Siap Diunduh {pdfResult ? `• ${pdfResult.fileSizeFormatted}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-y-auto">
          {/* Left: Configuration Panel */}
          <div className="md:col-span-6 p-5 border-b md:border-b-0 md:border-r border-slate-800 space-y-4">
            {/* Title / File Name */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Nama File Dokumen
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={config.title}
                    onChange={(e) => setConfig({ ...config, title: e.target.value })}
                    placeholder="Nama file..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all pr-12"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono pointer-events-none">
                    .pdf
                  </span>
                </div>

                {onAutoTitleRequest && (
                  <button
                    type="button"
                    onClick={handleAutoTitle}
                    disabled={isSuggestingTitle}
                    className="px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-medium flex items-center gap-1.5 transition-all disabled:opacity-50"
                    title="Gunakan AI untuk mendeteksi judul dokumen otomatis"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>{isSuggestingTitle ? 'Analisis...' : 'Nama AI'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Paper Size */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Ukuran Kertas PDF
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'a4', label: 'A4', desc: 'Standar Umum' },
                  { id: 'f4', label: 'F4 / Folio', desc: 'HVS Panjang (ID)' },
                  { id: 'letter', label: 'Letter', desc: 'Surat' },
                  { id: 'legal', label: 'Legal', desc: 'Dokumen Hukum' },
                  { id: 'fit', label: 'Pas Foto', desc: 'Ikuti Ukuran Asli' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setConfig({ ...config, paperSize: item.id as PaperSize })}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      config.paperSize === item.id
                        ? 'border-blue-500 bg-blue-500/15 text-white shadow-sm'
                        : 'border-slate-800 bg-slate-800/40 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="font-semibold text-xs">{item.label}</div>
                    <div className="text-[10px] text-slate-400">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Orientation & Margins */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Orientasi Kertas
                </label>
                <select
                  value={config.orientation}
                  onChange={(e) =>
                    setConfig({ ...config, orientation: e.target.value as PageOrientation })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-all"
                >
                  <option value="auto">Otomatis (Sesuai Foto)</option>
                  <option value="portrait">Potret (Tegak)</option>
                  <option value="landscape">Lanskap (Mendatar)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Tepi Margin
                </label>
                <select
                  value={config.margin}
                  onChange={(e) =>
                    setConfig({ ...config, margin: e.target.value as PageMargin })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-all"
                >
                  <option value="none">Tanpa Margin (Penuh)</option>
                  <option value="thin">Margin Tipis (5 mm)</option>
                  <option value="normal">Margin Standar (10 mm)</option>
                </select>
              </div>
            </div>

            {/* Additional Options */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.addPageNumbers}
                  onChange={(e) => setConfig({ ...config, addPageNumbers: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs text-slate-300">
                  Tambahkan nomor halaman di bagian bawah (contoh: "Halaman 1 dari {pages.length}")
                </span>
              </label>
            </div>
          </div>

          {/* Right: PDF Preview & Info */}
          <div className="md:col-span-6 p-5 flex flex-col justify-between bg-slate-950/40">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300">
                  Pratinjau Dokumen ({pages.length} Lembar)
                </span>
                {pdfResult && (
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Ukuran File: {pdfResult.fileSizeFormatted}
                  </span>
                )}
              </div>

              {/* Preview Container */}
              <div className="relative w-full h-[260px] sm:h-[300px] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center">
                {isGenerating ? (
                  <div className="flex flex-col items-center gap-2 text-slate-400 text-xs">
                    <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                    <span>Menyiapkan PDF beresolusi tinggi...</span>
                  </div>
                ) : pdfResult ? (
                  <iframe
                    src={`${pdfResult.blobUrl}#toolbar=0&navpanes=0`}
                    title="PDF Pratinjau"
                    className="w-full h-full border-0"
                  />
                ) : (
                  <div className="text-xs text-slate-500">Pratinjau tidak tersedia</div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col gap-2.5">
              <button
                onClick={handleDownload}
                disabled={isGenerating || !pdfResult}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-[0.99] transition-all disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Unduh File PDF Sekarang ({pdfResult?.fileSizeFormatted || '...'})</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                {canShare && (
                  <button
                    onClick={handleShare}
                    disabled={isGenerating || !pdfResult}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 border border-slate-700 transition-all disabled:opacity-50"
                  >
                    <Share2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>Kirim ke WhatsApp/Email</span>
                  </button>
                )}

                <button
                  onClick={handlePrint}
                  disabled={isGenerating || !pdfResult}
                  className={`py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 border border-slate-700 transition-all disabled:opacity-50 ${
                    !canShare ? 'col-span-2' : ''
                  }`}
                >
                  <Printer className="w-3.5 h-3.5 text-slate-400" />
                  <span>Cetak Langsung (Print)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
