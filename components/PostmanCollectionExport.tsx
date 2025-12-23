'use client';

import React, { useState } from 'react';
import {
  Download,
  FileJson,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Globe,
  Lock,
  Settings,
  Play,
  FileCode,
  Package,
  Terminal,
  FolderOpen,
  File,
  ExternalLink,
  Zap,
  Shield,
  Clock,
  Code,
  BookOpen,
  Layers,
  RefreshCw,
  AlertCircle,
  Info,
  Server,
  Database,
  ArrowLeft
} from 'lucide-react';

interface PostmanCollectionExportProps {
  onBack?: () => void;
}

// Collection structure matching Postman v2.1 schema
interface CollectionEndpoint {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  headers: { key: string; value: string; description?: string }[];
  queryParams?: { key: string; value: string; description?: string }[];
  body?: {
    mode: 'raw' | 'formdata' | 'urlencoded';
    raw?: string;
    options?: { raw: { language: string } };
  };
  auth?: {
    type: 'apikey' | 'bearer' | 'oauth2' | 'basic';
    config: Record<string, string>;
  };
  preRequestScript?: string;
  testScript?: string;
  responses?: {
    name: string;
    status: number;
    body: string;
  }[];
}

interface CollectionFolder {
  id: string;
  name: string;
  description: string;
  endpoints: CollectionEndpoint[];
  subfolders?: CollectionFolder[];
}

interface Environment {
  id: string;
  name: string;
  values: { key: string; value: string; type: 'default' | 'secret' }[];
}

