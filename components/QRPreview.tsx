import React, { useEffect, useRef, useState } from 'react';
import { QRStyleConfig, QRContentData } from '../types';
import { CustomSVGRenderer } from '../services/customSvgRenderer';
import { supabase, generateShortCode } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { Download, Printer, CheckCircle, Package, Loader2, Sliders, Maximize, ChevronDown, ChevronUp, Zap, Copy, Check, ExternalLink, Frame, Grid, Pencil, AlertCircle } from 'lucide-react';
import { AnalyticsOptions } from '../App';

// Clean Toast Component - Dark theme with amber accent
const Toast: React.FC<{ message: string; type: 'error' | 'success' | 'warning'; onClose: () => void }> = ({ message, type, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Smooth entry animation
    requestAnimationFrame(() => setIsVisible(true));

    // Auto dismiss after 3.5 seconds
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onClose, 300);
    }, 3500);

    return () => clearTimeout(timer);
  }, [onClose]);

  // Icon based on type - all use amber/yellow color scheme on dark bg
  const icons = {
    success: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="10" fill="#F59E0B"/>
        <path d="M6 10L9 13L14 7" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    warning: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="10" fill="#F59E0B"/>
        <path d="M10 6V11M10 14V14.5" stroke="#1F2937" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    error: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="10" fill="#F59E0B"/>
        <path d="M7 7L13 13M13 7L7 13" stroke="#1F2937" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    )
  };

  return (
    <div
      className={`fixed top-6 left-1/2 z-[9999] transition-all ${
        isVisible && !isExiting
          ? 'opacity-100 translate-y-0 -translate-x-1/2 scale-100'
          : isExiting
          ? 'opacity-0 -translate-y-3 -translate-x-1/2 scale-95'
          : 'opacity-0 translate-y-4 -translate-x-1/2 scale-95'
      }`}
      style={{
        transitionDuration: '300ms',
        transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}
    >
    <div
      className="bg-gray-900 px-6 py-2.5 rounded-full shadow-2xl flex items-center gap-3 whitespace-nowrap"
      style={{
        boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3)'
      }}
    >
      {/* Icon */}
      <div className="flex-shrink-0">
        {icons[type]}
      </div>

      {/* Message - single line, amber color */}
      <span className="text-amber-400 font-semibold text-base">
        {message}
      </span>
    </div>
    </div>
  );
};

