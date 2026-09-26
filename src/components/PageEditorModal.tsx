import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  RotateCw,
  RotateCcw,
  Sparkles,
  Sliders,
  Crop as CropIcon,
  Check,
  Undo2,
  Sun,
  Contrast as ContrastIcon,
  Maximize2,
} from 'lucide-react';
import { ScannedPage, DocumentFilter, CropRect } from '../types';
import { processImage } from '../utils/imageProcessing';

interface PageEditorModalProps {
  page: ScannedPage;
  pageIndex: number;
  totalPages: number;
  onSave: (updatedPage: ScannedPage) => void;
  onClose: () => void;
}

const FILTER_OPTIONS: { id: DocumentFilter; label: string; desc: string }[] = [
  { id: 'magic', label: 'Magic Color', desc: 'Latar putih bersih, teks tajam' },
  { id: 'bw', label: 'Hitam Putih', desc: 'Kontras tinggi, cocok cetak & nota' },
  { id: 'grayscale', label: 'Grayscale', desc: 'Monokrom halus tanpa noda warna' },
  { id: 'contrast', label: 'Super Kontras', desc: 'Perjelas tulisan pensil/redup' },
  { id: 'original', label: 'Foto Asli', desc: 'Warna alami dari kamera' },
];

export const PageEditorModal: React.FC<PageEditorModalProps> = ({
  page,
  pageIndex,
  totalPages,
  onSave,
  onClose,
}) => {
  const [filter, setFilter] = useState<DocumentFilter>(page.filter);
  const [rotation, setRotation] = useState<number>(page.rotation);
  const [brightness, setBrightness] = useState<number>(page.brightness);
  const [contrast, setContrast] = useState<number>(page.contrast);
  const [crop, setCrop] = useState<CropRect | undefined>(page.crop);

  // Active tab: 'filters' | 'crop' | 'adjust'
  const [activeTab, setActiveTab] = useState<'filters' | 'adjust' | 'crop'>('filters');

  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string>(page.processedDataUrl);
  const [previewDim, setPreviewDim] = useState<{ width: number; height: number }>({
    width: page.width,
    height: page.height,
  });
  const [isProcessing, setIsProcessing] = useState(false);

  // Crop interaction states
  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  const [isDraggingCrop, setIsDraggingCrop] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [initialCropOnDrag, setInitialCropOnDrag] = useState<CropRect | null>(null);

  // Default initial crop if undefined
  const activeCrop: CropRect = crop || { x: 0, y: 0, width: 100, height: 100 };

  // Re-generate preview when settings change
  const updatePreview = useCallback(async () => {
    setIsProcessing(true);
    try {
      const res = await processImage(
        page.originalDataUrl,
        filter,
        rotation,
        brightness,
        contrast,
        crop
      );
      setPreviewUrl(res.dataUrl);
      setPreviewDim({ width: res.width, height: res.height });
    } catch (err) {
      console.error('Error generating preview:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [page.originalDataUrl, filter, rotation, brightness, contrast, crop]);

  // Debounced preview update
  useEffect(() => {
    const timer = setTimeout(() => {
      updatePreview();
    }, 120);
    return () => clearTimeout(timer);
  }, [updatePreview]);

  // Rotate handlers
  const handleRotateCw = () => setRotation((prev) => (prev + 90) % 360);
  const handleRotateCcw = () => setRotation((prev) => (prev - 90 + 360) % 360);

  // Reset adjustments
  const handleResetAdjustments = () => {
    setBrightness(0);
    setContrast(0);
  };

  // Reset crop
  const handleResetCrop = () => {
    setCrop(undefined);
  };

  // Preset auto-crop margins (e.g. 3% inset to remove desk rim)
  const handleAutoTrimMargins = () => {
    setCrop({ x: 3, y: 3, width: 94, height: 94 });
  };

  // Save changes
  const handleSave = () => {
    onSave({
      ...page,
      filter,
      rotation,
      brightness,
      contrast,
      crop,
      processedDataUrl: previewUrl,
      width: previewDim.width,
      height: previewDim.height,
    });
  };

  // Crop Drag Handlers
  const handlePointerDown = (handle: string, e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDraggingCrop(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialCropOnDrag(activeCrop);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingCrop || !dragStart || !initialCropOnDrag || !imageContainerRef.current) return;

    const rect = imageContainerRef.current.getBoundingClientRect();
    const deltaXPercent = ((e.clientX - dragStart.x) / rect.width) * 100;
    const deltaYPercent = ((e.clientY - dragStart.y) / rect.height) * 100;

    let { x, y, width, height } = initialCropOnDrag;

    if (isDraggingCrop === 'move') {
      x = Math.max(0, Math.min(100 - width, x + deltaXPercent));
      y = Math.max(0, Math.min(100 - height, y + deltaYPercent));
    } else if (isDraggingCrop === 'tl') {
      const newX = Math.max(0, Math.min(x + width - 10, x + deltaXPercent));
      const newY = Math.max(0, Math.min(y + height - 10, y + deltaYPercent));
      width = width - (newX - x);
      height = height - (newY - y);
      x = newX;
      y = newY;
    } else if (isDraggingCrop === 'tr') {
      const newY = Math.max(0, Math.min(y + height - 10, y + deltaYPercent));
      width = Math.max(10, Math.min(100 - x, width + deltaXPercent));
      height = height - (newY - y);
      y = newY;
    } else if (isDraggingCrop === 'bl') {
      const newX = Math.max(0, Math.min(x + width - 10, x + deltaXPercent));
      width = width - (newX - x);
      height = Math.max(10, Math.min(100 - y, height + deltaYPercent));
      x = newX;
    } else if (isDraggingCrop === 'br') {
      width = Math.max(10, Math.min(100 - x, width + deltaXPercent));
      height = Math.max(10, Math.min(100 - y, height + deltaYPercent));
    }

    setCrop({
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      width: Math.round(width * 10) / 10,
      height: Math.round(height * 10) / 10,
    });
  };

  const handlePointerUp = () => {
    setIsDraggingCrop(null);
    setDragStart(null);
    setInitialCropOnDrag(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col justify-between select-none">
      {/* Top Header */}
      <div className="w-full flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 text-white">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-all"
            title="Batal"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-sm font-semibold">Edit Dokumen</h2>
            <p className="text-xs text-slate-400">
              Halaman {pageIndex + 1} dari {totalPages}
            </p>
          </div>
        </div>

        {/* Rotate & Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRotateCcw}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 active:scale-95 transition-all"
            title="Putar Kiri 90°"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleRotateCw}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 active:scale-95 transition-all"
            title="Putar Kanan 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleSave}
            disabled={isProcessing}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-lg shadow-blue-600/30 active:scale-95 transition-all disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>Simpan</span>
          </button>
        </div>
      </div>

      {/* Main Preview Area */}
      <div
        className="relative flex-1 w-full flex items-center justify-center p-4 overflow-hidden bg-slate-950/60"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div
          ref={imageContainerRef}
          className="relative max-h-[65vh] max-w-[90vw] flex items-center justify-center shadow-2xl rounded-lg overflow-hidden border border-slate-800 bg-black/40"
        >
          <img
            src={activeTab === 'crop' ? page.originalDataUrl : previewUrl}
            alt="Pratinjau Dokumen"
            className="max-h-[65vh] max-w-[90vw] object-contain select-none pointer-events-none"
            style={{
              transform: activeTab === 'crop' ? `rotate(${rotation}deg)` : undefined,
              transition: 'transform 0.2s ease',
            }}
          />

          {/* Interactive Crop Overlay when Crop tab is active */}
          {activeTab === 'crop' && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Dimmed backdrop outside crop area */}
              <div
                className="absolute inset-0 bg-black/60"
                style={{
                  clipPath: `polygon(
                    0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
                    ${activeCrop.x}% ${activeCrop.y}%,
                    ${activeCrop.x}% ${activeCrop.y + activeCrop.height}%,
                    ${activeCrop.x + activeCrop.width}% ${activeCrop.y + activeCrop.height}%,
                    ${activeCrop.x + activeCrop.width}% ${activeCrop.y}%,
                    ${activeCrop.x}% ${activeCrop.y}%
                  )`,
                }}
              />

              {/* Crop Bounding Box */}
              <div
                className="absolute border-2 border-emerald-400 bg-transparent pointer-events-auto cursor-move"
                style={{
                  left: `${activeCrop.x}%`,
                  top: `${activeCrop.y}%`,
                  width: `${activeCrop.width}%`,
                  height: `${activeCrop.height}%`,
                }}
                onPointerDown={(e) => handlePointerDown('move', e)}
              >
                {/* 3x3 Grid inside crop */}
                <div className="w-full h-full grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                  <div className="border-r border-b border-white" />
                  <div className="border-r border-b border-white" />
                  <div className="border-b border-white" />
                  <div className="border-r border-b border-white" />
                  <div className="border-r border-b border-white" />
                  <div className="border-b border-white" />
                  <div className="border-r border-white" />
                  <div className="border-r border-white" />
                  <div />
                </div>

                {/* Corner Handles */}
                <div
                  className="absolute -top-2 -left-2 w-5 h-5 bg-white border-2 border-emerald-500 rounded-full cursor-nwse-resize pointer-events-auto shadow-md"
                  onPointerDown={(e) => handlePointerDown('tl', e)}
                />
                <div
                  className="absolute -top-2 -right-2 w-5 h-5 bg-white border-2 border-emerald-500 rounded-full cursor-nesw-resize pointer-events-auto shadow-md"
                  onPointerDown={(e) => handlePointerDown('tr', e)}
                />
                <div
                  className="absolute -bottom-2 -left-2 w-5 h-5 bg-white border-2 border-emerald-500 rounded-full cursor-nesw-resize pointer-events-auto shadow-md"
                  onPointerDown={(e) => handlePointerDown('bl', e)}
                />
                <div
                  className="absolute -bottom-2 -right-2 w-5 h-5 bg-white border-2 border-emerald-500 rounded-full cursor-nwse-resize pointer-events-auto shadow-md"
                  onPointerDown={(e) => handlePointerDown('br', e)}
                />
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
              <div className="bg-slate-900/90 text-white text-xs px-3 py-1.5 rounded-full border border-slate-700 flex items-center gap-2 shadow-lg">
                <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <span>Memproses filter...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Tool Panel */}
      <div className="w-full bg-slate-900 border-t border-slate-800 flex flex-col">
        {/* Tab content area */}
        <div className="p-4 max-w-2xl mx-auto w-full">
          {activeTab === 'filters' && (
            <div className="flex flex-col gap-2">
              <div className="text-xs text-slate-400 font-medium px-1 flex items-center justify-between">
                <span>Pilih Filter Dokumen:</span>
                <span className="text-emerald-400 text-[11px]">
                  {FILTER_OPTIONS.find((f) => f.id === filter)?.desc}
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {FILTER_OPTIONS.map((f) => {
                  const isSelected = filter === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setFilter(f.id)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/15 text-white font-semibold shadow-md shadow-blue-500/10'
                          : 'border-slate-800 bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Sparkles
                        className={`w-4 h-4 mb-1 ${
                          isSelected ? 'text-blue-400' : 'text-slate-400'
                        }`}
                      />
                      <span>{f.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'adjust' && (
            <div className="space-y-4 py-1">
              {/* Brightness */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Sun className="w-4 h-4 text-amber-400" />
                    Kecerahan (Brightness)
                  </span>
                  <span className="font-mono text-slate-400">{brightness > 0 ? `+${brightness}` : brightness}</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              {/* Contrast */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <ContrastIcon className="w-4 h-4 text-blue-400" />
                    Kontras (Contrast)
                  </span>
                  <span className="font-mono text-slate-400">{contrast > 0 ? `+${contrast}` : contrast}</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={handleResetAdjustments}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Reset Kecerahan</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'crop' && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-1">
              <div className="text-xs text-slate-300 text-center sm:text-left">
                Tarik sudut kotak hijau untuk membuang tepi meja atau bayangan tangan.
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAutoTrimMargins}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 flex items-center gap-1 transition-all"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Pangkas Tepi (Auto Trim)</span>
                </button>
                <button
                  onClick={handleResetCrop}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 flex items-center gap-1 transition-all"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Reset Pangkas</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation Buttons */}
        <div className="grid grid-cols-3 border-t border-slate-800/80 bg-slate-950/80 text-xs">
          <button
            onClick={() => setActiveTab('filters')}
            className={`py-3 flex flex-col items-center gap-1 font-medium transition-colors ${
              activeTab === 'filters'
                ? 'text-blue-400 border-t-2 border-blue-500 bg-blue-500/5'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Filter Kertas</span>
          </button>

          <button
            onClick={() => setActiveTab('crop')}
            className={`py-3 flex flex-col items-center gap-1 font-medium transition-colors ${
              activeTab === 'crop'
                ? 'text-blue-400 border-t-2 border-blue-500 bg-blue-500/5'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CropIcon className="w-4 h-4" />
            <span>Pangkas (Crop)</span>
          </button>

          <button
            onClick={() => setActiveTab('adjust')}
            className={`py-3 flex flex-col items-center gap-1 font-medium transition-colors ${
              activeTab === 'adjust'
                ? 'text-blue-400 border-t-2 border-blue-500 bg-blue-500/5'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Kecerahan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