// Mock collection data representing NexusQR API
const mockCollectionFolders: CollectionFolder[] = [
  {
    id: 'qr-codes',
    name: 'QR Codes',
    description: 'Endpoints for creating, managing, and tracking QR codes',
    endpoints: [
      {
        id: 'create-qr',
        name: 'Create QR Code',
        method: 'POST',
        path: '/api/v1/qr-codes',
        description: 'Generate a new QR code with customizable options including size, color, logo, and error correction level.',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Authorization', value: 'Bearer {{api_key}}', description: 'Your API key' }
        ],
        body: {
          mode: 'raw',
          raw: JSON.stringify({
            content: 'https://example.com',
            type: 'url',
            size: 300,
            color: '#000000',
            background: '#ffffff',
            errorCorrection: 'M',
            logo: null,
            style: 'square'
          }, null, 2),
          options: { raw: { language: 'json' } }
        },
        preRequestScript: `// Set timestamp for tracking
pm.variables.set("timestamp", new Date().toISOString());`,
        testScript: `pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

pm.test("Response has qr_id", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data).to.have.property('id');
    pm.variables.set("qr_id", jsonData.data.id);
});`,
        responses: [
          {
            name: 'Success',
            status: 201,
            body: JSON.stringify({
              success: true,
              data: {
                id: 'qr_abc123',
                content: 'https://example.com',
                short_url: 'https://nxqr.io/abc123',
                image_url: 'https://cdn.nexusqr.com/qr/abc123.png',
                created_at: '2024-01-15T10:30:00Z'
              }
            }, null, 2)
          }
        ]
      },
      {
        id: 'get-qr',
        name: 'Get QR Code',
        method: 'GET',
        path: '/api/v1/qr-codes/{{qr_id}}',
        description: 'Retrieve details of a specific QR code including scan statistics.',
        headers: [
          { key: 'Authorization', value: 'Bearer {{api_key}}' }
        ],
        queryParams: [
          { key: 'include', value: 'stats,scans', description: 'Include additional data' }
        ],
        testScript: `pm.test("QR code exists", function () {
    pm.response.to.have.status(200);
    var jsonData = pm.response.json();
    pm.expect(jsonData.data.id).to.eql(pm.variables.get("qr_id"));
});`,
        responses: [
          {
            name: 'Success',
            status: 200,
            body: JSON.stringify({
              success: true,
              data: {
                id: 'qr_abc123',
                content: 'https://example.com',
                type: 'url',
                total_scans: 1542,
                unique_scans: 892,
                created_at: '2024-01-15T10:30:00Z'
              }
            }, null, 2)
          }
        ]
      },
      {
        id: 'list-qr',
        name: 'List QR Codes',
        method: 'GET',
        path: '/api/v1/qr-codes',
        description: 'Get a paginated list of all QR codes in your account.',
        headers: [
          { key: 'Authorization', value: 'Bearer {{api_key}}' }
        ],
        queryParams: [
          { key: 'page', value: '1', description: 'Page number' },
          { key: 'limit', value: '20', description: 'Items per page (max 100)' },
          { key: 'sort', value: '-created_at', description: 'Sort field (prefix with - for desc)' },
          { key: 'type', value: 'url', description: 'Filter by QR type' }
        ],
        testScript: `pm.test("Returns array of QR codes", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data).to.be.an('array');
});`,
        responses: []
      },
      {
        id: 'update-qr',
        name: 'Update QR Code',
        method: 'PATCH',
        path: '/api/v1/qr-codes/{{qr_id}}',
        description: 'Update an existing QR code. Note: The encoded content cannot be changed.',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Authorization', value: 'Bearer {{api_key}}' }
        ],
        body: {
          mode: 'raw',
          raw: JSON.stringify({
            name: 'Updated QR Code',
            folder_id: 'folder_123',
            tags: ['marketing', 'campaign-2024']
          }, null, 2),
          options: { raw: { language: 'json' } }
        },
        responses: []
      },
      {
        id: 'delete-qr',
        name: 'Delete QR Code',
        method: 'DELETE',
        path: '/api/v1/qr-codes/{{qr_id}}',
        description: 'Permanently delete a QR code. This action cannot be undone.',
        headers: [
          { key: 'Authorization', value: 'Bearer {{api_key}}' }
        ],
        testScript: `pm.test("QR code deleted", function () {
    pm.response.to.have.status(204);
});`,
        responses: []
      }
    ]
  },
  {
    id: 'analytics',
    name: 'Analytics',
    description: 'Access detailed analytics and scan data for your QR codes',
    endpoints: [
      {
        id: 'get-analytics',
        name: 'Get Analytics',
        method: 'GET',
        path: '/api/v1/analytics/{{qr_id}}',
        description: 'Get comprehensive analytics for a specific QR code.',
        headers: [
          { key: 'Authorization', value: 'Bearer {{api_key}}' }
        ],
        queryParams: [
          { key: 'start_date', value: '{{start_date}}', description: 'Start date (ISO 8601)' },
          { key: 'end_date', value: '{{end_date}}', description: 'End date (ISO 8601)' },
          { key: 'granularity', value: 'day', description: 'Data granularity: hour, day, week, month' }
        ],
        responses: [
          {
            name: 'Success',
            status: 200,
            body: JSON.stringify({
              success: true,
              data: {
                total_scans: 15420,
                unique_visitors: 8932,
                avg_daily_scans: 124,
                top_countries: ['US', 'UK', 'DE'],
                devices: { mobile: 72, desktop: 23, tablet: 5 },
                timeline: []
              }
            }, null, 2)
          }
        ]
      },
      {
        id: 'get-scans',
        name: 'Get Scan Events',
        method: 'GET',
        path: '/api/v1/analytics/{{qr_id}}/scans',
        description: 'Get individual scan events with detailed metadata.',
        headers: [
          { key: 'Authorization', value: 'Bearer {{api_key}}' }
        ],
        queryParams: [
          { key: 'limit', value: '50', description: 'Number of events to return' },
          { key: 'cursor', value: '', description: 'Pagination cursor' }
        ],
        responses: []
      },
      {
        id: 'export-analytics',
        name: 'Export Analytics',
        method: 'POST',
        path: '/api/v1/analytics/{{qr_id}}/export',
        description: 'Export analytics data to CSV or Excel format.',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Authorization', value: 'Bearer {{api_key}}' }
        ],
        body: {
          mode: 'raw',
          raw: JSON.stringify({
            format: 'csv',
            date_range: { start: '2024-01-01', end: '2024-01-31' },
            include: ['scans', 'locations', 'devices']
          }, null, 2),
          options: { raw: { language: 'json' } }
        },
        responses: []
      }
    ]
  },
  {
    id: 'webhooks',
    name: 'Webhooks',
    description: 'Configure webhooks to receive real-time notifications',
    endpoints: [
      {
        id: 'create-webhook',
        name: 'Create Webhook',
        method: 'POST',
        path: '/api/v1/webhooks',
        description: 'Register a new webhook endpoint to receive event notifications.',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Authorization', value: 'Bearer {{api_key}}' }
        ],
        body: {
          mode: 'raw',
          raw: JSON.stringify({
            url: 'https://your-server.com/webhooks/nexusqr',
            events: ['qr.scanned', 'qr.created', 'qr.deleted'],
            secret: 'your_webhook_secret',
            active: true
          }, null, 2),
          options: { raw: { language: 'json' } }
        },
        responses: []
      },
      {
        id: 'list-webhooks',
        name: 'List Webhooks',
        method: 'GET',
        path: '/api/v1/webhooks',
        description: 'Get all registered webhook endpoints.',
        headers: [
          { key: 'Authorization', value: 'Bearer {{api_key}}' }
        ],
        responses: []
      },
      {
        id: 'test-webhook',
        name: 'Test Webhook',
        method: 'POST',
        path: '/api/v1/webhooks/{{webhook_id}}/test',
        description: 'Send a test event to verify webhook configuration.',
        headers: [
          { key: 'Authorization', value: 'Bearer {{api_key}}' }
        ],
        responses: []
      }
    ]
  },
  {
    id: 'bulk-operations',
    name: 'Bulk Operations',
    description: 'Perform operations on multiple QR codes at once',
    endpoints: [
      {
        id: 'bulk-create',
        name: 'Bulk Create QR Codes',
        method: 'POST',
        path: '/api/v1/qr-codes/bulk',
        description: 'Create multiple QR codes in a single request (max 100 per request).',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Authorization', value: 'Bearer {{api_key}}' }
        ],
        body: {
          mode: 'raw',
          raw: JSON.stringify({
            items: [
              { content: 'https://example.com/1', type: 'url' },
              { content: 'https://example.com/2', type: 'url' },
              { content: 'Contact info...', type: 'vcard' }
            ],
            default_settings: {
              size: 300,
              color: '#000000',
              errorCorrection: 'M'
            }
          }, null, 2),
          options: { raw: { language: 'json' } }
        },
        responses: []
      },
      {
        id: 'bulk-delete',
        name: 'Bulk Delete QR Codes',
        method: 'DELETE',
        path: '/api/v1/qr-codes/bulk',
        description: 'Delete multiple QR codes at once.',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Authorization', value: 'Bearer {{api_key}}' }
        ],
        body: {
          mode: 'raw',
          raw: JSON.stringify({
            ids: ['qr_abc123', 'qr_def456', 'qr_ghi789']
          }, null, 2),
          options: { raw: { language: 'json' } }
        },
        responses: []
      }
    ]
  },
  {
    id: 'account',
    name: 'Account',
    description: 'Manage your account settings and API keys',
    endpoints: [
      {
        id: 'get-account',
        name: 'Get Account Info',
        method: 'GET',
        path: '/api/v1/account',
        description: 'Get your account details and current usage.',
        headers: [
          { key: 'Authorization', value: 'Bearer {{api_key}}' }
        ],
        responses: [
          {
            name: 'Success',
            status: 200,
            body: JSON.stringify({
              success: true,
              data: {
                id: 'acc_123456',
                email: 'developer@example.com',
                plan: 'professional',
                usage: {
                  qr_codes: { used: 450, limit: 1000 },
                  api_calls: { used: 15420, limit: 100000 },
                  storage: { used: '2.4GB', limit: '10GB' }
                }
              }
            }, null, 2)
          }
        ]
      },
      {
        id: 'list-api-keys',
        name: 'List API Keys',
        method: 'GET',
        path: '/api/v1/account/api-keys',
        description: 'Get all API keys associated with your account.',
        headers: [
          { key: 'Authorization', value: 'Bearer {{api_key}}' }
        ],
        responses: []
      },
      {
        id: 'rotate-api-key',
        name: 'Rotate API Key',
        method: 'POST',
        path: '/api/v1/account/api-keys/{{key_id}}/rotate',
        description: 'Generate a new API key and invalidate the old one.',
        headers: [
          { key: 'Authorization', value: 'Bearer {{api_key}}' }
        ],
        body: {
          mode: 'raw',
          raw: JSON.stringify({
            grace_period_hours: 24
          }, null, 2),
          options: { raw: { language: 'json' } }
        },
        responses: []
      }
    ]
  }
];