interface Props {
  data: string;
  config: QRStyleConfig;
  className?: string;
  bulkItems?: Array<{name: string, value: string}>;
  onConfigChange?: (config: QRStyleConfig) => void;
  // Dynamic QR props
  isDynamic?: boolean;
  isDynamicOnly?: boolean; // For content types that ONLY support dynamic QR
  dynamicTitle?: string;
  onTitleChange?: (title: string) => void;
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
  isDynamicOnly = false,
  dynamicTitle = '',
  onTitleChange,
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
  const [createdShortCode, setCreatedShortCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'warning' } | null>(null);
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
    setCreatedShortCode(null);
  }, [data]);

  // Render QR code to SVG string - with debounce to prevent INP issues
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Use longer debounce (300ms) to prevent UI blocking during rapid changes
    timerRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;

        // Use qrEncodedContent (short URL) if set, otherwise use original data
        const contentToRender = qrEncodedContent || data;
        if (!contentToRender || !renderer.current) return;

        // Use requestIdleCallback for non-blocking rendering if available
        const renderQR = () => {
          if (!isMountedRef.current) return;
          renderer.current!.updateConfig(config);
          const svgString = renderer.current!.render(contentToRender);

          if (isMountedRef.current) {
            setRenderedSvg(svgString);
          }
        };

        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(renderQR, { timeout: 500 });
        } else {
          renderQR();
        }
    }, 300);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [data, config, qrEncodedContent]);

  // Update DOM only when renderedSvg changes or data becomes empty
  useEffect(() => {
    if (!containerRef.current || !isMountedRef.current) return;

    // For dynamic-only types, don't show QR until it's created
    if (isDynamicOnly && !createdShortUrl) {
      // Clear any existing QR SVG
      const existingSvg = containerRef.current.querySelector('svg:not([class*="text-"])');
      if (existingSvg) {
        existingSvg.remove();
      }
      return;
    }

    // When data is empty, clear any QR SVG (React will render placeholder)
    if (!data || data.trim() === '') {
      // Only clear if there's an SVG inside (not the placeholder)
      const existingSvg = containerRef.current.querySelector('svg:not([class*="text-"])');
      if (existingSvg) {
        existingSvg.remove();
      }
      return;
    }

    // When we have QR content, inject the SVG
    if (renderedSvg) {
      // First remove any existing QR SVG
      const existingSvg = containerRef.current.querySelector('svg:not([class*="text-"])');
      if (existingSvg) {
        existingSvg.remove();
      }
      // Insert the new QR SVG
      containerRef.current.insertAdjacentHTML('beforeend', renderedSvg);
    }
  }, [renderedSvg, data, isDynamicOnly, createdShortUrl]);

  const handleConfigUpdate = (key: keyof QRStyleConfig, value: any) => {
    if (onConfigChange) {
      // When size changes, auto-clamp padding to max 40% of new size
      if (key === 'size') {
        const maxPadding = Math.floor(value * 0.4);
        if (config.padding > maxPadding) {
          onConfigChange({ ...config, [key]: value, padding: maxPadding });
          return;
        }
      }
      onConfigChange({ ...config, [key]: value });
    }
  };

  const handleDownload = async (ext: 'png' | 'svg') => {
    // Validate content exists before downloading
    if (!data || data.trim() === '') {
      setToast({ message: 'Enter some content first', type: 'warning' });
      return;
    }

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
      // Validate content exists before printing
      if (!data || data.trim() === '') {
        setToast({ message: 'Enter some content first', type: 'warning' });
        return;
      }

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
        setCreatedShortCode(newQR.short_code);
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

  // Reset dynamic success state and save any style changes
  const handleDynamicDone = async () => {
    // Save current styles to database before resetting
    if (createdShortCode) {
      try {
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

        await supabase
          .from('dynamic_qr_codes')
          .update({ qr_style: qrStyleData })
          .eq('short_code', createdShortCode);
      } catch (err) {
        console.error('Error saving style updates:', err);
      }
    }

    setCreatedShortUrl(null);
    setCreatedShortCode(null);
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

      // Mini QR pattern
      const miniQr = (
        <g>
          <rect x="3" y="3" width="5" height="5" fill={fgColor} />
          <rect x="15" y="3" width="5" height="5" fill={fgColor} />
          <rect x="3" y="15" width="5" height="5" fill={fgColor} />
          <rect x="9" y="9" width="5" height="5" fill={fgColor} />
          <rect x="10" y="4" width="2" height="2" fill={fgColor} />
          <rect x="4" y="10" width="2" height="2" fill={fgColor} />
          <rect x="16" y="10" width="2" height="2" fill={fgColor} />
          <rect x="10" y="16" width="2" height="2" fill={fgColor} />
        </g>
      );

      // Helper function to generate arc path
      const arcPath = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
        const sx = cx + r * Math.cos(startAngle);
        const sy = cy + r * Math.sin(startAngle);
        const ex = cx + r * Math.cos(endAngle);
        const ey = cy + r * Math.sin(endAngle);
        const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
        return `M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey}`;
      };

      switch (styleId) {
        case 'none':
          // Just QR without frame
          return (
            <svg width={size} height={size} viewBox="0 0 56 56">
              <rect x="12" y="12" width="32" height="32" fill="#f9fafb" rx="2" />
              <g transform="translate(17, 17) scale(0.9)">
                {miniQr}
              </g>
            </svg>
          );

        case 'circle':
          // Circle frame matching the actual render
          return (
            <svg width={size} height={size} viewBox="0 0 56 56">
              {/* Circle background - fills almost whole area */}
              <circle cx="28" cy="28" r="27" fill={fgColor} />
              {/* White container for QR (75% of size, slightly above center) */}
              <rect x="7" y="5" width="42" height="42" fill="white" rx="2" />
              {/* Mini QR inside */}
              <g transform="translate(14, 11) scale(0.9)">
                {miniQr}
              </g>
              {/* Text at bottom */}
              <text x="28" y="52" fontSize="6" fill="white" textAnchor="middle" fontWeight="bold" fontFamily="Arial">SCAN ME</text>
            </svg>
          );

        case 'scan-arc':
          // Scan arc frame with thick circular arcs around QR (matching reference design)
          return (
            <svg width={size} height={size} viewBox="0 0 56 56">
              {/* Background */}
              <rect width="56" height="56" fill="#f9fafb" />
              {/* Dark arc (main, thick) - left side dominant */}
              <path d={arcPath(28, 28, 24, 0.4 * Math.PI, 2.2 * Math.PI)} stroke={fgColor} strokeWidth="4" fill="none" strokeLinecap="round" />
              {/* Light arc (secondary, slightly thinner) - right side, overlapping */}
              <path d={arcPath(28, 28, 24, 1.1 * Math.PI, 2.9 * Math.PI)} stroke="#888888" strokeWidth="3.5" fill="none" strokeLinecap="round" />
              {/* Mini QR inside */}
              <g transform="translate(17, 17) scale(0.9)">
                {miniQr}
              </g>
              {/* Text at bottom */}
              <text x="28" y="50" fontSize="5" fill={fgColor} textAnchor="middle" fontWeight="600" fontFamily="Arial">SCAN ME</text>
            </svg>
          );

        case 'scan-oval':
          // Oval frame with SCAN ME text integrated (matching user's SVG design)
          return (
            <svg width={size} height={size} viewBox="0 0 56 56">
              {/* Background */}
              <rect width="56" height="56" fill="#f9fafb" />
              {/* Oval frame outline */}
              <ellipse cx="28" cy="28" rx="24" ry="22" fill="none" stroke={fgColor} strokeWidth="3" />
              {/* Mini QR inside */}
              <g transform="translate(17, 15) scale(0.9)">
                {miniQr}
              </g>
              {/* Text at bottom */}
              <text x="28" y="48" fontSize="5" fill={fgColor} textAnchor="middle" fontWeight="600" fontFamily="Arial">SCAN ME</text>
            </svg>
          );

        case 'scan-rect':
          // Rectangular device-style frame with SCAN ME text at bottom
          return (
            <svg width={size} height={size} viewBox="0 0 56 56">
              {/* Background */}
              <rect width="56" height="56" fill="#f9fafb" />
              {/* Outer frame rectangle */}
              <rect x="6" y="4" width="44" height="40" rx="3" fill="none" stroke={fgColor} strokeWidth="2.5" />
              {/* Inner frame rectangle */}
              <rect x="9" y="7" width="38" height="34" rx="2" fill="none" stroke={fgColor} strokeWidth="1.5" />
              {/* Bottom banner with text */}
              <path d="M 6 38 Q 6 44 12 44 L 44 44 Q 50 44 50 50 L 50 52 L 6 52 L 6 38 Z" fill={fgColor} />
              {/* Mini QR inside */}
              <g transform="translate(17, 12) scale(0.9)">
                {miniQr}
              </g>
              {/* Text at bottom */}
              <text x="28" y="49" fontSize="5" fill="white" textAnchor="middle" fontWeight="600" fontFamily="Arial">SCAN ME</text>
            </svg>
          );

        case 'device':
          // Phone/device screen style frame with thick borders
          return (
            <svg width={size} height={size} viewBox="0 0 56 56">
              {/* Background */}
              <rect width="56" height="56" fill="#f9fafb" />
              {/* Device outer frame */}
              <rect x="8" y="6" width="40" height="44" rx="4" fill={fgColor} />
              {/* Screen area (white) */}
              <rect x="11" y="9" width="34" height="32" rx="2" fill="white" />
              {/* Bottom bar with text */}
              <rect x="8" y="42" width="40" height="8" rx="0 0 4 4" fill={fgColor} />
              {/* Mini QR inside screen */}
              <g transform="translate(17, 12) scale(0.85)">
                {miniQr}
              </g>
              {/* Text at bottom */}
              <text x="28" y="48" fontSize="4.5" fill="white" textAnchor="middle" fontWeight="600" fontFamily="Arial">SCAN ME</text>
            </svg>
          );

        case 'badge':
          // Circular badge frame with rounded corners and SCAN ME text at top
          return (
            <svg width={size} height={size} viewBox="0 0 56 56">
              {/* Background */}
              <rect width="56" height="56" fill="#f9fafb" />
              {/* Outer circular badge */}
              <circle cx="28" cy="28" r="25" fill={fgColor} />
              {/* Inner white area with rounded corners (like in SVG) */}
              <rect x="12" y="14" width="32" height="28" rx="3" fill="white" />
              {/* Top corners decorative elements */}
              <rect x="12" y="10" width="6" height="8" rx="1" fill={fgColor} />
              <rect x="38" y="10" width="6" height="8" rx="1" fill={fgColor} />
              {/* Bottom corners decorative elements */}
              <rect x="12" y="38" width="6" height="8" rx="1" fill={fgColor} />
              <rect x="38" y="38" width="6" height="8" rx="1" fill={fgColor} />
              {/* Mini QR inside */}
              <g transform="translate(17, 17) scale(0.85)">
                {miniQr}
              </g>
              {/* Text at top */}
              <text x="28" y="12" fontSize="4" fill="white" textAnchor="middle" fontWeight="600" fontFamily="Arial">SCAN ME</text>
            </svg>
          );

        case 'tablet':
          // Tablet device frame - clean rectangular frame without text
          return (
            <svg width={size} height={size} viewBox="0 0 56 56">
              {/* Background */}
              <rect width="56" height="56" fill="#f9fafb" />
              {/* Tablet outer frame */}
              <rect x="8" y="6" width="40" height="44" rx="4" fill={fgColor} />
              {/* Screen area (white) */}
              <rect x="11" y="10" width="34" height="34" rx="2" fill="white" />
              {/* Mini QR inside */}
              <g transform="translate(15, 13) scale(0.95)">
                {miniQr}
              </g>
            </svg>
          );

        case 'clipboard':
          // Clipboard frame with clip at top and SCAN ME text at bottom
          return (
            <svg width={size} height={size} viewBox="0 0 56 56">
              {/* Background */}
              <rect width="56" height="56" fill="#f9fafb" />
              {/* Clipboard board */}
              <path d="M 12 10 L 44 10 L 44 48 Q 44 50 42 50 L 14 50 Q 12 50 12 48 L 12 10 Z" fill={fgColor} />
              {/* Clip at top */}
              <rect x="20" y="6" width="16" height="8" rx="2" fill={fgColor} />
              <rect x="22" y="8" width="12" height="4" rx="1" fill="white" />
              {/* Screen/paper area (white) */}
              <rect x="14" y="12" width="28" height="32" rx="1" fill="white" />
              {/* Mini QR inside */}
              <g transform="translate(17, 14) scale(0.85)">
                {miniQr}
              </g>
              {/* SCAN ME text at bottom */}
              <text x="28" y="47" fontSize="4" fill="white" textAnchor="middle" fontWeight="600" fontFamily="Arial">SCAN ME</text>
            </svg>
          );

        case 'ticket':
          // Ticket/coupon frame with notched sides and SCAN ME text at bottom
          return (
            <svg width={size} height={size} viewBox="0 0 56 56">
              {/* Background */}
              <rect width="56" height="56" fill="#f9fafb" />
              {/* Ticket frame with notches */}
              <path d="M 12 8 L 44 8 Q 46 8 46 10 L 46 46 Q 46 48 44 48 L 12 48 Q 10 48 10 46 L 10 10 Q 10 8 12 8 Z" fill={fgColor} />
              {/* Left notch */}
              <circle cx="10" cy="28" r="3" fill="#f9fafb" />
              {/* Right notch */}
              <circle cx="46" cy="28" r="3" fill="#f9fafb" />
              {/* Screen/content area (white) */}
              <rect x="13" y="11" width="30" height="26" rx="2" fill="white" />
              {/* Mini QR inside */}
              <g transform="translate(16, 13) scale(0.9)">
                {miniQr}
              </g>
              {/* SCAN ME text at bottom */}
              <text x="28" y="44" fontSize="4" fill="white" textAnchor="middle" fontWeight="600" fontFamily="Arial">SCAN ME</text>
            </svg>
          );

        case 'monitor':
          // Monitor/display frame with stand and SCAN ME text in badge
          return (
            <svg width={size} height={size} viewBox="0 0 56 56">
              {/* Background */}
              <rect width="56" height="56" fill="#f9fafb" />
              {/* Monitor outer frame */}
              <rect x="10" y="6" width="36" height="32" rx="2" fill={fgColor} />
              {/* Monitor inner bezel */}
              <rect x="12" y="8" width="32" height="28" rx="1" fill={fgColor} />
              {/* Screen area (white) */}
              <rect x="14" y="10" width="28" height="24" rx="1" fill="white" />
              {/* Stand neck */}
              <rect x="24" y="38" width="8" height="4" fill={fgColor} />
              {/* Stand base/badge */}
              <path d="M 16 42 L 40 42 Q 42 42 42 44 L 42 48 Q 42 50 40 50 L 16 50 Q 14 50 14 48 L 14 44 Q 14 42 16 42 Z" fill={fgColor} />
              {/* Mini QR inside */}
              <g transform="translate(17, 12) scale(0.85)">
                {miniQr}
              </g>
              {/* SCAN ME text in stand badge */}
              <text x="28" y="47" fontSize="3.5" fill="white" textAnchor="middle" fontWeight="600" fontFamily="Arial">SCAN ME</text>
            </svg>
          );

        default:
          return (
            <svg width={size} height={size} viewBox="0 0 56 56">
              <rect x="12" y="12" width="32" height="32" fill="#f9fafb" rx="2" />
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
      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="mb-4 flex flex-col items-center w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-xs font-semibold text-gray-600 mb-4">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              {isBulkMode ? `PREVIEW (1 of ${bulkItems.length})` : 'LIVE PREVIEW'}
          </div>
          
          <div className="relative group w-full flex justify-center">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] bg-gradient-to-tr from-gray-200 to-gray-100 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-1000"></div>
             {/* Single container - shows placeholder when empty or dynamic-only waiting for creation */}
             <div
                ref={containerRef}
                className={`relative p-4 rounded-xl border ${((!data || data.trim() === '') || (isDynamicOnly && !createdShortUrl)) ? 'border-2 border-dashed border-gray-200 bg-gray-50' : 'border-gray-100 shadow-sm'} transition-transform duration-300 group-hover:scale-[1.02] [&>svg]:max-w-full [&>svg]:h-auto ${data && data.trim() !== '' && !isDynamicOnly && !config.bgTransparent ? 'bg-white' : ''} ${createdShortUrl && !config.bgTransparent ? 'bg-white' : ''} min-h-[200px] min-w-[200px] flex items-center justify-center`}
                style={(data && data.trim() !== '' && !isDynamicOnly) || createdShortUrl ? checkerboardStyle : {}}
             >
               {/* Dynamic-only placeholder - shown until dynamic QR is created */}
               {isDynamicOnly && !createdShortUrl && (
                 <div className="text-center p-4">
                   <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-100 flex items-center justify-center">
                     <Zap size={32} className="text-indigo-500" />
                   </div>
                   <h3 className="text-lg font-semibold text-gray-700 mb-1">Create Dynamic QR First</h3>
                   <p className="text-sm text-gray-500">Click the button below to generate your trackable QR code</p>
                 </div>
               )}
               {/* Regular placeholder - shown when no content (for non-dynamic-only types) */}
               {!isDynamicOnly && (!data || data.trim() === '') && (
                 <div className="text-center p-4">
                   <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                     {/* QR Code Icon */}
                     <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                       <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                       <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                       <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                       <rect x="14" y="14" width="3" height="3" fill="currentColor"/>
                       <rect x="18" y="14" width="3" height="3" fill="currentColor"/>
                       <rect x="14" y="18" width="3" height="3" fill="currentColor"/>
                       <rect x="18" y="18" width="3" height="3" fill="currentColor"/>
                     </svg>
                   </div>
                   <h3 className="text-lg font-semibold text-gray-700 mb-1">Generate QR First</h3>
                   <p className="text-sm text-gray-500">Enter content to generate QR code</p>
                 </div>
               )}
             </div>
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
                  <div className="flex flex-col items-center gap-3 w-full">
                    <div className="flex gap-3">
                      {[
                          {id: 'none', label: 'None'},
                          {id: 'circle', label: 'Circle'},
                          {id: 'scan-arc', label: 'Scan'},
                          {id: 'scan-oval', label: 'Oval'},
                          {id: 'scan-rect', label: 'Rect'},
                          {id: 'device', label: 'Device'},
                          {id: 'badge', label: 'Badge'},
                          {id: 'tablet', label: 'Tablet'},
                          {id: 'clipboard', label: 'Clipboard'},
                          {id: 'ticket', label: 'Ticket'},
                          {id: 'monitor', label: 'Monitor'}
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
                    </div>
                    {/* Frame Text Input - only show when frame is selected */}
                    {config.frameType && config.frameType !== 'none' && (
                      <div className="w-full max-w-[200px]">
                        <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block text-center">Frame Text (max 10)</label>
                        <input
                          type="text"
                          value={config.frameText || 'SCAN ME'}
                          onChange={(e) => handleConfigUpdate('frameText', e.target.value.substring(0, 10))}
                          maxLength={10}
                          placeholder="SCAN ME"
                          className="w-full px-3 py-2 text-sm text-center border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        />
                      </div>
                    )}
                  </div>
              )}
            </div>
          </div>
      </div>

      {/* Dynamic QR Success View - Minimal */}
      {createdShortUrl ? (
        <div className="w-full space-y-3">
          {/* Title with rename */}
          <div className="flex items-center justify-center gap-2">
            {isRenaming ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && renameValue.trim()) {
                      onTitleChange?.(renameValue.trim());
                      setIsRenaming(false);
                    } else if (e.key === 'Escape') {
                      setIsRenaming(false);
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (renameValue.trim()) {
                      onTitleChange?.(renameValue.trim());
                    }
                    setIsRenaming(false);
                  }}
                  className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                >
                  <Check size={14} />
                </button>
              </div>
            ) : (
              <>
                <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">{dynamicTitle}</span>
                <button
                  onClick={() => {
                    setRenameValue(dynamicTitle);
                    setIsRenaming(true);
                  }}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Rename"
                >
                  <Pencil size={12} className="text-gray-400" />
                </button>
              </>
            )}
          </div>

          {/* Short URL row */}
          <div className="flex items-center justify-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
            <code className="text-indigo-600 font-medium text-xs break-all">{createdShortUrl}</code>
            <button onClick={copyShortUrl} className="p-1 hover:bg-gray-200 rounded transition-colors" title="Copy">
              {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} className="text-gray-500" />}
            </button>
            <a href={createdShortUrl} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-gray-200 rounded transition-colors" title="Open">
              <ExternalLink size={12} className="text-gray-500" />
            </a>
          </div>

          {/* Download buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleDownload('png')}
              className="py-2 bg-gray-900 text-white rounded-xl font-medium text-sm hover:bg-gray-800 transition-colors flex items-center justify-center gap-1.5"
            >
              <Download size={14} /> PNG
            </button>
            <button
              onClick={() => handleDownload('svg')}
              className="py-2 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5"
            >
              <Download size={14} /> SVG
            </button>
          </div>

          <button
            onClick={handleDynamicDone}
            className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 transition-colors"
          >
            Done
          </button>
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
                          {/* Max padding = 40% of size to ensure QR remains visible */}
                          <input
                              type="range" min="0" max={Math.floor(config.size * 0.4)} step="5"
                              value={Math.min(config.padding, Math.floor(config.size * 0.4))}
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