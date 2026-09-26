import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  FileUp,
  FileText,
  Trash2,
  Edit3,
  ArrowLeft,
  ArrowRight,
  Plus,
  Sparkles,
  Download,
  Share2,
  CheckCircle,
  ShieldCheck,
  Zap,
  SlidersHorizontal,
  Layers,
  FileCheck,
  HelpCircle,
} from 'lucide-react';

import { ScannedPage } from './types';
import { processImage, fileToDataUrl, loadImage } from './utils/imageProcessing';
import { CameraScanner } from './components/CameraScanner';
import { PageEditorModal } from './components/PageEditorModal';
import { PdfExportModal } from './components/PdfExportModal';
import { OcrModal } from './components/OcrModal';
import { SAMPLE_DOCUMENTS } from './utils/sampleDocuments';

export default function App() {
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [editingPageIndex, setEditingPageIndex] = useState<number | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [ocrPageIndex, setOcrPageIndex] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Show auto-dismissing toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  // Add captured or uploaded image data URLs as scanned pages
  const addImagesAsPages = async (dataUrls: string[], filterType: any = 'magic') => {
    if (dataUrls.length === 0) return;

    const newPages: ScannedPage[] = [];

    for (const url of dataUrls) {
      try {
        const img = await loadImage(url);
        // Process with default 'magic' filter for clean paper background
        const processed = await processImage(
          url,
          filterType,
          0,
          0,
          0
        );

        newPages.push({
          id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          originalDataUrl: url,
          processedDataUrl: processed.dataUrl,
          filter: filterType,
          rotation: 0,
          brightness: 0,
          contrast: 0,
          width: processed.width || img.width,
          height: processed.height || img.height,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error('Gagal memproses gambar:', err);
      }
    }

    if (newPages.length > 0) {
      setPages((prev) => [...prev, ...newPages]);
      showToast(`${newPages.length} halaman berhasil ditambahkan`);
    }
  };

  // Handle files selected via input
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const url = await fileToDataUrl(files[i]);
        urls.push(url);
      } catch (err) {
        console.error('Gagal membaca berkas:', err);
      }
    }

    if (urls.length > 0) {
      await addImagesAsPages(urls);
    }

    // Reset input value so same files can be re-selected
    e.target.value = '';
  };

  // Handle Drag and Drop
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      if (files[i].type.startsWith('image/')) {
        try {
          const url = await fileToDataUrl(files[i]);
          urls.push(url);
        } catch (err) {
          console.error('Gagal membaca gambar drop:', err);
        }
      }
    }

    if (urls.length > 0) {
      await addImagesAsPages(urls);
    }
  };

  // Quick Load Sample Documents
  const handleLoadSample = async (sample: typeof SAMPLE_DOCUMENTS[0]) => {
    setIsLoadingSamples(true);
    try {
      const dataUrl = await sample.generate();
      await addImagesAsPages([dataUrl], 'original');
      showToast(`Contoh "${sample.name}" berhasil dimuat`);
    } catch (err) {
      console.error('Gagal membuat contoh dokumen:', err);
    } finally {
      setIsLoadingSamples(false);
    }
  };

  // Load All Samples as Multi-Page
  const handleLoadAllSamples = async () => {
    setIsLoadingSamples(true);
    try {
      const urls: string[] = [];
      for (const sample of SAMPLE_DOCUMENTS) {
        const url = await sample.generate();
        urls.push(url);
      }
      await addImagesAsPages(urls, 'original');
      showToast(`3 contoh dokumen berhasil dimuat`);
    } catch (err) {
      console.error('Gagal membuat contoh:', err);
    } finally {
      setIsLoadingSamples(false);
    }
  };

  // Move page position in list
  const movePage = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pages.length) return;

    setPages((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated;
    });
  };

  // Delete page
  const deletePage = (index: number) => {
    setPages((prev) => prev.filter((_, i) => i !== index));
    showToast('Halaman berhasil dihapus');
  };

  // Clear all pages
  const handleClearAll = () => {
    if (window.confirm('Hapus semua halaman dokumen yang sudah di-scan?')) {
      setPages([]);
      showToast('Semua halaman dihapus');
    }
  };

  // Save edited page
  const handleSaveEditedPage = (updatedPage: ScannedPage) => {
    if (editingPageIndex === null) return;
    setPages((prev) => {
      const next = [...prev];
      next[editingPageIndex] = updatedPage;
      return next;
    });
    setEditingPageIndex(null);
    showToast('Perubahan halaman disimpan');
  };

  // AI Title suggestion
  const handleAutoTitleFromAI = async (): Promise<string | null> => {
    if (pages.length === 0) return null;
    try {
      const firstPage = pages[0];
      const response = await fetch('/api/analyze-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: firstPage.processedDataUrl || firstPage.originalDataUrl,
        }),
      });
      const data = await response.json();
      if (data?.data?.suggestedFileName) {
        return data.data.suggestedFileName;
      }
    } catch (err) {
      console.warn('Gagal meminta judul AI:', err);
    }
    return null;
  };

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Hidden File Input for Multiple Gallery Pick */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-800/95 text-white px-4 py-2.5 rounded-full shadow-2xl border border-slate-700/80 flex items-center gap-2 text-xs font-medium backdrop-blur-md animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/90 px-4 lg:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base text-white tracking-tight">DocuScan</h1>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20">
                  Scan Foto ke PDF
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Pindai berkas fisik & foto menjadi file PDF siap kirim
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2">
            {pages.length > 0 && (
              <>
                <button
                  onClick={handleClearAll}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 text-xs font-medium transition-colors"
                  title="Hapus semua halaman"
                >
                  <Trash2 className="w-4 h-4 inline mr-1" />
                  <span className="hidden sm:inline">Reset</span>
                </button>

                <button
                  onClick={() => setIsPdfModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-blue-500/25 active:scale-95 transition-all"
                >
                  <FileText className="w-4 h-4" />
                  <span>Buat PDF ({pages.length})</span>
                </button>
              </>
            )}

            {pages.length === 0 && (
              <button
                onClick={() => setIsCameraOpen(true)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-blue-600/30 active:scale-95 transition-all"
              >
                <Camera className="w-4 h-4" />
                <span>Mulai Scan</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 lg:px-8 py-6">
        {pages.length === 0 ? (
          /* Empty State - Prominent Hero and Capture Options */
          <div className="flex flex-col items-center justify-center py-6 sm:py-12 max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300 mb-6 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Filter Pembersih Kertas Otomatis & Ukuran Kertas F4 / A4</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4 leading-tight">
              Scan Dokumen Fisik Menjadi <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                File Dokumen PDF Instan
              </span>
            </h2>

            <p className="text-sm sm:text-base text-slate-400 max-w-xl mb-8 leading-relaxed">
              Cukup ambil foto surat, kwitansi, berkas, atau nota melalui kamera ponsel/laptop.
              DocuScan akan merapikan kertas dan menyatukannya dalam 1 file PDF siap cetak atau kirim.
            </p>

            {/* Primary Action Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg mb-8">
              {/* Option 1: Live Camera Scan */}
              <button
                onClick={() => setIsCameraOpen(true)}
                className="group relative p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-900/60 border border-blue-500/30 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 transition-all text-left flex flex-col justify-between active:scale-[0.98]"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Camera className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base mb-1 flex items-center justify-between">
                    <span>Buka Kamera Scan</span>
                    <span className="text-xs text-blue-400 font-normal">Rekomendasi</span>
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Ambil foto dokumen langsung dengan bingkai panduan dan mode jepret banyak halaman.
                  </p>
                </div>
              </button>

              {/* Option 2: Upload from Storage / Gallery */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="group relative p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-900/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 transition-all text-left flex flex-col justify-between active:scale-[0.98]"
              >
                <div className="w-12 h-12 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <FileUp className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base mb-1">
                    Pilih Foto dari Galeri
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Unggah 1 atau banyak foto dokumen sekaligus dari galeri ponsel atau komputer Anda.
                  </p>
                </div>
              </button>
            </div>

            {/* Quick Sample Document Buttons (for testing without a camera) */}
            <div className="w-full max-w-lg p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 mb-10">
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                  <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
                  Belum punya foto berkas fisik? Coba sampel kami:
                </span>
                <button
                  onClick={handleLoadAllSamples}
                  disabled={isLoadingSamples}
                  className="text-blue-400 hover:text-blue-300 font-medium transition-colors text-[11px]"
                >
                  Muat Semua
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {SAMPLE_DOCUMENTS.map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => handleLoadSample(sample)}
                    disabled={isLoadingSamples}
                    className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-xs text-slate-200 transition-all text-center flex flex-col items-center gap-1 active:scale-95 disabled:opacity-50"
                  >
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    <span className="truncate w-full font-medium">{sample.category}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl text-left border-t border-slate-800/80 pt-8">
              <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800/40">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2.5">
                  <Zap className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-semibold text-white mb-1">Pembersih Kertas Cerdas</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Menghilangkan bayangan lipatan meja dan mencerahkan warna kertas seperti mesin scanner fotokopi.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800/40">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-2.5">
                  <Layers className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-semibold text-white mb-1">Multi-Halaman & F4 / A4</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Dukung pembuatan berkas banyak halaman dengan ukuran standar Indonesia (F4 Folio, A4, Letter).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800/40">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-2.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-semibold text-white mb-1">100% Aman & Privat</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Seluruh pemrosesan foto dan konversi PDF dijalankan langsung pada peramban web perangkat Anda.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Active State - Document Pages Gallery */
          <div className="space-y-6 pb-24">
            {/* Top Toolbar / Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm text-white">
                    Daftar Halaman Dokumen ({pages.length} Halaman)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Geser urutan halaman, terapkan filter, atau tambah halaman baru sebelum diekspor ke PDF.
                  </p>
                </div>
              </div>

              {/* Add More Pages Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCameraOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-md shadow-blue-600/20 active:scale-95 transition-all"
                >
                  <Camera className="w-4 h-4" />
                  <span>Ambil Foto</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700 active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Unggah Galeri</span>
                </button>
              </div>
            </div>

            {/* Pages Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {pages.map((page, index) => (
                <div
                  key={page.id}
                  className="group relative bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden shadow-lg transition-all flex flex-col"
                >
                  {/* Page Header Bar */}
                  <div className="px-3 py-2 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between text-xs">
                    <span className="font-semibold text-white flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-[11px] font-bold text-white flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span>Hal {index + 1}</span>
                    </span>

                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-slate-700 text-slate-300">
                      {page.filter === 'magic'
                        ? 'Magic Color'
                        : page.filter === 'bw'
                        ? 'B&W'
                        : page.filter === 'grayscale'
                        ? 'Grayscale'
                        : page.filter === 'contrast'
                        ? 'Kontras'
                        : 'Asli'}
                    </span>
                  </div>

                  {/* Thumbnail Container */}
                  <div
                    onClick={() => setEditingPageIndex(index)}
                    className="relative w-full aspect-[3/4] bg-slate-950 flex items-center justify-center p-2.5 cursor-pointer overflow-hidden group-hover:bg-slate-950/80 transition-colors"
                  >
                    <img
                      src={page.processedDataUrl}
                      alt={`Halaman ${index + 1}`}
                      className="max-w-full max-h-full object-contain shadow-md rounded border border-slate-800 select-none"
                    />

                    {/* Quick Edit Overlay on Hover */}
                    <div className="absolute inset-0 bg-blue-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium flex items-center gap-1 shadow-lg">
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Halaman</span>
                      </span>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="p-2 bg-slate-900 border-t border-slate-800/80 grid grid-cols-4 gap-1 text-slate-400">
                    {/* Move Left */}
                    <button
                      onClick={() => movePage(index, 'left')}
                      disabled={index === 0}
                      className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Geser ke kiri / urutan sebelum"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>

                    {/* Move Right */}
                    <button
                      onClick={() => movePage(index, 'right')}
                      disabled={index === pages.length - 1}
                      className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Geser ke kanan / urutan sesudah"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    {/* AI OCR */}
                    <button
                      onClick={() => setOcrPageIndex(index)}
                      className="p-1.5 rounded-lg hover:bg-purple-500/20 hover:text-purple-300 text-purple-400 flex items-center justify-center transition-colors"
                      title="Ekstrak Teks & Ringkasan AI (OCR)"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => deletePage(index)}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-400 text-slate-400 flex items-center justify-center transition-colors"
                      title="Hapus halaman ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Add New Page Card placeholder */}
              <button
                onClick={() => setIsCameraOpen(true)}
                className="w-full aspect-[3/4] rounded-2xl border-2 border-dashed border-slate-800 hover:border-blue-500/60 bg-slate-900/30 hover:bg-blue-500/5 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-blue-400 transition-all group"
              >
                <div className="p-3 rounded-full bg-slate-800 group-hover:bg-blue-600/20 transition-colors">
                  <Camera className="w-6 h-6" />
                </div>
                <span className="text-xs font-medium">Scan Halaman Berikutnya</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Floating Bottom Action Bar (When pages exist) */}
      {pages.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-3.5 shadow-2xl">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300 font-medium">
                Total: <strong className="text-white">{pages.length}</strong> Halaman
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setOcrPageIndex(0)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-medium border border-purple-500/30 flex items-center gap-1.5 transition-all"
                title="Baca teks seluruh halaman dengan OCR AI"
              >
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="hidden sm:inline">Ekstrak Teks (OCR)</span>
              </button>

              <button
                onClick={() => setIsPdfModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xl shadow-blue-500/30 active:scale-95 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Simpan Dokumen ke PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Scanner Modal */}
      {isCameraOpen && (
        <CameraScanner
          onCapture={(capturedUrls) => {
            setIsCameraOpen(false);
            addImagesAsPages(capturedUrls);
          }}
          onClose={() => setIsCameraOpen(false)}
          initialPageCount={pages.length}
        />
      )}

      {/* Page Editor Modal */}
      {editingPageIndex !== null && pages[editingPageIndex] && (
        <PageEditorModal
          page={pages[editingPageIndex]}
          pageIndex={editingPageIndex}
          totalPages={pages.length}
          onSave={handleSaveEditedPage}
          onClose={() => setEditingPageIndex(null)}
        />
      )}

      {/* PDF Export Modal */}
      {isPdfModalOpen && pages.length > 0 && (
        <PdfExportModal
          pages={pages}
          onClose={() => setIsPdfModalOpen(false)}
          onAutoTitleRequest={handleAutoTitleFromAI}
        />
      )}

      {/* OCR & AI Intelligence Modal */}
      {ocrPageIndex !== null && pages[ocrPageIndex] && (
        <OcrModal
          page={pages[ocrPageIndex]}
          pageIndex={ocrPageIndex}
          onApplyTitle={(title) => {
            showToast(`Nama dokumen "${title}" siap diekspor`);
          }}
          onClose={() => setOcrPageIndex(null)}
        />
      )}
    </div>
  );
}
