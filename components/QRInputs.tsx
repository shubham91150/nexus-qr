import React, { useState, useRef, useEffect } from 'react';
import { QRContentData, QRType } from '../types';
import { generateSmartQRContent } from '../services/geminiService';
import { Loader2, Sparkles, MapPin, Upload, FileText, X } from 'lucide-react';

interface Props {
  type: QRType;
  data: QRContentData;
  onChange: (data: QRContentData) => void;
}

const InputWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-col gap-3 animate-fadeIn">
    {children}
  </div>
);

// Optimized Debounced Input Component
const DebouncedInput = ({ 
  value, 
  onChange, 
  placeholder, 
  isArea = false,
  className = "",
  type = "text"
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  isArea?: boolean;
  className?: string;
  type?: string;
}) => {
  const [localValue, setLocalValue] = useState(value);
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (!isTypingRef.current && value !== localValue) {
        setLocalValue(value);
    }
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
      isTypingRef.current = false;
    }, 500);

    return () => clearTimeout(handler);
  }, [localValue, onChange, value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      isTypingRef.current = true;
      setLocalValue(e.target.value);
  };

  const baseClass = "w-full p-4 rounded-xl custom-input text-gray-700 text-sm font-medium border border-transparent focus:border-gray-300 focus:bg-white transition-all";

  if (isArea) {
    return (
      <textarea
        className={`${baseClass} min-h-[120px] resize-none ${className}`}
        placeholder={placeholder}
        value={localValue}
        onChange={handleChange}
      />
    );
  }

  return (
    <input
      type={type}
      className={`${baseClass} ${className}`}
      placeholder={placeholder}
      value={localValue}
      onChange={handleChange}
    />
  );
};

