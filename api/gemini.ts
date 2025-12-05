import type { VercelRequest, VercelResponse } from '@vercel/node';

// ============================================
// SECURITY CONFIGURATION
// ============================================

const MAX_PROMPT_LENGTH = 1000; // Maximum characters allowed in prompt
const MAX_REQUEST_SIZE = 10 * 1024; // 10KB max request size
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // Max requests per window per IP

// In-memory rate limiting (resets on cold start, but provides basic protection)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Allowed origins (add your production domain here)
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://localhost:3000',
  // Add your Vercel production URL after deployment
  // 'https://your-app.vercel.app',
];

// ============================================
// SECURITY HELPER FUNCTIONS
// ============================================

/**
 * Get client IP address from request
 */
function getClientIP(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * Check rate limit for IP
 */
function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - record.count };
}

/**
 * Validate and sanitize input
 */
function validateInput(body: unknown): { valid: boolean; prompt?: string; error?: string } {
  // Check if body exists and is an object
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const { prompt } = body as { prompt?: unknown };

  // Check if prompt exists and is a string
  if (!prompt || typeof prompt !== 'string') {
    return { valid: false, error: 'Prompt is required and must be a string' };
  }

  // Check prompt length
  const trimmedPrompt = prompt.trim();
  if (trimmedPrompt.length === 0) {
    return { valid: false, error: 'Prompt cannot be empty' };
  }

  if (trimmedPrompt.length > MAX_PROMPT_LENGTH) {
    return { valid: false, error: `Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters` };
  }

  // Basic sanitization - remove potential injection patterns
  // Note: Gemini API handles its own sanitization, but we add a layer
  const sanitizedPrompt = trimmedPrompt
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .substring(0, MAX_PROMPT_LENGTH);

  return { valid: true, prompt: sanitizedPrompt };
}

/**
 * Set security headers
 */
function setSecurityHeaders(res: VercelResponse, origin: string | undefined): void {
  // CORS - only allow specific origins
  if (origin && ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed) || allowed === '*')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'none'");
}

/**
 * Log security event (without sensitive data)
 */
function logSecurityEvent(event: string, ip: string, details?: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[SECURITY] ${timestamp} | ${event} | IP: ${ip}${details ? ` | ${details}` : ''}`);
}

// ============================================
// GEMINI API CONFIGURATION
// ============================================

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const SYSTEM_INSTRUCTION = `
You are an expert helper for a QR Code Generator app.
Your goal is to translate user intent into the correct raw string format for QR codes.

Rules:
1. If the user asks for WiFi, return strict format: WIFI:S:MySSID;T:WPA;P:MyPass;;
2. If the user asks for a Contact/VCard, return strict VCard 3.0 format.
3. If the user asks for a URL, return the clean URL.
4. If the user asks for an Email/SMS, return 'mailto:...' or 'smsto:...'.
5. If the user wants a summary or creative text, provide just the text.
6. Return ONLY the raw string for the QR code. No markdown, no explanations.

Examples:
Input: "Wifi for HomeNetwork password secure123"
Output: WIFI:T:WPA;S:HomeNetwork;P:secure123;;

Input: "Email to john@example.com subject Hello body How are you"
Output: mailto:john@example.com?subject=Hello&body=How%20are%20you
`;

// ============================================
// MAIN HANDLER
// ============================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const origin = req.headers.origin as string | undefined;
  const clientIP = getClientIP(req);

  // Set security headers for all responses
  setSecurityHeaders(res, origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST method
  if (req.method !== 'POST') {
    logSecurityEvent('INVALID_METHOD', clientIP, `Method: ${req.method}`);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Check Content-Type
  const contentType = req.headers['content-type'];
  if (!contentType || !contentType.includes('application/json')) {
    logSecurityEvent('INVALID_CONTENT_TYPE', clientIP);
    res.status(400).json({ error: 'Content-Type must be application/json' });
    return;
  }

  // Check request size (Vercel handles this, but we add explicit check)
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > MAX_REQUEST_SIZE) {
    logSecurityEvent('REQUEST_TOO_LARGE', clientIP, `Size: ${contentLength}`);
    res.status(413).json({ error: 'Request too large' });
    return;
  }

  // Rate limiting
  const rateLimit = checkRateLimit(clientIP);
  res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS.toString());
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());

  if (!rateLimit.allowed) {
    logSecurityEvent('RATE_LIMIT_EXCEEDED', clientIP);
    res.status(429).json({ error: 'Too many requests. Please try again later.' });
    return;
  }

  // Validate API key exists (server-side only)
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[ERROR] GEMINI_API_KEY not configured');
    res.status(500).json({ error: 'Service configuration error' });
    return;
  }

  // Validate and sanitize input
  const validation = validateInput(req.body);
  if (!validation.valid) {
    logSecurityEvent('INVALID_INPUT', clientIP, validation.error);
    res.status(400).json({ error: validation.error });
    return;
  }

  const { prompt } = validation;

  try {
    // Call Gemini API
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        systemInstruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }]
        },
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 500,
        }
      }),
    });

    if (!response.ok) {
      const errorStatus = response.status;
      logSecurityEvent('GEMINI_API_ERROR', clientIP, `Status: ${errorStatus}`);

      // Don't expose detailed API errors to client
      if (errorStatus === 429) {
        res.status(429).json({ error: 'Service temporarily unavailable. Please try again later.' });
      } else {
        res.status(502).json({ error: 'Failed to generate content' });
      }
      return;
    }

    const data = await response.json();

    // Extract text from Gemini response
    const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      res.status(502).json({ error: 'Invalid response from AI service' });
      return;
    }

    // Success - return only the generated text
    res.status(200).json({
      success: true,
      content: generatedText.trim()
    });

  } catch (error) {
    // Log error internally but don't expose details
    console.error('[ERROR] Gemini API call failed:', error instanceof Error ? error.message : 'Unknown error');
    logSecurityEvent('API_CALL_FAILED', clientIP);

    res.status(500).json({ error: 'An unexpected error occurred' });
  }
}
