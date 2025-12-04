import React, { useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react'; // Assuming peer dependency availability
import { Download, Share2 } from 'lucide-react';

interface QRCodeConfig {
  value?: string;
  size: number;
  fgColor: string;
  bgColor: string;
  level: string;
  includeImage?: boolean;
  imageSrc?: string;
}

interface QRCodeViewerProps {
  config: QRCodeConfig;
}

export const QRCodeViewer: React.FC<QRCodeViewerProps> = ({ config }) => {
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    // Find the canvas inside the container
    const canvas = canvasRef.current?.querySelector('canvas');
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexus-qr-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md mx-auto transition-all duration-300 hover:shadow-2xl">
      <div 
        ref={canvasRef} 
        className="p-4 bg-white rounded-lg border-2 border-dashed border-slate-200 mb-6"
      >
        <QRCodeCanvas
          id="qr-canvas"
          value={config.value || "https://example.com"}
          size={config.size}
          fgColor={config.fgColor}
          bgColor={config.bgColor}
          level={config.level}
          imageSettings={config.includeImage && config.imageSrc ? {
            src: config.imageSrc,
            x: undefined,
            y: undefined,
            height: config.size * 0.2,
            width: config.size * 0.2,
            excavate: true,
          } : undefined}
        />
      </div>

      <div className="flex gap-3 w-full">
        <button
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-xl font-medium transition-colors shadow-lg shadow-indigo-200"
        >
          <Download size={18} />
          Download PNG
        </button>
      </div>
      
      <p className="mt-4 text-xs text-slate-400 text-center">
        Generated with high-fidelity error correction ({config.level})
      </p>
    </div>
  );
};