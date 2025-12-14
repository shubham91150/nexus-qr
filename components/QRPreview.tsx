import React, { useEffect, useRef, useState } from 'react';
import { QRStyleConfig, QRContentData } from '../types';
import { CustomSVGRenderer } from '../services/customSvgRenderer';
import { supabase, generateShortCode } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { Download, Printer, CheckCircle, Package, Loader2, Sliders, Grid, Maximize, ChevronDown, ChevronUp, Zap, Copy, Check, ExternalLink, Frame } from 'lucide-react';
import { AnalyticsOptions } from '../App';

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
  analyticsOptions?: AnalyticsOptions;
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
  analyticsOptions,
  onDynamicSuccess
}) => {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const renderer = useRef<CustomSVGRenderer | null>(null);
  const isMountedRef = useRef(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeEditTab, setActiveEditTab] = useState<'pattern' | 'corner' | 'frame'>('pattern');
  const [isAdjustmentsOpen, setIsAdjustmentsOpen] = useState(false);

  // Dynamic QR states
  const [creatingDynamic, setCreatingDynamic] = useState(false);
  const [dynamicError, setDynamicError] = useState<string | null>(null);
  const [createdShortUrl, setCreatedShortUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // Track what content is encoded in the QR code
  // After creating dynamic QR, this becomes the short URL
  const [qrEncodedContent, setQrEncodedContent] = useState<string | null>(null);

  // Store rendered SVG string in state to avoid direct DOM manipulation conflicts
  const [renderedSvg, setRenderedSvg] = useState<string>('');

  useEffect(() => {
    renderer.current = new CustomSVGRenderer(config);
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Reset qrEncodedContent when data changes (new QR being created)
  useEffect(() => {
    setQrEncodedContent(null);
    setCreatedShortUrl(null);
  }, [data]);

  // Render QR code to SVG string
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;

        // Use qrEncodedContent (short URL) if set, otherwise use original data
        const contentToRender = qrEncodedContent || data;
        if (!contentToRender || !renderer.current) return;

        renderer.current.updateConfig(config);
        const svgString = renderer.current.render(contentToRender);

        if (isMountedRef.current) {
          setRenderedSvg(svgString);
        }
    }, 100);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [data, config, qrEncodedContent]);

  // Update DOM only when renderedSvg changes
  useEffect(() => {
    if (renderedSvg && containerRef.current && isMountedRef.current) {
      containerRef.current.innerHTML = renderedSvg;
    }
  }, [renderedSvg]);

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
        analyticsOptions: analyticsOptions || {
          trackLocation: true,
          trackDevice: true,
          trackBrowser: true,
          trackTime: true,
          trackReferrer: true,
        },
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

        // Success - set both the display URL and the QR encoded content
        const shortUrl = `${baseUrl}/r/${newQR.short_code}`;
        setCreatedShortUrl(shortUrl);
        // Update QR code to encode the short URL instead of destination
        setQrEncodedContent(shortUrl);
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
    setQrEncodedContent(null);
    onDynamicSuccess?.();
  };

  const isBulkMode = bulkItems && bulkItems.length > 0;
  const checkerboardStyle = config.bgTransparent ? {
      backgroundImage: `linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)`,
      backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
      backgroundSize: '20px 20px',
      backgroundColor: '#fff' 
  } : {};

  // Render actual QR style thumbnail preview
  const StyleThumbnail: React.FC<{
    type: 'pattern' | 'corner';
    styleId: string;
    active: boolean;
  }> = ({ type, styleId, active }) => {
    const thumbRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (!thumbRef.current) return;

      const thumbConfig: QRStyleConfig = {
        ...config,
        size: 150,
        padding: 8,
        dotsType: type === 'pattern' ? styleId : config.dotsType,
        cornerSquareType: type === 'corner' ? styleId : config.cornerSquareType,
      };

      try {
        const thumbRenderer = new CustomSVGRenderer(thumbConfig);
        const svgString = thumbRenderer.render('STYLE');
        thumbRef.current.innerHTML = svgString;
      } catch (err) {
        console.error('Error rendering style thumbnail:', err);
      }
    }, [type, styleId, config.fgColor, config.bgColor, config.isGradient, config.fgColor2]);

    const borderClass = active
      ? "ring-2 ring-gray-900 ring-offset-2"
      : "border border-gray-200 hover:border-gray-300";

    return (
      <div className={`w-[70px] h-[70px] rounded-xl overflow-hidden bg-white flex-shrink-0 ${borderClass} transition-all duration-200 flex items-center justify-center`}>
        <div
          ref={thumbRef}
          className="w-[150px] h-[150px] flex-shrink-0"
          style={{
            transform: 'scale(0.5)',
          }}
        />
      </div>
    );
  };

  // Corner eye thumbnail - renders just the corner eye shape
  const CornerStyleThumbnail: React.FC<{
    styleId: string;
    active: boolean;
  }> = ({ styleId, active }) => {
    const borderClass = active
      ? "ring-2 ring-gray-900 ring-offset-2"
      : "border border-gray-200 hover:border-gray-300";

    // SVG paths for different corner styles
    const renderCornerSvg = () => {
      const size = 50;
      const outerSize = 38;
      const innerSize = 12;
      const outerOffset = (size - outerSize) / 2;
      const innerOffset = (size - innerSize) / 2;
      const fgColor = config.fgColor || '#000000';
      const radius = 8; // corner radius for rounded styles

      // Helper to create rounded rect path with individual corner radii
      const roundedRectPath = (x: number, y: number, w: number, h: number, radii: number[]) => {
        const [tl, tr, br, bl] = radii;
        return `M ${x + tl} ${y}
                L ${x + w - tr} ${y}
                Q ${x + w} ${y} ${x + w} ${y + tr}
                L ${x + w} ${y + h - br}
                Q ${x + w} ${y + h} ${x + w - br} ${y + h}
                L ${x + bl} ${y + h}
                Q ${x} ${y + h} ${x} ${y + h - bl}
                L ${x} ${y + tl}
                Q ${x} ${y} ${x + tl} ${y}
                Z`;
      };

      switch (styleId) {
        case 'square':
          return (
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              <rect x={outerOffset} y={outerOffset} width={outerSize} height={outerSize} fill={fgColor} />
              <rect x={outerOffset + 5} y={outerOffset + 5} width={outerSize - 10} height={outerSize - 10} fill="white" />
              <rect x={innerOffset} y={innerOffset} width={innerSize} height={innerSize} fill={fgColor} />
            </svg>
          );
        case 'circle':
          return (
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              <circle cx={size/2} cy={size/2} r={outerSize/2} fill={fgColor} />
              <circle cx={size/2} cy={size/2} r={outerSize/2 - 5} fill="white" />
              <circle cx={size/2} cy={size/2} r={innerSize/2} fill={fgColor} />
            </svg>
          );
        case 'rounded':
          return (
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              <rect x={outerOffset} y={outerOffset} width={outerSize} height={outerSize} fill={fgColor} rx={radius} />
              <rect x={outerOffset + 5} y={outerOffset + 5} width={outerSize - 10} height={outerSize - 10} fill="white" rx={radius * 0.6} />
              <rect x={innerOffset} y={innerOffset} width={innerSize} height={innerSize} fill={fgColor} rx={2} />
            </svg>
          );
        case 'three-sided':
          // 3 rounded corners, 1 sharp corner (top-left is sharp)
          return (
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              <path d={roundedRectPath(outerOffset, outerOffset, outerSize, outerSize, [0, radius, radius, radius])} fill={fgColor} />
              <path d={roundedRectPath(outerOffset + 5, outerOffset + 5, outerSize - 10, outerSize - 10, [0, radius * 0.6, radius * 0.6, radius * 0.6])} fill="white" />
              <rect x={innerOffset} y={innerOffset} width={innerSize} height={innerSize} fill={fgColor} />
            </svg>
          );
        case 'two-sided':
          // 2 diagonal rounded corners (top-right, bottom-left), 2 sharp (top-left, bottom-right) - leaf shape
          return (
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              <path d={roundedRectPath(outerOffset, outerOffset, outerSize, outerSize, [0, radius, 0, radius])} fill={fgColor} />
              <path d={roundedRectPath(outerOffset + 5, outerOffset + 5, outerSize - 10, outerSize - 10, [0, radius * 0.6, 0, radius * 0.6])} fill="white" />
              <rect x={innerOffset} y={innerOffset} width={innerSize} height={innerSize} fill={fgColor} />
            </svg>
          );
        default:
          return (
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              <rect x={outerOffset} y={outerOffset} width={outerSize} height={outerSize} fill={fgColor} />
              <rect x={outerOffset + 5} y={outerOffset + 5} width={outerSize - 10} height={outerSize - 10} fill="white" />
              <rect x={innerOffset} y={innerOffset} width={innerSize} height={innerSize} fill={fgColor} />
            </svg>
          );
      }
    };

    return (
      <div className={`w-[70px] h-[70px] rounded-xl overflow-hidden bg-white flex-shrink-0 ${borderClass} transition-all duration-200 flex items-center justify-center`}>
        {renderCornerSvg()}
      </div>
    );
  };

  // Frame style thumbnail - renders frame preview with mini QR
  const FrameStyleThumbnail: React.FC<{
    styleId: string;
    active: boolean;
  }> = ({ styleId, active }) => {
    const borderClass = active
      ? "ring-2 ring-gray-900 ring-offset-2"
      : "border border-gray-200 hover:border-gray-300";

    const fgColor = config.fgColor || '#000000';

    const renderFrameSvg = () => {
      const size = 56;

      // Mini QR inside white container
      const miniQrContent = `
        <rect x="4" y="4" width="6" height="6" fill="${fgColor}" rx="0.5" />
        <rect x="18" y="4" width="6" height="6" fill="${fgColor}" rx="0.5" />
        <rect x="4" y="18" width="6" height="6" fill="${fgColor}" rx="0.5" />
        <rect x="11" y="11" width="6" height="6" fill="${fgColor}" rx="0.5" />
        <rect x="12" y="5" width="2" height="2" fill="${fgColor}" />
        <rect x="5" y="12" width="2" height="2" fill="${fgColor}" />
        <rect x="19" y="12" width="2" height="2" fill="${fgColor}" />
        <rect x="12" y="19" width="2" height="2" fill="${fgColor}" />
      `;

      switch (styleId) {
        case 'none':
          // Just QR without frame
          return (
            <svg width={size} height={size} viewBox="0 0 56 56">
              <rect x="14" y="14" width="28" height="28" fill="#f9fafb" rx="2" />
              <g transform="translate(16, 16)">{/* Mini QR */}
                <rect x="2" y="2" width="5" height="5" fill={fgColor} rx="0.5" />
                <rect x="17" y="2" width="5" height="5" fill={fgColor} rx="0.5" />
                <rect x="2" y="17" width="5" height="5" fill={fgColor} rx="0.5" />
                <rect x="9" y="9" width="6" height="6" fill={fgColor} rx="0.5" />
              </g>
            </svg>
          );

        case 'circle':
          // Circle frame with QR inside
          return (
            <svg width={size} height={size} viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="26" fill={fgColor} />
              <rect x="10" y="8" width="36" height="36" fill="white" rx="3" />
              <g transform="translate(14, 11)">
                <g dangerouslySetInnerHTML={{ __html: miniQrContent }} />
              </g>
              <text x="28" y="50" fontSize="6" fill="white" textAnchor="middle" fontWeight="bold" fontFamily="Arial">SCAN</text>
            </svg>
          );

        case 'rounded-box':
          // Rounded rectangle frame
          return (
            <svg width={size} height={size} viewBox="0 0 56 56">
              <rect x="2" y="2" width="52" height="52" fill={fgColor} rx="6" />
              <rect x="6" y="5" width="44" height="40" fill="white" rx="3" />
              <g transform="translate(14, 9)">
                <g dangerouslySetInnerHTML={{ __html: miniQrContent }} />
              </g>
              <text x="28" y="51" fontSize="6" fill="white" textAnchor="middle" fontWeight="bold" fontFamily="Arial">SCAN ME</text>
            </svg>
          );

        case 'square-box':
          // Square frame with slight radius
          return (
            <svg width={size} height={size} viewBox="0 0 56 56">
              <rect x="2" y="2" width="52" height="52" fill={fgColor} rx="3" />
              <rect x="6" y="5" width="44" height="40" fill="white" rx="2" />
              <g transform="translate(14, 9)">
                <g dangerouslySetInnerHTML={{ __html: miniQrContent }} />
              </g>
              <text x="28" y="51" fontSize="6" fill="white" textAnchor="middle" fontWeight="bold" fontFamily="Arial">SCAN ME</text>
            </svg>
          );

        default:
          return (
            <svg width={size} height={size} viewBox="0 0 56 56">
              <rect x="14" y="14" width="28" height="28" fill="#f9fafb" rx="2" />
            </svg>
          );
      }
    };

    return (
      <div className={`w-[70px] h-[70px] rounded-xl overflow-hidden bg-white flex-shrink-0 ${borderClass} transition-all duration-200 flex items-center justify-center`}>
        {renderFrameSvg()}
      </div>
    );
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
          <div className="flex justify-center gap-4 mb-4 border-b border-gray-100 pb-2">
              <button
                onClick={() => setActiveEditTab('pattern')}
                className={`flex items-center gap-1.5 pb-1 transition-all border-b-2 ${activeEditTab === 'pattern' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                <Grid size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Patterns</span>
              </button>
              <button
                onClick={() => setActiveEditTab('corner')}
                className={`flex items-center gap-1.5 pb-1 transition-all border-b-2 ${activeEditTab === 'corner' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                <Maximize size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Corners</span>
              </button>
              <button
                onClick={() => setActiveEditTab('frame')}
                className={`flex items-center gap-1.5 pb-1 transition-all border-b-2 ${activeEditTab === 'frame' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                <Frame size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Frames</span>
              </button>
          </div>
          
          <div className="w-full overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            <div className="flex gap-3 px-2 min-w-min mx-auto w-fit">
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
                            className="flex flex-col items-center gap-1.5 group focus:outline-none flex-shrink-0"
                        >
                            <StyleThumbnail type="pattern" styleId={item.id} active={config.dotsType === item.id} />
                            <span className={`text-[10px] font-medium uppercase tracking-tight transition-colors ${config.dotsType === item.id ? 'text-gray-900 font-bold' : 'text-gray-400 group-hover:text-gray-600'}`}>{item.label}</span>
                        </button>
                    ))}
                  </>
              ) : activeEditTab === 'corner' ? (
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
                            className="flex flex-col items-center gap-1.5 group focus:outline-none flex-shrink-0"
                        >
                            <CornerStyleThumbnail styleId={item.id} active={config.cornerSquareType === item.id} />
                            <span className={`text-[10px] font-medium uppercase tracking-tight transition-colors ${config.cornerSquareType === item.id ? 'text-gray-900 font-bold' : 'text-gray-400 group-hover:text-gray-600'}`}>{item.label}</span>
                        </button>
                    ))}
                  </>
              ) : (
                  <>
                    {[
                        {id: 'none', label: 'None'},
                        {id: 'circle', label: 'Circle'},
                        {id: 'rounded-box', label: 'Rounded'},
                        {id: 'square-box', label: 'Square'}
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleConfigUpdate('frameType', item.id)}
                            className="flex flex-col items-center gap-1.5 group focus:outline-none flex-shrink-0"
                        >
                            <FrameStyleThumbnail styleId={item.id} active={config.frameType === item.id} />
                            <span className={`text-[10px] font-medium uppercase tracking-tight transition-colors ${config.frameType === item.id ? 'text-gray-900 font-bold' : 'text-gray-400 group-hover:text-gray-600'}`}>{item.label}</span>
                        </button>
                    ))}
                  </>
              )}
            </div>
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