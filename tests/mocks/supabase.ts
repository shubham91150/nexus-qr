import { vi } from 'vitest';

// Mock Supabase client
export const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  channel: vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
  }),
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
  },
};

// Mock QR codes data
export const mockQRCodes = [
  {
    id: 'qr-1',
    user_id: 'user-1',
    short_code: 'abc123',
    title: 'Test QR 1',
    destination_url: 'https://example.com',
    qr_style: {},
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'qr-2',
    user_id: 'user-1',
    short_code: 'def456',
    title: 'Test QR 2',
    destination_url: 'https://example2.com',
    qr_style: {},
    is_active: false,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    folder_id: 'folder-1',
  },
];

// Mock folders data
export const mockFolders = [
  {
    id: 'folder-1',
    user_id: 'user-1',
    name: 'Marketing',
    color: '#6366f1',
    icon: 'folder',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'folder-2',
    user_id: 'user-1',
    name: 'Sales',
    color: '#22c55e',
    icon: 'folder',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
];

// Mock user
export const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00Z',
};

// Mock scans data
export const mockScans = [
  {
    id: 'scan-1',
    qr_id: 'qr-1',
    scanned_at: '2024-01-15T10:00:00Z',
    country: 'India',
    city: 'Mumbai',
    device_type: 'mobile',
    browser: 'Chrome',
    os: 'Android',
  },
  {
    id: 'scan-2',
    qr_id: 'qr-1',
    scanned_at: '2024-01-15T11:00:00Z',
    country: 'USA',
    city: 'New York',
    device_type: 'desktop',
    browser: 'Firefox',
    os: 'Windows',
  },
];
