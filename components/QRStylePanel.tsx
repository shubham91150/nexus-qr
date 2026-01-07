import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { QRStyleConfig } from '../types';
import { Palette, Grid, Sliders, Image as ImageIcon, Zap, Monitor, Printer, Tv } from 'lucide-react';
import { extractLogoColors } from '../services/colorExtractor';
import { getAllIcons, getCategories, IconItem } from '../services/iconLibrary';

interface Props {
  config: QRStyleConfig;
  onChange: (config: QRStyleConfig) => void;
}

export const QRStylePanel: React.FC<Props> = ({ config, onChange }) => {
  // Debounced update for sliders to prevent INP issues
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const update = useCallback((key: keyof QRStyleConfig, val: any) => {
    onChange({ ...config, [key]: val });
  }, [config, onChange]);

  // Debounced update for sliders (prevents UI blocking during rapid changes)
  const updateDebounced = useCallback((key: keyof QRStyleConfig, val: any) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      onChange({ ...config, [key]: val });
    }, 50);
  }, [config, onChange]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const [iconCategory, setIconCategory] = useState<'social' | 'business' | 'general'>('social');
  const allIcons = useMemo(() => getAllIcons(), []);
  const categories = useMemo(() => getCategories(), []);
  const filteredIcons = useMemo(() =>
    allIcons.filter(icon => icon.category === iconCategory),
    [allIcons, iconCategory]
  );

  // Helper to apply icon with color extraction
  const applyIcon = async (icon: IconItem) => {
    const svgDataUrl = `data:image/svg+xml,${encodeURIComponent(icon.svg)}`;
    try {
      const colors = await extractLogoColors(svgDataUrl);
      onChange({
        ...config,
        logoImage: svgDataUrl,
        fgColor: colors.foreground,
        bgColor: colors.background,
        isGradient: colors.isGradient,
        fgColor2: colors.foreground2 || colors.foreground,
        gradientType: colors.gradientType || 'linear',
        gradientRotation: colors.gradientRotation || 45
      });
    } catch {
      update('logoImage', svgDataUrl);
    }
  };

  const ColorInput = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => {
    const [localValue, setLocalValue] = useState(value);
    const [isEditing, setIsEditing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync local value when prop changes (but not while editing)
    useEffect(() => {
      if (!isEditing) {
        setLocalValue(value);
      }
    }, [value, isEditing]);

    const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let newValue = e.target.value.toUpperCase();
      // Allow typing without # prefix
      if (!newValue.startsWith('#')) {
        newValue = '#' + newValue.replace('#', '');
      }
      setLocalValue(newValue);

      // Apply color in real-time if valid
      if (/^#[0-9A-Fa-f]{6}$/.test(newValue)) {
        onChange(newValue);
      } else if (/^#[0-9A-Fa-f]{3}$/.test(newValue)) {
        const expanded = '#' + newValue[1] + newValue[1] + newValue[2] + newValue[2] + newValue[3] + newValue[3];
        onChange(expanded);
      }
    };

    const handleHexBlur = () => {
      setIsEditing(false);
      // Validate and apply the color
      const hex = localValue.trim();
      if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
        onChange(hex);
      } else if (/^#[0-9A-Fa-f]{3}$/.test(hex)) {
        // Expand shorthand
        const expanded = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
        onChange(expanded);
        setLocalValue(expanded);
      } else {
        // Invalid, reset to original
        setLocalValue(value);
      }
    };

    const handleHexKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        inputRef.current?.blur();
      }
    };

    return (
      <div className="flex-1 min-w-[140px] bg-gray-50 p-2 rounded-xl border border-gray-200">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-gray-600 uppercase">{label}</span>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={localValue}
              onChange={handleHexChange}
              onFocus={() => setIsEditing(true)}
              onBlur={handleHexBlur}
              onKeyDown={handleHexKeyDown}
              className="w-[70px] text-xs font-mono bg-white border border-gray-200 rounded px-1.5 py-1 text-center uppercase focus:outline-none focus:border-gray-400"
              maxLength={7}
            />
            <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
              <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="absolute inset-[-4px] w-[150%] h-[150%] cursor-pointer p-0 m-0"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const qualityPresets = [
    { label: 'Draft', sub: '300px', size: 300, icon: Zap },
    { label: 'HD', sub: '1000px', size: 1000, icon: Monitor },
    { label: 'Full HD', sub: '1920px', size: 1920, icon: Tv },
    { label: '4K', sub: '3840px', size: 3840, icon: ImageIcon },
  ];

  return (
    <div className="mt-8 space-y-8">
      {/* Dimensions & Quality Section */}
      <div>
        <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center">
              <Sliders size={14} />
            </div>
            <h3 className="text-sm font-semibold text-gray-800">Dimensions & Quality</h3>
        </div>

        <div className="space-y-6 px-1">
            {/* Resolution Presets */}
            <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">Quality Presets</label>
                <div className="grid grid-cols-4 gap-2">
                    {qualityPresets.map((preset) => (
                        <button
                            type="button"
                            key={preset.label}
                            onClick={() => update('size', preset.size)}
                            className={`
                                flex flex-col items-center justify-center gap-1 py-3 rounded-xl border transition-all
                                ${config.size === preset.size 
                                    ? 'bg-gray-900 text-white border-gray-900 shadow-md' 
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}
                            `}
                        >
                            <preset.icon size={14} />
                            <span className="text-[10px] font-bold">{preset.label}</span>
                            <span className={`text-[8px] ${config.size === preset.size ? 'text-gray-300' : 'text-gray-400'}`}>{preset.sub}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Manual Slider */}
            <div>
                <div className="flex justify-between text-xs text-gray-500 mb-2">
                    <span className="font-medium">Manual Resolution</span>
                    <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700">{config.size}px</span>
                </div>
                <input
                    type="range"
                    min="200"
                    max="4096"
                    step="50"
                    value={config.size}
                    onChange={e => updateDebounced('size', Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-800"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-1">
                    <span>Low</span>
                    <span>HD</span>
                    <span>4K</span>
                </div>
            </div>
            
            {/* Error Correction */}
            <div>
                 <label className="text-xs font-medium text-gray-500 mb-2 block">Error Correction Level</label>
                 <div className="grid grid-cols-4 gap-2">
                     {['L', 'M', 'Q', 'H'].map(level => (
                         <button
                            type="button"
                            key={level}
                            onClick={() => update('errorCorrectionLevel', level)}
                            title={level === 'L' ? 'Low (7%)' : level === 'M' ? 'Medium (15%)' : level === 'Q' ? 'Quartile (25%)' : 'High (30%)'}
                            className={`py-2 rounded-lg text-xs font-semibold border transition-all ${config.errorCorrectionLevel === level ? 'bg-gray-800 text-white border-gray-800 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                         >
                            {level}
                         </button>
                     ))}
                 </div>
                 <p className="text-[10px] text-gray-400 mt-1">
                    Higher levels allow the QR to work even if damaged or covered by a logo.
                 </p>
            </div>
        </div>
      </div>

      <div className="w-full h-px bg-gray-100"></div>

      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center">
            <Palette size={14} />
          </div>
          <h3 className="text-sm font-semibold text-gray-800">Advanced Colors</h3>
        </div>

        {/* Mode Toggle */}
        <div className="bg-gray-100 p-1 rounded-full flex mb-6 w-max">
          <button
            type="button"
            onClick={() => update('isGradient', false)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${!config.isGradient ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            Solid
          </button>
          <button
            type="button"
            onClick={() => update('isGradient', true)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${config.isGradient ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            SVG Gradient
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <ColorInput label={config.isGradient ? "Start" : "Foreground"} value={config.fgColor} onChange={(v: string) => update('fgColor', v)} />
            {config.isGradient && (
              <ColorInput label="End" value={config.fgColor2} onChange={(v: string) => update('fgColor2', v)} />
            )}
          </div>

          {config.isGradient && (
             <div className="pt-2 px-1">
                <div className="flex justify-between text-xs text-gray-500 mb-2">
                    <span>Gradient Angle</span>
                    <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700">{config.gradientRotation}°</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="360"
                    step="15"
                    value={config.gradientRotation}
                    onChange={e => updateDebounced('gradientRotation', Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-800"
                />
             </div>
          )}

          <div className="flex items-center gap-3">
              <ColorInput label="Background" value={config.bgColor} onChange={(v: string) => update('bgColor', v)} />
              <button
                  type="button"
                  onClick={() => update('bgTransparent', !config.bgTransparent)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all h-[50px] ${config.bgTransparent ? 'bg-gray-800 text-white border-gray-800' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
              >
                  <span className="text-xs font-medium">Transparent</span>
                  <div className={`w-4 h-4 rounded-full border ${config.bgTransparent ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'}`}></div>
              </button>
          </div>

          {/* Warning if colors are same */}
          {config.fgColor.toLowerCase() === config.bgColor.toLowerCase() && !config.bgTransparent && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
              <span className="text-red-500 text-lg">⚠️</span>
              <span className="text-xs text-red-600">Foreground and background colors are same. QR code won't be visible!</span>
            </div>
          )}

          {/* Custom Corner Colors Toggle */}
          <div className="pt-4 border-t border-dashed border-gray-200">
             <button
               type="button"
               onClick={() => update('customCornerColor', !config.customCornerColor)}
               className={`w-full py-2 rounded-lg text-xs font-medium border border-dashed mb-3 ${config.customCornerColor ? 'border-gray-800 text-gray-800 bg-gray-50' : 'border-gray-300 text-gray-400'}`}
             >
               {config.customCornerColor ? "Disable Custom Corner Colors" : "+ Enable Custom Corner Colors"}
             </button>
             
             {config.customCornerColor && (
               <div className="flex gap-3 animate-fadeIn">
                  <ColorInput label="Corner" value={config.cornerSquareColor} onChange={(v: string) => {
                      update('cornerSquareColor', v);
                      update('cornerDotColor', v); // Sync for simplicity
                  }} />
               </div>
             )}
          </div>
        </div>
      </div>

      <div className="w-full h-px bg-gray-100"></div>

      {/* Patterns & Shapes */}
      <div>
         <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">
              <Grid size={14} />
            </div>
            <h3 className="text-sm font-semibold text-gray-800">Vector Patterns</h3>
         </div>
         
         <div className="space-y-6">
            {/* Data Patterns */}
            <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">Data Pattern</label>
                <div className="grid grid-cols-3 gap-2">
                    {[
                        {id: 'square', label: 'Square'},
                        {id: 'circle', label: 'Circle'},
                        {id: 'square-dots', label: 'Sq. Dots'},
                        {id: 'uniform-pills', label: 'Pills ✨'},
                        {id: 'sharp-diamond', label: 'Diamond'},
                        {id: 'mixed', label: 'Mixed'}
                    ].map((item) => (
                        <button
                           type="button"
                           key={item.id}
                           onClick={() => update('dotsType', item.id)}
                           className={`px-2 py-3 rounded-lg text-xs font-medium border transition-all ${config.dotsType === item.id ? 'bg-gray-800 text-white border-gray-800 shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                           {item.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Corner Styles */}
            <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">Corner Style</label>
                <div className="grid grid-cols-3 gap-2">
                    {[
                       {id: 'square', label: 'Square'},
                       {id: 'circle', label: 'Circle'},
                       {id: 'rounded', label: 'Rounded'},
                       {id: 'three-sided', label: '3-Sided'},
                       {id: 'two-sided', label: '2-Sided'}
                    ].map((item) => (
                        <button
                           type="button"
                           key={item.id}
                           onClick={() => update('cornerSquareType', item.id)}
                           className={`px-2 py-3 rounded-lg text-xs font-medium border transition-all ${config.cornerSquareType === item.id ? 'bg-gray-800 text-white border-gray-800 shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                           {item.label}
                        </button>
                    ))}
                </div>
            </div>
         </div>
      </div>
      
      <div className="w-full h-px bg-gray-100"></div>
      
      {/* Logo Section */}
      <div>
         <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">
              <ImageIcon size={14} />
            </div>
            <h3 className="text-sm font-semibold text-gray-800">Add Logo / Icon</h3>
         </div>

         {/* Icon Library */}
         <div className="mb-4">
            <div className="flex gap-1 mb-3">
               {categories.map((cat) => (
                  <button
                     type="button"
                     key={cat.id}
                     onClick={() => setIconCategory(cat.id)}
                     className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${iconCategory === cat.id ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                     {cat.name}
                  </button>
               ))}
            </div>
            <div className="grid grid-cols-6 gap-2 max-h-32 overflow-y-auto p-1">
               {filteredIcons.map((icon) => (
                  <button
                     type="button"
                     key={icon.id}
                     onClick={() => applyIcon(icon)}
                     className="w-10 h-10 rounded-lg bg-white border border-gray-200 hover:border-gray-400 hover:shadow-sm transition-all flex items-center justify-center p-1.5"
                     title={icon.name}
                  >
                     <div dangerouslySetInnerHTML={{ __html: icon.svg }} className="w-full h-full" />
                  </button>
               ))}
            </div>
         </div>

         {/* Upload Custom Logo */}
         <div className="flex items-center gap-4">
             <label className="flex-1 cursor-pointer bg-gray-50 border border-dashed border-gray-300 rounded-xl h-20 flex flex-col items-center justify-center hover:bg-gray-100 transition-colors">
                 <span className="text-xs font-medium text-gray-500">Upload Image</span>
                 <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                     const file = e.target.files?.[0];
                     if (file) {
                         const reader = new FileReader();
                         reader.onload = async (evt) => {
                             const imageDataUrl = evt.target?.result as string;
                             if (imageDataUrl) {
                                 // Extract colors from logo and apply to QR
                                 try {
                                     const colors = await extractLogoColors(imageDataUrl);
                                     onChange({
                                         ...config,
                                         logoImage: imageDataUrl,
                                         fgColor: colors.foreground,
                                         bgColor: colors.background,
                                         // Apply gradient if detected in logo
                                         isGradient: colors.isGradient,
                                         fgColor2: colors.foreground2 || colors.foreground,
                                         gradientType: colors.gradientType || 'linear',
                                         gradientRotation: colors.gradientRotation || 45
                                     });
                                 } catch (error) {
                                     // Fallback: just set the logo without color extraction
                                     update('logoImage', imageDataUrl);
                                 }
                             }
                         };
                         reader.readAsDataURL(file);
                     }
                 }} />
             </label>
             
             {config.logoImage && (
                 <div className="relative w-20 h-20 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
                     <img src={config.logoImage} className="w-full h-full object-contain" alt="Logo" />
                     <button
                         type="button"
                         onClick={() => update('logoImage', null)}
                         className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs shadow-md"
                     >
                         ×
                     </button>
                 </div>
             )}
         </div>
         
         {config.logoImage && (
             <div className="mt-4 space-y-4">
                 {/* Logo Shape Selection */}
                 <div>
                     <label className="text-xs font-medium text-gray-500 mb-2 block">Padding Shape</label>
                     <div className="grid grid-cols-4 gap-2">
                         {[
                             { id: 'auto', label: 'Auto' },
                             { id: 'square', label: 'Square' },
                             { id: 'circle', label: 'Circle' },
                             { id: 'rounded', label: 'Rounded' }
                         ].map((shape) => (
                             <button
                                 type="button"
                                 key={shape.id}
                                 onClick={() => update('logoShape', shape.id)}
                                 className={`py-2 rounded-lg text-xs font-medium border transition-all ${config.logoShape === shape.id ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                             >
                                 {shape.label}
                             </button>
                         ))}
                     </div>
                     <p className="text-[10px] text-gray-400 mt-1">Auto detects logo shape and applies matching padding</p>
                 </div>

                 {/* Logo Color Info */}
                 <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                     <p className="text-[11px] text-blue-700">
                         <span className="font-medium">Auto Color Match:</span> QR colors (including gradients) are automatically extracted from your logo. You can manually adjust colors in the Colors section above.
                     </p>
                 </div>

                 {/* Logo Size Slider */}
                 <div>
                     <div className="flex justify-between text-xs text-gray-500 mb-1">
                         <span>Size</span>
                         <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700">{(config.logoSize * 100).toFixed(0)}%</span>
                     </div>
                     <input
                         type="range" min="0.1" max="0.4" step="0.05"
                         value={config.logoSize}
                         onChange={e => updateDebounced('logoSize', Number(e.target.value))}
                         className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-800"
                     />
                 </div>
             </div>
         )}
      </div>
    </div>
  );
};