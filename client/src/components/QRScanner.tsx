import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsQR from "jsqr";
import { getQrScanFrameSize } from "@/lib/qrScan";

interface QRScannerProps {
  onScan: (data: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function QRScanner({ onScan, isOpen, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const onScanRef = useRef(onScan);

  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  useEffect(() => {
    if (!isOpen) return;

    const startCamera = async () => {
      try {
        setError(null);
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Este navegador no ofrece acceso a la cámara");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 960, max: 1280 },
            height: { ideal: 540, max: 720 },
          },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            void videoRef.current?.play().catch(() => undefined);
            setIsScanning(true);
          };
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "No se pudo acceder a la cámara";
        setError(
          `${errorMessage}. Verifica los permisos de cámara en tu dispositivo.`
        );
        setIsScanning(false);
      }
    };

    startCamera();

    return () => {
      if (animationFrameRef.current) window.cancelAnimationFrame(animationFrameRef.current);
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [isOpen]);

  // QR detection loop using jsQR
  useEffect(() => {
    if (!isScanning || !videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let hasScanned = false;
    let lastScanAt = 0;
    const scanFrame = (timestamp: number) => {
      try {
        const video = videoRef.current;
        if (!video || video.readyState !== video.HAVE_ENOUGH_DATA || hasScanned) {
          if (!hasScanned) animationFrameRef.current = window.requestAnimationFrame(scanFrame);
          return;
        }
        if (timestamp - lastScanAt < 100) {
          animationFrameRef.current = window.requestAnimationFrame(scanFrame);
          return;
        }
        lastScanAt = timestamp;
        const frameSize = getQrScanFrameSize(video.videoWidth, video.videoHeight);
        if (!frameSize.width || !frameSize.height) {
          animationFrameRef.current = window.requestAnimationFrame(scanFrame);
          return;
        }

        if (canvas.width !== frameSize.width) canvas.width = frameSize.width;
        if (canvas.height !== frameSize.height) canvas.height = frameSize.height;

        ctx.drawImage(video, 0, 0, frameSize.width, frameSize.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });

        if (code) {
          hasScanned = true;
          onScanRef.current(code.data);
          return;
        }
      } catch (err) {
        console.error("Scan error:", err);
      }
      animationFrameRef.current = window.requestAnimationFrame(scanFrame);
    };
    animationFrameRef.current = window.requestAnimationFrame(scanFrame);

    return () => {
      if (animationFrameRef.current) window.cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isScanning]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            Escanear QR
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {error}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden aspect-square">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* QR frame overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-4 border-primary rounded-lg opacity-70" />
                  <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-lg" />
                </div>
              </div>

              <p className="text-sm text-gray-600 text-center">
                Apunta la cámara hacia el código QR del envío
              </p>
            </div>
          )}
        </div>

        <div className="p-4 border-t flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
