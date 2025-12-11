import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization of Supabase client
let supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (supabase) return supabase;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase environment variables not configured');
    return null;
  }

  supabase = createClient(supabaseUrl, supabaseServiceKey);
  return supabase;
}

// Validate GPS coordinates
function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180 &&
    !isNaN(lat) && !isNaN(lng)
  );
}

// Validate UUID format
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Get Supabase client
  const db = getSupabaseClient();
  if (!db) {
    console.error('Supabase client not initialized');
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  try {
    const { qr_id, latitude, longitude, accuracy, timestamp } = req.body;

    // Validate required fields
    if (!qr_id || latitude === undefined || longitude === undefined) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Validate QR ID format
    if (!isValidUUID(qr_id)) {
      res.status(400).json({ error: 'Invalid QR ID format' });
      return;
    }

    // Validate coordinates
    if (!isValidCoordinate(latitude, longitude)) {
      res.status(400).json({ error: 'Invalid coordinates' });
      return;
    }

    // Validate accuracy if provided
    const validAccuracy = typeof accuracy === 'number' && accuracy >= 0 ? accuracy : null;

    // Validate timestamp if provided
    let validTimestamp = new Date().toISOString();
    if (timestamp) {
      const parsedDate = new Date(timestamp);
      if (!isNaN(parsedDate.getTime())) {
        validTimestamp = parsedDate.toISOString();
      }
    }

    // First, verify the QR code exists and has GPS tracking enabled
    const { data: qrCode, error: qrError } = await db
      .from('dynamic_qr_codes')
      .select('id, gps_tracking_config')
      .eq('id', qr_id)
      .single();

    if (qrError || !qrCode) {
      res.status(404).json({ error: 'QR code not found' });
      return;
    }

    // Check if GPS tracking is enabled for this QR
    const gpsConfig = qrCode.gps_tracking_config as {
      enabled?: boolean;
      store_for_heatmap?: boolean;
    } | null;

    if (!gpsConfig?.enabled || !gpsConfig?.store_for_heatmap) {
      // GPS tracking not enabled, just acknowledge
      res.status(200).json({ success: true, stored: false });
      return;
    }

    // Store the GPS location in qr_scans table
    // Find the most recent scan for this QR (within last 5 minutes) and update it
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    // Get the IP from request to match the scan
    const forwarded = req.headers['x-forwarded-for'];
    const clientIP = typeof forwarded === 'string'
      ? forwarded.split(',')[0].trim()
      : req.headers['x-real-ip'] as string || '';

    // Try to update the most recent scan with GPS data
    const { data: updatedScan, error: updateError } = await db
      .from('qr_scans')
      .update({
        latitude,
        longitude,
        accuracy: validAccuracy,
        location_timestamp: validTimestamp,
      })
      .eq('qr_id', qr_id)
      .gte('scanned_at', fiveMinutesAgo)
      .is('latitude', null) // Only update if not already set
      .order('scanned_at', { ascending: false })
      .limit(1)
      .select()
      .single();

    if (updateError && updateError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine
      console.error('Error updating scan with GPS:', updateError);
    }

    // If no recent scan found, insert a new GPS-only record
    if (!updatedScan) {
      const { error: insertError } = await db
        .from('qr_scans')
        .insert({
          qr_id,
          latitude,
          longitude,
          accuracy: validAccuracy,
          location_timestamp: validTimestamp,
          ip_address: clientIP || null,
        });

      if (insertError) {
        console.error('Error inserting GPS location:', insertError);
        res.status(500).json({ error: 'Failed to store location' });
        return;
      }
    }

    res.status(200).json({ success: true, stored: true });
  } catch (err) {
    console.error('Track location error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
