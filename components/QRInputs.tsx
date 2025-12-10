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
          <DebouncedInput placeholder="Phone Number (e.g., +91XXXXXXXXXX)" value={data.sms?.phone || ''} onChange={(v) => updateNested('sms', 'phone', v)} />
          <DebouncedInput isArea placeholder="Message (optional)" value={data.sms?.message || ''} onChange={(v) => updateNested('sms', 'message', v)} />
        </InputWrapper>
      );

    case 'appstore':
      return (
        <InputWrapper>
          <DebouncedInput placeholder="App Name (for display)" value={data.appstore?.appName || ''} onChange={(v) => updateNested('appstore', 'appName', v)} />
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 ml-1 flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              iOS App Store URL
            </label>
            <DebouncedInput placeholder="https://apps.apple.com/app/..." value={data.appstore?.iosUrl || ''} onChange={(v) => updateNested('appstore', 'iosUrl', v)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 ml-1 flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#34A853" d="M3.609 1.814L13.792 12 3.61 22.186a2.372 2.372 0 01-.87-1.837V3.651c0-.723.33-1.37.869-1.837z"/>
                <path fill="#FBBC04" d="M17.586 8.146L14.897 9.7l-1.105 2.3 1.105 2.3 2.69 1.554 2.992-1.728a2.372 2.372 0 000-4.252l-2.993-1.728z"/>
                <path fill="#4285F4" d="M3.609 1.814L14.897 9.7l2.689-1.554L6.758.245a2.366 2.366 0 00-3.15 1.57z"/>
                <path fill="#EA4335" d="M14.897 14.3L3.609 22.186a2.366 2.366 0 003.149 1.57l10.828-7.902-2.689-1.554z"/>
              </svg>
              Google Play Store URL
            </label>
            <DebouncedInput placeholder="https://play.google.com/store/apps/..." value={data.appstore?.androidUrl || ''} onChange={(v) => updateNested('appstore', 'androidUrl', v)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 ml-1 flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="12" fill="#C41230"/>
                <path fill="#fff" d="M7.5 7h2v10h-2V7zm7 0h2v10h-2V7zm-5.5 4h6v2H9v-2z"/>
              </svg>
              Huawei AppGallery URL (optional)
            </label>
            <DebouncedInput placeholder="https://appgallery.huawei.com/..." value={data.appstore?.huaweiUrl || ''} onChange={(v) => updateNested('appstore', 'huaweiUrl', v)} />
          </div>
        </InputWrapper>
      );

    case 'whatsapp':
      return (
        <InputWrapper>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 ml-1 flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#25D366">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp Number
            </label>
            <DebouncedInput placeholder="Phone with country code (e.g., 919876543210)" value={data.whatsapp?.phone || ''} onChange={(v) => updateNested('whatsapp', 'phone', v)} />
          </div>
          <DebouncedInput isArea placeholder="Pre-filled message (optional)" value={data.whatsapp?.message || ''} onChange={(v) => updateNested('whatsapp', 'message', v)} />
        </InputWrapper>
      );

    case 'youtube':
      return (
        <InputWrapper>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 ml-1 flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#FF0000">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              YouTube Video URL
            </label>
            <DebouncedInput placeholder="https://youtube.com/watch?v=..." value={data.youtube?.url || ''} onChange={(v) => updateNested('youtube', 'url', v)} />
          </div>
        </InputWrapper>
      );

    case 'bitcoin':
      return (
        <InputWrapper>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 ml-1 flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#F7931A">
                <path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.546z"/>
                <path fill="#fff" d="M14.6 10.592c.338-2.255-1.38-3.47-3.73-4.28l.762-3.055-1.86-.464-.742 2.975c-.49-.122-.993-.237-1.493-.351l.747-2.993-1.86-.464-.762 3.054c-.405-.092-.803-.183-1.19-.279l.002-.01-2.566-.64-.495 1.987s1.38.316 1.35.336c.753.188.89.687.867 1.082l-.868 3.482c.052.013.119.032.193.062l-.197-.049-1.217 4.88c-.092.229-.326.572-.854.442.019.027-1.35-.337-1.35-.337l-.923 2.127 2.423.603c.45.113.892.231 1.327.341l-.77 3.09 1.858.463.763-3.058c.508.138 1.001.265 1.483.386l-.76 3.044 1.86.464.77-3.086c3.17.6 5.553.358 6.556-2.51.81-2.31-.04-3.644-1.71-4.514 1.216-.28 2.133-1.08 2.377-2.73zm-4.254 5.964c-.574 2.31-4.461 1.062-5.72.749l1.021-4.092c1.26.314 5.3.936 4.7 3.343zm.575-5.996c-.524 2.1-3.76.962-4.81.718l.926-3.712c1.05.263 4.43.752 3.884 2.994z"/>
              </svg>
              Bitcoin Address
            </label>
            <DebouncedInput placeholder="bc1q... or 1A1zP1..." value={data.bitcoin?.address || ''} onChange={(v) => updateNested('bitcoin', 'address', v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DebouncedInput placeholder="Amount (BTC)" value={data.bitcoin?.amount || ''} onChange={(v) => updateNested('bitcoin', 'amount', v)} />
            <DebouncedInput placeholder="Label (optional)" value={data.bitcoin?.label || ''} onChange={(v) => updateNested('bitcoin', 'label', v)} />
          </div>
        </InputWrapper>
      );

    case 'coupon':
      return (
        <InputWrapper>
          <DebouncedInput placeholder="Coupon Code (e.g., SAVE20)" value={data.coupon?.code || ''} onChange={(v) => updateNested('coupon', 'code', v)} />
          <DebouncedInput placeholder="Discount (e.g., 20% OFF or $10 OFF)" value={data.coupon?.discount || ''} onChange={(v) => updateNested('coupon', 'discount', v)} />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 ml-1">Expiry Date</label>
              <DebouncedInput type="date" value={data.coupon?.expiry || ''} onChange={(v) => updateNested('coupon', 'expiry', v)} />
            </div>
          </div>
          <DebouncedInput isArea placeholder="Terms & Conditions (optional)" value={data.coupon?.terms || ''} onChange={(v) => updateNested('coupon', 'terms', v)} />
        </InputWrapper>
      );

    default:
      return <InputWrapper><DebouncedInput placeholder="Enter Value" value={data.value} onChange={(v) => update('value', v)} /></InputWrapper>;
  }
};