export const QRInputs: React.FC<Props> = ({ type, data, onChange }) => {
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAiGenerate = async () => {
    if (!aiPrompt) return;
    setIsAiLoading(true);
    try {
      const text = await generateSmartQRContent(aiPrompt);
      onChange({ ...data, type: 'text', value: text });
    } catch (e) {
      alert("AI Generation failed. Please check your API key.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const update = (field: string, value: any) => {
    onChange({ ...data, value });
  };

  const updateNested = (category: keyof QRContentData, field: string, value: any) => {
    // @ts-ignore
    const newData = { ...data, [category]: { ...data[category], [field]: value } };
    onChange(newData);
  };

  const handleBulkTextChange = (text: string) => {
    const items = text.split('\n').filter(line => line.trim() !== '').map((line, idx) => ({
        name: `QR-${idx + 1}`,
        value: line.trim()
    }));
    onChange({ 
        ...data, 
        bulk: { 
            rawInput: text, 
            items: items 
        } 
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (window.Papa) {
      window.Papa.parse(file, {
        complete: (results: any) => {
          const items = results.data
            .filter((row: any) => row.length > 0)
            .map((row: any, idx: number) => {
              if (Array.isArray(row)) {
                 if (row.length >= 2) return { name: row[0], value: row[1] };
                 return { name: `Item-${idx + 1}`, value: row[0] };
              } else if (typeof row === 'object') {
                 const keys = Object.keys(row);
                 const nameKey = keys.find(k => k.toLowerCase().includes('name')) || keys[0];
                 const contentKey = keys.find(k => k.toLowerCase().includes('content') || k.toLowerCase().includes('url') || k.toLowerCase().includes('data')) || keys[1];
                 return { 
                    name: row[nameKey] || `Item-${idx + 1}`, 
                    value: row[contentKey] || row[Object.keys(row)[0]] 
                 };
              }
              return null;
            })
            .filter((i: any) => i && i.value);

          onChange({
              ...data,
              bulk: {
                  items: items,
                  rawInput: items.map((i: any) => i.value).join('\n')
              }
          });
        },
        header: false
      });
    }
  };

  switch (type) {
    case 'text':
      return <InputWrapper><DebouncedInput isArea placeholder="Enter your text content here..." value={data.value} onChange={(v) => update('value', v)} /></InputWrapper>;
    
    case 'url':
      return <InputWrapper><DebouncedInput placeholder="https://www.example.com" value={data.value} onChange={(v) => update('value', v)} /></InputWrapper>;

    case 'bulk':
        const itemCount = data.bulk?.items?.length || 0;
        return (
            <InputWrapper>
                <div className="grid grid-cols-2 gap-3 mb-2">
                    <button 
                       onClick={() => fileInputRef.current?.click()}
                       className="flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-gray-800 hover:text-gray-800 transition-colors bg-gray-50"
                    >
                        <Upload size={18} />
                        <span className="text-sm font-medium">Upload CSV</span>
                    </button>
                    <div className="flex flex-col justify-center items-center bg-gray-50 rounded-xl border border-gray-100 p-2">
                        <span className="text-2xl font-bold text-gray-800">{itemCount}</span>
                        <span className="text-xs text-gray-500 font-medium">Items Loaded</span>
                    </div>
                    <input type="file" ref={fileInputRef} accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
                </div>
                
                <div className="relative">
                    <DebouncedInput
                        isArea
                        className="min-h-[150px] font-mono text-xs"
                        placeholder="Or paste links here (one per line)...&#10;https://site1.com&#10;https://site2.com"
                        value={data.bulk?.rawInput || ''}
                        onChange={(val) => handleBulkTextChange(val)}
                    />
                    {itemCount > 0 && (
                        <button 
                           onClick={() => onChange({ ...data, bulk: { items: [], rawInput: '' } })}
                           className="absolute top-2 right-2 p-1.5 bg-white shadow-sm border border-gray-200 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                           title="Clear all"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
                <p className="text-xs text-gray-400 px-1">
                    Supports simple lists or CSV files. The first item is previewed on the right.
                </p>
            </InputWrapper>
        );

    case 'ai':
      return (
        <InputWrapper>
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100 mb-2">
            <h4 className="text-indigo-900 font-semibold text-sm flex items-center gap-2 mb-1">
              <Sparkles size={16} /> AI Assistant
            </h4>
            <p className="text-xs text-indigo-700">Describe what you want (e.g., "WiFi for Guest, password 1234").</p>
          </div>
          <textarea
            className="w-full min-h-[100px] p-4 rounded-xl custom-input text-gray-700 text-sm font-medium resize-none border-indigo-100 focus:border-indigo-300 outline-none"
            placeholder="Describe your QR code..."
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
          />
          <button 
            onClick={handleAiGenerate}
            disabled={isAiLoading || !aiPrompt}
            className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium shadow-lg shadow-gray-200 flex items-center justify-center gap-2 hover:bg-gray-800 transition-all disabled:opacity-50"
          >
            {isAiLoading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
            Generate Magic QR
          </button>
        </InputWrapper>
      );

    case 'wifi':
      return (
        <InputWrapper>
          <DebouncedInput placeholder="Network Name (SSID)" value={data.wifi?.ssid || ''} onChange={(v) => updateNested('wifi', 'ssid', v)} />
          <DebouncedInput placeholder="Password" value={data.wifi?.pass || ''} onChange={(v) => updateNested('wifi', 'pass', v)} />
          <select 
            className="w-full p-4 rounded-xl custom-input text-gray-700 text-sm font-medium appearance-none"
            value={data.wifi?.type || 'WPA'}
            onChange={(e) => updateNested('wifi', 'type', e.target.value)}
          >
            <option value="WPA">WPA/WPA2</option>
            <option value="WEP">WEP</option>
            <option value="nopass">No Encryption</option>
          </select>
          <label className="flex items-center gap-3 p-2 cursor-pointer">
            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${data.wifi?.hidden ? 'bg-gray-800 border-gray-800' : 'border-gray-300 bg-white'}`}>
              {data.wifi?.hidden && <div className="w-2 h-2 bg-white rounded-full" />}
            </div>
            <input type="checkbox" className="hidden" checked={data.wifi?.hidden || false} onChange={e => updateNested('wifi', 'hidden', e.target.checked)} />
            <span className="text-sm text-gray-600 font-medium">Hidden Network</span>
          </label>
        </InputWrapper>
      );

    case 'contact':
      return (
        <InputWrapper>
          <DebouncedInput placeholder="Full Name" value={data.contact?.fn || ''} onChange={(v) => updateNested('contact', 'fn', v)} />
          <DebouncedInput placeholder="Phone Number" value={data.contact?.phone || ''} onChange={(v) => updateNested('contact', 'phone', v)} />
          <DebouncedInput placeholder="Email" value={data.contact?.email || ''} onChange={(v) => updateNested('contact', 'email', v)} />
          <DebouncedInput placeholder="Organization" value={data.contact?.org || ''} onChange={(v) => updateNested('contact', 'org', v)} />
        </InputWrapper>
      );

    case 'geo':
      return (
        <InputWrapper>
          <button 
            onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(pos => {
                   updateNested('geo', 'lat', pos.coords.latitude.toString());
                   updateNested('geo', 'lng', pos.coords.longitude.toString());
                });
              }
            }}
            className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium shadow-lg flex items-center justify-center gap-2 mb-2 hover:bg-gray-800 transition-colors"
          >
            <MapPin size={18} /> Get Current Location
          </button>
          <div className="grid grid-cols-2 gap-3">
             <DebouncedInput placeholder="Latitude" value={data.geo?.lat || ''} onChange={(v) => updateNested('geo', 'lat', v)} />
             <DebouncedInput placeholder="Longitude" value={data.geo?.lng || ''} onChange={(v) => updateNested('geo', 'lng', v)} />
          </div>
        </InputWrapper>
      );
      
    case 'event':
      return (
        <InputWrapper>
          <DebouncedInput placeholder="Event Title" value={data.event?.title || ''} onChange={(v) => updateNested('event', 'title', v)} />
          <DebouncedInput placeholder="Location" value={data.event?.location || ''} onChange={(v) => updateNested('event', 'location', v)} />
          <div className="grid grid-cols-2 gap-3">
             <div className="flex flex-col gap-1">
                 <label className="text-xs text-gray-500 ml-1">Starts</label>
                 <DebouncedInput type="datetime-local" className="text-xs" value={data.event?.start || ''} onChange={(v) => updateNested('event', 'start', v)} />
             </div>
             <div className="flex flex-col gap-1">
                 <label className="text-xs text-gray-500 ml-1">Ends</label>
                 <DebouncedInput type="datetime-local" className="text-xs" value={data.event?.end || ''} onChange={(v) => updateNested('event', 'end', v)} />
             </div>
          </div>
        </InputWrapper>
      );

    case 'sms':
      return (
        <InputWrapper>
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-xl border border-green-100 mb-1">
            <p className="text-xs text-green-700">Create a QR code that opens SMS app with pre-filled message</p>
          </div>
          <DebouncedInput placeholder="Phone Number (e.g., +91XXXXXXXXXX)" value={data.sms?.phone || ''} onChange={(v) => updateNested('sms', 'phone', v)} />
          <DebouncedInput isArea placeholder="Message (optional)" value={data.sms?.message || ''} onChange={(v) => updateNested('sms', 'message', v)} />
        </InputWrapper>
      );

    case 'appstore':
      return (
        <InputWrapper>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-xl border border-blue-100 mb-1">
            <p className="text-xs text-blue-700">Create QR code that redirects to app stores based on user's device</p>
          </div>
          <DebouncedInput placeholder="App Name (for display)" value={data.appstore?.appName || ''} onChange={(v) => updateNested('appstore', 'appName', v)} />
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 ml-1 flex items-center gap-1">
              <span className="w-4 h-4 bg-gray-900 rounded flex items-center justify-center text-white text-[8px]"></span>
              iOS App Store URL
            </label>
            <DebouncedInput placeholder="https://apps.apple.com/app/..." value={data.appstore?.iosUrl || ''} onChange={(v) => updateNested('appstore', 'iosUrl', v)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 ml-1 flex items-center gap-1">
              <span className="w-4 h-4 bg-green-600 rounded flex items-center justify-center text-white text-[8px]">▶</span>
              Google Play Store URL
            </label>
            <DebouncedInput placeholder="https://play.google.com/store/apps/..." value={data.appstore?.androidUrl || ''} onChange={(v) => updateNested('appstore', 'androidUrl', v)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 ml-1 flex items-center gap-1">
              <span className="w-4 h-4 bg-red-500 rounded flex items-center justify-center text-white text-[8px]">H</span>
              Huawei AppGallery URL (optional)
            </label>
            <DebouncedInput placeholder="https://appgallery.huawei.com/..." value={data.appstore?.huaweiUrl || ''} onChange={(v) => updateNested('appstore', 'huaweiUrl', v)} />
          </div>
        </InputWrapper>
      );

    default:
      return <InputWrapper><DebouncedInput placeholder="Enter Value" value={data.value} onChange={(v) => update('value', v)} /></InputWrapper>;
  }
};