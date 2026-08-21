import React, { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsQR from "jsqr";
import { getQrScanFrameSize } from "@/lib/qrScan";

interface QRScannerProps {
  onScan: (data: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const stopStream = (stream: MediaStream | null) => stream?.getTracks().forEach(track => track.stop());

export function QRScanner({ onScan, isOpen, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const onScanRef = useRef(onScan);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraAttempt, setCameraAttempt] = useState(0);

  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setError(null);
    setIsScanning(false);

    const connectCamera = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Este navegador no ofrece acceso a la cámara");
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
          });
        } catch (rearCameraError) {
          // Algunos navegadores móviles no aceptan restricciones de cámara trasera; se reintenta con cualquier cámara disponible.
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          console.warn("Se usó una cámara alternativa para leer el QR.", rearCameraError);
        }
        if (cancelled) { stopStream(stream); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) { stopStream(stream); return; }
        video.srcObject = stream;
        video.onloadeddata = () => {
          void video.play().then(() => {
            if (!cancelled) setIsScanning(true);
          }).catch(() => setError("No se pudo iniciar la vista de cámara. Toca «Reintentar cámara»."));
        };
      } catch (cameraError) {
        if (cancelled) return;
        const reason = cameraError instanceof Error ? cameraError.message : "No se pudo acceder a la cámara";
        setError(`${reason}. Permite el uso de cámara y vuelve a intentarlo.`);
        setIsScanning(false);
      }
    };
    void connectCamera();

    return () => {
      cancelled = true;
      setIsScanning(false);
      if (animationFrameRef.current) window.cancelAnimationFrame(animationFrameRef.current);
      stopStream(streamRef.current);
      streamRef.current = null;
      if (videoRef.current) { videoRef.current.onloadeddata = null; videoRef.current.srcObject = null; }
    };
  }, [isOpen, cameraAttempt]);

  useEffect(() => {
    if (!isScanning || !videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    let hasScanned = false;
    let lastScanAt = 0;
    const scanFrame = (timestamp: number) => {
      const video = videoRef.current;
      if (!video || hasScanned) return;
      if (video.readyState !== video.HAVE_ENOUGH_DATA || timestamp - lastScanAt < 80) {
        animationFrameRef.current = window.requestAnimationFrame(scanFrame);
        return;
      }
      lastScanAt = timestamp;
      try {
        const frameSize = getQrScanFrameSize(video.videoWidth, video.videoHeight);
        if (!frameSize.width || !frameSize.height) {
          animationFrameRef.current = window.requestAnimationFrame(scanFrame);
          return;
        }
        if (canvas.width !== frameSize.width) canvas.width = frameSize.width;
        if (canvas.height !== frameSize.height) canvas.height = frameSize.height;
        context.drawImage(video, 0, 0, frameSize.width, frameSize.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "attemptBoth" });
        if (code?.data) {
          hasScanned = true;
          setIsScanning(false);
          stopStream(streamRef.current);
          onScanRef.current(code.data);
          return;
        }
      } catch (scanError) {
        console.warn("No se pudo procesar un fotograma QR; se continúa intentando.", scanError);
      }
      animationFrameRef.current = window.requestAnimationFrame(scanFrame);
    };
    animationFrameRef.current = window.requestAnimationFrame(scanFrame);
    return () => { if (animationFrameRef.current) window.cancelAnimationFrame(animationFrameRef.current); };
  }, [isScanning]);

  const retryCamera = () => { setError(null); setCameraAttempt(attempt => attempt + 1); };
  const closeScanner = () => { setIsScanning(false); onClose(); };
  if (!isOpen) return null;

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="qr-scanner-title">
    <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b p-4"><h2 id="qr-scanner-title" className="flex items-center gap-2 text-lg font-semibold"><Camera className="h-5 w-5 text-primary" />Escanear QR</h2><button type="button" onClick={closeScanner} aria-label="Cerrar escáner QR" className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"><X className="h-5 w-5" /></button></div>
      <div className="p-4">{error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"><p>{error}</p><Button type="button" onClick={retryCamera} className="mt-3 bg-[#0B2B5E] text-white hover:bg-[#123d78]"><RefreshCw className="mr-2 h-4 w-4" />Reintentar cámara</Button></div> : <div className="space-y-4"><div className="relative aspect-square overflow-hidden rounded-lg bg-black"><video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" /><canvas ref={canvasRef} className="hidden" /><div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="h-48 w-48 rounded-lg border-4 border-primary opacity-80" /></div></div><p className="text-center text-sm text-gray-600">Apunta a un QR completo, con buena luz, y mantén el teléfono firme unos segundos.</p></div>}</div>
      <div className="flex gap-2 border-t p-4"><Button variant="outline" type="button" onClick={closeScanner} className="flex-1">Cerrar</Button>{!error && <Button variant="outline" type="button" onClick={retryCamera} className="flex-1"><RefreshCw className="mr-2 h-4 w-4" />Reiniciar cámara</Button>}</div>
    </div>
  </div>;
}
