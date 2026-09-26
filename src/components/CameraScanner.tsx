import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, RotateCcw, Zap, ZapOff, Check, ImagePlus, Layers, AlertCircle } from 'lucide-react';
import { playShutterSound } from '../utils/sound';

interface CameraScannerProps {
  onCapture: (dataUrls: string[]) => void;
  onClose: () => void;
  initialPageCount?: number;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({
  onCapture,
  onClose,
  initialPageCount = 0,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [batchMode, setBatchMode] = useState(true);
  const [sessionCaptures, setSessionCaptures] = useState<string[]>([]);
  const [flashEffect, setFlashEffect] = useState(false);

  // Initialize Camera Stream
  useEffect(() => {
    let currentStream: MediaStream | null = null;

    async function initCamera() {
      setCameraError(null);
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Browser tidak mendukung akses kamera langsung. Silakan gunakan tombol Ambil dari Galeri/Kamera.');
        }

        // Stop previous tracks if any
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }

        const constraints: MediaStreamConstraints = {
          audio: false,
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
          },
        };

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        currentStream = mediaStream;
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play();
        }

        // Check torch capability
        const track = mediaStream.getVideoTracks()[0];
        const capabilities = track.getCapabilities?.() as any;
        if (capabilities && capabilities.torch) {
          setHasTorch(true);
        } else {
          setHasTorch(false);
        }
      } catch (err: any) {
        console.error('Kamera error:', err);
        let msg = 'Izin kamera tidak diberikan atau perangkat kamera tidak ditemukan.';
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          msg = 'Izin akses kamera ditolak. Berikan izin di browser Anda atau gunakan tombol unggah foto.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          msg = 'Kamera tidak ditemukan pada perangkat Anda.';
        }
        setCameraError(msg);
      }
    }

    initCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextTorch = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn('Gagal mengubah flash:', e);
    }
  };

  // Flip Camera (Front / Back)
  const flipCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Capture Photo
  const handleSnap = () => {
    if (!videoRef.current || isCapturing) return;

    setIsCapturing(true);
    setFlashEffect(true);
    playShutterSound();

    setTimeout(() => setFlashEffect(false), 200);

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // If user camera, mirror it
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.94);

      if (batchMode) {
        setSessionCaptures((prev) => [...prev, dataUrl]);
        setIsCapturing(false);
      } else {
        // Single shot -> finish immediately
        onCapture([dataUrl]);
      }
    } else {
      setIsCapturing(false);
    }
  };

  // Finish batch scanning
  const handleFinishBatch = () => {
    if (sessionCaptures.length > 0) {
      onCapture(sessionCaptures);
    } else {
      onClose();
    }
  };

  // Handle native file camera input
  const handleNativeFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const promises = Array.from(files).map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then((urls) => {
      onCapture(urls);
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between overflow-hidden select-none">
      {/* Hidden canvas for snapshot rendering */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Hidden file input for native camera trigger */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={handleNativeFileInput}
      />

      {/* Screen Flash Animation */}
      {flashEffect && (
        <div className="absolute inset-0 bg-white z-40 pointer-events-none transition-opacity duration-150" />
      )}

      {/* Top Header Bar */}
      <div className="w-full z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent text-white">
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white backdrop-blur-md"
          title="Tutup Kamera"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Batch mode toggle */}
        <button
          onClick={() => setBatchMode(!batchMode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-md transition-all ${
            batchMode
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
              : 'bg-white/10 text-white/80 hover:bg-white/20'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{batchMode ? 'Mode Banyak Halaman (Aktif)' : 'Mode 1 Halaman'}</span>
        </button>

        {/* Torch & Flip Camera */}
        <div className="flex items-center gap-2">
          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={`p-2 rounded-full backdrop-blur-md transition-all ${
                torchOn ? 'bg-amber-400 text-black' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              title="Flashlight"
            >
              {torchOn ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
            </button>
          )}

          <button
            onClick={flipCamera}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white backdrop-blur-md"
            title="Ganti Kamera Depan/Belakang"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Camera Viewport & Framing Aid */}
      <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden">
        {cameraError ? (
          <div className="p-6 max-w-sm mx-auto text-center text-white bg-slate-900/90 rounded-2xl border border-slate-700/80 shadow-2xl backdrop-blur-lg">
            <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
            <h3 className="font-semibold text-lg mb-1">Akses Kamera Terkendala</h3>
            <p className="text-sm text-slate-300 mb-5 leading-relaxed">{cameraError}</p>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-95 transition-all"
            >
              <Camera className="w-5 h-5" />
              <span>Gunakan Kamera HP / Galeri</span>
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="w-full h-full object-cover"
            />

            {/* Document Frame Guide Overlay */}
            <div className="absolute inset-6 md:inset-16 pointer-events-none border-2 border-dashed border-white/40 rounded-2xl flex flex-col justify-between p-4">
              {/* Corner Accents */}
              <div className="flex justify-between">
                <div className="w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                <div className="w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
              </div>

              {/* Centered Guide Text */}
              <div className="self-center bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full text-xs text-white/90 border border-white/10 shadow-lg tracking-wide text-center">
                Posisikan dokumen di dalam bingkai
              </div>

              <div className="flex justify-between">
                <div className="w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                <div className="w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div className="w-full z-20 bg-gradient-to-t from-black via-black/90 to-transparent pt-4 pb-8 px-6 flex items-center justify-between">
        {/* Left: Gallery / Native Picker */}
        <div className="w-20 flex justify-start">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-all text-xs"
          >
            <div className="p-3 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all">
              <ImagePlus className="w-5 h-5" />
            </div>
            <span>Galeri</span>
          </button>
        </div>

        {/* Center: Shutter Button */}
        <div className="flex flex-col items-center">
          <button
            onClick={handleSnap}
            disabled={isCapturing || !!cameraError}
            aria-label="Ambil Foto Dokumen"
            className="relative group p-1.5 rounded-full bg-white/20 active:scale-90 transition-transform duration-100 disabled:opacity-50"
          >
            <div className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-white group-hover:bg-slate-100 shadow-md group-active:scale-95 transition-transform" />
            </div>
          </button>
        </div>

        {/* Right: Done / Next Button with Counter */}
        <div className="w-20 flex justify-end">
          {sessionCaptures.length > 0 ? (
            <button
              onClick={handleFinishBatch}
              className="flex flex-col items-center gap-1 text-white text-xs font-semibold group animate-bounce"
            >
              <div className="relative p-3 rounded-full bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/30 text-white active:scale-95 transition-all">
                <Check className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-black">
                  {sessionCaptures.length}
                </span>
              </div>
              <span className="text-emerald-400">Selesai ({sessionCaptures.length})</span>
            </button>
          ) : (
            <div className="w-12 text-center text-[11px] text-white/50">
              {initialPageCount > 0 ? `${initialPageCount} Hal` : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
