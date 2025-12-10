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

    case 'upi':
      return (
        <InputWrapper>
          <div className="bg-gradient-to-r from-orange-50 to-green-50 p-4 rounded-xl border border-orange-100 mb-2">
            <h4 className="text-orange-900 font-semibold text-sm flex items-center gap-2 mb-1">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              UPI Payment
            </h4>
            <p className="text-xs text-orange-700">Create a QR code for instant UPI payments.</p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 ml-1">UPI ID (VPA) *</label>
            <DebouncedInput placeholder="yourname@upi or 9876543210@paytm" value={data.upi?.vpa || ''} onChange={(v) => updateNested('upi', 'vpa', v)} />
          </div>
          <DebouncedInput placeholder="Payee Name (optional)" value={data.upi?.name || ''} onChange={(v) => updateNested('upi', 'name', v)} />
          <div className="grid grid-cols-2 gap-3">
            <DebouncedInput placeholder="Amount (optional)" value={data.upi?.amount || ''} onChange={(v) => updateNested('upi', 'amount', v)} />
            <DebouncedInput placeholder="Note (optional)" value={data.upi?.note || ''} onChange={(v) => updateNested('upi', 'note', v)} />
          </div>
        </InputWrapper>
      );

    case 'paypal':
      return (
        <InputWrapper>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100 mb-2">
            <h4 className="text-blue-900 font-semibold text-sm flex items-center gap-2 mb-1">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#003087">
                <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.77.77 0 0 1 .757-.65h6.16c2.048 0 3.474.526 4.238 1.564.357.485.58 1.038.669 1.643.092.628.042 1.375-.154 2.219l-.003.018c-.607 3.093-2.537 4.166-5.025 4.166H9.94a.95.95 0 0 0-.939.804l-.746 4.725a.64.64 0 0 1-.632.541h.453l-.846 3.587zm11.141-13.36c-.012.079-.027.158-.042.237-.752 3.862-3.323 5.201-6.609 5.201H9.883c-.391 0-.724.284-.788.67l-.916 5.804a.53.53 0 0 0 .525.617h3.679c.342 0 .633-.25.687-.587l.028-.146.547-3.459.035-.19a.69.69 0 0 1 .687-.587h.432c2.8 0 4.993-1.138 5.634-4.428.269-1.375.13-2.524-.581-3.332z"/>
              </svg>
              PayPal Payment
            </h4>
            <p className="text-xs text-blue-700">Accept payments via PayPal.me link.</p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 ml-1">PayPal Username/Email *</label>
            <DebouncedInput placeholder="your@email.com or username" value={data.paypal?.email || ''} onChange={(v) => updateNested('paypal', 'email', v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DebouncedInput placeholder="Amount (optional)" value={data.paypal?.amount || ''} onChange={(v) => updateNested('paypal', 'amount', v)} />
            <select
              className="w-full p-4 rounded-xl custom-input text-gray-700 text-sm font-medium appearance-none"
              value={data.paypal?.currency || 'USD'}
              onChange={(e) => updateNested('paypal', 'currency', e.target.value)}
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="INR">INR (₹)</option>
              <option value="CAD">CAD ($)</option>
              <option value="AUD">AUD ($)</option>
            </select>
          </div>
          <DebouncedInput placeholder="Description (optional)" value={data.paypal?.description || ''} onChange={(v) => updateNested('paypal', 'description', v)} />
        </InputWrapper>
      );

    case 'telegram':
      return (
        <InputWrapper>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 ml-1 flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#0088cc">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              Telegram Username
            </label>
            <DebouncedInput placeholder="username (without @)" value={data.telegram?.username || ''} onChange={(v) => updateNested('telegram', 'username', v)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 ml-1">Link Type</label>
            <select
              className="w-full p-4 rounded-xl custom-input text-gray-700 text-sm font-medium appearance-none"
              value={data.telegram?.type || 'user'}
              onChange={(e) => updateNested('telegram', 'type', e.target.value)}
            >
              <option value="user">User Profile</option>
              <option value="group">Group Invite</option>
              <option value="channel">Channel</option>
            </select>
          </div>
        </InputWrapper>
      );

    case 'spotify':
      return (
        <InputWrapper>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 ml-1 flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1DB954">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              Spotify URL
            </label>
            <DebouncedInput placeholder="https://open.spotify.com/track/..." value={data.spotify?.url || ''} onChange={(v) => updateNested('spotify', 'url', v)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 ml-1">Content Type</label>
            <select
              className="w-full p-4 rounded-xl custom-input text-gray-700 text-sm font-medium appearance-none"
              value={data.spotify?.type || 'track'}
              onChange={(e) => updateNested('spotify', 'type', e.target.value)}
            >
              <option value="track">Track</option>
              <option value="album">Album</option>
              <option value="playlist">Playlist</option>
              <option value="artist">Artist</option>
            </select>
          </div>
        </InputWrapper>
      );

    case 'instagram':
      return (
        <InputWrapper>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 ml-1 flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <defs>
                  <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FFDC80"/>
                    <stop offset="50%" stopColor="#F77737"/>
                    <stop offset="100%" stopColor="#C13584"/>
                  </linearGradient>
                </defs>
                <path fill="url(#ig-grad)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              Instagram Username
            </label>
            <DebouncedInput placeholder="username (without @)" value={data.instagram?.username || ''} onChange={(v) => updateNested('instagram', 'username', v)} />
          </div>
          <p className="text-xs text-gray-400 px-1">
            Opens the Instagram profile when scanned.
          </p>
        </InputWrapper>
      );

    case 'twitter':
      return (
        <InputWrapper>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 ml-1 flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#000000">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              Twitter/X Username
            </label>
            <DebouncedInput placeholder="username (without @)" value={data.twitter?.username || ''} onChange={(v) => updateNested('twitter', 'username', v)} />
          </div>
          <p className="text-xs text-gray-400 px-1">
            Opens the Twitter/X profile when scanned.
          </p>
        </InputWrapper>
      );

    case 'linkedin':
      return (
        <InputWrapper>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 ml-1 flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#0A66C2">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              LinkedIn Username/ID
            </label>
            <DebouncedInput placeholder="in/username or company/name" value={data.linkedin?.username || ''} onChange={(v) => updateNested('linkedin', 'username', v)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 ml-1">Profile Type</label>
            <select
              className="w-full p-4 rounded-xl custom-input text-gray-700 text-sm font-medium appearance-none"
              value={data.linkedin?.type || 'profile'}
              onChange={(e) => updateNested('linkedin', 'type', e.target.value)}
            >
              <option value="profile">Personal Profile</option>
              <option value="company">Company Page</option>
            </select>
          </div>
        </InputWrapper>
      );

    case 'zoom':
      return (
        <InputWrapper>
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-100 mb-2">
            <h4 className="text-blue-900 font-semibold text-sm flex items-center gap-2 mb-1">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#2D8CFF">
                <path d="M4.585 13.607l-.27.012h-.006c-.767 0-1.397-.63-1.397-1.397V8.139c0-.767.63-1.397 1.397-1.397h6.774c.768 0 1.397.63 1.397 1.397v4.09l.015-.004c.377.384.9.622 1.479.622.578 0 1.102-.238 1.478-.621l3.378-3.445c.125-.118.292-.184.469-.184.365 0 .66.295.66.66v6.496c0 .365-.295.66-.66.66-.177 0-.344-.066-.469-.184l-3.378-3.445c-.376-.383-.9-.62-1.478-.62-.58 0-1.102.237-1.479.62l-.015-.003v4.09c0 .767-.63 1.396-1.397 1.396H4.309a1.397 1.397 0 01-1.397-1.396v-4.084c0-.767.63-1.396 1.397-1.396h.006l.27.012z"/>
              </svg>
              Zoom Meeting
            </h4>
            <p className="text-xs text-blue-700">Create a QR to join a Zoom meeting directly.</p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 ml-1">Meeting ID *</label>
            <DebouncedInput placeholder="123 456 7890" value={data.zoom?.meetingId || ''} onChange={(v) => updateNested('zoom', 'meetingId', v.replace(/\s/g, ''))} />
          </div>
          <DebouncedInput placeholder="Password (optional)" value={data.zoom?.password || ''} onChange={(v) => updateNested('zoom', 'password', v)} />
        </InputWrapper>
      );

    case 'facebook':
      return (
        <InputWrapper>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 ml-1 flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook Username/Page
            </label>
            <DebouncedInput placeholder="username or pagename" value={data.facebook?.username || ''} onChange={(v) => updateNested('facebook', 'username', v)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 ml-1">Link Type</label>
            <select
              className="w-full p-4 rounded-xl custom-input text-gray-700 text-sm font-medium appearance-none"
              value={data.facebook?.type || 'profile'}
              onChange={(e) => updateNested('facebook', 'type', e.target.value)}
            >
              <option value="profile">Personal Profile</option>
              <option value="page">Business Page</option>
              <option value="group">Group</option>
            </select>
          </div>
        </InputWrapper>
      );

    case 'tiktok':
      return (
        <InputWrapper>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 ml-1 flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#000000">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
              </svg>
              TikTok Username
            </label>
            <DebouncedInput placeholder="@username (without @)" value={data.tiktok?.username || ''} onChange={(v) => updateNested('tiktok', 'username', v.replace('@', ''))} />
          </div>
          <p className="text-xs text-gray-400 px-1">
            Opens the TikTok profile when scanned.
          </p>
        </InputWrapper>
      );

    case 'pinterest':
      return (
        <InputWrapper>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 ml-1 flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#E60023">
                <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/>
              </svg>
              Pinterest Username
            </label>
            <DebouncedInput placeholder="username" value={data.pinterest?.username || ''} onChange={(v) => updateNested('pinterest', 'username', v)} />
          </div>
          <DebouncedInput placeholder="Board name (optional)" value={data.pinterest?.board || ''} onChange={(v) => updateNested('pinterest', 'board', v)} />
        </InputWrapper>
      );

    case 'snapchat':
      return (
        <InputWrapper>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 ml-1 flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#FFFC00">
                <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146 1.124.347 2.317.535 3.554.535 6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/>
              </svg>
              Snapchat Username
            </label>
            <DebouncedInput placeholder="username" value={data.snapchat?.username || ''} onChange={(v) => updateNested('snapchat', 'username', v)} />
          </div>
          <p className="text-xs text-gray-400 px-1">
            Opens the Snapchat profile to add as friend.
          </p>
        </InputWrapper>
      );

    case 'discord':
      return (
        <InputWrapper>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 ml-1 flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#5865F2">
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
              </svg>
              Discord Invite Code
            </label>
            <DebouncedInput placeholder="abc123XYZ (from discord.gg/abc123XYZ)" value={data.discord?.inviteCode || ''} onChange={(v) => updateNested('discord', 'inviteCode', v.replace('https://discord.gg/', '').replace('discord.gg/', ''))} />
          </div>
          <p className="text-xs text-gray-400 px-1">
            Enter the invite code or full Discord invite URL.
          </p>
        </InputWrapper>
      );

    case 'skype':
      return (
        <InputWrapper>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 ml-1 flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#00AFF0">
                <path d="M12.069 18.874c-4.023 0-5.82-1.979-5.82-3.464 0-.765.561-1.296 1.333-1.296 1.723 0 1.273 2.477 4.487 2.477 1.641 0 2.55-.895 2.55-1.811 0-.551-.269-1.16-1.354-1.429l-3.576-.895c-2.88-.724-3.403-2.286-3.403-3.751 0-3.047 2.861-4.191 5.549-4.191 2.471 0 5.393 1.373 5.393 3.199 0 .784-.688 1.24-1.453 1.24-1.469 0-1.198-2.037-4.164-2.037-1.469 0-2.292.664-2.292 1.617s1.153 1.258 2.157 1.487l2.637.587c2.891.649 3.624 2.346 3.624 3.944 0 2.476-1.902 4.324-5.722 4.324m11.084-4.882c0-.783-.037-1.551-.11-2.301a7.75 7.75 0 00-1.245-3.49c-.42-.627-.916-1.183-1.475-1.666-.559-.482-1.181-.881-1.857-1.189-.674-.309-1.4-.529-2.166-.656a11.79 11.79 0 00-2.271-.218c-.65 0-1.293.037-1.925.111a8.007 8.007 0 00-3.614 1.298 7.558 7.558 0 00-1.628 1.427 7.235 7.235 0 00-1.163 1.828 8.483 8.483 0 00-.678 2.154 11.31 11.31 0 00-.213 2.219c0 .657.036 1.305.108 1.939a8.007 8.007 0 001.245 3.49c.42.627.916 1.183 1.475 1.666.559.482 1.181.881 1.857 1.189.674.309 1.4.529 2.166.656a11.79 11.79 0 002.271.218c.65 0 1.293-.037 1.925-.111a8.007 8.007 0 003.614-1.298 7.558 7.558 0 001.628-1.427 7.235 7.235 0 001.163-1.828 8.483 8.483 0 00.678-2.154c.14-.719.213-1.46.213-2.219z"/>
              </svg>
              Skype Username
            </label>
            <DebouncedInput placeholder="live:username or skype_id" value={data.skype?.username || ''} onChange={(v) => updateNested('skype', 'username', v)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 ml-1">Action Type</label>
            <select
              className="w-full p-4 rounded-xl custom-input text-gray-700 text-sm font-medium appearance-none"
              value={data.skype?.type || 'chat'}
              onChange={(e) => updateNested('skype', 'type', e.target.value)}
            >
              <option value="chat">Start Chat</option>
              <option value="call">Start Call</option>
            </select>
          </div>
        </InputWrapper>
      );

    case 'facetime':
      return (
        <InputWrapper>
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100 mb-2">
            <h4 className="text-green-900 font-semibold text-sm flex items-center gap-2 mb-1">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#32D74B">
                <path d="M16.25 3.25a1.5 1.5 0 0 1 1.5 1.5v14.5a1.5 1.5 0 0 1-1.5 1.5H4.75a1.5 1.5 0 0 1-1.5-1.5V4.75a1.5 1.5 0 0 1 1.5-1.5h11.5zm4.5 3.25v11l-3-2.5v-6l3-2.5z"/>
              </svg>
              FaceTime (Apple)
            </h4>
            <p className="text-xs text-green-700">Works only on Apple devices (iPhone, iPad, Mac).</p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 ml-1">Phone or Email *</label>
            <DebouncedInput placeholder="+1234567890 or email@icloud.com" value={data.facetime?.contact || ''} onChange={(v) => updateNested('facetime', 'contact', v)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 ml-1">Call Type</label>
            <select
              className="w-full p-4 rounded-xl custom-input text-gray-700 text-sm font-medium appearance-none"
              value={data.facetime?.type || 'video'}
              onChange={(e) => updateNested('facetime', 'type', e.target.value)}
            >
              <option value="video">Video Call</option>
              <option value="audio">Audio Call</option>
            </select>
          </div>
        </InputWrapper>
      );

    case 'googlemeet':
      return (
        <InputWrapper>
          <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-xl border border-blue-100 mb-2">
            <h4 className="text-blue-900 font-semibold text-sm flex items-center gap-2 mb-1">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#00832D" d="M12 11.5v3h3.5L12 18V14.5H8.5L12 11z"/>
                <path fill="#0066DA" d="M12 7l3.5 3.5h-3.5V7z"/>
                <path fill="#E94235" d="M8.5 10.5L12 7v3.5H8.5z"/>
                <path fill="#2684FC" d="M15.5 10.5L12 14.5V11h3.5v-.5z"/>
                <path fill="#00AC47" d="M12 14.5l-3.5 3.5H12v-3.5z"/>
                <path fill="#FFBA00" d="M8.5 14.5l3.5 3.5h-3.5v-3.5z"/>
              </svg>
              Google Meet
            </h4>
            <p className="text-xs text-blue-700">Create a QR to join a Google Meet directly.</p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 ml-1">Meeting Code *</label>
            <DebouncedInput placeholder="abc-defg-hij" value={data.googlemeet?.meetingCode || ''} onChange={(v) => updateNested('googlemeet', 'meetingCode', v.replace(/\s/g, ''))} />
          </div>
          <p className="text-xs text-gray-400 px-1">
            Enter the meeting code from your Google Meet link.
          </p>
        </InputWrapper>
      );

    case 'googlereview':
      return (
        <InputWrapper>
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-xl border border-yellow-100 mb-2">
            <h4 className="text-yellow-900 font-semibold text-sm flex items-center gap-2 mb-1">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#FBBC04">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
              </svg>
              Google Review
            </h4>
            <p className="text-xs text-yellow-700">Get more reviews by sharing this QR with customers.</p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 ml-1">Google Place ID *</label>
            <DebouncedInput placeholder="ChIJN1t_tDeuEmsRUsoyG83frY4" value={data.googlereview?.placeId || ''} onChange={(v) => updateNested('googlereview', 'placeId', v)} />
          </div>
          <DebouncedInput placeholder="Business Name (for reference)" value={data.googlereview?.businessName || ''} onChange={(v) => updateNested('googlereview', 'businessName', v)} />
          <p className="text-xs text-gray-400 px-1">
            Find your Place ID at: <a href="https://developers.google.com/maps/documentation/places/web-service/place-id" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">Google Place ID Finder</a>
          </p>
        </InputWrapper>
      );

    case 'pdf':
      return (
        <InputWrapper>
          <div className="bg-gradient-to-r from-red-50 to-orange-50 p-4 rounded-xl border border-red-100 mb-2">
            <h4 className="text-red-900 font-semibold text-sm flex items-center gap-2 mb-1">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#FF0000">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13H10v4H8.5v-4zm5.5 0h1.5v4H14v-4zm-3.5 0H12v.5h-1v1h1V15h-1v1.5h-.5V13z"/>
              </svg>
              PDF / File
            </h4>
            <p className="text-xs text-red-700">Share documents, PDFs, or any file via direct link.</p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 ml-1">File URL *</label>
            <DebouncedInput placeholder="https://example.com/document.pdf" value={data.pdf?.url || ''} onChange={(v) => updateNested('pdf', 'url', v)} />
          </div>
          <DebouncedInput placeholder="Document Title (optional)" value={data.pdf?.title || ''} onChange={(v) => updateNested('pdf', 'title', v)} />
        </InputWrapper>
      );

    case 'menu':
      return (
        <InputWrapper>
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-4 rounded-xl border border-amber-100 mb-2">
            <h4 className="text-amber-900 font-semibold text-sm flex items-center gap-2 mb-1">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#D97706">
                <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/>
              </svg>
              Restaurant Menu
            </h4>
            <p className="text-xs text-amber-700">Perfect for restaurants, cafes, and food businesses.</p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 ml-1">Menu URL *</label>
            <DebouncedInput placeholder="https://yourmenu.com/menu.pdf" value={data.menu?.url || ''} onChange={(v) => updateNested('menu', 'url', v)} />
          </div>
          <DebouncedInput placeholder="Restaurant Name (optional)" value={data.menu?.restaurantName || ''} onChange={(v) => updateNested('menu', 'restaurantName', v)} />
        </InputWrapper>
      );

    default:
      return <InputWrapper><DebouncedInput placeholder="Enter Value" value={data.value} onChange={(v) => update('value', v)} /></InputWrapper>;
  }
};