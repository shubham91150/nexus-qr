import React, { useState } from 'react';
import {
  ArrowLeft, Copy, Check, Terminal, Code, Download,
  ChevronRight, ExternalLink, Package, Zap, Book
} from 'lucide-react';

type Language = 'nodejs' | 'python' | 'php' | 'go' | 'curl';
type Operation = 'install' | 'auth' | 'create' | 'get' | 'list' | 'update' | 'delete' | 'analytics' | 'webhook';

interface LanguageConfig {
  id: Language;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  installCmd: string;
  fileExt: string;
}

const LANGUAGES: LanguageConfig[] = [
  { id: 'nodejs', name: 'Node.js', icon: '⬢', color: 'text-green-600', bgColor: 'bg-green-100', installCmd: 'npm install nexusqr', fileExt: 'js' },
  { id: 'python', name: 'Python', icon: '🐍', color: 'text-blue-600', bgColor: 'bg-blue-100', installCmd: 'pip install nexusqr', fileExt: 'py' },
  { id: 'php', name: 'PHP', icon: '🐘', color: 'text-purple-600', bgColor: 'bg-purple-100', installCmd: 'composer require nexusqr/nexusqr-php', fileExt: 'php' },
  { id: 'go', name: 'Go', icon: '🔷', color: 'text-cyan-600', bgColor: 'bg-cyan-100', installCmd: 'go get github.com/nexusqr/nexusqr-go', fileExt: 'go' },
  { id: 'curl', name: 'cURL', icon: '⚡', color: 'text-orange-600', bgColor: 'bg-orange-100', installCmd: '', fileExt: 'sh' },
];

const OPERATIONS: { id: Operation; name: string; description: string }[] = [
  { id: 'install', name: 'Installation', description: 'Install the SDK' },
  { id: 'auth', name: 'Authentication', description: 'Configure API key' },
  { id: 'create', name: 'Create QR Code', description: 'Generate a new QR code' },
  { id: 'get', name: 'Get QR Code', description: 'Retrieve QR code details' },
  { id: 'list', name: 'List QR Codes', description: 'Get all your QR codes' },
  { id: 'update', name: 'Update QR Code', description: 'Modify QR code settings' },
  { id: 'delete', name: 'Delete QR Code', description: 'Remove a QR code' },
  { id: 'analytics', name: 'Get Analytics', description: 'Fetch scan analytics' },
  { id: 'webhook', name: 'Webhook Handler', description: 'Handle webhook events' },
];

