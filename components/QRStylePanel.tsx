import React from 'react';
import { QRStyleConfig } from '../types';
import { Palette, Grid, Sliders, Image as ImageIcon, Zap, Monitor, Tv, Film, Maximize } from 'lucide-react';

interface Props {
  config: QRStyleConfig;
  onChange: (config: QRStyleConfig) => void;
}

export const QRStylePanel: React.FC<Props> = ({ config, onChange }) => {
  const update = (key: keyof QRStyleConfig, val: any) => onChange({ ...config, [key]: val });

  const ColorInput = ({ label, value, onChange }: any) => (
    <div className="flex-1 min-w-[120px] bg-gray-50 p-2 rounded-xl border border-gray-200 flex items-center justify-between">
      <span className="text-xs font-medium text-gray-600 uppercase">{label}</span>
      <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
        <input 
          type="color" 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-[-4px] w-[150%] h-[150%] cursor-pointer p-0 m-0"
        />
      </div>
    </div>
  );

  const qualityPresets = [
    { label: 'Draft', sub: '300px', size: 300, icon: Zap },
    { label: 'HD', sub: '1280px', size: 1280, icon: Monitor },
    { label: 'Full HD', sub: '1920px', size: 1920, icon: Tv },
    { label: '2K', sub: '2560px', size: 2560, icon: Film },
    { label: '4K', sub: '3840px', size: 3840, icon: Maximize },
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
                <div className="grid grid-cols-5 gap-2">
                    {qualityPresets.map((preset) => (
                        <button
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
                    onChange={e => update('size', Number(e.target.value))}
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
            onClick={() => update('isGradient', false)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${!config.isGradient ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            Solid
          </button>
          <button 
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
                    onChange={e => update('gradientRotation', Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-800"
                />
             </div>
          )}

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
             <div className="mt-4 space-y-3">
                 <div className="flex items-center gap-2 mb-2">
                     <button 
                         onClick={() => update('logoBackground', 'transparent')}
                         className={`flex-1 py-1.5 text-xs rounded-lg border ${config.logoBackground === 'transparent' ? 'bg-gray-800 text-white' : 'bg-white text-gray-600'}`}
                     >
                         Transparent
                     </button>
                     <button 
                         onClick={() => update('logoBackground', 'solid')}
                         className={`flex-1 py-1.5 text-xs rounded-lg border ${config.logoBackground === 'solid' ? 'bg-gray-800 text-white' : 'bg-white text-gray-600'}`}
                     >
                         White Bg
                     </button>
                 </div>
                 <div>
                     <div className="flex justify-between text-xs text-gray-500 mb-1">
                         <span>Size</span>
                         <span>{(config.logoSize * 100).toFixed(0)}%</span>
                     </div>
                     <input 
                         type="range" min="0.1" max="0.4" step="0.05" 
                         value={config.logoSize} 
                         onChange={e => update('logoSize', Number(e.target.value))}
                         className="w-full accent-gray-800"
                     />
                 </div>
             </div>
         )}
      </div>
    </div>
  );
};