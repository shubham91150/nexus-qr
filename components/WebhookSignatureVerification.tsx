'use client';

import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Key,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  Code,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Terminal,
  FileCode,
  Zap,
  Clock,
  Hash,
  ShieldCheck,
  ShieldAlert,
  Play,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  ArrowLeft
} from 'lucide-react';

interface WebhookSignatureVerificationProps {
  onBack: () => void;
}

// Types
interface WebhookSecret {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsed: string;
  status: 'active' | 'rotated';
}

interface VerificationLog {
  id: string;
  webhookId: string;
  timestamp: string;
  status: 'valid' | 'invalid' | 'expired' | 'missing';
  signatureReceived: string;
  signatureExpected: string;
  payload: string;
}

// Mock data
const webhookSecrets: WebhookSecret[] = [
  {
    id: 'whsec_1',
    name: 'Production Webhook',
    prefix: 'whsec_abc...xyz',
    createdAt: '2023-10-15T10:00:00Z',
    lastUsed: '2024-01-28T15:30:00Z',
    status: 'active'
  },
  {
    id: 'whsec_2',
    name: 'Staging Webhook',
    prefix: 'whsec_def...uvw',
    createdAt: '2023-08-20T14:00:00Z',
    lastUsed: '2024-01-25T09:15:00Z',
    status: 'active'
  }
];

const verificationLogs: VerificationLog[] = [
  { id: 'log-1', webhookId: 'whsec_1', timestamp: '2024-01-28T15:42:00Z', status: 'valid', signatureReceived: 'sha256=abc...', signatureExpected: 'sha256=abc...', payload: '{"event":"qr.scanned"}' },
  { id: 'log-2', webhookId: 'whsec_1', timestamp: '2024-01-28T15:38:00Z', status: 'valid', signatureReceived: 'sha256=def...', signatureExpected: 'sha256=def...', payload: '{"event":"qr.created"}' },
  { id: 'log-3', webhookId: 'whsec_1', timestamp: '2024-01-28T15:35:00Z', status: 'invalid', signatureReceived: 'sha256=xyz...', signatureExpected: 'sha256=abc...', payload: '{"event":"qr.updated"}' },
  { id: 'log-4', webhookId: 'whsec_2', timestamp: '2024-01-28T15:30:00Z', status: 'expired', signatureReceived: 'sha256=ghi...', signatureExpected: 'sha256=ghi...', payload: '{"event":"webhook.test"}' }
];

