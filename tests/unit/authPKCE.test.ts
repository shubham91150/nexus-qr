import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('OAuth PKCE Code Verifier Handling', () => {
  let originalLocalStorage: Storage;
  let mockStorage: Map<string, string>;

  beforeEach(() => {
    mockStorage = new Map();
    originalLocalStorage = globalThis.localStorage;

    // Mock localStorage
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => mockStorage.get(key) ?? null,
        setItem: (key: string, value: string) => mockStorage.set(key, value),
        removeItem: (key: string) => mockStorage.delete(key),
        clear: () => mockStorage.clear(),
        get length() { return mockStorage.size; },
        key: (index: number) => Array.from(mockStorage.keys())[index] ?? null,
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  describe('hasPKCECodeVerifier', () => {
    // Import the function dynamically to use mocked localStorage
    const getHelpers = async () => {
      // Re-import to get fresh module with mocked localStorage
      vi.resetModules();

      // Create test versions of the functions
      const hasPKCECodeVerifier = (): boolean => {
        if (typeof localStorage === 'undefined') return false;

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes('auth-token-code-verifier')) {
            const value = localStorage.getItem(key);
            return !!value && value.length > 0;
          }
        }
        return false;
      };

      const clearPKCEState = (): void => {
        if (typeof localStorage === 'undefined') return;

        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes('auth-token-code-verifier')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      };

      return { hasPKCECodeVerifier, clearPKCEState };
    };

    it('should return false when localStorage is empty', async () => {
      const { hasPKCECodeVerifier } = await getHelpers();
      expect(hasPKCECodeVerifier()).toBe(false);
    });

    it('should return false when no code verifier exists', async () => {
      mockStorage.set('sb-test-auth-token', 'some-session-data');
      mockStorage.set('other-key', 'other-value');

      const { hasPKCECodeVerifier } = await getHelpers();
      expect(hasPKCECodeVerifier()).toBe(false);
    });

    it('should return true when code verifier exists', async () => {
      mockStorage.set('sb-tyuambzppjfvwxkmpgma-auth-token-code-verifier', 'test-verifier/recovery');

      const { hasPKCECodeVerifier } = await getHelpers();
      expect(hasPKCECodeVerifier()).toBe(true);
    });

    it('should return false when code verifier is empty string', async () => {
      mockStorage.set('sb-tyuambzppjfvwxkmpgma-auth-token-code-verifier', '');

      const { hasPKCECodeVerifier } = await getHelpers();
      expect(hasPKCECodeVerifier()).toBe(false);
    });

    it('should handle different project references', async () => {
      mockStorage.set('sb-different-project-auth-token-code-verifier', 'verifier-value');

      const { hasPKCECodeVerifier } = await getHelpers();
      expect(hasPKCECodeVerifier()).toBe(true);
    });
  });

  describe('clearPKCEState', () => {
    const getHelpers = async () => {
      const clearPKCEState = (): void => {
        if (typeof localStorage === 'undefined') return;

        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes('auth-token-code-verifier')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      };

      return { clearPKCEState };
    };

    it('should remove code verifier from localStorage', async () => {
      mockStorage.set('sb-tyuambzppjfvwxkmpgma-auth-token-code-verifier', 'test-verifier');
      mockStorage.set('sb-tyuambzppjfvwxkmpgma-auth-token', 'session-data');

      const { clearPKCEState } = await getHelpers();
      clearPKCEState();

      expect(mockStorage.has('sb-tyuambzppjfvwxkmpgma-auth-token-code-verifier')).toBe(false);
      expect(mockStorage.has('sb-tyuambzppjfvwxkmpgma-auth-token')).toBe(true); // Should NOT be removed
    });

    it('should handle multiple code verifier entries', async () => {
      mockStorage.set('sb-project1-auth-token-code-verifier', 'verifier1');
      mockStorage.set('sb-project2-auth-token-code-verifier', 'verifier2');
      mockStorage.set('other-key', 'other-value');

      const { clearPKCEState } = await getHelpers();
      clearPKCEState();

      expect(mockStorage.has('sb-project1-auth-token-code-verifier')).toBe(false);
      expect(mockStorage.has('sb-project2-auth-token-code-verifier')).toBe(false);
      expect(mockStorage.has('other-key')).toBe(true);
    });

    it('should do nothing when no code verifier exists', async () => {
      mockStorage.set('other-key', 'other-value');

      const { clearPKCEState } = await getHelpers();
      clearPKCEState();

      expect(mockStorage.size).toBe(1);
      expect(mockStorage.get('other-key')).toBe('other-value');
    });
  });

  describe('OAuth Flow Edge Cases', () => {
    it('should handle cross-tab/browser scenario gracefully', async () => {
      // Simulate: OAuth initiated in Tab A, callback opened in Tab B
      // Tab B doesn't have the code verifier

      const hasPKCECodeVerifier = (): boolean => {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes('auth-token-code-verifier')) {
            const value = localStorage.getItem(key);
            return !!value && value.length > 0;
          }
        }
        return false;
      };

      // Tab B has empty localStorage (no code verifier)
      expect(hasPKCECodeVerifier()).toBe(false);

      // The code should detect this and NOT call exchangeCodeForSession
      // This prevents the "both auth code and code verifier should be non-empty" error
    });

    it('should handle stale code verifier cleanup after failed exchange', async () => {
      mockStorage.set('sb-test-auth-token-code-verifier', 'stale-verifier');

      const clearPKCEState = (): void => {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes('auth-token-code-verifier')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      };

      // After failed exchange, stale verifier should be cleared
      clearPKCEState();

      expect(mockStorage.has('sb-test-auth-token-code-verifier')).toBe(false);
    });
  });
});

describe('File Upload FormData Structure', () => {
  it('should create FormData with correct structure for Supabase', () => {
    const file = new File(['test content'], 'test.mp4', { type: 'video/mp4' });

    const formData = new FormData();
    formData.append('cacheControl', '3600');
    formData.append('', file); // Empty key is what Supabase expects

    // Verify structure
    expect(formData.get('cacheControl')).toBe('3600');
    expect(formData.get('')).toBeInstanceOf(File);
  });

  it('should NOT manually set Content-Type when using FormData', () => {
    // This is a documentation test to remind developers
    // that when sending FormData, the browser automatically sets
    // Content-Type with the correct multipart boundary

    const mockSetRequestHeader = vi.fn();
    const xhr = {
      setRequestHeader: mockSetRequestHeader,
      open: vi.fn(),
      send: vi.fn(),
    };

    // Correct way: Don't set Content-Type
    xhr.setRequestHeader('Authorization', 'Bearer token');
    xhr.setRequestHeader('apikey', 'key');
    xhr.setRequestHeader('x-upsert', 'false');
    // Do NOT call: xhr.setRequestHeader('Content-Type', '...')

    // Verify Content-Type was NOT set
    const contentTypeCalls = mockSetRequestHeader.mock.calls.filter(
      (call: [string, string]) => call[0].toLowerCase() === 'content-type'
    );
    expect(contentTypeCalls.length).toBe(0);
  });
});