// Environment configurations
const mockEnvironments: Environment[] = [
  {
    id: 'dev',
    name: 'Development',
    values: [
      { key: 'base_url', value: 'https://api-dev.nexusqr.com', type: 'default' },
      { key: 'api_key', value: 'nxqr_dev_xxxxxxxxxxxx', type: 'secret' },
      { key: 'api_version', value: 'v1', type: 'default' },
      { key: 'timeout', value: '30000', type: 'default' }
    ]
  },
  {
    id: 'staging',
    name: 'Staging',
    values: [
      { key: 'base_url', value: 'https://api-staging.nexusqr.com', type: 'default' },
      { key: 'api_key', value: 'nxqr_staging_xxxxxxxxxxxx', type: 'secret' },
      { key: 'api_version', value: 'v1', type: 'default' },
      { key: 'timeout', value: '30000', type: 'default' }
    ]
  },
  {
    id: 'prod',
    name: 'Production',
    values: [
      { key: 'base_url', value: 'https://api.nexusqr.com', type: 'default' },
      { key: 'api_key', value: 'nxqr_live_xxxxxxxxxxxx', type: 'secret' },
      { key: 'api_version', value: 'v1', type: 'default' },
      { key: 'timeout', value: '60000', type: 'default' }
    ]
  }
];

