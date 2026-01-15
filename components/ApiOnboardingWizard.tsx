'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Circle,
  Key,
  Code,
  Zap,
  Rocket,
  Shield,
  Copy,
  Terminal,
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  User,
  Mail,
  Building,
  Globe,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink,
  BookOpen,
  MessageSquare,
  Github,
  ArrowRight,
  Sparkles,
  Target,
  Clock,
  Award,
  HelpCircle,
  AlertCircle,
  Info,
  Download,
  FileCode,
  Cpu,
  Database,
  Link,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { generateApiKey as generateApiKeyService } from '../services/apiService';

interface ApiOnboardingWizardProps {
  onBack: () => void;
  onComplete?: () => void;
}

interface Step {
  id: number;
  title: string;
  description: string;
  icon: React.ElementType;
  isCompleted: boolean;
}

interface SDKOption {
  id: string;
  name: string;
  icon: string;
  color: string;
  installCommand: string;
  importCode: string;
}

export default function ApiOnboardingWizard({ onBack, onComplete }: ApiOnboardingWizardProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Form states
  const [accountForm, setAccountForm] = useState({
    name: '',
    email: '',
    company: '',
    useCase: 'web-app',
    agreeTerms: false
  });

  const [apiKeyName, setApiKeyName] = useState('My First API Key');
  const [generatedApiKey, setGeneratedApiKey] = useState('');
  const [selectedSDK, setSelectedSDK] = useState<string>('nodejs');
  const [selectedEnvironment, setSelectedEnvironment] = useState<'sandbox' | 'production'>('sandbox');

  // Steps configuration
  const [steps, setSteps] = useState<Step[]>([
    { id: 1, title: 'Account Setup', description: 'Set up your developer account', icon: User, isCompleted: false },
    { id: 2, title: 'API Key', description: 'Generate your first API key', icon: Key, isCompleted: false },
    { id: 3, title: 'Choose SDK', description: 'Select your preferred SDK', icon: Code, isCompleted: false },
    { id: 4, title: 'First Request', description: 'Make your first API call', icon: Zap, isCompleted: false },
    { id: 5, title: 'Verify & Launch', description: 'Verify integration and go live', icon: Rocket, isCompleted: false }
  ]);

  // SDK options
  const sdkOptions: SDKOption[] = [
    {
      id: 'nodejs',
      name: 'Node.js',
      icon: '⬢',
      color: 'from-green-500 to-emerald-600',
      installCommand: 'npm install @nexusqr/sdk',
      importCode: "const NexusQR = require('@nexusqr/sdk');"
    },
    {
      id: 'python',
      name: 'Python',
      icon: '🐍',
      color: 'from-blue-500 to-indigo-600',
      installCommand: 'pip install nexusqr',
      importCode: 'from nexusqr import NexusQRClient'
    },
    {
      id: 'php',
      name: 'PHP',
      icon: '🐘',
      color: 'from-purple-500 to-violet-600',
      installCommand: 'composer require nexusqr/nexusqr-php',
      importCode: "use NexusQR\\Client;"
    },
    {
      id: 'go',
      name: 'Go',
      icon: '🔷',
      color: 'from-cyan-500 to-blue-600',
      installCommand: 'go get github.com/nexusqr/nexusqr-go',
      importCode: 'import "github.com/nexusqr/nexusqr-go"'
    },
    {
      id: 'curl',
      name: 'cURL',
      icon: '📟',
      color: 'from-slate-500 to-slate-600',
      installCommand: '# No installation required',
      importCode: '# Direct HTTP requests'
    }
  ];

  // Use case options
  const useCaseOptions = [
    { id: 'web-app', label: 'Web Application', icon: Globe },
    { id: 'mobile-app', label: 'Mobile App', icon: Cpu },
    { id: 'marketing', label: 'Marketing Campaigns', icon: Target },
    { id: 'inventory', label: 'Inventory Management', icon: Database },
    { id: 'other', label: 'Other', icon: HelpCircle }
  ];

  // Copy to clipboard
  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  // Generate API key using real service
  const generateApiKey = async () => {
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      const tier = selectedEnvironment === 'sandbox' ? 'free' : 'starter';
      const result = await generateApiKeyService(user.id, apiKeyName, tier);

      if (result) {
        setGeneratedApiKey(result.key);
        markStepCompleted(2);
      } else {
        console.error('Failed to generate API key');
      }
    } catch (error) {
      console.error('Error generating API key:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mark step as completed
  const markStepCompleted = (stepId: number) => {
    setSteps(prev => prev.map(step =>
      step.id === stepId ? { ...step, isCompleted: true } : step
    ));
  };

  // Handle account form submission
  const handleAccountSubmit = () => {
    if (accountForm.name && accountForm.email && accountForm.agreeTerms) {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        markStepCompleted(1);
        setCurrentStep(2);
      }, 1000);
    }
  };

  // Run test request
  const runTestRequest = () => {
    setTestResult('loading');
    setTimeout(() => {
      setTestResult('success');
      markStepCompleted(4);
    }, 2000);
  };

  // Get code example for selected SDK
  const getCodeExample = () => {
    const sdk = sdkOptions.find(s => s.id === selectedSDK);

    switch (selectedSDK) {
      case 'nodejs':
        return `const NexusQR = require('@nexusqr/sdk');

// Initialize client with your API key
const client = new NexusQR({
  apiKey: '${generatedApiKey || 'YOUR_API_KEY'}',
  environment: '${selectedEnvironment}'
});

// Create your first QR code
async function createQRCode() {
  try {
    const qr = await client.qrCodes.create({
      content: 'https://example.com',
      type: 'url',
      size: 300,
      color: '#000000',
      errorCorrection: 'M'
    });

    console.log('QR Code created!');
    console.log('ID:', qr.id);
    console.log('Short URL:', qr.shortUrl);
    console.log('Image:', qr.imageUrl);

    return qr;
  } catch (error) {
    console.error('Error:', error.message);
  }
}

createQRCode();`;

      case 'python':
        return `from nexusqr import NexusQRClient

# Initialize client with your API key
client = NexusQRClient(
    api_key="${generatedApiKey || 'YOUR_API_KEY'}",
    environment="${selectedEnvironment}"
)

# Create your first QR code
def create_qr_code():
    try:
        qr = client.qr_codes.create(
            content="https://example.com",
            type="url",
            size=300,
            color="#000000",
            error_correction="M"
        )

        print("QR Code created!")
        print(f"ID: {qr.id}")
        print(f"Short URL: {qr.short_url}")
        print(f"Image: {qr.image_url}")

        return qr
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    create_qr_code()`;

      case 'php':
        return `<?php
require 'vendor/autoload.php';

use NexusQR\\Client;

// Initialize client with your API key
$client = new Client([
    'api_key' => '${generatedApiKey || 'YOUR_API_KEY'}',
    'environment' => '${selectedEnvironment}'
]);

// Create your first QR code
try {
    $qr = $client->qrCodes->create([
        'content' => 'https://example.com',
        'type' => 'url',
        'size' => 300,
        'color' => '#000000',
        'error_correction' => 'M'
    ]);

    echo "QR Code created!\\n";
    echo "ID: " . $qr->id . "\\n";
    echo "Short URL: " . $qr->shortUrl . "\\n";
    echo "Image: " . $qr->imageUrl . "\\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}`;

      case 'go':
        return `package main

import (
    "fmt"
    "log"

    nexusqr "github.com/nexusqr/nexusqr-go"
)

func main() {
    // Initialize client with your API key
    client := nexusqr.NewClient(&nexusqr.Config{
        APIKey:      "${generatedApiKey || 'YOUR_API_KEY'}",
        Environment: "${selectedEnvironment}",
    })

    // Create your first QR code
    qr, err := client.QRCodes.Create(&nexusqr.CreateQRRequest{
        Content:         "https://example.com",
        Type:            "url",
        Size:            300,
        Color:           "#000000",
        ErrorCorrection: "M",
    })

    if err != nil {
        log.Fatal("Error:", err)
    }

    fmt.Println("QR Code created!")
    fmt.Printf("ID: %s\\n", qr.ID)
    fmt.Printf("Short URL: %s\\n", qr.ShortURL)
    fmt.Printf("Image: %s\\n", qr.ImageURL)
}`;

      case 'curl':
        return `# Create your first QR code with cURL
curl -X POST "https://api.nexusqr.com/v1/qr-codes" \\
  -H "Authorization: Bearer ${generatedApiKey || 'YOUR_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "https://example.com",
    "type": "url",
    "size": 300,
    "color": "#000000",
    "error_correction": "M"
  }'

# Response:
# {
#   "success": true,
#   "data": {
#     "id": "qr_abc123",
#     "content": "https://example.com",
#     "short_url": "https://nxqr.io/abc123",
#     "image_url": "https://cdn.nexusqr.com/qr/abc123.png",
#     "created_at": "2024-01-15T10:30:00Z"
#   }
# }`;

      default:
        return '';
    }
  };

  // Calculate progress
  const completedSteps = steps.filter(s => s.isCompleted).length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome to NexusQR</h2>
              <p className="text-sm text-gray-500">Let's set up your developer account in just a few steps.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={accountForm.name}
                    onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                    placeholder="John Doe"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-0 rounded-full text-sm focus:ring-2 focus:ring-[#E5FF00] focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={accountForm.email}
                    onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                    placeholder="john@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-0 rounded-full text-sm focus:ring-2 focus:ring-[#E5FF00] focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Company / Organization</label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={accountForm.company}
                  onChange={(e) => setAccountForm({ ...accountForm, company: e.target.value })}
                  placeholder="Acme Inc. (optional)"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-0 rounded-full text-sm focus:ring-2 focus:ring-[#E5FF00] focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-3">Primary Use Case</label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {useCaseOptions.map(option => (
                  <button
                    key={option.id}
                    onClick={() => setAccountForm({ ...accountForm, useCase: option.id })}
                    className={`p-3 rounded-[16px] transition-all flex flex-col items-center gap-2 ${
                      accountForm.useCase === option.id
                        ? 'bg-[#E5FF00] shadow-sm'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <option.icon className={`w-5 h-5 ${accountForm.useCase === option.id ? 'text-gray-900' : 'text-gray-500'}`} />
                    <span className={`text-xs text-center ${accountForm.useCase === option.id ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-[16px] cursor-pointer">
              <input
                type="checkbox"
                checked={accountForm.agreeTerms}
                onChange={(e) => setAccountForm({ ...accountForm, agreeTerms: e.target.checked })}
                className="mt-1 w-4 h-4 rounded border-gray-300 bg-white text-[#E5FF00] focus:ring-[#E5FF00]"
              />
              <div className="text-sm">
                <span className="text-gray-700">
                  I agree to the{' '}
                  <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>
                  {' '}and{' '}
                  <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
                </span>
                <p className="text-gray-500 text-xs mt-1">
                  You'll receive API updates and important security notifications.
                </p>
              </div>
            </label>

            <button
              onClick={handleAccountSubmit}
              disabled={!accountForm.name || !accountForm.email || !accountForm.agreeTerms || isLoading}
              className="w-full py-3 bg-[#E5FF00] hover:bg-[#d4ee00] disabled:opacity-50 disabled:cursor-not-allowed rounded-full font-semibold text-gray-900 flex items-center justify-center gap-2 transition-all text-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Key className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Generate Your API Key</h2>
              <p className="text-sm text-gray-500">Your API key is your secret credential for authentication.</p>
            </div>

            {/* Environment Selection */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-3">Select Environment</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setSelectedEnvironment('sandbox')}
                  className={`p-4 rounded-[16px] transition-all ${
                    selectedEnvironment === 'sandbox'
                      ? 'bg-green-50 ring-2 ring-green-500'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Shield className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-900 text-sm">Sandbox</div>
                      <div className="text-xs text-gray-500">For testing & development</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 text-left">
                    • No real charges • Test data only • Unlimited requests
                  </div>
                </button>

                <button
                  onClick={() => setSelectedEnvironment('production')}
                  className={`p-4 rounded-[16px] transition-all ${
                    selectedEnvironment === 'production'
                      ? 'bg-red-50 ring-2 ring-red-500'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <Rocket className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-900 text-sm">Production</div>
                      <div className="text-xs text-gray-500">For live applications</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 text-left">
                    • Real QR codes • Analytics • Usage limits apply
                  </div>
                </button>
              </div>
            </div>

            {/* Key Name */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">API Key Name</label>
              <input
                type="text"
                value={apiKeyName}
                onChange={(e) => setApiKeyName(e.target.value)}
                placeholder="My First API Key"
                className="w-full px-4 py-2.5 bg-gray-100 border-0 rounded-full text-sm focus:ring-2 focus:ring-[#E5FF00] focus:bg-white transition-all"
              />
              <p className="text-xs text-gray-500 mt-1">A friendly name to identify this key later.</p>
            </div>

            {/* Generated Key Display */}
            {generatedApiKey ? (
              <div className="bg-gray-900 rounded-[16px] p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    API Key Generated Successfully
                  </span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    selectedEnvironment === 'sandbox'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {selectedEnvironment.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={generatedApiKey}
                      readOnly
                      className="w-full px-4 py-3 bg-gray-800 border-0 rounded-full font-mono text-sm text-white pr-20"
                    />
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-12 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-700 rounded-full"
                    >
                      {showApiKey ? (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    <button
                      onClick={() => copyToClipboard(generatedApiKey, 'apikey')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-700 rounded-full"
                    >
                      {copied === 'apikey' ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-amber-500/10 rounded-[12px] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-200">
                    <strong>Important:</strong> Save this key now. You won't be able to see it again!
                    Store it securely in your environment variables.
                  </p>
                </div>
              </div>
            ) : (
              <button
                onClick={generateApiKey}
                disabled={isLoading}
                className="w-full py-3 bg-[#E5FF00] hover:bg-[#d4ee00] disabled:opacity-50 rounded-full font-semibold text-gray-900 flex items-center justify-center gap-2 transition-all text-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Key...
                  </>
                ) : (
                  <>
                    <Key className="w-5 h-5" />
                    Generate API Key
                  </>
                )}
              </button>
            )}

            {generatedApiKey && (
              <button
                onClick={() => setCurrentStep(3)}
                className="w-full py-3 bg-[#E5FF00] hover:bg-[#d4ee00] rounded-full font-semibold text-gray-900 flex items-center justify-center gap-2 transition-all text-sm"
              >
                Continue to SDK Setup
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Code className="w-8 h-8 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Choose Your SDK</h2>
              <p className="text-sm text-gray-500">Select your preferred programming language or tool.</p>
            </div>

            {/* SDK Selection */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {sdkOptions.map(sdk => (
                <button
                  key={sdk.id}
                  onClick={() => {
                    setSelectedSDK(sdk.id);
                    markStepCompleted(3);
                  }}
                  className={`p-4 rounded-[16px] transition-all ${
                    selectedSDK === sdk.id
                      ? 'bg-[#E5FF00] shadow-sm'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <div className="text-2xl mb-2">{sdk.icon}</div>
                  <div className={`font-semibold text-sm ${selectedSDK === sdk.id ? 'text-gray-900' : 'text-gray-700'}`}>{sdk.name}</div>
                </button>
              ))}
            </div>

            {/* Installation Command */}
            {selectedSDK && (
              <div className="space-y-4">
                <div className="bg-gray-900 rounded-[16px] overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
                    <span className="text-sm font-medium text-white">Installation</span>
                    <button
                      onClick={() => copyToClipboard(
                        sdkOptions.find(s => s.id === selectedSDK)?.installCommand || '',
                        'install'
                      )}
                      className="p-1.5 hover:bg-gray-700 rounded-full"
                    >
                      {copied === 'install' ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <pre className="p-4 text-sm font-mono text-green-400 overflow-x-auto">
                    {sdkOptions.find(s => s.id === selectedSDK)?.installCommand}
                  </pre>
                </div>

                <button
                  onClick={() => setCurrentStep(4)}
                  className="w-full py-3 bg-[#E5FF00] hover:bg-[#d4ee00] rounded-full font-semibold text-gray-900 flex items-center justify-center gap-2 transition-all text-sm"
                >
                  Continue to First Request
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Make Your First Request</h2>
              <p className="text-sm text-gray-500">Let's create your first QR code with the API.</p>
            </div>

            {/* Code Example */}
            <div className="bg-gray-900 rounded-[16px] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{sdkOptions.find(s => s.id === selectedSDK)?.icon}</span>
                  <span className="text-sm font-medium text-white">{sdkOptions.find(s => s.id === selectedSDK)?.name}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(getCodeExample(), 'code')}
                  className="p-1.5 hover:bg-gray-700 rounded-full flex items-center gap-1"
                >
                  {copied === 'code' ? (
                    <>
                      <Check className="w-4 h-4 text-green-400" />
                      <span className="text-xs text-green-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-400">Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 text-sm font-mono text-gray-300 overflow-x-auto max-h-80">
                <code>{getCodeExample()}</code>
              </pre>
            </div>

            {/* Test Request */}
            <div className="bg-gray-50 rounded-[16px] p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-sm">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Play className="w-4 h-4 text-emerald-600" />
                </div>
                Test Your Integration
              </h3>

              <p className="text-xs text-gray-500 mb-4">
                Click the button below to simulate an API request and verify everything is working.
              </p>

              <button
                onClick={runTestRequest}
                disabled={testResult === 'loading'}
                className={`w-full py-3 rounded-full font-semibold flex items-center justify-center gap-2 transition-all text-sm ${
                  testResult === 'success'
                    ? 'bg-green-500 text-white cursor-default'
                    : 'bg-[#E5FF00] hover:bg-[#d4ee00] text-gray-900'
                }`}
              >
                {testResult === 'loading' && (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Testing...
                  </>
                )}
                {testResult === 'idle' && (
                  <>
                    <Play className="w-5 h-5" />
                    Run Test Request
                  </>
                )}
                {testResult === 'success' && (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Test Passed!
                  </>
                )}
                {testResult === 'error' && (
                  <>
                    <XCircle className="w-5 h-5" />
                    Test Failed
                  </>
                )}
              </button>

              {testResult === 'success' && (
                <div className="mt-4 p-4 bg-green-50 rounded-[12px]">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-green-700 text-sm">Connection Successful!</div>
                      <div className="text-xs text-green-600 mt-1">
                        Your API key is valid and working. A test QR code was created successfully.
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        Response time: 142ms | Status: 201 Created
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {testResult === 'success' && (
              <button
                onClick={() => {
                  markStepCompleted(4);
                  setCurrentStep(5);
                }}
                className="w-full py-3 bg-[#E5FF00] hover:bg-[#d4ee00] rounded-full font-semibold text-gray-900 flex items-center justify-center gap-2 transition-all text-sm"
              >
                Continue to Launch
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">You're All Set!</h2>
              <p className="text-sm text-gray-500">Congratulations! Your NexusQR integration is ready.</p>
            </div>

            {/* Completion Summary */}
            <div className="bg-green-50 rounded-[16px] p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="font-bold text-gray-900">Onboarding Complete</div>
                  <div className="text-xs text-gray-500">All {steps.length} steps completed successfully</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-white rounded-[12px] p-3 shadow-sm">
                  <div className="text-xs text-gray-500">Environment</div>
                  <div className="font-semibold text-gray-900 capitalize text-sm">{selectedEnvironment}</div>
                </div>
                <div className="bg-white rounded-[12px] p-3 shadow-sm">
                  <div className="text-xs text-gray-500">SDK</div>
                  <div className="font-semibold text-gray-900 text-sm">{sdkOptions.find(s => s.id === selectedSDK)?.name}</div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
              <a
                href="#"
                className="p-4 bg-gray-50 hover:bg-gray-100 rounded-[16px] transition-colors flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-sm">API Documentation</div>
                  <div className="text-xs text-gray-500">Explore all endpoints</div>
                </div>
              </a>

              <a
                href="#"
                className="p-4 bg-gray-50 hover:bg-gray-100 rounded-[16px] transition-colors flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Github className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-sm">SDK Examples</div>
                  <div className="text-xs text-gray-500">GitHub repositories</div>
                </div>
              </a>

              <a
                href="#"
                className="p-4 bg-gray-50 hover:bg-gray-100 rounded-[16px] transition-colors flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-sm">Developer Community</div>
                  <div className="text-xs text-gray-500">Get help from others</div>
                </div>
              </a>

              <a
                href="#"
                className="p-4 bg-gray-50 hover:bg-gray-100 rounded-[16px] transition-colors flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <Download className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-sm">Postman Collection</div>
                  <div className="text-xs text-gray-500">Download & test</div>
                </div>
              </a>
            </div>

            {/* Next Steps */}
            <div className="bg-gray-50 rounded-[16px] p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-sm">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-emerald-600" />
                </div>
                Recommended Next Steps
              </h3>

              <div className="space-y-3">
                {[
                  { icon: Shield, text: 'Set up webhook endpoints for real-time notifications' },
                  { icon: Target, text: 'Configure custom domains for branded short URLs' },
                  { icon: Database, text: 'Explore analytics API to track QR code performance' },
                  { icon: Lock, text: 'Review rate limits and upgrade plan if needed' }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-[12px] hover:bg-gray-100 transition-colors cursor-pointer shadow-sm">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-gray-600" />
                    </div>
                    <span className="text-xs text-gray-700">{item.text}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                markStepCompleted(5);
                if (onComplete) {
                  onComplete();
                } else {
                  onBack();
                }
              }}
              className="w-full py-3 bg-[#E5FF00] hover:bg-[#d4ee00] rounded-full font-semibold text-gray-900 flex items-center justify-center gap-2 transition-all text-sm"
            >
              <Rocket className="w-5 h-5" />
              Go to Dashboard
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F0F0] text-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-[20px] shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="w-10 h-10 bg-[#F0F0F0] rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Rocket className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h1 className="text-sm font-semibold text-gray-900">Getting Started</h1>
                  <p className="text-xs text-gray-500">Complete the setup wizard</p>
                </div>
              </div>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#E5FF00] text-gray-900 rounded-full hover:bg-[#d4ee00] transition-colors text-xs font-medium">
              <div className="w-6 h-6 bg-gray-900/10 rounded-full flex items-center justify-center">
                <HelpCircle className="w-3 h-3" />
              </div>
              Need Help?
            </button>
          </div>
        </div>

        {/* Progress Header */}
        <div className="bg-white rounded-[20px] shadow-sm p-5 mb-6">
          {/* Progress Bar */}
          <div className="relative mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-900">Onboarding Progress</span>
              <span className="text-xs text-gray-500">{completedSteps} of {steps.length} steps</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#E5FF00] transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Step Indicators */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => step.isCompleted && setCurrentStep(step.id)}
                  disabled={!step.isCompleted && step.id !== currentStep}
                  className={`flex flex-col items-center gap-2 transition-all ${
                    step.isCompleted ? 'cursor-pointer' : step.id === currentStep ? 'cursor-default' : 'cursor-not-allowed opacity-50'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      step.isCompleted
                        ? 'bg-green-500'
                        : step.id === currentStep
                        ? 'bg-[#E5FF00] ring-4 ring-[#E5FF00]/30'
                        : 'bg-gray-100'
                    }`}
                  >
                    {step.isCompleted ? (
                      <Check className="w-5 h-5 text-white" />
                    ) : (
                      <step.icon className={`w-5 h-5 ${step.id === currentStep ? 'text-gray-900' : 'text-gray-400'}`} />
                    )}
                  </div>
                  <div className="text-center">
                    <div className={`text-xs font-medium ${step.id === currentStep ? 'text-gray-900' : 'text-gray-400'}`}>
                      {step.title}
                    </div>
                  </div>
                </button>

                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    steps[index + 1].isCompleted || step.isCompleted ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-[20px] shadow-sm p-8">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        {currentStep > 1 && (
          <div className="mt-4 flex justify-start">
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to {steps[currentStep - 2]?.title}
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 bg-gray-900 rounded-[20px] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-white font-medium">Need help with setup?</p>
                <p className="text-xs text-gray-400">Our team is here to assist you</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a href="#" className="px-3 py-1.5 bg-white/10 text-white rounded-full text-xs hover:bg-white/20 transition-colors">
                Contact Support
              </a>
              <a href="#" className="px-3 py-1.5 bg-[#E5FF00] text-gray-900 rounded-full text-xs hover:bg-[#d4ee00] transition-colors font-medium">
                Read the Docs
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