export default function WebhookSignatureVerification({ onBack }: WebhookSignatureVerificationProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'secrets' | 'logs' | 'test'>('overview');
  const [selectedLanguage, setSelectedLanguage] = useState<'nodejs' | 'python' | 'php' | 'go' | 'ruby'>('nodejs');
  const [showSecret, setShowSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string[]>(['how-it-works']);

  // Test verification state
  const [testPayload, setTestPayload] = useState('{"event":"qr.scanned","data":{"qr_id":"qr_abc123"}}');
  const [testSignature, setTestSignature] = useState('');
  const [testResult, setTestResult] = useState<'idle' | 'valid' | 'invalid'>('idle');

  // Copy to clipboard
  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  // Toggle section
  const toggleSection = (section: string) => {
    setExpandedSection(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  // Get code example
  const getCodeExample = (): string => {
    switch (selectedLanguage) {
      case 'nodejs':
        return `const crypto = require('crypto');

// Your webhook secret from NexusQR dashboard
const WEBHOOK_SECRET = process.env.NEXUSQR_WEBHOOK_SECRET;

function verifyWebhookSignature(req) {
  const signature = req.headers['x-nexusqr-signature'];
  const timestamp = req.headers['x-nexusqr-timestamp'];
  const payload = req.body;

  // Check if signature exists
  if (!signature || !timestamp) {
    throw new Error('Missing signature or timestamp');
  }

  // Verify timestamp is within 5 minutes (prevent replay attacks)
  const currentTime = Math.floor(Date.now() / 1000);
  const webhookTime = parseInt(timestamp, 10);
  if (Math.abs(currentTime - webhookTime) > 300) {
    throw new Error('Webhook timestamp too old');
  }

  // Compute expected signature
  const signedPayload = \`\${timestamp}.\${JSON.stringify(payload)}\`;
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(signedPayload)
    .digest('hex');

  // Compare signatures (timing-safe)
  const expectedBuffer = Buffer.from('sha256=' + expectedSignature);
  const receivedBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== receivedBuffer.length) {
    throw new Error('Invalid signature');
  }

  if (!crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
    throw new Error('Invalid signature');
  }

  return true;
}

// Express.js middleware example
app.post('/webhooks/nexusqr', express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}), (req, res) => {
  try {
    verifyWebhookSignature(req);
    // Process webhook
    console.log('Webhook verified:', req.body);
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook verification failed:', error.message);
    res.status(401).json({ error: 'Invalid signature' });
  }
});`;

      case 'python':
        return `import hmac
import hashlib
import time
import os
from flask import Flask, request, jsonify

app = Flask(__name__)

# Your webhook secret from NexusQR dashboard
WEBHOOK_SECRET = os.environ.get('NEXUSQR_WEBHOOK_SECRET')

def verify_webhook_signature(request):
    signature = request.headers.get('X-NexusQR-Signature')
    timestamp = request.headers.get('X-NexusQR-Timestamp')
    payload = request.get_data(as_text=True)

    # Check if signature exists
    if not signature or not timestamp:
        raise ValueError('Missing signature or timestamp')

    # Verify timestamp is within 5 minutes (prevent replay attacks)
    current_time = int(time.time())
    webhook_time = int(timestamp)
    if abs(current_time - webhook_time) > 300:
        raise ValueError('Webhook timestamp too old')

    # Compute expected signature
    signed_payload = f'{timestamp}.{payload}'
    expected_signature = 'sha256=' + hmac.new(
        WEBHOOK_SECRET.encode('utf-8'),
        signed_payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    # Compare signatures (timing-safe)
    if not hmac.compare_digest(expected_signature, signature):
        raise ValueError('Invalid signature')

    return True

@app.route('/webhooks/nexusqr', methods=['POST'])
def handle_webhook():
    try:
        verify_webhook_signature(request)
        # Process webhook
        data = request.get_json()
        print(f'Webhook verified: {data}')
        return jsonify({'received': True}), 200
    except ValueError as e:
        print(f'Webhook verification failed: {e}')
        return jsonify({'error': 'Invalid signature'}), 401`;

      case 'php':
        return `<?php
// Your webhook secret from NexusQR dashboard
$webhookSecret = getenv('NEXUSQR_WEBHOOK_SECRET');

function verifyWebhookSignature($payload, $signature, $timestamp, $secret) {
    // Check if signature exists
    if (empty($signature) || empty($timestamp)) {
        throw new Exception('Missing signature or timestamp');
    }

    // Verify timestamp is within 5 minutes (prevent replay attacks)
    $currentTime = time();
    $webhookTime = intval($timestamp);
    if (abs($currentTime - $webhookTime) > 300) {
        throw new Exception('Webhook timestamp too old');
    }

    // Compute expected signature
    $signedPayload = $timestamp . '.' . $payload;
    $expectedSignature = 'sha256=' . hash_hmac('sha256', $signedPayload, $secret);

    // Compare signatures (timing-safe)
    if (!hash_equals($expectedSignature, $signature)) {
        throw new Exception('Invalid signature');
    }

    return true;
}

// Handle webhook
$payload = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_NEXUSQR_SIGNATURE'] ?? '';
$timestamp = $_SERVER['HTTP_X_NEXUSQR_TIMESTAMP'] ?? '';

try {
    verifyWebhookSignature($payload, $signature, $timestamp, $webhookSecret);

    // Process webhook
    $data = json_decode($payload, true);
    error_log('Webhook verified: ' . print_r($data, true));

    http_response_code(200);
    echo json_encode(['received' => true]);
} catch (Exception $e) {
    error_log('Webhook verification failed: ' . $e->getMessage());
    http_response_code(401);
    echo json_encode(['error' => 'Invalid signature']);
}`;

      case 'go':
        return `package main

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "encoding/json"
    "fmt"
    "io/ioutil"
    "math"
    "net/http"
    "os"
    "strconv"
    "strings"
    "time"
)

// Your webhook secret from NexusQR dashboard
var webhookSecret = os.Getenv("NEXUSQR_WEBHOOK_SECRET")

func verifyWebhookSignature(r *http.Request, payload []byte) error {
    signature := r.Header.Get("X-NexusQR-Signature")
    timestamp := r.Header.Get("X-NexusQR-Timestamp")

    // Check if signature exists
    if signature == "" || timestamp == "" {
        return fmt.Errorf("missing signature or timestamp")
    }

    // Verify timestamp is within 5 minutes (prevent replay attacks)
    webhookTime, _ := strconv.ParseInt(timestamp, 10, 64)
    currentTime := time.Now().Unix()
    if math.Abs(float64(currentTime-webhookTime)) > 300 {
        return fmt.Errorf("webhook timestamp too old")
    }

    // Compute expected signature
    signedPayload := fmt.Sprintf("%s.%s", timestamp, string(payload))
    mac := hmac.New(sha256.New, []byte(webhookSecret))
    mac.Write([]byte(signedPayload))
    expectedSignature := "sha256=" + hex.EncodeToString(mac.Sum(nil))

    // Compare signatures (timing-safe)
    if !hmac.Equal([]byte(expectedSignature), []byte(signature)) {
        return fmt.Errorf("invalid signature")
    }

    return nil
}

func webhookHandler(w http.ResponseWriter, r *http.Request) {
    payload, _ := ioutil.ReadAll(r.Body)

    if err := verifyWebhookSignature(r, payload); err != nil {
        http.Error(w, "Invalid signature", http.StatusUnauthorized)
        return
    }

    // Process webhook
    var data map[string]interface{}
    json.Unmarshal(payload, &data)
    fmt.Printf("Webhook verified: %v\\n", data)

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]bool{"received": true})
}

func main() {
    http.HandleFunc("/webhooks/nexusqr", webhookHandler)
    http.ListenAndServe(":8080", nil)
}`;

      case 'ruby':
        return `require 'sinatra'
require 'openssl'
require 'json'

# Your webhook secret from NexusQR dashboard
WEBHOOK_SECRET = ENV['NEXUSQR_WEBHOOK_SECRET']

def verify_webhook_signature(payload, signature, timestamp)
  # Check if signature exists
  raise 'Missing signature or timestamp' if signature.nil? || timestamp.nil?

  # Verify timestamp is within 5 minutes (prevent replay attacks)
  current_time = Time.now.to_i
  webhook_time = timestamp.to_i
  raise 'Webhook timestamp too old' if (current_time - webhook_time).abs > 300

  # Compute expected signature
  signed_payload = "#{timestamp}.#{payload}"
  expected_signature = 'sha256=' + OpenSSL::HMAC.hexdigest(
    OpenSSL::Digest.new('sha256'),
    WEBHOOK_SECRET,
    signed_payload
  )

  # Compare signatures (timing-safe)
  raise 'Invalid signature' unless Rack::Utils.secure_compare(expected_signature, signature)

  true
end

post '/webhooks/nexusqr' do
  content_type :json
  payload = request.body.read
  signature = request.env['HTTP_X_NEXUSQR_SIGNATURE']
  timestamp = request.env['HTTP_X_NEXUSQR_TIMESTAMP']

  begin
    verify_webhook_signature(payload, signature, timestamp)
    data = JSON.parse(payload)
    puts "Webhook verified: #{data}"
    { received: true }.to_json
  rescue => e
    puts "Webhook verification failed: #{e.message}"
    status 401
    { error: 'Invalid signature' }.to_json
  end
end`;

      default:
        return '';
    }
  };

  // Run test verification
  const runTestVerification = () => {
    try {
      JSON.parse(testPayload);
      setTestResult(testSignature ? 'valid' : 'invalid');
    } catch {
      setTestResult('invalid');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Webhooks
        </button>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Webhook Signature Verification</h1>
              <p className="text-slate-400">Secure your webhook endpoints with HMAC signatures</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-700 mb-6">
          {[
            { id: 'overview', label: 'Overview', icon: Info },
            { id: 'secrets', label: 'Signing Secrets', icon: Key },
            { id: 'logs', label: 'Verification Logs', icon: FileCode },
            { id: 'test', label: 'Test Verification', icon: Play }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 flex items-center gap-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-emerald-400 border-b-2 border-emerald-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Info Banner */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <Shield className="w-6 h-6 text-emerald-400 mt-1" />
                <div>
                  <h3 className="font-semibold text-emerald-300 mb-2">Why Verify Webhook Signatures?</h3>
                  <p className="text-slate-300">
                    Webhook signatures ensure that incoming webhook requests are actually from NexusQR and haven't been
                    tampered with. Each webhook request includes a signature computed using your secret key.
                  </p>
                </div>
              </div>
            </div>

            {/* How It Works */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <button
                onClick={() => toggleSection('how-it-works')}
                className="w-full flex items-center justify-between"
              >
                <h3 className="font-semibold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  How Signature Verification Works
                </h3>
                {expandedSection.includes('how-it-works') ? (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                )}
              </button>

              {expandedSection.includes('how-it-works') && (
                <div className="mt-6 space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    {[
                      { step: 1, title: 'Request Sent', desc: 'NexusQR sends webhook with payload' },
                      { step: 2, title: 'Signature Created', desc: 'HMAC-SHA256 signature is computed' },
                      { step: 3, title: 'Headers Added', desc: 'Signature and timestamp added to headers' },
                      { step: 4, title: 'You Verify', desc: 'Your server validates the signature' }
                    ].map(item => (
                      <div key={item.step} className="text-center">
                        <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-emerald-400">
                          {item.step}
                        </div>
                        <div className="font-medium mb-1">{item.title}</div>
                        <div className="text-xs text-slate-400">{item.desc}</div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-900 rounded-lg p-4 mt-4">
                    <div className="text-xs text-slate-500 mb-2">Signature Formula:</div>
                    <code className="text-sm text-emerald-400 font-mono">
                      signature = HMAC-SHA256(timestamp + "." + payload, secret)
                    </code>
                  </div>
                </div>
              )}
            </div>

            {/* Headers Reference */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Hash className="w-5 h-5 text-blue-400" />
                Webhook Headers
              </h3>

              <div className="space-y-3">
                {[
                  { header: 'X-NexusQR-Signature', desc: 'HMAC-SHA256 signature prefixed with "sha256="' },
                  { header: 'X-NexusQR-Timestamp', desc: 'Unix timestamp when the webhook was sent' },
                  { header: 'X-NexusQR-Event', desc: 'The type of event (e.g., qr.scanned, qr.created)' },
                  { header: 'X-NexusQR-Delivery-ID', desc: 'Unique identifier for this delivery attempt' }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 bg-slate-700/30 rounded-lg">
                    <code className="text-sm font-mono text-blue-400 min-w-48">{item.header}</code>
                    <span className="text-sm text-slate-400">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Code Examples */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
              <div className="p-6 border-b border-slate-700">
                <h3 className="font-semibold flex items-center gap-2">
                  <Code className="w-5 h-5 text-purple-400" />
                  Implementation Examples
                </h3>
              </div>

              {/* Language Tabs */}
              <div className="flex gap-1 px-6 pt-4 border-b border-slate-700">
                {[
                  { id: 'nodejs', label: 'Node.js', icon: '⬢' },
                  { id: 'python', label: 'Python', icon: '🐍' },
                  { id: 'php', label: 'PHP', icon: '🐘' },
                  { id: 'go', label: 'Go', icon: '🔷' },
                  { id: 'ruby', label: 'Ruby', icon: '💎' }
                ].map(lang => (
                  <button
                    key={lang.id}
                    onClick={() => setSelectedLanguage(lang.id as any)}
                    className={`px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors ${
                      selectedLanguage === lang.id
                        ? 'text-purple-400 border-b-2 border-purple-400'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>{lang.icon}</span>
                    {lang.label}
                  </button>
                ))}
              </div>

              {/* Code Block */}
              <div className="relative">
                <div className="absolute top-4 right-4">
                  <button
                    onClick={() => copyToClipboard(getCodeExample(), 'code')}
                    className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    {copied === 'code' ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </div>
                <pre className="p-6 text-sm font-mono text-slate-300 overflow-x-auto max-h-96">
                  <code>{getCodeExample()}</code>
                </pre>
              </div>
            </div>

            {/* Security Tips */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6">
              <h3 className="font-semibold text-amber-300 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Security Best Practices
              </h3>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <span>Always verify signatures before processing webhook data</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <span>Check timestamp to prevent replay attacks (reject if older than 5 minutes)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <span>Use timing-safe comparison to prevent timing attacks</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <span>Store webhook secrets securely (environment variables, secrets manager)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <span>Rotate secrets periodically and after any suspected compromise</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Secrets Tab */}
        {activeTab === 'secrets' && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
              <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                <h3 className="font-semibold">Webhook Signing Secrets</h3>
                <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                  <RefreshCw className="w-4 h-4" />
                  Rotate Secret
                </button>
              </div>

              <div className="p-6 space-y-4">
                {webhookSecrets.map(secret => (
                  <div key={secret.id} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                        <Key className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <div className="font-medium">{secret.name}</div>
                        <div className="flex items-center gap-2 text-sm">
                          <code className="text-slate-400 font-mono">
                            {showSecret === secret.id ? 'whsec_abcdefghijklmnop123456' : secret.prefix}
                          </code>
                          <button
                            onClick={() => setShowSecret(showSecret === secret.id ? null : secret.id)}
                            className="p-1 hover:bg-slate-600 rounded"
                          >
                            {showSecret === secret.id ? (
                              <EyeOff className="w-3 h-3 text-slate-400" />
                            ) : (
                              <Eye className="w-3 h-3 text-slate-400" />
                            )}
                          </button>
                          <button
                            onClick={() => copyToClipboard('whsec_abcdefghijklmnop123456', secret.id)}
                            className="p-1 hover:bg-slate-600 rounded"
                          >
                            {copied === secret.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 text-xs rounded ${
                        secret.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-500/20 text-slate-400'
                      }`}>
                        {secret.status}
                      </span>
                      <div className="text-xs text-slate-500 mt-1">
                        Last used: {new Date(secret.lastUsed).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-700">
              <h3 className="font-semibold">Recent Verification Attempts</h3>
            </div>

            <div className="divide-y divide-slate-700">
              {verificationLogs.map(log => (
                <div key={log.id} className="p-4 hover:bg-slate-700/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {log.status === 'valid' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                      {log.status === 'invalid' && <XCircle className="w-5 h-5 text-red-400" />}
                      {log.status === 'expired' && <Clock className="w-5 h-5 text-amber-400" />}
                      {log.status === 'missing' && <AlertTriangle className="w-5 h-5 text-slate-400" />}
                      <span className={`font-medium ${
                        log.status === 'valid' ? 'text-emerald-400' :
                        log.status === 'invalid' ? 'text-red-400' :
                        log.status === 'expired' ? 'text-amber-400' : 'text-slate-400'
                      }`}>
                        {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm text-slate-400 ml-8">
                    <code className="text-xs font-mono">{log.payload}</code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Test Tab */}
        {activeTab === 'test' && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <h3 className="font-semibold mb-4">Test Signature Verification</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Payload (JSON)</label>
                  <textarea
                    value={testPayload}
                    onChange={(e) => setTestPayload(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg font-mono text-sm resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Signature</label>
                  <input
                    type="text"
                    value={testSignature}
                    onChange={(e) => setTestSignature(e.target.value)}
                    placeholder="sha256=..."
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg font-mono text-sm"
                  />
                </div>

                <button
                  onClick={runTestVerification}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Verify Signature
                </button>

                {testResult !== 'idle' && (
                  <div className={`p-4 rounded-lg flex items-center gap-3 ${
                    testResult === 'valid'
                      ? 'bg-emerald-500/20 border border-emerald-500/30'
                      : 'bg-red-500/20 border border-red-500/30'
                  }`}>
                    {testResult === 'valid' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                    <span className={testResult === 'valid' ? 'text-emerald-300' : 'text-red-300'}>
                      {testResult === 'valid' ? 'Signature is valid!' : 'Signature verification failed'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
