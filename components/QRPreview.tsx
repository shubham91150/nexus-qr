import React, { useEffect, useRef, useState } from 'react';
import { QRStyleConfig } from '../types';
import { CustomSVGRenderer } from '../services/customSvgRenderer';
import { Download, Share2, Printer, CheckCircle, Package, Loader2, Sliders } from 'lucide-react';

interface Props {
  data: string;
  config: QRStyleConfig;
  className?: string;
  bulkItems?: Array<{name: string, value: string}>;
  onConfigChange?: (config: QRStyleConfig) => void;
}

export const QRPreview: React.FC<Props> = ({ data, config, className, bulkItems, onConfigChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderer = useRef<CustomSVGRenderer | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Initialize renderer
  useEffect(() => {
    renderer.current = new CustomSVGRenderer(config);
  }, []);

  // Update logic
  useEffect(() => {
    // Debounce the QR generation to optimize performance
    const timer = setTimeout(() => {
        if (!data || !renderer.current || !containerRef.current) return;
        
        // Update renderer config
        renderer.current.updateConfig(config);
        
        // Render SVG string
        const svgString = renderer.current.render(data);
        
        // Inject into DOM
        containerRef.current.innerHTML = svgString;
        
    }, 100); // 100ms debounce

    return () => clearTimeout(timer);
  }, [data, config]);

  const handleConfigUpdate = (key: keyof QRStyleConfig, value: any) => {
    if (onConfigChange) {
        onConfigChange({ ...config, [key]: value });
    }
  };

  const handleDownload = async (ext: 'png' | 'svg' | 'jpeg') => {
    if (!renderer.current || !containerRef.current) return;
    setDownloading(true);
    
    // Get SVG string
    const svgElement = containerRef.current.querySelector('svg');
    if (!svgElement) return;
    
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const filename = `nexus-qr-${Date.now()}`;

    if (ext === 'svg') {
        const blob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setDownloading(false);
    } else {
        // Convert to PNG via Canvas
        const img = new Image();
        const blob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            // Smart scaling: If size is large (>2000px), use 1x scale to prevent crash/OOM
            // If size is small, use 2x for retina quality
            const scale = config.size > 2000 ? 1 : 2; 
            
            canvas.width = config.size * scale;
            canvas.height = config.size * scale;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.scale(scale, scale);
                // Important: Do not draw checkerboard background here for transparency
                if (!config.bgTransparent) {
                    ctx.fillStyle = config.bgColor;
                    ctx.fillRect(0, 0, config.size, config.size);
                }
                ctx.drawImage(img, 0, 0);
                const pngUrl = canvas.toDataURL("image/png");
                const a = document.createElement('a');
                a.href = pngUrl;
                a.download = `${filename}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
            URL.revokeObjectURL(url);
            setDownloading(false);
        };
        img.src = url;
    }
  };

  const handleBulkDownload = async () => {
      if (!bulkItems || bulkItems.length === 0 || !window.JSZip || !renderer.current) return;
      
      setDownloading(true);
      setProgress(0);
      
      const zip = new window.JSZip();
      
      try {
          const total = bulkItems.length;
          // Temporarily use current config but ensure clean renderer usage
          const tempRenderer = new CustomSVGRenderer(config);
          
          for (let i = 0; i < total; i++) {
              const item = bulkItems[i];
              const svgString = tempRenderer.render(item.value);
              
              await new Promise<void>((resolve) => {
                  const img = new Image();
                  const blob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
                  const url = URL.createObjectURL(blob);
                  img.onload = () => {
                      const canvas = document.createElement('canvas');
                      // Conservative size for bulk to avoid OOM
                      const bulkSize = Math.min(config.size, 2000); 
                      canvas.width = bulkSize;
                      canvas.height = bulkSize;
                      const ctx = canvas.getContext('2d');
                      
                      // Handle scale if config size was larger
                      const scale = bulkSize / config.size;
                      if (scale !== 1) ctx?.scale(scale, scale);

                      if (ctx && !config.bgTransparent) {
                          ctx.fillStyle = config.bgColor;
                          ctx.fillRect(0, 0, config.size, config.size);
                      }
                      ctx?.drawImage(img, 0, 0);
                      
                      canvas.toBlob((blob) => {
                          if (blob) {
                              const safeName = item.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                              zip.file(`${safeName}.png`, blob);
                          }
                          URL.revokeObjectURL(url);
                          resolve();
                      });
                  };
                  img.src = url;
              });

              setProgress(Math.round(((i + 1) / total) * 100));
          }
          
          const content = await zip.generateAsync({ type: "blob" });
          const url = URL.createObjectURL(content);
          const a = document.createElement('a');
          a.href = url;
          a.download = `nexus-bulk-qr-${Date.now()}.zip`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
      } catch (e) {
          console.error("Bulk generation error", e);
          alert("Failed to generate bulk ZIP. See console.");
      } finally {
          setDownloading(false);
          setProgress(0);
      }
  };

  const handlePrint = () => {
      const svgElement = containerRef.current?.innerHTML;
      if (svgElement) {
        const win = window.open('', '_blank');
        win?.document.write(`
            <html>
                <body style="display:flex;justify-content:center;align-items:center;height:100vh;">
                    ${svgElement}
                </body>
            </html>
        `);
        win?.document.close();
        setTimeout(() => win?.print(), 500);
    }
  };

  const isBulkMode = bulkItems && bulkItems.length > 0;

  // Checkerboard pattern for transparency visualization
  const checkerboardStyle = config.bgTransparent ? {
      backgroundImage: `
          linear-gradient(45deg, #f0f0f0 25%, transparent 25%), 
          linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), 
          linear-gradient(45deg, transparent 75%, #f0f0f0 75%), 
          linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)
      `,
      backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
      backgroundSize: '20px 20px',
      backgroundColor: '#fff' 
  } : {};

  return (
    <div className={`bg-white rounded-[24px] shadow-card p-6 md:p-8 flex flex-col items-center ${className}`}>
      <div className="mb-6 flex flex-col items-center w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-xs font-semibold text-gray-600 mb-4">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              {isBulkMode ? `PREVIEW (1 of ${bulkItems.length})` : 'LIVE PREVIEW'}
          </div>
          
          <div className="relative group w-full flex justify-center">
             {/* Glowing backdrop effect */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] bg-gradient-to-tr from-gray-200 to-gray-100 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-1000"></div>
             
             {/* 
                 Container: 
                 - Applies checkerboard style if transparent
                 - bg-white if not transparent
             */}
             <div 
                ref={containerRef} 
                className={`relative p-4 rounded-xl border border-gray-100 shadow-sm transition-transform duration-300 group-hover:scale-[1.02] [&>svg]:max-w-full [&>svg]:h-auto ${!config.bgTransparent ? 'bg-white' : ''}`}
                style={checkerboardStyle}
             />
          </div>
      </div>

      <div className="w-full space-y-4">
          {/* Sliders Control Section */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
              <div className="flex items-center gap-2 text-gray-700 mb-1">
                  <Sliders size={14} />
                  <span className="text-xs font-semibold uppercase tracking-wide">Adjustments</span>
              </div>
              
              <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                      <span>Size</span>
                      <span className="font-mono">{config.size}px</span>
                  </div>
                  <input 
                      type="range" min="200" max="4096" step="50"
                      value={config.size}
                      onChange={(e) => handleConfigUpdate('size', Number(e.target.value))}
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-800"
                  />
              </div>

              <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                      <span>Padding</span>
                      <span className="font-mono">{config.padding}px</span>
                  </div>
                  <input 
                      type="range" min="0" max="100" step="5"
                      value={config.padding}
                      onChange={(e) => handleConfigUpdate('padding', Number(e.target.value))}
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-800"
                  />
              </div>
          </div>

          {isBulkMode ? (
              <button 
                 onClick={handleBulkDownload}
                 disabled={downloading}
                 className="w-full py-3.5 bg-indigo-900 text-white rounded-xl font-semibold shadow-lg shadow-indigo-100 hover:bg-indigo-800 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-80"
              >
                 {downloading ? (
                    <>
                       <Loader2 size={18} className="animate-spin" />
                       {progress}% Generated...
                    </>
                 ) : (
                    <>
                       <Package size={18} />
                       Generate ZIP ({bulkItems.length})
                    </>
                 )}
              </button>
          ) : (
              <button 
                 onClick={() => handleDownload('png')}
                 className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-semibold shadow-lg shadow-gray-200 hover:bg-gray-800 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                 {downloading ? <CheckCircle size={18} /> : <Download size={18} />}
                 {downloading ? "Downloaded!" : "Download PNG"}
              </button>
          )}
          
          {!isBulkMode && (
              <div className="grid grid-cols-2 gap-3">
                 <button 
                    onClick={() => handleDownload('svg')}
                    className="py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                 >
                    <Download size={16} /> SVG
                 </button>
                 <button 
                    onClick={handlePrint}
                    className="py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                 >
                    <Printer size={16} /> Print
                 </button>
              </div>
          )}
          
          {isBulkMode && (
             <div className="text-center">
                <p className="text-xs text-gray-400 mt-2">
                   Generating large batches may take a few seconds.
                </p>
             </div>
          )}
      </div>
    </div>
  );
};