// Code examples for each language and operation
const CODE_EXAMPLES: Record<Language, Record<Operation, string>> = {
  nodejs: {
    install: `# Install via npm
npm install nexusqr

# Or using yarn
yarn add nexusqr

# Or using pnpm
pnpm add nexusqr`,

    auth: `const NexusQR = require('nexusqr');

// Initialize the client with your API key
const nexus = new NexusQR({
  apiKey: 'nxqr_live_xxxxxxxxxxxx',
  // Optional: Use sandbox for testing
  // baseUrl: 'https://sandbox.api.nexusqr.com'
});

// Or set via environment variable
// NEXUSQR_API_KEY=nxqr_live_xxxxxxxxxxxx
const nexus = new NexusQR();`,

    create: `const NexusQR = require('nexusqr');
const nexus = new NexusQR({ apiKey: 'nxqr_live_xxxxxxxxxxxx' });

async function createQRCode() {
  try {
    // Simple URL QR code
    const qr = await nexus.qr.create({
      url: 'https://example.com',
      type: 'dynamic',
      title: 'My Website'
    });

    console.log('QR Code created:', qr.id);
    console.log('Short URL:', qr.short_url);
    console.log('Image URL:', qr.qr_image_url);

    // With custom styling
    const styledQr = await nexus.qr.create({
      url: 'https://example.com',
      type: 'dynamic',
      title: 'Styled QR',
      style: {
        size: 500,
        color: '#1a1a2e',
        background: '#ffffff',
        pattern: 'rounded',
        cornerStyle: 'rounded'
      },
      logo: {
        url: 'https://example.com/logo.png',
        size: 0.25
      }
    });

    return styledQr;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

createQRCode();`,

    get: `const NexusQR = require('nexusqr');
const nexus = new NexusQR({ apiKey: 'nxqr_live_xxxxxxxxxxxx' });

async function getQRCode(id) {
  try {
    // Get basic QR code details
    const qr = await nexus.qr.retrieve(id);

    console.log('QR Code:', qr);
    console.log('Total Scans:', qr.scans);
    console.log('Is Active:', qr.is_active);

    // Get with expanded analytics
    const qrWithAnalytics = await nexus.qr.retrieve(id, {
      expand: ['analytics', 'scans']
    });

    return qrWithAnalytics;
  } catch (error) {
    if (error.code === 'NOT_FOUND') {
      console.error('QR code not found');
    } else {
      console.error('Error:', error.message);
    }
    throw error;
  }
}

getQRCode('qr_abc123xyz789');`,

    list: `const NexusQR = require('nexusqr');
const nexus = new NexusQR({ apiKey: 'nxqr_live_xxxxxxxxxxxx' });

async function listQRCodes() {
  try {
    // List all QR codes with pagination
    const result = await nexus.qr.list({
      page: 1,
      limit: 20,
      sort: 'created_at',
      order: 'desc'
    });

    console.log('Total QR codes:', result.pagination.total);
    console.log('QR codes:', result.items);

    // Filter by type
    const dynamicQRs = await nexus.qr.list({
      type: 'dynamic',
      is_active: true
    });

    // Search by title
    const searchResults = await nexus.qr.list({
      search: 'marketing'
    });

    // Auto-paginate through all results
    for await (const qr of nexus.qr.listAutoPaginate()) {
      console.log(qr.id, qr.title);
    }

    return result;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

listQRCodes();`,

    update: `const NexusQR = require('nexusqr');
const nexus = new NexusQR({ apiKey: 'nxqr_live_xxxxxxxxxxxx' });

async function updateQRCode(id) {
  try {
    // Update destination URL
    const updated = await nexus.qr.update(id, {
      url: 'https://new-destination.com',
      title: 'Updated Title'
    });

    console.log('Updated:', updated);

    // Disable QR code
    await nexus.qr.update(id, {
      is_active: false
    });

    // Set expiration
    await nexus.qr.update(id, {
      settings: {
        expires_at: '2024-12-31T23:59:59Z',
        max_scans: 1000
      }
    });

    return updated;
  } catch (error) {
    if (error.code === 'VALIDATION_ERROR') {
      console.error('Invalid data:', error.details);
    } else {
      console.error('Error:', error.message);
    }
    throw error;
  }
}

updateQRCode('qr_abc123xyz789');`,

    delete: `const NexusQR = require('nexusqr');
const nexus = new NexusQR({ apiKey: 'nxqr_live_xxxxxxxxxxxx' });

async function deleteQRCode(id) {
  try {
    // Delete a QR code (cannot be undone!)
    await nexus.qr.delete(id);

    console.log('QR code deleted successfully');

    // Bulk delete
    const idsToDelete = ['qr_abc123', 'qr_def456', 'qr_ghi789'];

    for (const qrId of idsToDelete) {
      await nexus.qr.delete(qrId);
      console.log(\`Deleted: \${qrId}\`);
    }

  } catch (error) {
    if (error.code === 'NOT_FOUND') {
      console.error('QR code not found');
    } else {
      console.error('Error:', error.message);
    }
    throw error;
  }
}

deleteQRCode('qr_abc123xyz789');`,

    analytics: `const NexusQR = require('nexusqr');
const nexus = new NexusQR({ apiKey: 'nxqr_live_xxxxxxxxxxxx' });

async function getAnalytics(id) {
  try {
    // Get analytics for last 30 days
    const analytics = await nexus.qr.analytics(id, {
      period: '30d',
      timezone: 'America/New_York'
    });

    console.log('Total Scans:', analytics.summary.total_scans);
    console.log('Unique Scans:', analytics.summary.unique_scans);
    console.log('Peak Hour:', analytics.summary.peak_hour);

    // Scans by country
    analytics.scans_by_country.forEach(country => {
      console.log(\`\${country.country}: \${country.scans} (\${country.percentage}%)\`);
    });

    // Scans by device
    analytics.scans_by_device.forEach(device => {
      console.log(\`\${device.device}: \${device.scans}\`);
    });

    // Get individual scan events
    const scans = await nexus.qr.scans(id, {
      page: 1,
      limit: 50,
      start_date: '2024-01-01T00:00:00Z'
    });

    scans.items.forEach(scan => {
      console.log(\`\${scan.timestamp}: \${scan.country}, \${scan.device}\`);
    });

    return analytics;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

getAnalytics('qr_abc123xyz789');`,

    webhook: `const express = require('express');
const crypto = require('crypto');
const NexusQR = require('nexusqr');

const app = express();
app.use(express.raw({ type: 'application/json' }));

const WEBHOOK_SECRET = 'your_webhook_secret';

// Webhook signature verification
function verifySignature(payload, signature) {
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(\`sha256=\${expectedSignature}\`)
  );
}

app.post('/webhooks/nexusqr', (req, res) => {
  const signature = req.headers['x-webhook-signature'];

  // Verify webhook signature
  if (!verifySignature(req.body, signature)) {
    console.error('Invalid webhook signature');
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(req.body);

  // Handle different event types
  switch (event.event) {
    case 'qr.created':
      console.log('New QR created:', event.data.id);
      break;

    case 'qr.scanned':
      console.log('QR scanned:', event.data.qr_id);
      console.log('Location:', event.data.country, event.data.city);
      console.log('Device:', event.data.device);
      // Send notification, update CRM, etc.
      break;

    case 'qr.updated':
      console.log('QR updated:', event.data.id);
      break;

    case 'qr.deleted':
      console.log('QR deleted:', event.data.id);
      break;

    case 'scan.milestone':
      console.log(\`Milestone reached: \${event.data.milestone} scans\`);
      break;

    default:
      console.log('Unknown event:', event.event);
  }

  // Acknowledge receipt
  res.status(200).json({ received: true });
});

app.listen(3000, () => {
  console.log('Webhook server running on port 3000');
});`
  },

  python: {
    install: `# Install via pip
pip install nexusqr

# Or using poetry
poetry add nexusqr

# Or using pipenv
pipenv install nexusqr`,

    auth: `import nexusqr

# Initialize the client with your API key
client = nexusqr.Client(api_key="nxqr_live_xxxxxxxxxxxx")

# Or use sandbox for testing
client = nexusqr.Client(
    api_key="nxqr_test_xxxxxxxxxxxx",
    base_url="https://sandbox.api.nexusqr.com"
)

# Or set via environment variable
# export NEXUSQR_API_KEY=nxqr_live_xxxxxxxxxxxx
client = nexusqr.Client()`,

    create: `import nexusqr

client = nexusqr.Client(api_key="nxqr_live_xxxxxxxxxxxx")

# Simple URL QR code
qr = client.qr.create(
    url="https://example.com",
    type="dynamic",
    title="My Website"
)

print(f"QR Code created: {qr.id}")
print(f"Short URL: {qr.short_url}")
print(f"Image URL: {qr.qr_image_url}")

# With custom styling
styled_qr = client.qr.create(
    url="https://example.com",
    type="dynamic",
    title="Styled QR",
    style={
        "size": 500,
        "color": "#1a1a2e",
        "background": "#ffffff",
        "pattern": "rounded",
        "corner_style": "rounded"
    },
    logo={
        "url": "https://example.com/logo.png",
        "size": 0.25
    }
)

# WiFi QR code
wifi_qr = client.qr.create(
    type="static",
    content_type="wifi",
    wifi={
        "ssid": "MyNetwork",
        "password": "secret123",
        "encryption": "WPA"
    }
)`,

    get: `import nexusqr

client = nexusqr.Client(api_key="nxqr_live_xxxxxxxxxxxx")

# Get basic QR code details
qr = client.qr.retrieve("qr_abc123xyz789")

print(f"QR Code: {qr}")
print(f"Total Scans: {qr.scans}")
print(f"Is Active: {qr.is_active}")

# Get with expanded analytics
qr_with_analytics = client.qr.retrieve(
    "qr_abc123xyz789",
    expand=["analytics", "scans"]
)

# Handle errors
try:
    qr = client.qr.retrieve("invalid_id")
except nexusqr.NotFoundError:
    print("QR code not found")
except nexusqr.APIError as e:
    print(f"Error: {e.message}")`,

    list: `import nexusqr

client = nexusqr.Client(api_key="nxqr_live_xxxxxxxxxxxx")

# List all QR codes with pagination
result = client.qr.list(
    page=1,
    limit=20,
    sort="created_at",
    order="desc"
)

print(f"Total QR codes: {result.pagination.total}")
for qr in result.items:
    print(f"{qr.id}: {qr.title}")

# Filter by type
dynamic_qrs = client.qr.list(
    type="dynamic",
    is_active=True
)

# Search by title
search_results = client.qr.list(search="marketing")

# Auto-paginate through all results
for qr in client.qr.list_auto_paginate():
    print(f"{qr.id}: {qr.title}")`,

    update: `import nexusqr

client = nexusqr.Client(api_key="nxqr_live_xxxxxxxxxxxx")

# Update destination URL
updated = client.qr.update(
    "qr_abc123xyz789",
    url="https://new-destination.com",
    title="Updated Title"
)

print(f"Updated: {updated}")

# Disable QR code
client.qr.update("qr_abc123xyz789", is_active=False)

# Set expiration
client.qr.update(
    "qr_abc123xyz789",
    settings={
        "expires_at": "2024-12-31T23:59:59Z",
        "max_scans": 1000
    }
)`,

    delete: `import nexusqr

client = nexusqr.Client(api_key="nxqr_live_xxxxxxxxxxxx")

# Delete a QR code (cannot be undone!)
client.qr.delete("qr_abc123xyz789")
print("QR code deleted successfully")

# Bulk delete
ids_to_delete = ["qr_abc123", "qr_def456", "qr_ghi789"]

for qr_id in ids_to_delete:
    try:
        client.qr.delete(qr_id)
        print(f"Deleted: {qr_id}")
    except nexusqr.NotFoundError:
        print(f"Not found: {qr_id}")`,

    analytics: `import nexusqr

client = nexusqr.Client(api_key="nxqr_live_xxxxxxxxxxxx")

# Get analytics for last 30 days
analytics = client.qr.analytics(
    "qr_abc123xyz789",
    period="30d",
    timezone="America/New_York"
)

print(f"Total Scans: {analytics.summary.total_scans}")
print(f"Unique Scans: {analytics.summary.unique_scans}")
print(f"Peak Hour: {analytics.summary.peak_hour}")

# Scans by country
for country in analytics.scans_by_country:
    print(f"{country.country}: {country.scans} ({country.percentage}%)")

# Scans by device
for device in analytics.scans_by_device:
    print(f"{device.device}: {device.scans}")

# Get individual scan events
scans = client.qr.scans(
    "qr_abc123xyz789",
    page=1,
    limit=50,
    start_date="2024-01-01T00:00:00Z"
)

for scan in scans.items:
    print(f"{scan.timestamp}: {scan.country}, {scan.device}")`,

    webhook: `from flask import Flask, request, jsonify
import hmac
import hashlib
import json

app = Flask(__name__)

WEBHOOK_SECRET = "your_webhook_secret"

def verify_signature(payload: bytes, signature: str) -> bool:
    """Verify webhook signature"""
    expected = hmac.new(
        WEBHOOK_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(f"sha256={expected}", signature)

@app.route("/webhooks/nexusqr", methods=["POST"])
def webhook_handler():
    signature = request.headers.get("X-Webhook-Signature")

    # Verify webhook signature
    if not verify_signature(request.data, signature):
        return jsonify({"error": "Invalid signature"}), 401

    event = request.json

    # Handle different event types
    if event["event"] == "qr.created":
        print(f"New QR created: {event['data']['id']}")

    elif event["event"] == "qr.scanned":
        print(f"QR scanned: {event['data']['qr_id']}")
        print(f"Location: {event['data']['country']}, {event['data']['city']}")
        print(f"Device: {event['data']['device']}")
        # Send notification, update CRM, etc.

    elif event["event"] == "qr.updated":
        print(f"QR updated: {event['data']['id']}")

    elif event["event"] == "qr.deleted":
        print(f"QR deleted: {event['data']['id']}")

    elif event["event"] == "scan.milestone":
        print(f"Milestone reached: {event['data']['milestone']} scans")

    # Acknowledge receipt
    return jsonify({"received": True}), 200

if __name__ == "__main__":
    app.run(port=3000)`
  },

  php: {
    install: `# Install via Composer
composer require nexusqr/nexusqr-php

# Or add to composer.json
{
    "require": {
        "nexusqr/nexusqr-php": "^1.0"
    }
}`,

    auth: `<?php

require_once 'vendor/autoload.php';

use NexusQR\\Client;

// Initialize the client with your API key
$client = new Client('nxqr_live_xxxxxxxxxxxx');

// Or use sandbox for testing
$client = new Client('nxqr_test_xxxxxxxxxxxx', [
    'base_url' => 'https://sandbox.api.nexusqr.com'
]);

// Or set via environment variable
// NEXUSQR_API_KEY=nxqr_live_xxxxxxxxxxxx
$client = new Client();`,

    create: `<?php

use NexusQR\\Client;

$client = new Client('nxqr_live_xxxxxxxxxxxx');

// Simple URL QR code
$qr = $client->qr->create([
    'url' => 'https://example.com',
    'type' => 'dynamic',
    'title' => 'My Website'
]);

echo "QR Code created: " . $qr->id . "\\n";
echo "Short URL: " . $qr->short_url . "\\n";
echo "Image URL: " . $qr->qr_image_url . "\\n";

// With custom styling
$styledQr = $client->qr->create([
    'url' => 'https://example.com',
    'type' => 'dynamic',
    'title' => 'Styled QR',
    'style' => [
        'size' => 500,
        'color' => '#1a1a2e',
        'background' => '#ffffff',
        'pattern' => 'rounded',
        'corner_style' => 'rounded'
    ],
    'logo' => [
        'url' => 'https://example.com/logo.png',
        'size' => 0.25
    ]
]);`,

    get: `<?php

use NexusQR\\Client;
use NexusQR\\Exceptions\\NotFoundException;

$client = new Client('nxqr_live_xxxxxxxxxxxx');

// Get basic QR code details
$qr = $client->qr->retrieve('qr_abc123xyz789');

echo "QR Code: " . json_encode($qr) . "\\n";
echo "Total Scans: " . $qr->scans . "\\n";
echo "Is Active: " . ($qr->is_active ? 'Yes' : 'No') . "\\n";

// Get with expanded analytics
$qrWithAnalytics = $client->qr->retrieve('qr_abc123xyz789', [
    'expand' => ['analytics', 'scans']
]);

// Handle errors
try {
    $qr = $client->qr->retrieve('invalid_id');
} catch (NotFoundException $e) {
    echo "QR code not found\\n";
} catch (\\Exception $e) {
    echo "Error: " . $e->getMessage() . "\\n";
}`,

    list: `<?php

use NexusQR\\Client;

$client = new Client('nxqr_live_xxxxxxxxxxxx');

// List all QR codes with pagination
$result = $client->qr->list([
    'page' => 1,
    'limit' => 20,
    'sort' => 'created_at',
    'order' => 'desc'
]);

echo "Total QR codes: " . $result->pagination->total . "\\n";

foreach ($result->items as $qr) {
    echo $qr->id . ": " . $qr->title . "\\n";
}

// Filter by type
$dynamicQRs = $client->qr->list([
    'type' => 'dynamic',
    'is_active' => true
]);

// Search by title
$searchResults = $client->qr->list([
    'search' => 'marketing'
]);`,

    update: `<?php

use NexusQR\\Client;

$client = new Client('nxqr_live_xxxxxxxxxxxx');

// Update destination URL
$updated = $client->qr->update('qr_abc123xyz789', [
    'url' => 'https://new-destination.com',
    'title' => 'Updated Title'
]);

echo "Updated: " . json_encode($updated) . "\\n";

// Disable QR code
$client->qr->update('qr_abc123xyz789', [
    'is_active' => false
]);

// Set expiration
$client->qr->update('qr_abc123xyz789', [
    'settings' => [
        'expires_at' => '2024-12-31T23:59:59Z',
        'max_scans' => 1000
    ]
]);`,

    delete: `<?php

use NexusQR\\Client;
use NexusQR\\Exceptions\\NotFoundException;

$client = new Client('nxqr_live_xxxxxxxxxxxx');

// Delete a QR code (cannot be undone!)
$client->qr->delete('qr_abc123xyz789');
echo "QR code deleted successfully\\n";

// Bulk delete
$idsToDelete = ['qr_abc123', 'qr_def456', 'qr_ghi789'];

foreach ($idsToDelete as $qrId) {
    try {
        $client->qr->delete($qrId);
        echo "Deleted: $qrId\\n";
    } catch (NotFoundException $e) {
        echo "Not found: $qrId\\n";
    }
}`,

    analytics: `<?php

use NexusQR\\Client;

$client = new Client('nxqr_live_xxxxxxxxxxxx');

// Get analytics for last 30 days
$analytics = $client->qr->analytics('qr_abc123xyz789', [
    'period' => '30d',
    'timezone' => 'America/New_York'
]);

echo "Total Scans: " . $analytics->summary->total_scans . "\\n";
echo "Unique Scans: " . $analytics->summary->unique_scans . "\\n";
echo "Peak Hour: " . $analytics->summary->peak_hour . "\\n";

// Scans by country
foreach ($analytics->scans_by_country as $country) {
    echo $country->country . ": " . $country->scans . " (" . $country->percentage . "%)\\n";
}

// Scans by device
foreach ($analytics->scans_by_device as $device) {
    echo $device->device . ": " . $device->scans . "\\n";
}

// Get individual scan events
$scans = $client->qr->scans('qr_abc123xyz789', [
    'page' => 1,
    'limit' => 50,
    'start_date' => '2024-01-01T00:00:00Z'
]);

foreach ($scans->items as $scan) {
    echo $scan->timestamp . ": " . $scan->country . ", " . $scan->device . "\\n";
}`,

    webhook: `<?php

// webhook.php - Handle incoming webhooks

$webhookSecret = 'your_webhook_secret';

// Get the raw request body and signature
$payload = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_WEBHOOK_SIGNATURE'] ?? '';

// Verify webhook signature
function verifySignature($payload, $signature, $secret) {
    $expected = 'sha256=' . hash_hmac('sha256', $payload, $secret);
    return hash_equals($expected, $signature);
}

if (!verifySignature($payload, $signature, $webhookSecret)) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid signature']);
    exit;
}

$event = json_decode($payload, true);

// Handle different event types
switch ($event['event']) {
    case 'qr.created':
        error_log("New QR created: " . $event['data']['id']);
        break;

    case 'qr.scanned':
        error_log("QR scanned: " . $event['data']['qr_id']);
        error_log("Location: " . $event['data']['country'] . ", " . $event['data']['city']);
        error_log("Device: " . $event['data']['device']);
        // Send notification, update CRM, etc.
        break;

    case 'qr.updated':
        error_log("QR updated: " . $event['data']['id']);
        break;

    case 'qr.deleted':
        error_log("QR deleted: " . $event['data']['id']);
        break;

    case 'scan.milestone':
        error_log("Milestone reached: " . $event['data']['milestone'] . " scans");
        break;

    default:
        error_log("Unknown event: " . $event['event']);
}

// Acknowledge receipt
http_response_code(200);
echo json_encode(['received' => true]);`
  },

  go: {
    install: `# Install via go get
go get github.com/nexusqr/nexusqr-go

# Or add to go.mod
require github.com/nexusqr/nexusqr-go v1.0.0`,

    auth: `package main

import (
    "github.com/nexusqr/nexusqr-go"
)

func main() {
    // Initialize the client with your API key
    client := nexusqr.NewClient("nxqr_live_xxxxxxxxxxxx")

    // Or use sandbox for testing
    client := nexusqr.NewClient("nxqr_test_xxxxxxxxxxxx",
        nexusqr.WithBaseURL("https://sandbox.api.nexusqr.com"),
    )

    // Or set via environment variable
    // NEXUSQR_API_KEY=nxqr_live_xxxxxxxxxxxx
    client := nexusqr.NewClient("")
}`,

    create: `package main

import (
    "fmt"
    "log"

    "github.com/nexusqr/nexusqr-go"
)

func main() {
    client := nexusqr.NewClient("nxqr_live_xxxxxxxxxxxx")

    // Simple URL QR code
    qr, err := client.QR.Create(&nexusqr.CreateQRParams{
        URL:   "https://example.com",
        Type:  "dynamic",
        Title: "My Website",
    })
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("QR Code created: %s\\n", qr.ID)
    fmt.Printf("Short URL: %s\\n", qr.ShortURL)
    fmt.Printf("Image URL: %s\\n", qr.QRImageURL)

    // With custom styling
    styledQR, err := client.QR.Create(&nexusqr.CreateQRParams{
        URL:   "https://example.com",
        Type:  "dynamic",
        Title: "Styled QR",
        Style: &nexusqr.QRStyle{
            Size:        500,
            Color:       "#1a1a2e",
            Background:  "#ffffff",
            Pattern:     "rounded",
            CornerStyle: "rounded",
        },
        Logo: &nexusqr.QRLogo{
            URL:  "https://example.com/logo.png",
            Size: 0.25,
        },
    })
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("Styled QR: %+v\\n", styledQR)
}`,

    get: `package main

import (
    "fmt"
    "log"

    "github.com/nexusqr/nexusqr-go"
)

func main() {
    client := nexusqr.NewClient("nxqr_live_xxxxxxxxxxxx")

    // Get basic QR code details
    qr, err := client.QR.Retrieve("qr_abc123xyz789")
    if err != nil {
        if nexusqr.IsNotFoundError(err) {
            fmt.Println("QR code not found")
            return
        }
        log.Fatal(err)
    }

    fmt.Printf("QR Code: %+v\\n", qr)
    fmt.Printf("Total Scans: %d\\n", qr.Scans)
    fmt.Printf("Is Active: %t\\n", qr.IsActive)

    // Get with expanded analytics
    qrWithAnalytics, err := client.QR.Retrieve("qr_abc123xyz789",
        nexusqr.WithExpand("analytics", "scans"),
    )
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("Analytics: %+v\\n", qrWithAnalytics.Analytics)
}`,

    list: `package main

import (
    "fmt"
    "log"

    "github.com/nexusqr/nexusqr-go"
)

func main() {
    client := nexusqr.NewClient("nxqr_live_xxxxxxxxxxxx")

    // List all QR codes with pagination
    result, err := client.QR.List(&nexusqr.ListQRParams{
        Page:  1,
        Limit: 20,
        Sort:  "created_at",
        Order: "desc",
    })
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("Total QR codes: %d\\n", result.Pagination.Total)

    for _, qr := range result.Items {
        fmt.Printf("%s: %s\\n", qr.ID, qr.Title)
    }

    // Filter by type
    dynamicQRs, _ := client.QR.List(&nexusqr.ListQRParams{
        Type:     "dynamic",
        IsActive: true,
    })

    // Search by title
    searchResults, _ := client.QR.List(&nexusqr.ListQRParams{
        Search: "marketing",
    })

    fmt.Printf("Dynamic: %d, Search: %d\\n",
        len(dynamicQRs.Items), len(searchResults.Items))
}`,

    update: `package main

import (
    "fmt"
    "log"

    "github.com/nexusqr/nexusqr-go"
)

func main() {
    client := nexusqr.NewClient("nxqr_live_xxxxxxxxxxxx")

    // Update destination URL
    updated, err := client.QR.Update("qr_abc123xyz789", &nexusqr.UpdateQRParams{
        URL:   "https://new-destination.com",
        Title: "Updated Title",
    })
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("Updated: %+v\\n", updated)

    // Disable QR code
    _, err = client.QR.Update("qr_abc123xyz789", &nexusqr.UpdateQRParams{
        IsActive: false,
    })
    if err != nil {
        log.Fatal(err)
    }

    // Set expiration
    _, err = client.QR.Update("qr_abc123xyz789", &nexusqr.UpdateQRParams{
        Settings: &nexusqr.QRSettings{
            ExpiresAt: "2024-12-31T23:59:59Z",
            MaxScans:  1000,
        },
    })
    if err != nil {
        log.Fatal(err)
    }
}`,

    delete: `package main

import (
    "fmt"
    "log"

    "github.com/nexusqr/nexusqr-go"
)

func main() {
    client := nexusqr.NewClient("nxqr_live_xxxxxxxxxxxx")

    // Delete a QR code (cannot be undone!)
    err := client.QR.Delete("qr_abc123xyz789")
    if err != nil {
        log.Fatal(err)
    }

    fmt.Println("QR code deleted successfully")

    // Bulk delete
    idsToDelete := []string{"qr_abc123", "qr_def456", "qr_ghi789"}

    for _, qrID := range idsToDelete {
        err := client.QR.Delete(qrID)
        if err != nil {
            if nexusqr.IsNotFoundError(err) {
                fmt.Printf("Not found: %s\\n", qrID)
                continue
            }
            log.Fatal(err)
        }
        fmt.Printf("Deleted: %s\\n", qrID)
    }
}`,

    analytics: `package main

import (
    "fmt"
    "log"

    "github.com/nexusqr/nexusqr-go"
)

func main() {
    client := nexusqr.NewClient("nxqr_live_xxxxxxxxxxxx")

    // Get analytics for last 30 days
    analytics, err := client.QR.Analytics("qr_abc123xyz789", &nexusqr.AnalyticsParams{
        Period:   "30d",
        Timezone: "America/New_York",
    })
    if err != nil {
        log.Fatal(err)
    }

    fmt.Printf("Total Scans: %d\\n", analytics.Summary.TotalScans)
    fmt.Printf("Unique Scans: %d\\n", analytics.Summary.UniqueScans)
    fmt.Printf("Peak Hour: %d\\n", analytics.Summary.PeakHour)

    // Scans by country
    for _, country := range analytics.ScansByCountry {
        fmt.Printf("%s: %d (%.1f%%)\\n",
            country.Country, country.Scans, country.Percentage)
    }

    // Scans by device
    for _, device := range analytics.ScansByDevice {
        fmt.Printf("%s: %d\\n", device.Device, device.Scans)
    }

    // Get individual scan events
    scans, err := client.QR.Scans("qr_abc123xyz789", &nexusqr.ScansParams{
        Page:      1,
        Limit:     50,
        StartDate: "2024-01-01T00:00:00Z",
    })
    if err != nil {
        log.Fatal(err)
    }

    for _, scan := range scans.Items {
        fmt.Printf("%s: %s, %s\\n", scan.Timestamp, scan.Country, scan.Device)
    }
}`,

    webhook: `package main

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "encoding/json"
    "fmt"
    "io"
    "log"
    "net/http"
)

const webhookSecret = "your_webhook_secret"

type WebhookEvent struct {
    Event     string                 \`json:"event"\`
    Timestamp string                 \`json:"timestamp"\`
    Data      map[string]interface{} \`json:"data"\`
}

func verifySignature(payload []byte, signature string) bool {
    mac := hmac.New(sha256.New, []byte(webhookSecret))
    mac.Write(payload)
    expected := "sha256=" + hex.EncodeToString(mac.Sum(nil))
    return hmac.Equal([]byte(expected), []byte(signature))
}

func webhookHandler(w http.ResponseWriter, r *http.Request) {
    signature := r.Header.Get("X-Webhook-Signature")

    body, err := io.ReadAll(r.Body)
    if err != nil {
        http.Error(w, "Failed to read body", http.StatusBadRequest)
        return
    }

    // Verify webhook signature
    if !verifySignature(body, signature) {
        http.Error(w, "Invalid signature", http.StatusUnauthorized)
        return
    }

    var event WebhookEvent
    if err := json.Unmarshal(body, &event); err != nil {
        http.Error(w, "Invalid JSON", http.StatusBadRequest)
        return
    }

    // Handle different event types
    switch event.Event {
    case "qr.created":
        fmt.Printf("New QR created: %v\\n", event.Data["id"])

    case "qr.scanned":
        fmt.Printf("QR scanned: %v\\n", event.Data["qr_id"])
        fmt.Printf("Location: %v, %v\\n", event.Data["country"], event.Data["city"])
        fmt.Printf("Device: %v\\n", event.Data["device"])

    case "qr.updated":
        fmt.Printf("QR updated: %v\\n", event.Data["id"])

    case "qr.deleted":
        fmt.Printf("QR deleted: %v\\n", event.Data["id"])

    case "scan.milestone":
        fmt.Printf("Milestone reached: %v scans\\n", event.Data["milestone"])

    default:
        fmt.Printf("Unknown event: %s\\n", event.Event)
    }

    // Acknowledge receipt
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]bool{"received": true})
}

func main() {
    http.HandleFunc("/webhooks/nexusqr", webhookHandler)
    log.Println("Webhook server running on port 3000")
    log.Fatal(http.ListenAndServe(":3000", nil))
}`
  },

  curl: {
    install: `# cURL comes pre-installed on most systems
# Verify installation:
curl --version

# For Windows, install via:
# https://curl.se/windows/`,

    auth: `# Include your API key in the Authorization header
# Replace YOUR_API_KEY with your actual API key

# Production
curl https://api.nexusqr.com/api/v1/qr \\
  -H "Authorization: Bearer nxqr_live_xxxxxxxxxxxx"

# Sandbox (for testing)
curl https://sandbox.api.nexusqr.com/api/v1/qr \\
  -H "Authorization: Bearer nxqr_test_xxxxxxxxxxxx"`,

    create: `# Simple URL QR code
curl -X POST https://api.nexusqr.com/api/v1/qr \\
  -H "Authorization: Bearer nxqr_live_xxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com",
    "type": "dynamic",
    "title": "My Website"
  }'

# With custom styling
curl -X POST https://api.nexusqr.com/api/v1/qr \\
  -H "Authorization: Bearer nxqr_live_xxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com",
    "type": "dynamic",
    "title": "Styled QR",
    "style": {
      "size": 500,
      "color": "#1a1a2e",
      "background": "#ffffff",
      "pattern": "rounded",
      "cornerStyle": "rounded"
    },
    "logo": {
      "url": "https://example.com/logo.png",
      "size": 0.25
    }
  }'

# WiFi QR code
curl -X POST https://api.nexusqr.com/api/v1/qr \\
  -H "Authorization: Bearer nxqr_live_xxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "static",
    "content_type": "wifi",
    "wifi": {
      "ssid": "MyNetwork",
      "password": "secret123",
      "encryption": "WPA"
    }
  }'`,

    get: `# Get QR code details
curl https://api.nexusqr.com/api/v1/qr/qr_abc123xyz789 \\
  -H "Authorization: Bearer nxqr_live_xxxxxxxxxxxx"

# With expanded analytics
curl "https://api.nexusqr.com/api/v1/qr/qr_abc123xyz789?expand=analytics,scans" \\
  -H "Authorization: Bearer nxqr_live_xxxxxxxxxxxx"

# Pretty print with jq
curl https://api.nexusqr.com/api/v1/qr/qr_abc123xyz789 \\
  -H "Authorization: Bearer nxqr_live_xxxxxxxxxxxx" | jq .`,

    list: `# List all QR codes
curl "https://api.nexusqr.com/api/v1/qr?page=1&limit=20" \\
  -H "Authorization: Bearer nxqr_live_xxxxxxxxxxxx"

# Filter by type
curl "https://api.nexusqr.com/api/v1/qr?type=dynamic&is_active=true" \\
  -H "Authorization: Bearer nxqr_live_xxxxxxxxxxxx"

# Sort by scans
curl "https://api.nexusqr.com/api/v1/qr?sort=scans&order=desc" \\
  -H "Authorization: Bearer nxqr_live_xxxxxxxxxxxx"

# Search by title
curl "https://api.nexusqr.com/api/v1/qr?search=marketing" \\
  -H "Authorization: Bearer nxqr_live_xxxxxxxxxxxx"`,

    update: `# Update destination URL
curl -X PATCH https://api.nexusqr.com/api/v1/qr/qr_abc123xyz789 \\
  -H "Authorization: Bearer nxqr_live_xxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://new-destination.com",
    "title": "Updated Title"
  }'

# Disable QR code
curl -X PATCH https://api.nexusqr.com/api/v1/qr/qr_abc123xyz789 \\
  -H "Authorization: Bearer nxqr_live_xxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"is_active": false}'

# Set expiration
curl -X PATCH https://api.nexusqr.com/api/v1/qr/qr_abc123xyz789 \\
  -H "Authorization: Bearer nxqr_live_xxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "settings": {
      "expires_at": "2024-12-31T23:59:59Z",
      "max_scans": 1000
    }
  }'`,

    delete: `# Delete QR code
curl -X DELETE https://api.nexusqr.com/api/v1/qr/qr_abc123xyz789 \\
  -H "Authorization: Bearer nxqr_live_xxxxxxxxxxxx"

# Delete with verbose output
curl -X DELETE https://api.nexusqr.com/api/v1/qr/qr_abc123xyz789 \\
  -H "Authorization: Bearer nxqr_live_xxxxxxxxxxxx" \\
  -v`,

    analytics: `# Get analytics for last 30 days
curl "https://api.nexusqr.com/api/v1/qr/qr_abc123xyz789/analytics?period=30d" \\
  -H "Authorization: Bearer nxqr_live_xxxxxxxxxxxx"

# With timezone
curl "https://api.nexusqr.com/api/v1/qr/qr_abc123xyz789/analytics?period=30d&timezone=America/New_York" \\
  -H "Authorization: Bearer nxqr_live_xxxxxxxxxxxx"

# Get individual scans
curl "https://api.nexusqr.com/api/v1/qr/qr_abc123xyz789/scans?page=1&limit=50" \\
  -H "Authorization: Bearer nxqr_live_xxxxxxxxxxxx"

# Filter scans by date
curl "https://api.nexusqr.com/api/v1/qr/qr_abc123xyz789/scans?start_date=2024-01-01T00:00:00Z" \\
  -H "Authorization: Bearer nxqr_live_xxxxxxxxxxxx"`,

    webhook: `# List webhooks
curl https://api.nexusqr.com/api/v1/webhooks \\
  -H "Authorization: Bearer nxqr_live_xxxxxxxxxxxx"

# Create webhook
curl -X POST https://api.nexusqr.com/api/v1/webhooks \\
  -H "Authorization: Bearer nxqr_live_xxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Production Webhook",
    "url": "https://api.yoursite.com/webhooks/nexusqr",
    "events": ["qr.created", "qr.scanned"],
    "secret": "your_webhook_secret"
  }'

# Test webhook
curl -X POST https://api.nexusqr.com/api/v1/webhooks/wh_abc123/test \\
  -H "Authorization: Bearer nxqr_live_xxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"event": "qr.scanned"}'

# Delete webhook
curl -X DELETE https://api.nexusqr.com/api/v1/webhooks/wh_abc123 \\
  -H "Authorization: Bearer nxqr_live_xxxxxxxxxxxx"`
  }
};