// Method color mapping
const methodColors: Record<string, string> = {
  GET: 'bg-emerald-500',
  POST: 'bg-blue-500',
  PUT: 'bg-amber-500',
  PATCH: 'bg-purple-500',
  DELETE: 'bg-red-500'
};

export default function PostmanCollectionExport({ onBack }: PostmanCollectionExportProps) {
  const [selectedFormat, setSelectedFormat] = useState<'postman' | 'openapi' | 'insomnia'>('postman');
  const [selectedEnvironments, setSelectedEnvironments] = useState<string[]>(['dev', 'staging', 'prod']);
  const [expandedFolders, setExpandedFolders] = useState<string[]>(['qr-codes']);
  const [selectedEndpoints, setSelectedEndpoints] = useState<string[]>([]);
  const [includeScripts, setIncludeScripts] = useState(true);
  const [includeExamples, setIncludeExamples] = useState(true);
  const [includeDocumentation, setIncludeDocumentation] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportProgress, setExportProgress] = useState<number | null>(null);

  // Toggle folder expansion
  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev =>
      prev.includes(folderId)
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId]
    );
  };

  // Toggle endpoint selection
  const toggleEndpoint = (endpointId: string) => {
    setSelectedEndpoints(prev =>
      prev.includes(endpointId)
        ? prev.filter(id => id !== endpointId)
        : [...prev, endpointId]
    );
  };

  // Select all endpoints
  const selectAllEndpoints = () => {
    const allIds = mockCollectionFolders.flatMap(f => f.endpoints.map(e => e.id));
    setSelectedEndpoints(allIds);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedEndpoints([]);
  };

  // Toggle environment selection
  const toggleEnvironment = (envId: string) => {
    setSelectedEnvironments(prev =>
      prev.includes(envId)
        ? prev.filter(id => id !== envId)
        : [...prev, envId]
    );
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  // Generate Postman Collection JSON
  const generatePostmanCollection = () => {
    const collection = {
      info: {
        _postman_id: 'nexusqr-api-collection',
        name: 'NexusQR API',
        description: 'Complete API collection for NexusQR - Dynamic QR Code Platform\n\nBase URL: {{base_url}}/api/{{api_version}}\n\nAuthentication: Bearer Token (API Key)\n\nRate Limits:\n- Standard: 1000 requests/minute\n- Bulk operations: 100 requests/minute',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        _exporter_id: 'nexusqr'
      },
      auth: {
        type: 'bearer',
        bearer: [
          {
            key: 'token',
            value: '{{api_key}}',
            type: 'string'
          }
        ]
      },
      variable: [
        { key: 'base_url', value: 'https://api.nexusqr.com', type: 'string' },
        { key: 'api_version', value: 'v1', type: 'string' }
      ],
      item: mockCollectionFolders.map(folder => ({
        name: folder.name,
        description: folder.description,
        item: folder.endpoints
          .filter(e => selectedEndpoints.length === 0 || selectedEndpoints.includes(e.id))
          .map(endpoint => {
            const item: any = {
              name: endpoint.name,
              request: {
                method: endpoint.method,
                header: endpoint.headers,
                url: {
                  raw: `{{base_url}}/api/{{api_version}}${endpoint.path}`,
                  host: ['{{base_url}}'],
                  path: ['api', '{{api_version}}', ...endpoint.path.split('/').filter(Boolean)]
                }
              }
            };

            if (includeDocumentation) {
              item.request.description = endpoint.description;
            }

            if (endpoint.queryParams) {
              item.request.url.query = endpoint.queryParams;
            }

            if (endpoint.body) {
              item.request.body = endpoint.body;
            }

            if (includeScripts) {
              const event = [];
              if (endpoint.preRequestScript) {
                event.push({
                  listen: 'prerequest',
                  script: { exec: endpoint.preRequestScript.split('\n'), type: 'text/javascript' }
                });
              }
              if (endpoint.testScript) {
                event.push({
                  listen: 'test',
                  script: { exec: endpoint.testScript.split('\n'), type: 'text/javascript' }
                });
              }
              if (event.length > 0) item.event = event;
            }

            if (includeExamples && endpoint.responses && endpoint.responses.length > 0) {
              item.response = endpoint.responses.map(res => ({
                name: res.name,
                originalRequest: item.request,
                status: res.status === 200 ? 'OK' : res.status === 201 ? 'Created' : 'Success',
                code: res.status,
                body: res.body
              }));
            }

            return item;
          })
      }))
    };

    return JSON.stringify(collection, null, 2);
  };

  // Generate OpenAPI 3.1 specification
  const generateOpenAPISpec = () => {
    const spec = {
      openapi: '3.1.0',
      info: {
        title: 'NexusQR API',
        version: '1.0.0',
        description: 'Dynamic QR Code Platform API - Create, manage, and track QR codes with powerful analytics.',
        contact: {
          name: 'NexusQR Support',
          email: 'api-support@nexusqr.com',
          url: 'https://developers.nexusqr.com'
        },
        license: {
          name: 'MIT',
          identifier: 'MIT'
        }
      },
      servers: mockEnvironments.map(env => ({
        url: env.values.find(v => v.key === 'base_url')?.value || '',
        description: `${env.name} environment`
      })),
      security: [{ BearerAuth: [] }],
      paths: {} as Record<string, any>,
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'API Key',
            description: 'API key authentication. Get your key from the dashboard.'
          }
        },
        schemas: {
          QRCode: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'qr_abc123' },
              content: { type: 'string', example: 'https://example.com' },
              type: { type: 'string', enum: ['url', 'text', 'vcard', 'wifi', 'email'] },
              short_url: { type: 'string', format: 'uri' },
              image_url: { type: 'string', format: 'uri' },
              created_at: { type: 'string', format: 'date-time' },
              total_scans: { type: 'integer' }
            }
          },
          Error: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  message: { type: 'string' }
                }
              }
            }
          }
        }
      }
    };

    // Build paths from collection
    mockCollectionFolders.forEach(folder => {
      folder.endpoints
        .filter(e => selectedEndpoints.length === 0 || selectedEndpoints.includes(e.id))
        .forEach(endpoint => {
          const path = endpoint.path.replace(/\{\{(\w+)\}\}/g, '{$1}');
          if (!spec.paths[path]) spec.paths[path] = {};

          const operation: any = {
            summary: endpoint.name,
            description: endpoint.description,
            operationId: endpoint.id.replace(/-/g, '_'),
            tags: [folder.name],
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/QRCode' }
                  }
                }
              },
              '400': { description: 'Bad request' },
              '401': { description: 'Unauthorized' },
              '404': { description: 'Not found' },
              '429': { description: 'Rate limit exceeded' }
            }
          };

          if (endpoint.queryParams) {
            operation.parameters = endpoint.queryParams.map(p => ({
              name: p.key,
              in: 'query',
              description: p.description,
              schema: { type: 'string' }
            }));
          }

          if (endpoint.body?.raw) {
            try {
              const bodyExample = JSON.parse(endpoint.body.raw);
              operation.requestBody = {
                required: true,
                content: {
                  'application/json': {
                    schema: { type: 'object' },
                    example: bodyExample
                  }
                }
              };
            } catch (e) {
              // Skip if not valid JSON
            }
          }

          spec.paths[path][endpoint.method.toLowerCase()] = operation;
        });
    });

    return JSON.stringify(spec, null, 2);
  };

  // Generate Insomnia export
  const generateInsomniaExport = () => {
    const resources: any[] = [];
    const workspaceId = 'wrk_nexusqr';

    // Add workspace
    resources.push({
      _id: workspaceId,
      _type: 'workspace',
      name: 'NexusQR API',
      description: 'Dynamic QR Code Platform API',
      scope: 'collection'
    });

    // Add environment
    resources.push({
      _id: 'env_base',
      _type: 'environment',
      parentId: workspaceId,
      name: 'Base Environment',
      data: {
        base_url: 'https://api.nexusqr.com',
        api_key: 'your_api_key_here'
      }
    });

    // Add folders and requests
    mockCollectionFolders.forEach(folder => {
      const folderId = `fld_${folder.id}`;
      resources.push({
        _id: folderId,
        _type: 'request_group',
        parentId: workspaceId,
        name: folder.name,
        description: folder.description
      });

      folder.endpoints
        .filter(e => selectedEndpoints.length === 0 || selectedEndpoints.includes(e.id))
        .forEach(endpoint => {
          resources.push({
            _id: `req_${endpoint.id}`,
            _type: 'request',
            parentId: folderId,
            name: endpoint.name,
            description: endpoint.description,
            method: endpoint.method,
            url: `{{ _.base_url }}/api/v1${endpoint.path}`,
            headers: endpoint.headers.map(h => ({
              name: h.key,
              value: h.value.replace(/\{\{api_key\}\}/g, '{{ _.api_key }}')
            })),
            body: endpoint.body ? {
              mimeType: 'application/json',
              text: endpoint.body.raw
            } : undefined,
            authentication: {
              type: 'bearer',
              token: '{{ _.api_key }}'
            }
          });
        });
    });

    return JSON.stringify({
      _type: 'export',
      __export_format: 4,
      __export_date: new Date().toISOString(),
      __export_source: 'nexusqr.api.export',
      resources
    }, null, 2);
  };

  // Handle export
  const handleExport = async () => {
    setShowExportModal(true);
    setExportProgress(0);

    // Simulate export progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setExportProgress(i);
    }

    let content: string;
    let filename: string;

    switch (selectedFormat) {
      case 'postman':
        content = generatePostmanCollection();
        filename = 'NexusQR-API.postman_collection.json';
        break;
      case 'openapi':
        content = generateOpenAPISpec();
        filename = 'NexusQR-API.openapi.json';
        break;
      case 'insomnia':
        content = generateInsomniaExport();
        filename = 'NexusQR-API.insomnia.json';
        break;
      default:
        content = '';
        filename = 'export.json';
    }

    // Create download
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Export environments if selected
    if (selectedEnvironments.length > 0 && selectedFormat === 'postman') {
      selectedEnvironments.forEach(envId => {
        const env = mockEnvironments.find(e => e.id === envId);
        if (env) {
          const envContent = JSON.stringify({
            id: env.id,
            name: `NexusQR - ${env.name}`,
            values: env.values.map(v => ({
              key: v.key,
              value: v.type === 'secret' ? '' : v.value,
              type: v.type,
              enabled: true
            })),
            _postman_variable_scope: 'environment'
          }, null, 2);
          const envBlob = new Blob([envContent], { type: 'application/json' });
          const envUrl = URL.createObjectURL(envBlob);
          const envA = document.createElement('a');
          envA.href = envUrl;
          envA.download = `NexusQR-${env.name}.postman_environment.json`;
          document.body.appendChild(envA);
          envA.click();
          document.body.removeChild(envA);
          URL.revokeObjectURL(envUrl);
        }
      });
    }

    setTimeout(() => {
      setShowExportModal(false);
      setExportProgress(null);
    }, 500);
  };

  // Get total endpoint count
  const totalEndpoints = mockCollectionFolders.reduce((sum, f) => sum + f.endpoints.length, 0);

  // Newman CLI command
  const newmanCommand = `newman run NexusQR-API.postman_collection.json \\
  -e NexusQR-Production.postman_environment.json \\
  --reporters cli,htmlextra \\
  --reporter-htmlextra-export ./reports/api-test-report.html`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to API Dashboard
          </button>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Collection Export</h1>
              <p className="text-slate-400">Export API collection for Postman, OpenAPI, or Insomnia</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Collection Browser */}
          <div className="lg:col-span-2 space-y-6">
            {/* Format Selection */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileCode className="w-5 h-5 text-orange-400" />
                Export Format
              </h2>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'postman', name: 'Postman', version: 'v2.1', icon: '📮', color: 'from-orange-500 to-amber-600' },
                  { id: 'openapi', name: 'OpenAPI', version: '3.1', icon: '📄', color: 'from-green-500 to-emerald-600' },
                  { id: 'insomnia', name: 'Insomnia', version: 'v4', icon: '🌙', color: 'from-purple-500 to-violet-600' }
                ].map(format => (
                  <button
                    key={format.id}
                    onClick={() => setSelectedFormat(format.id as any)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedFormat === format.id
                        ? `border-orange-500 bg-gradient-to-br ${format.color} bg-opacity-20`
                        : 'border-slate-600 hover:border-slate-500 bg-slate-700/50'
                    }`}
                  >
                    <div className="text-2xl mb-2">{format.icon}</div>
                    <div className="font-semibold">{format.name}</div>
                    <div className="text-sm text-slate-400">{format.version}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Collection Browser */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-orange-400" />
                  API Endpoints
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">
                    {selectedEndpoints.length > 0
                      ? `${selectedEndpoints.length} of ${totalEndpoints} selected`
                      : `All ${totalEndpoints} endpoints`}
                  </span>
                  <button
                    onClick={selectAllEndpoints}
                    className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    Select All
                  </button>
                  {selectedEndpoints.length > 0 && (
                    <button
                      onClick={clearSelection}
                      className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {mockCollectionFolders.map(folder => (
                  <div key={folder.id} className="border border-slate-700 rounded-lg overflow-hidden">
                    {/* Folder Header */}
                    <button
                      onClick={() => toggleFolder(folder.id)}
                      className="w-full flex items-center gap-3 p-3 bg-slate-700/50 hover:bg-slate-700 transition-colors"
                    >
                      {expandedFolders.includes(folder.id) ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                      <FolderOpen className="w-4 h-4 text-amber-400" />
                      <span className="font-medium">{folder.name}</span>
                      <span className="text-xs text-slate-400 bg-slate-600 px-2 py-0.5 rounded">
                        {folder.endpoints.length}
                      </span>
                    </button>

                    {/* Folder Contents */}
                    {expandedFolders.includes(folder.id) && (
                      <div className="bg-slate-800/50">
                        {folder.endpoints.map(endpoint => (
                          <label
                            key={endpoint.id}
                            className="flex items-center gap-3 p-3 hover:bg-slate-700/30 cursor-pointer border-t border-slate-700/50"
                          >
                            <input
                              type="checkbox"
                              checked={selectedEndpoints.length === 0 || selectedEndpoints.includes(endpoint.id)}
                              onChange={() => toggleEndpoint(endpoint.id)}
                              className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-orange-500 focus:ring-orange-500"
                            />
                            <span className={`px-2 py-0.5 text-xs font-bold rounded ${methodColors[endpoint.method]} text-white`}>
                              {endpoint.method}
                            </span>
                            <code className="text-sm text-slate-300 flex-1 font-mono">{endpoint.path}</code>
                            <span className="text-xs text-slate-500">{endpoint.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* CLI Integration */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Terminal className="w-5 h-5 text-orange-400" />
                CLI Integration
              </h2>

              <div className="space-y-4">
                <div className="bg-slate-900 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-400">Run with Newman</span>
                    <button
                      onClick={() => copyToClipboard(newmanCommand, 'newman')}
                      className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                    >
                      {copied === 'newman' ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </div>
                  <pre className="text-sm text-emerald-400 font-mono overflow-x-auto">
                    {newmanCommand}
                  </pre>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">Install Newman</span>
                      <button
                        onClick={() => copyToClipboard('npm install -g newman newman-reporter-htmlextra', 'install-newman')}
                        className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                      >
                        {copied === 'install-newman' ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </div>
                    <code className="text-sm text-blue-400 font-mono">
                      npm install -g newman newman-reporter-htmlextra
                    </code>
                  </div>

                  <div className="bg-slate-900 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">Docker</span>
                      <button
                        onClick={() => copyToClipboard('docker run -v ./:/etc/newman postman/newman run collection.json', 'docker')}
                        className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                      >
                        {copied === 'docker' ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </div>
                    <code className="text-sm text-purple-400 font-mono text-xs">
                      docker run -v ./:/etc/newman postman/newman run collection.json
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Export Options */}
          <div className="space-y-6">
            {/* Export Options */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-orange-400" />
                Export Options
              </h2>

              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeScripts}
                    onChange={(e) => setIncludeScripts(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-orange-500 focus:ring-orange-500"
                  />
                  <div>
                    <div className="font-medium">Pre-request & Test Scripts</div>
                    <div className="text-sm text-slate-400">Include automation scripts</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeExamples}
                    onChange={(e) => setIncludeExamples(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-orange-500 focus:ring-orange-500"
                  />
                  <div>
                    <div className="font-medium">Response Examples</div>
                    <div className="text-sm text-slate-400">Include sample responses</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeDocumentation}
                    onChange={(e) => setIncludeDocumentation(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-orange-500 focus:ring-orange-500"
                  />
                  <div>
                    <div className="font-medium">Documentation</div>
                    <div className="text-sm text-slate-400">Include descriptions</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Environment Selection */}
            {selectedFormat === 'postman' && (
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-orange-400" />
                  Environments
                </h2>

                <div className="space-y-3">
                  {mockEnvironments.map(env => (
                    <label
                      key={env.id}
                      className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEnvironments.includes(env.id)}
                        onChange={() => toggleEnvironment(env.id)}
                        className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-orange-500 focus:ring-orange-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{env.name}</div>
                        <div className="text-xs text-slate-400">
                          {env.values.find(v => v.key === 'base_url')?.value}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        env.id === 'prod' ? 'bg-red-500/20 text-red-400' :
                        env.id === 'staging' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {env.id.toUpperCase()}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Collection Info */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-orange-400" />
                Collection Info
              </h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Endpoints</span>
                  <span className="font-medium">{totalEndpoints}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Folders</span>
                  <span className="font-medium">{mockCollectionFolders.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">API Version</span>
                  <span className="font-medium">v1.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Updated</span>
                  <span className="font-medium">Jan 15, 2024</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-700">
                <div className="text-xs text-slate-400 mb-2">Includes:</div>
                <div className="flex flex-wrap gap-2">
                  {['Authentication', 'Rate Limits', 'Error Codes', 'Examples'].map(tag => (
                    <span key={tag} className="px-2 py-1 text-xs bg-slate-700 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Export Button */}
            <button
              onClick={handleExport}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/25"
            >
              <Download className="w-5 h-5" />
              Export Collection
            </button>

            {/* Quick Actions */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-orange-400" />
                Quick Actions
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    const content = generatePostmanCollection();
                    copyToClipboard(content, 'json');
                  }}
                  className="p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors flex flex-col items-center gap-2"
                >
                  {copied === 'json' ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : (
                    <Copy className="w-5 h-5 text-slate-400" />
                  )}
                  <span className="text-sm">Copy JSON</span>
                </button>

                <a
                  href="https://www.postman.com/downloads/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors flex flex-col items-center gap-2"
                >
                  <ExternalLink className="w-5 h-5 text-slate-400" />
                  <span className="text-sm">Get Postman</span>
                </a>

                <button
                  onClick={() => {/* Open in Swagger */}}
                  className="p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors flex flex-col items-center gap-2"
                >
                  <BookOpen className="w-5 h-5 text-slate-400" />
                  <span className="text-sm">Swagger UI</span>
                </button>

                <button
                  onClick={() => {/* Generate cURL */}}
                  className="p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors flex flex-col items-center gap-2"
                >
                  <Terminal className="w-5 h-5 text-slate-400" />
                  <span className="text-sm">cURL Export</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-8 bg-slate-800/50 rounded-xl border border-slate-700 p-6">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Layers className="w-5 h-5 text-orange-400" />
            What's Included
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Lock, title: 'Authentication', desc: 'Bearer token setup' },
              { icon: Globe, title: 'Environments', desc: 'Dev, staging, prod' },
              { icon: Play, title: 'Test Scripts', desc: 'Automated validation' },
              { icon: RefreshCw, title: 'Variables', desc: 'Dynamic values' },
              { icon: Server, title: 'All Endpoints', desc: `${totalEndpoints} requests` },
              { icon: FileJson, title: 'Examples', desc: 'Request/response' },
              { icon: Shield, title: 'Rate Limits', desc: 'Documented limits' },
              { icon: Database, title: 'Schemas', desc: 'Data models' }
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg">
                <feature.icon className="w-5 h-5 text-orange-400 mt-0.5" />
                <div>
                  <div className="font-medium">{feature.title}</div>
                  <div className="text-sm text-slate-400">{feature.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Export Progress Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                {exportProgress === 100 ? (
                  <Check className="w-8 h-8 text-white" />
                ) : (
                  <Download className="w-8 h-8 text-white animate-bounce" />
                )}
              </div>
              <h3 className="text-xl font-bold mb-2">
                {exportProgress === 100 ? 'Export Complete!' : 'Exporting Collection...'}
              </h3>
              <p className="text-slate-400 mb-4">
                {exportProgress === 100
                  ? 'Your files are ready for download'
                  : 'Generating collection files...'}
              </p>

              <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                <div
                  className="bg-gradient-to-r from-orange-500 to-amber-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
              <span className="text-sm text-slate-400">{exportProgress}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
