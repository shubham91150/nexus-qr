import React, { useEffect, useRef, useState } from 'react';
import { QRStyleConfig, QRContentData } from '../types';
import { CustomSVGRenderer } from '../services/customSvgRenderer';
import { supabase, generateShortCode } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { Download, Printer, CheckCircle, Package, Loader2, Sliders, Grid, Maximize, ChevronDown, ChevronUp, Zap, Copy, Check, ExternalLink } from 'lucide-react';

interface Props {
  data: string;
  config: QRStyleConfig;
  className?: string;
  bulkItems?: Array<{name: string, value: string}>;
  onConfigChange?: (config: QRStyleConfig) => void;
  // Dynamic QR props
  isDynamic?: boolean;
  dynamicTitle?: string;
  contentData?: QRContentData;
  isEncrypted?: boolean;
  onDynamicSuccess?: () => void;
}

export const QRPreview: React.FC<Props> = ({
  data,
  config,
  className,
  bulkItems,
  onConfigChange,
  isDynamic = false,
  dynamicTitle = '',
  contentData,
  isEncrypted = false,
  onDynamicSuccess
}) => {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const renderer = useRef<CustomSVGRenderer | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeEditTab, setActiveEditTab] = useState<'pattern' | 'corner'>('pattern');
  const [isAdjustmentsOpen, setIsAdjustmentsOpen] = useState(false);

  // Dynamic QR states
  const [creatingDynamic, setCreatingDynamic] = useState(false);
  const [dynamicError, setDynamicError] = useState<string | null>(null);
  const [createdShortUrl, setCreatedShortUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    renderer.current = new CustomSVGRenderer(config);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
        if (!data || !renderer.current || !containerRef.current) return;
        renderer.current.updateConfig(config);
        const svgString = renderer.current.render(data);
        containerRef.current.innerHTML = svgString;
    }, 100);
    return () => clearTimeout(timer);
  }, [data, config]);

  const handleConfigUpdate = (key: keyof QRStyleConfig, value: any) => {
    if (onConfigChange) {
        onConfigChange({ ...config, [key]: value });
    }
  };

  const handleDownload = async (ext: 'png' | 'svg') => {
    if (!renderer.current || !containerRef.current) return;
    setDownloading(true);
    
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
        const img = new Image();
        const blob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = config.size > 2000 ? 1 : 2; 
            canvas.width = config.size * scale;
            canvas.height = config.size * scale;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.scale(scale, scale);
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
                      const bulkSize = Math.min(config.size, 2000); 
                      canvas.width = bulkSize;
                      canvas.height = bulkSize;
                      const ctx = canvas.getContext('2d');
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
          console.error("Bulk error", e);
          alert("Failed to generate bulk ZIP.");
      } finally {
          setDownloading(false);
          setProgress(0);
      }
  };

  const handlePrint = () => {
      const svgElement = containerRef.current?.innerHTML;
      if (svgElement) {
        const win = window.open('', '_blank');
        win?.document.write(`<html><body style="display:flex;justify-content:center;align-items:center;height:100vh;">${svgElement}</body></html>`);
        win?.document.close();
        setTimeout(() => win?.print(), 500);
    }
  };

  // Create Dynamic QR
  const handleCreateDynamic = async () => {
    if (!user || !isDynamic) return;

    setDynamicError(null);
    setCreatingDynamic(true);

    try {
      // Validate
      if (!data || data.length < 1) {
        setDynamicError('Please enter valid content for the QR code');
        setCreatingDynamic(false);
        return;
      }

      if (!dynamicTitle.trim()) {
        setDynamicError('Please enter a title for your QR code');
        setCreatingDynamic(false);
        return;
      }

      // Prepare QR style data
      const qrStyleData = {
        styleConfig: config,
        contentData,
        isEncrypted,
        payload: data,
      };

      // Generate unique short code
      let shortCode = generateShortCode();
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        const { data: newQR, error: insertError } = await supabase
          .from('dynamic_qr_codes')
          .insert({
            user_id: user.id,
            short_code: shortCode,
            title: dynamicTitle.trim(),
            destination_url: data,
            qr_style: qrStyleData,
          })
          .select()
          .single();

        if (insertError) {
          if (insertError.code === '23505') {
            shortCode = generateShortCode();
            attempts++;
            continue;
          }
          throw insertError;
        }

        // Success
        setCreatedShortUrl(`${baseUrl}/r/${newQR.short_code}`);
        break;
      }

      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique code. Please try again.');
      }
    } catch (err) {
      console.error('Error creating dynamic QR:', err);
      setDynamicError(err instanceof Error ? err.message : 'Failed to create QR code');
    } finally {
      setCreatingDynamic(false);
    }
  };

  // Copy short URL
  const copyShortUrl = async () => {
    if (!createdShortUrl) return;
    try {
      await navigator.clipboard.writeText(createdShortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Reset dynamic success state
  const handleDynamicDone = () => {
    setCreatedShortUrl(null);
    onDynamicSuccess?.();
  };

  const isBulkMode = bulkItems && bulkItems.length > 0;
  const checkerboardStyle = config.bgTransparent ? {
      backgroundImage: `linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)`,
      backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
      backgroundSize: '20px 20px',
      backgroundColor: '#fff' 
  } : {};

  const renderThumbnail = (type: 'pattern' | 'corner', id: string, active: boolean) => {
      const color = active ? "#fff" : "#374151";
      const bgClass = active ? "bg-gray-900 shadow-md transform scale-105" : "bg-gray-100 hover:bg-gray-200";
      
      if (type === 'pattern') {
          return (
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-200 ${bgClass}`}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill={color}>
                      {id === 'square' && <g><rect x="4" y="4" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/></g>}
                      {id === 'circle' && <g><circle cx="7.5" cy="7.5" r="3.5"/><circle cx="16.5" cy="16.5" r="3.5"/><circle cx="7.5" cy="16.5" r="3.5"/><circle cx="16.5" cy="7.5" r="3.5"/></g>}
                      {id === 'square-dots' && <g><rect x="5" y="5" width="5" height="5"/><rect x="14" y="14" width="5" height="5"/><rect x="5" y="14" width="5" height="5"/><rect x="14" y="5" width="5" height="5"/></g>}
                      {id === 'uniform-pills' && <g><rect x="3" y="5" width="10" height="5" rx="2.5" /><rect x="14" y="5" width="7" height="5" rx="2.5" /><rect x="3" y="13" width="6" height="5" rx="2.5" /><rect x="10" y="13" width="11" height="5" rx="2.5" /></g>}
                      {id === 'sharp-diamond' && <g><path d="M7.5 3L10.5 7.5L7.5 12L4.5 7.5Z" /><path d="M16.5 12L19.5 16.5L16.5 21L13.5 16.5Z" /><path d="M7.5 12L10.5 16.5L7.5 21L4.5 16.5Z" /><path d="M16.5 3L19.5 7.5L16.5 12L13.5 7.5Z" /></g>}
                      {id === 'mixed' && <g><circle cx="7" cy="7" r="3.5"/><circle cx="17" cy="17" r="3.5"/><circle cx="17" cy="7" r="2"/><circle cx="7" cy="17" r="2"/></g>}
                  </svg>
              </div>
          );
      } else {
          return (
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-200 ${bgClass}`}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      {id === 'square' && <path d="M4 4H20V20H4V4Z" />}
                      {id === 'circle' && <circle cx="12" cy="12" r="9" />}
                      {id === 'rounded' && <rect x="4" y="4" width="16" height="16" rx="5" />}
                      {id === 'three-sided' && <path d="M4 12C4 7.58 7.58 4 12 4H20V20H4V12Z" />}
                      {id === 'two-sided' && <path d="M4 12C4 7.58 7.58 4 12 4H20V12C20 16.42 16.42 20 12 20H4V12Z" />}
                  </svg>
              </div>
          );
      }
  };

  return (
    <div className={`bg-white rounded-[24px] shadow-card p-6 md:p-8 flex flex-col items-center ${className}`}>
      <div className="mb-4 flex flex-col items-center w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-xs font-semibold text-gray-600 mb-4">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              {isBulkMode ? `PREVIEW (1 of ${bulkItems.length})` : 'LIVE PREVIEW'}
          </div>
          
          <div className="relative group w-full flex justify-center">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] bg-gradient-to-tr from-gray-200 to-gray-100 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-1000"></div>
             <div 
                ref={containerRef} 
                className={`relative p-4 rounded-xl border border-gray-100 shadow-sm transition-transform duration-300 group-hover:scale-[1.02] [&>svg]:max-w-full [&>svg]:h-auto ${!config.bgTransparent ? 'bg-white' : ''}`}
                style={checkerboardStyle}
             />
          </div>
      </div>

      <div className="w-full mb-6">
          <div className="flex justify-center gap-6 mb-4 border-b border-gray-100 pb-2">
              <button 
                onClick={() => setActiveEditTab('pattern')}
                className={`flex items-center gap-2 pb-1 transition-all border-b-2 ${activeEditTab === 'pattern' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                <Grid size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Patterns</span>
              </button>
              <button 
                onClick={() => setActiveEditTab('corner')}
                className={`flex items-center gap-2 pb-1 transition-all border-b-2 ${activeEditTab === 'corner' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                <Maximize size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Corners</span>
              </button>
          </div>
          
          <div className="flex overflow-x-auto no-scrollbar gap-4 pb-2 px-2 justify-center">
              {activeEditTab === 'pattern' ? (
                  <>
                    {[
                        {id: 'square', label: 'Square'},
                        {id: 'circle', label: 'Circle'},
                        {id: 'square-dots', label: 'Dots'},
                        {id: 'uniform-pills', label: 'Pills'},
                        {id: 'sharp-diamond', label: 'Diamond'},
                        {id: 'mixed', label: 'Mixed'}
                    ].map((item) => (
                        <button 
                            key={item.id}
                            onClick={() => handleConfigUpdate('dotsType', item.id)}
                            className="flex flex-col items-center gap-2 min-w-[60px] group focus:outline-none"
                        >
                            {renderThumbnail('pattern', item.id, config.dotsType === item.id)}
                            <span className={`text-[10px] font-medium uppercase tracking-tight transition-colors ${config.dotsType === item.id ? 'text-gray-900 font-bold' : 'text-gray-400 group-hover:text-gray-600'}`}>{item.label}</span>
                        </button>
                    ))}
                  </>
              ) : (
                  <>
                    {[
                       {id: 'square', label: 'Square'},
                       {id: 'circle', label: 'Circle'},
                       {id: 'rounded', label: 'Round'},
                       {id: 'three-sided', label: '3-Side'},
                       {id: 'two-sided', label: 'Leaf'}
                    ].map((item) => (
                        <button 
                            key={item.id}
                            onClick={() => handleConfigUpdate('cornerSquareType', item.id)}
                            className="flex flex-col items-center gap-2 min-w-[60px] group focus:outline-none"
                        >
                            {renderThumbnail('corner', item.id, config.cornerSquareType === item.id)}
                            <span className={`text-[10px] font-medium uppercase tracking-tight transition-colors ${config.cornerSquareType === item.id ? 'text-gray-900 font-bold' : 'text-gray-400 group-hover:text-gray-600'}`}>{item.label}</span>
                        </button>
                    ))}
                  </>
              )}
          </div>
      </div>

      {/* Dynamic QR Success View */}
      {createdShortUrl ? (
        <div className="w-full space-y-4">
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check className="text-green-600" size={24} />
            </div>
            <h3 className="font-semibold text-green-800 mb-1">Dynamic QR Created!</h3>
            <p className="text-xs text-green-600 mb-3">Your trackable QR is ready</p>

            <div className="bg-white rounded-lg p-3 mb-3">
              <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider">Short URL</p>
              <div className="flex items-center gap-2 justify-center">
                <code className="text-indigo-600 font-medium text-sm break-all">{createdShortUrl}</code>
                <button onClick={copyShortUrl} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Copy URL">
                  {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} className="text-gray-500" />}
                </button>
                <a href={createdShortUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Open URL">
                  <ExternalLink size={14} className="text-gray-500" />
                </a>
              </div>
            </div>

            {/* Download buttons after creation */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => handleDownload('png')}
                className="py-2.5 bg-gray-900 text-white rounded-xl font-medium text-sm hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                <Download size={14} /> PNG
              </button>
              <button
                onClick={() => handleDownload('svg')}
                className="py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <Download size={14} /> SVG
              </button>
            </div>

            <button
              onClick={handleDynamicDone}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full space-y-4">
          <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden transition-all duration-300">
              <button
                onClick={() => setIsAdjustmentsOpen(!isAdjustmentsOpen)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                  <div className="flex items-center gap-2 text-gray-700">
                      <Sliders size={16} />
                      <span className="text-xs font-bold uppercase tracking-wide">Adjustments</span>
                  </div>
                  {isAdjustmentsOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </button>

              {isAdjustmentsOpen && (
                  <div className="p-4 pt-0 space-y-4 animate-fadeIn">
                      <div className="pt-2">
                          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                              <span>Size</span>
                              <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{config.size}px</span>
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
                              <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{config.padding}px</span>
                          </div>
                          <input
                              type="range" min="0" max="100" step="5"
                              value={config.padding}
                              onChange={(e) => handleConfigUpdate('padding', Number(e.target.value))}
                              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-800"
                          />
                      </div>
                  </div>
              )}
          </div>

          {/* Error message */}
          {dynamicError && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
              {dynamicError}
            </div>
          )}

          {/* Dynamic QR Create Button */}
          {isDynamic ? (
            <button
               onClick={handleCreateDynamic}
               disabled={creatingDynamic || !dynamicTitle.trim()}
               className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200 hover:from-indigo-700 hover:to-purple-700 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
               {creatingDynamic ? (
                  <>
                     <Loader2 size={18} className="animate-spin" />
                     Creating...
                  </>
               ) : (
                  <>
                     <Zap size={18} />
                     Create Dynamic QR
                  </>
               )}
            </button>
          ) : isBulkMode ? (
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

          {!isBulkMode && !isDynamic && (
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
        </div>
      )}
    </div>
  );
};