interface ApiSDKExamplesProps {
  onBack: () => void;
}

const ApiSDKExamples: React.FC<ApiSDKExamplesProps> = ({ onBack }) => {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('nodejs');
  const [selectedOperation, setSelectedOperation] = useState<Operation>('create');
  const [copiedCode, setCopiedCode] = useState(false);

  const currentLang = LANGUAGES.find(l => l.id === selectedLanguage)!;
  const currentCode = CODE_EXAMPLES[selectedLanguage][selectedOperation];

  const copyCode = () => {
    navigator.clipboard.writeText(currentCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getHighlightedCode = (code: string, lang: Language) => {
    // Simple syntax highlighting
    let highlighted = code
      // Strings
      .replace(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g, '<span class="text-green-400">$&</span>')
      // Comments
      .replace(/(\/\/.*$|#.*$|\/\*[\s\S]*?\*\/)/gm, '<span class="text-gray-500">$&</span>')
      // Keywords
      .replace(/\b(const|let|var|function|async|await|return|if|else|for|while|try|catch|throw|import|export|from|require|class|new|this|def|import|from|as|with|lambda|elif|except|raise|pass|True|False|None|use|namespace|public|private|protected|static|final|abstract|interface|extends|implements|package|func|type|struct|interface|map|chan|go|defer|select|case|break|continue|default|fallthrough|range)\b/g, '<span class="text-purple-400">$&</span>')
      // Numbers
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="text-orange-400">$&</span>')
      // HTTP Methods
      .replace(/\b(GET|POST|PUT|PATCH|DELETE)\b/g, '<span class="text-yellow-400 font-bold">$&</span>')
      // URLs
      .replace(/(https?:\/\/[^\s"']+)/g, '<span class="text-blue-400">$&</span>');

    return highlighted;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-200 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-6 h-6 text-indigo-600" />
                SDK & Code Examples
              </h1>
              <p className="text-gray-500 text-sm">Ready-to-use code snippets for your integration</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com/nexusqr"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              <ExternalLink className="w-4 h-4" />
              GitHub
            </a>
          </div>
        </div>

        {/* Language Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 mb-6">
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.id}
                onClick={() => setSelectedLanguage(lang.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                  selectedLanguage === lang.id
                    ? `${lang.bgColor} ${lang.color}`
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="text-lg">{lang.icon}</span>
                {lang.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Operations Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sticky top-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Operations
              </h3>
              <div className="space-y-1">
                {OPERATIONS.map((op) => (
                  <button
                    key={op.id}
                    onClick={() => setSelectedOperation(op.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                      selectedOperation === op.id
                        ? 'bg-indigo-50 text-indigo-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{op.name}</span>
                      {selectedOperation === op.id && (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{op.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Code Panel */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Code Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-3">
                  <span className={`text-xl`}>{currentLang.icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {OPERATIONS.find(o => o.id === selectedOperation)?.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {currentLang.name} • {currentLang.fileExt}
                    </p>
                  </div>
                </div>
                <button
                  onClick={copyCode}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    copiedCode
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>

              {/* Code Block */}
              <div className="bg-[#1a1a2e] p-6 overflow-x-auto">
                <pre className="text-sm font-mono leading-relaxed">
                  <code
                    className="text-gray-300"
                    dangerouslySetInnerHTML={{
                      __html: getHighlightedCode(currentCode, selectedLanguage)
                    }}
                  />
                </pre>
              </div>

              {/* Installation Note */}
              {selectedOperation === 'install' && currentLang.installCmd && (
                <div className="px-6 py-4 border-t border-gray-100 bg-amber-50">
                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">Quick Install</p>
                      <code className="text-sm text-amber-700 font-mono">
                        {currentLang.installCmd}
                      </code>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Terminal className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Test in Sandbox</h4>
                    <p className="text-sm text-gray-600">
                      Use <code className="bg-indigo-100 px-1.5 py-0.5 rounded text-indigo-700 text-xs">nxqr_test_xxx</code> keys
                      with the sandbox URL for safe testing.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-100">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Book className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Full Documentation</h4>
                    <p className="text-sm text-gray-600">
                      Check out the <a href="/api/reference" className="text-emerald-600 font-medium hover:underline">API Reference</a> for
                      complete endpoint documentation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiSDKExamples;
