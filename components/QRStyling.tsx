import React, { useState, useRef, useEffect } from 'react';
import { QRStyleConfig } from '../types';
import { Palette, Grid, Image as ImageIcon } from 'lucide-react';

interface Props {
  config: QRStyleConfig;
  onChange: (config: QRStyleConfig) => void;
}

export const QRStyling: React.FC<Props> = ({ config, onChange }) => {
  const update = (key: keyof QRStyleConfig, val: any) => onChange({ ...config, [key]: val });

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
      const hex = localValue.trim();
      if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
        onChange(hex);
      } else if (/^#[0-9A-Fa-f]{3}$/.test(hex)) {
        const expanded = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
        onChange(expanded);
        setLocalValue(expanded);
      } else {
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

  return (
    <div className="mt-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center">
          <Palette size={14} />
        </div>
        <h3 className="text-sm font-semibold text-gray-800">Choose Your Colors</h3>
        <div className="ml-auto flex items-center gap-2 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-md">
          <span>Contrast OK</span>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="bg-gray-100 p-1 rounded-full flex mb-6 w-max">
        <button 
          onClick={() => update('isGradient', false)}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${!config.isGradient ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
        >
          Solid
        </button>
        <button 
          onClick={() => update('isGradient', true)}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${config.isGradient ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
        >
          Gradient
        </button>
      </div>

      <div className="space-y-4">
        {/* Colors Row */}
        <div className="flex flex-wrap gap-3">
          <ColorInput label={config.isGradient ? "Start" : "Foreground"} value={config.fgColor} onChange={(v: string) => update('fgColor', v)} />
          {config.isGradient && (
            <ColorInput label="End" value={config.fgColor2} onChange={(v: string) => update('fgColor2', v)} />
          )}
        </div>

        {/* Background & Transparent */}
        <div className="flex items-center gap-3">
            <ColorInput label="Background" value={config.bgColor} onChange={(v: string) => update('bgColor', v)} />
            <button 
                onClick={() => update('bgTransparent', !config.bgTransparent)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all h-[50px] ${config.bgTransparent ? 'bg-gray-800 text-white border-gray-800' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
            >
                <span className="text-xs font-medium">Transparent</span>
                <div className={`w-4 h-4 rounded-full border ${config.bgTransparent ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'}`}></div>
            </button>
        </div>

        {/* Custom Corner Colors Toggle */}
        <div className="pt-4 border-t border-dashed border-gray-200">
           <button 
             onClick={() => update('customCornerColor', !config.customCornerColor)}
             className={`w-full py-2 rounded-lg text-xs font-medium border border-dashed mb-3 ${config.customCornerColor ? 'border-gray-800 text-gray-800 bg-gray-50' : 'border-gray-300 text-gray-400'}`}
           >
             {config.customCornerColor ? "Disable Custom Corner Colors" : "+ Enable Custom Corner Colors"}
           </button>
           
           {config.customCornerColor && (
             <div className="flex gap-3 animate-fadeIn">
                <ColorInput label="Corner Color" value={config.cornerSquareColor} onChange={(v: string) => {
                  update('cornerSquareColor', v);
                  update('cornerDotColor', v);
                }} />
             </div>
           )}
        </div>

        {/* Patterns & Shapes */}
        <div className="pt-6 border-t border-gray-100">
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
                             key={item.id}
                             onClick={() => update('dotsType', item.id)}
                             className={`px-2 py-3 rounded-lg text-xs font-medium border transition-all ${config.dotsType === item.id ? 'bg-gray-800 text-white border-gray-800 shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                          >
                             {item.label}
                          </button>
                      ))}
                  </div>
                  {config.dotsType === 'uniform-pills' && (
                    <p className="text-[10px] text-green-600 mt-2 font-medium bg-green-50 p-2 rounded-lg border border-green-100">
                      ✨ Premium Vector Pills with 0.2px precision gaps enabled.
                    </p>
                  )}
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
        
        {/* Logo Section */}
        <div className="pt-6 border-t border-gray-100">
           <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center">
                <ImageIcon size={14} />
              </div>
              <h3 className="text-sm font-semibold text-gray-800">Add Logo</h3>
           </div>
           
           <div className="flex items-center gap-4">
               <label className="flex-1 cursor-pointer bg-gray-50 border border-dashed border-gray-300 rounded-xl h-20 flex flex-col items-center justify-center hover:bg-gray-100 transition-colors">
                   <span className="text-xs font-medium text-gray-500">Upload Image</span>
                   <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                       const file = e.target.files?.[0];
                       if (file) {
                           const reader = new FileReader();
                           reader.onload = (evt) => update('logoImage', evt.target?.result);
                           reader.readAsDataURL(file);
                       }
                   }} />
               </label>
               
               {config.logoImage && (
                   <div className="relative w-20 h-20 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
                       <img src={config.logoImage} className="w-full h-full object-contain" alt="Logo" />
                       <button 
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

                   {/* Custom Color Toggle */}
                   <div>
                       <button
                           onClick={() => update('logoUseCustomColors', !config.logoUseCustomColors)}
                           className={`w-full py-2 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-2 ${config.logoUseCustomColors ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                       >
                           <span>Custom Colors</span>
                           <div className={`w-4 h-4 rounded-full border ${config.logoUseCustomColors ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'}`}></div>
                       </button>
                       <p className="text-[10px] text-gray-400 mt-1">
                           {config.logoUseCustomColors
                               ? 'Using custom colors for logo'
                               : 'Auto-matching QR foreground & background colors'}
                       </p>
                   </div>

                   {/* Custom Color Pickers */}
                   {config.logoUseCustomColors && (
                       <div className="space-y-2">
                           <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                               <span className="text-xs font-medium text-gray-600">Foreground</span>
                               <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-gray-200 shadow-sm ml-auto">
                                   <input
                                       type="color"
                                       value={config.logoForegroundColor || '#000000'}
                                       onChange={(e) => update('logoForegroundColor', e.target.value)}
                                       className="absolute inset-[-4px] w-[150%] h-[150%] cursor-pointer p-0 m-0"
                                   />
                               </div>
                           </div>
                           <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                               <span className="text-xs font-medium text-gray-600">Background</span>
                               <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-gray-200 shadow-sm ml-auto">
                                   <input
                                       type="color"
                                       value={config.logoBackgroundColor || '#ffffff'}
                                       onChange={(e) => update('logoBackgroundColor', e.target.value)}
                                       className="absolute inset-[-4px] w-[150%] h-[150%] cursor-pointer p-0 m-0"
                                   />
                               </div>
                           </div>
                       </div>
                   )}

                   {/* Logo Size Slider */}
                   <div>
                       <div className="flex justify-between text-xs text-gray-500 mb-1">
                           <span>Size</span>
                           <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700">{(config.logoSize * 100).toFixed(0)}%</span>
                       </div>
                       <input
                           type="range" min="0.1" max="0.5" step="0.05"
                           value={config.logoSize}
                           onChange={e => update('logoSize', Number(e.target.value))}
                           className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-800"
                       />
                   </div>
               </div>
           )}
        </div>
      </div>
    </div>
  );
};