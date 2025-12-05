
import React, { useState } from 'react';
import { QRType, QRContentData, QRStyleConfig } from './types';
import { QRTabs } from './components/QRTabs';
import { QRInputs } from './components/QRInputs';
import { QRStyling } from './components/QRStyling';
import { QRStylePanel } from './components/QRStylePanel';
import { QRPreview } from './components/QRPreview';
import { generatePayload, encryptPayload } from './services/qrUtils';
import { LayoutGrid, Lock } from 'lucide-react';

const INITIAL_STYLE: QRStyleConfig = {
  size: 1000, // Default to HD
  padding: 20,
  errorCorrectionLevel: 'M',
  fgColor: '#000000',
  bgColor: '#ffffff',
  isGradient: false,
  gradientType: 'linear',
  fgColor2: '#2563eb',
  gradientRotation: 45,
  bgTransparent: false,
  customCornerColor: false,
  cornerSquareColor: '#000000',
  cornerDotColor: '#000000',
  dotsType: 'uniform-pills', 
  cornerSquareType: 'three-sided',
  cornerDotType: 'square',
  logoImage: null,
  logoSize: 0.25,
  logoPadding: 0,
  logoBackground: 'transparent'
};

const INITIAL_CONTENT: QRContentData = {
  type: 'text',
  value: 'Welcome to Nexus QR'
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<QRType>('text');
  const [contentData, setContentData] = useState<QRContentData>(INITIAL_CONTENT);
  const [styleConfig, setStyleConfig] = useState<QRStyleConfig>(INITIAL_STYLE);
  
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState('');

  const handleTabChange = (type: QRType) => {
    setActiveTab(type);
    setContentData({ ...contentData, type });
  };

  const getPayload = () => {
    let raw = generatePayload(contentData);
    if (isEncrypted && encryptionKey) {
       raw = `ENCRYPTED:AES:${encryptPayload(raw, encryptionKey, 'AES')}`;
    }
    return raw;
  };

  const isBulk = contentData.type === 'bulk';

  return (
    <div className="max-w-[1000px] mx-auto pt-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8 px-4">
         <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white shadow-lg shadow-gray-300">
            <LayoutGrid size={20} />
         </div>
         <div>
            <h1 className="text-xl font-bold text-gray-800">Nexus QR</h1>
            <p className="text-xs text-gray-500 font-medium">Professional AI Generator</p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 px-2 md:px-4">
        
        {/* Left Column: Input & Styling */}
        <div className="md:col-span-7 space-y-6">
          <div className="bg-white rounded-[24px] shadow-card p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
               <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center">
                  <LayoutGrid size={14} />
               </div>
               <h2 className="text-sm font-semibold text-gray-800">Pick a Content Type</h2>
            </div>
            
            <QRTabs activeTab={activeTab} onChange={handleTabChange} />
            
            <div className="min-h-[150px]">
               <QRInputs type={activeTab} data={contentData} onChange={setContentData} />
            </div>
            
            {/* Encryption Toggle */}
            <div className="mt-6 pt-6 border-t border-gray-100">
               <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                     <Lock size={14} className={isEncrypted ? "text-green-600" : "text-gray-400"} /> 
                     Password Protection
                  </h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={isEncrypted} onChange={e => setIsEncrypted(e.target.checked)} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                  </label>
               </div>
               
               {isEncrypted && (
                   <input 
                      type="password" 
                      placeholder="Enter Password" 
                      value={encryptionKey}
                      onChange={e => setEncryptionKey(e.target.value)}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400 transition-colors"
                   />
               )}
            </div>

            {/* Replaced QRStyling with QRStylePanel which contains the new features */}
            <QRStylePanel config={styleConfig} onChange={setStyleConfig} />
          </div>
        </div>

        {/* Right Column: Preview (Sticky on Desktop) */}
        <div className="md:col-span-5 relative">
           <div className="sticky top-6">
              <QRPreview 
                 data={getPayload()} 
                 config={styleConfig} 
                 bulkItems={isBulk ? contentData.bulk?.items : undefined}
                 onConfigChange={setStyleConfig}
              />
              
              <div className="mt-6 text-center text-xs text-gray-400 font-medium">
                 Generated securely on your device.
                 <br/>No data is stored on our servers.
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default App;
