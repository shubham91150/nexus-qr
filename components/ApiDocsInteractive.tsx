import React, { useState, useEffect } from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import { ArrowLeft, Book, Code, ExternalLink, Copy, Check, Moon, Sun, Zap } from 'lucide-react';
import yaml from 'js-yaml';

interface ApiDocsInteractiveProps {
  onBack: () => void;
}

// Custom Swagger UI styling overrides
const customStyles = `
  .swagger-ui {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
  }

  .swagger-ui .topbar {
    display: none !important;
  }

  .swagger-ui .info {
    margin: 30px 0;
  }

  .swagger-ui .info .title {
    font-size: 2rem !important;
    font-weight: 700 !important;
    color: #1a1a2e !important;
  }

  .swagger-ui .info .description {
    font-size: 0.95rem !important;
    line-height: 1.7 !important;
  }

  .swagger-ui .info .description h1,
  .swagger-ui .info .description h2,
  .swagger-ui .info .description h3 {
    margin-top: 1.5rem !important;
    margin-bottom: 0.75rem !important;
    color: #1a1a2e !important;
  }

  .swagger-ui .info .description table {
    margin: 1rem 0;
    border-collapse: collapse;
    width: 100%;
  }

  .swagger-ui .info .description th,
  .swagger-ui .info .description td {
    padding: 0.75rem 1rem;
    border: 1px solid #e5e7eb;
    text-align: left;
  }

  .swagger-ui .info .description th {
    background: #f9fafb;
    font-weight: 600;
  }

  .swagger-ui .info .description code {
    background: #1a1a2e;
    color: #10b981;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.85rem;
  }

  .swagger-ui .info .description pre {
    background: #1a1a2e;
    padding: 1rem;
    border-radius: 8px;
    overflow-x: auto;
  }

  .swagger-ui .info .description pre code {
    background: transparent;
    padding: 0;
  }

  .swagger-ui .opblock-tag {
    border-bottom: 1px solid #e5e7eb !important;
    padding: 15px 20px !important;
    margin: 0 !important;
    font-size: 1.1rem !important;
    font-weight: 600 !important;
    color: #1a1a2e !important;
  }

  .swagger-ui .opblock-tag:hover {
    background: #f9fafb !important;
  }

  .swagger-ui .opblock {
    border: 1px solid #e5e7eb !important;
    border-radius: 12px !important;
    margin: 10px 20px !important;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important;
  }

  .swagger-ui .opblock .opblock-summary {
    padding: 12px 15px !important;
  }

  .swagger-ui .opblock .opblock-summary-method {
    border-radius: 6px !important;
    font-weight: 700 !important;
    min-width: 70px !important;
    text-align: center !important;
    padding: 6px 12px !important;
  }

  .swagger-ui .opblock.opblock-get .opblock-summary-method {
    background: #10b981 !important;
  }

  .swagger-ui .opblock.opblock-post .opblock-summary-method {
    background: #3b82f6 !important;
  }

  .swagger-ui .opblock.opblock-put .opblock-summary-method {
    background: #f59e0b !important;
  }

  .swagger-ui .opblock.opblock-patch .opblock-summary-method {
    background: #f97316 !important;
  }

  .swagger-ui .opblock.opblock-delete .opblock-summary-method {
    background: #ef4444 !important;
  }

  .swagger-ui .opblock.opblock-get {
    border-color: #10b981 !important;
    background: rgba(16, 185, 129, 0.05) !important;
  }

  .swagger-ui .opblock.opblock-post {
    border-color: #3b82f6 !important;
    background: rgba(59, 130, 246, 0.05) !important;
  }

  .swagger-ui .opblock.opblock-put {
    border-color: #f59e0b !important;
    background: rgba(245, 158, 11, 0.05) !important;
  }

  .swagger-ui .opblock.opblock-patch {
    border-color: #f97316 !important;
    background: rgba(249, 115, 22, 0.05) !important;
  }

  .swagger-ui .opblock.opblock-delete {
    border-color: #ef4444 !important;
    background: rgba(239, 68, 68, 0.05) !important;
  }

  .swagger-ui .opblock-description-wrapper {
    padding: 15px !important;
  }

  .swagger-ui .opblock-body pre.microlight {
    background: #1a1a2e !important;
    border-radius: 8px !important;
    padding: 15px !important;
  }

  .swagger-ui .btn {
    border-radius: 8px !important;
    font-weight: 600 !important;
    padding: 8px 16px !important;
  }

  .swagger-ui .btn.execute {
    background: #6366f1 !important;
    border-color: #6366f1 !important;
  }

  .swagger-ui .btn.execute:hover {
    background: #4f46e5 !important;
  }

  .swagger-ui .btn.cancel {
    background: #6b7280 !important;
    border-color: #6b7280 !important;
  }

  .swagger-ui .responses-wrapper {
    padding: 15px !important;
  }

  .swagger-ui .response-col_status {
    font-weight: 700 !important;
  }

  .swagger-ui .model-box {
    background: #f9fafb !important;
    border-radius: 8px !important;
  }

  .swagger-ui .model {
    font-size: 0.9rem !important;
  }

  .swagger-ui section.models {
    border: 1px solid #e5e7eb !important;
    border-radius: 12px !important;
    margin: 20px !important;
  }

  .swagger-ui section.models h4 {
    padding: 15px 20px !important;
    margin: 0 !important;
    font-size: 1.1rem !important;
  }

  .swagger-ui .scheme-container {
    background: #f9fafb !important;
    padding: 15px 20px !important;
    margin: 0 20px !important;
    border-radius: 12px !important;
  }

  .swagger-ui .auth-wrapper {
    padding: 15px !important;
  }

  .swagger-ui .authorization__btn {
    border-radius: 8px !important;
    background: #6366f1 !important;
    border-color: #6366f1 !important;
  }

  .swagger-ui .authorization__btn:hover {
    background: #4f46e5 !important;
  }

  .swagger-ui input[type=text],
  .swagger-ui textarea {
    border-radius: 8px !important;
    border: 1px solid #d1d5db !important;
    padding: 10px 12px !important;
  }

  .swagger-ui input[type=text]:focus,
  .swagger-ui textarea:focus {
    border-color: #6366f1 !important;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1) !important;
  }

  .swagger-ui select {
    border-radius: 8px !important;
    border: 1px solid #d1d5db !important;
    padding: 8px 12px !important;
  }

  /* Dark mode support */
  .dark .swagger-ui .info .title,
  .dark .swagger-ui .opblock-tag,
  .dark .swagger-ui .info .description h1,
  .dark .swagger-ui .info .description h2,
  .dark .swagger-ui .info .description h3 {
    color: #f3f4f6 !important;
  }

  .dark .swagger-ui {
    background: #111827 !important;
  }

  .dark .swagger-ui .opblock-tag {
    border-color: #374151 !important;
  }

  .dark .swagger-ui .opblock {
    border-color: #374151 !important;
  }

  .dark .swagger-ui .scheme-container {
    background: #1f2937 !important;
  }
`;

