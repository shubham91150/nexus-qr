/**
 * Nexus QR - Supabase Client for MCP Server
 *
 * Connects to the same Supabase backend as the main app for dynamic QR management.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration (same as main app)
const supabaseUrl = 'https://tyuambzppjfvwxkmpgma.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5dWFtYnpwcGpmdnd4a21wZ21hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDU3MDksImV4cCI6MjA4MDUyMTcwOX0.4-OxuDsfxDf4M5_Xe06x9TC_7hgodZJZp-xzO0U68bA';

// Create Supabase client
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Base URL for short URLs (production)
export const BASE_URL = process.env.NEXUS_QR_BASE_URL || 'https://nexusqr.app';

// Dynamic QR Code interface (matches main app)
export interface DynamicQRCode {
  id: string;
  user_id: string;
  short_code: string;
  title: string;
  destination_url: string;
  qr_style: Record<string, unknown>;
  is_active: boolean;
  scan_count: number;
  created_at: string;
  updated_at: string;
  expires_at?: string | null;
}

// QR Scan interface
export interface QRScan {
  id: string;
  qr_id: string;
  scanned_at: string;
  ip_address: string | null;
  country: string | null;
  city: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
}

// Generate unique short code
export function generateShortCode(length: number = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// API Key based authentication for MCP
// Users will provide their API key which maps to their user_id
export async function getUserIdFromApiKey(apiKey: string): Promise<string | null> {
  // For now, we'll use a simple approach where the API key IS the user_id
  // In production, you'd have an api_keys table mapping keys to users
  if (!apiKey || apiKey.length < 10) {
    return null;
  }
  return apiKey;
}

// Create a dynamic QR code
export async function createDynamicQR(params: {
  userId: string;
  title: string;
  destinationUrl: string;
  customAlias?: string;
}): Promise<{ success: boolean; data?: DynamicQRCode; shortUrl?: string; error?: string }> {
  try {
    // Generate or use custom short code
    let shortCode = params.customAlias || generateShortCode();
    let attempts = 0;
    const maxAttempts = params.customAlias ? 1 : 5;

    while (attempts < maxAttempts) {
      const { data, error } = await supabase
        .from('dynamic_qr_codes')
        .insert({
          user_id: params.userId,
          short_code: shortCode,
          title: params.title,
          destination_url: params.destinationUrl,
          qr_style: {},
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          // Duplicate short_code
          if (params.customAlias) {
            return { success: false, error: 'This custom URL is already taken. Please choose another.' };
          }
          shortCode = generateShortCode();
          attempts++;
          continue;
        }
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: data as DynamicQRCode,
        shortUrl: `${BASE_URL}/r/${shortCode}`,
      };
    }

    return { success: false, error: 'Failed to generate unique short code. Please try again.' };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// Update destination URL of a dynamic QR
export async function updateDynamicQRUrl(params: {
  userId: string;
  shortCode: string;
  newUrl: string;
}): Promise<{ success: boolean; data?: DynamicQRCode; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('dynamic_qr_codes')
      .update({ destination_url: params.newUrl })
      .eq('short_code', params.shortCode)
      .eq('user_id', params.userId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'QR code not found or you do not have permission to edit it.' };
    }

    return { success: true, data: data as DynamicQRCode };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// Get analytics for a dynamic QR
export async function getDynamicQRAnalytics(params: {
  userId: string;
  shortCode: string;
}): Promise<{ success: boolean; qr?: DynamicQRCode; scans?: QRScan[]; analytics?: Record<string, unknown>; error?: string }> {
  try {
    // Get QR code
    const { data: qrData, error: qrError } = await supabase
      .from('dynamic_qr_codes')
      .select('*')
      .eq('short_code', params.shortCode)
      .eq('user_id', params.userId)
      .single();

    if (qrError || !qrData) {
      return { success: false, error: 'QR code not found or you do not have permission to view it.' };
    }

    // Get recent scans
    const { data: scansData, error: scansError } = await supabase
      .from('qr_scans')
      .select('*')
      .eq('qr_id', qrData.id)
      .order('scanned_at', { ascending: false })
      .limit(100);

    if (scansError) {
      return { success: false, error: scansError.message };
    }

    // Compute analytics
    const scans = scansData as QRScan[];
    const deviceCounts: Record<string, number> = {};
    const countryCounts: Record<string, number> = {};
    const browserCounts: Record<string, number> = {};

    for (const scan of scans) {
      if (scan.device_type) {
        deviceCounts[scan.device_type] = (deviceCounts[scan.device_type] || 0) + 1;
      }
      if (scan.country) {
        countryCounts[scan.country] = (countryCounts[scan.country] || 0) + 1;
      }
      if (scan.browser) {
        browserCounts[scan.browser] = (browserCounts[scan.browser] || 0) + 1;
      }
    }

    return {
      success: true,
      qr: qrData as DynamicQRCode,
      scans,
      analytics: {
        totalScans: qrData.scan_count || scans.length,
        recentScans: scans.length,
        byDevice: deviceCounts,
        byCountry: countryCounts,
        byBrowser: browserCounts,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// List user's dynamic QR codes
export async function listDynamicQRs(params: {
  userId: string;
  limit?: number;
}): Promise<{ success: boolean; qrCodes?: DynamicQRCode[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('dynamic_qr_codes')
      .select('*')
      .eq('user_id', params.userId)
      .order('created_at', { ascending: false })
      .limit(params.limit || 50);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, qrCodes: data as DynamicQRCode[] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// Delete a dynamic QR
export async function deleteDynamicQR(params: {
  userId: string;
  shortCode: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('dynamic_qr_codes')
      .delete()
      .eq('short_code', params.shortCode)
      .eq('user_id', params.userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// Toggle active status
export async function toggleDynamicQRStatus(params: {
  userId: string;
  shortCode: string;
  isActive: boolean;
}): Promise<{ success: boolean; data?: DynamicQRCode; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('dynamic_qr_codes')
      .update({ is_active: params.isActive })
      .eq('short_code', params.shortCode)
      .eq('user_id', params.userId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as DynamicQRCode };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
