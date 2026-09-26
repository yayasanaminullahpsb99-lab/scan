import React, { useState, useEffect } from 'react';
import { X, Sparkles, Copy, Check, FileDown, AlertCircle, RefreshCw } from 'lucide-react';
import { ScannedPage, AiDocAnalysis } from '../types';

interface OcrModalProps {
  page: ScannedPage;
  pageIndex: number;
  onApplyTitle?: (title: string) => void;
  onClose: () => void;
}

export const OcrModal: React.FC<OcrModalProps> = ({
  page,
  pageIndex,
  onApplyTitle,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AiDocAnalysis | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function analyze() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/analyze-doc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: page.processedDataUrl || page.originalDataUrl,
            mimeType: 'image/jpeg',
          }),
        });

        const data = await response.json();

        if (isCancelled) return;

        if (!response.ok) {
          throw new Error(data.error || 'Gagal memproses OCR pada gambar');
        }

        if (data.data) {
          setAnalysis(data.data);
        } else {
          throw new Error('Hasil analisis kosong');
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(err.message || 'Terjadi kesalahan saat memproses OCR');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    analyze();

    return () => {
      isCancelled = true;
    };
  }, [page]);

  const handleCopy = () => {
    if (!analysis?.extractedText) return;
    navigator.clipboard.writeText(analysis.extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    if (!analysis?.extractedText) return;
    const blob = new Blob([analysis.extractedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${analysis.suggestedFileName || 'Teks_Hasil_Scan'}.txt`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Ekstrak Teks & Ringkasan (OCR)</h2>
              <p className="text-xs text-slate-400">Halaman {pageIndex + 1}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mb-3" />
              <p className="text-sm font-medium text-white">Membaca dan menganalisis teks dokumen...</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Mengekstrak karakter teks, mendeteksi jenis berkas, dan menyusun ringkasan dokumen.
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-300">Pemberitahuan</p>
                <p className="text-slate-300 leading-relaxed">{error}</p>
                <p className="text-slate-400 mt-2">
                  Catatan: Pemindaian foto ke PDF dapat dilakukan secara langsung tanpa AI.
                </p>
              </div>
            </div>
          )}

          {analysis && (
            <>
              {/* Type and Suggested Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-[11px] text-slate-400 block mb-1">Jenis Dokumen Terdeteksi:</span>
                  <span className="text-sm font-semibold text-blue-400">
                    {analysis.documentType || 'Dokumen Resmi'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Rekomendasi Nama File:</span>
                    <span className="text-xs font-mono font-medium text-emerald-400">
                      {analysis.suggestedFileName || 'Dokumen_Scan'}.pdf
                    </span>
                  </div>
                  {onApplyTitle && (
                    <button
                      onClick={() => onApplyTitle(analysis.suggestedFileName)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition-all"
                    >
                      Gunakan
                    </button>
                  )}
                </div>
              </div>

              {/* Summary */}
              {analysis.summary && (
                <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
                  <span className="text-xs font-semibold text-slate-300 block mb-1">Ringkasan Dokumen:</span>
                  <p className="text-xs text-slate-300 leading-relaxed">{analysis.summary}</p>
                </div>
              )}

              {/* Extracted Text Area */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-300">
                    Teks Lengkap Dokumen (OCR):
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopy}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Tersalin!' : 'Salin Teks'}</span>
                    </button>
                    <button
                      onClick={handleDownloadTxt}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all"
                    >
                      <FileDown className="w-3.5 h-3.5 text-blue-400" />
                      <span>Unduh .TXT</span>
                    </button>
                  </div>
                </div>

                <textarea
                  readOnly
                  value={analysis.extractedText || 'Tidak ada teks yang dapat diekstrak.'}
                  rows={8}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 leading-relaxed focus:outline-none select-all"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