const ApiDocsInteractive: React.FC<ApiDocsInteractiveProps> = ({ onBack }) => {
  const [spec, setSpec] = useState<object | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  useEffect(() => {
    loadSpec();
  }, []);

  const loadSpec = async () => {
    try {
      setLoading(true);
      const response = await fetch('/openapi.yaml');
      if (!response.ok) throw new Error('Failed to load API spec');
      const text = await response.text();
      const parsed = yaml.load(text) as object;
      setSpec(parsed);
    } catch (err) {
      setError('Failed to load API documentation');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText('nxqr_test_xxxxxxxxxxxx');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Custom plugin to add API key
  const ApiKeyPlugin = () => ({
    statePlugins: {
      spec: {
        wrapActions: {
          updateSpec: (oriAction: any) => (spec: any) => {
            // Inject API key if available
            return oriAction(spec);
          }
        }
      }
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading API documentation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Code className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Failed to load documentation</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadSpec}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Inject custom styles */}
      <style>{customStyles}</style>

      {/* Fixed Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <Book className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">API Reference</h1>
                  <p className="text-xs text-gray-500">OpenAPI 3.1 Specification</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Quick Start Button */}
              <button
                onClick={() => setShowApiKeyModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                <Zap className="w-4 h-4" />
                Quick Start
              </button>

              {/* OpenAPI Spec Download */}
              <a
                href="/openapi.yaml"
                download="nexusqr-openapi.yaml"
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
              >
                <Code className="w-4 h-4" />
                Download Spec
              </a>

              {/* External Links */}
              <a
                href="https://github.com/nexusqr/api-examples"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                title="View examples on GitHub"
              >
                <ExternalLink className="w-5 h-5 text-gray-600" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Start Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Quick Start Guide</h3>
            <p className="text-gray-600 mb-6">Follow these steps to make your first API call:</p>

            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-indigo-600 font-bold">1</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Get your API key</h4>
                  <p className="text-sm text-gray-600">Visit the API Dashboard to create your API key</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-indigo-600 font-bold">2</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Use the test key</h4>
                  <p className="text-sm text-gray-600 mb-2">Try with this sandbox key:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-gray-900 text-green-400 px-3 py-2 rounded-lg text-sm font-mono">
                      nxqr_test_xxxxxxxxxxxx
                    </code>
                    <button
                      onClick={copyApiKey}
                      className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-600" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-indigo-600 font-bold">3</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Make your first request</h4>
                  <p className="text-sm text-gray-600 mb-2">Try creating a QR code:</p>
                  <pre className="bg-gray-900 text-gray-300 p-3 rounded-lg text-xs overflow-x-auto">
{`curl -X POST https://sandbox.api.nexusqr.com/api/v1/qr \\
  -H "Authorization: Bearer nxqr_test_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com"}'`}
                  </pre>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowApiKeyModal(false);
                  // Scroll to first POST endpoint
                  const postEndpoint = document.querySelector('.opblock-post');
                  if (postEndpoint) {
                    postEndpoint.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
              >
                Try it out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Swagger UI */}
      <div className="swagger-container">
        {spec && (
          <SwaggerUI
            spec={spec}
            docExpansion="list"
            defaultModelsExpandDepth={1}
            defaultModelExpandDepth={2}
            displayOperationId={false}
            displayRequestDuration={true}
            filter={true}
            showExtensions={true}
            showCommonExtensions={true}
            tryItOutEnabled={true}
            persistAuthorization={true}
            plugins={[ApiKeyPlugin]}
            requestInterceptor={(req) => {
              // Add default headers
              if (!req.headers) req.headers = {};
              req.headers['Content-Type'] = 'application/json';
              return req;
            }}
            onComplete={() => {
              console.log('Swagger UI loaded');
            }}
          />
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-600 text-sm mb-4">
            Need help? Check out our{' '}
            <a href="#" className="text-indigo-600 hover:underline">Developer Guide</a>
            {' '}or{' '}
            <a href="#" className="text-indigo-600 hover:underline">contact support</a>.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-gray-700">SDKs</a>
            <span>|</span>
            <a href="#" className="hover:text-gray-700">Changelog</a>
            <span>|</span>
            <a href="#" className="hover:text-gray-700">Status</a>
            <span>|</span>
            <a href="#" className="hover:text-gray-700">GitHub</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiDocsInteractive;
