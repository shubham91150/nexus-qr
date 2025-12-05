import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tyuambzppjfvwxkmpgma.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5dWFtYnpwcGpmdnd4a21wZ21hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDU3MDksImV4cCI6MjA4MDUyMTcwOX0.4-OxuDsfxDf4M5_Xe06x9TC_7hgodZJZp-xzO0U68bA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database
export interface DynamicQRCode {
  id: string;
  user_id: string;
  short_code: string;
  title: string;
  destination_url: string;
  qr_style: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

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
  referrer: string | null;
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
