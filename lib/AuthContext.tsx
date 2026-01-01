import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type AuthStatus = 'initializing' | 'authenticating' | 'authenticated' | 'unauthenticated';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authStatus: AuthStatus;
  setAuthStatus: (status: AuthStatus) => void;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Module-level flags to prevent double code exchange in StrictMode
// Reset on page load to handle different devices/sessions
let codeExchangeAttempted = false;
let oauthInProgress = false;

// Reset flags on page load
if (typeof window !== 'undefined') {
  codeExchangeAttempted = false;
  oauthInProgress = false;
}

// Helper to check if PKCE code verifier exists in localStorage
function hasPKCECodeVerifier(): boolean {
  if (typeof localStorage === 'undefined') return false;

  // Supabase stores code verifier with key pattern: sb-<project-ref>-auth-token-code-verifier
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes('auth-token-code-verifier')) {
      const value = localStorage.getItem(key);
      return !!value && value.length > 0;
    }
  }
  return false;
}

// Helper to clear stale PKCE state
function clearPKCEState(): void {
  if (typeof localStorage === 'undefined') return;

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes('auth-token-code-verifier')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('initializing');

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const errorParam = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');

        // Handle OAuth error (e.g., user cancelled)
        if (errorParam) {
          console.error('OAuth error:', errorParam, errorDescription);
          window.history.replaceState({}, '', url.origin + url.pathname);
          if (mounted) {
            setAuthStatus('unauthenticated');
            setLoading(false);
          }
          return;
        }

        // Handle OAuth code exchange (with StrictMode protection)
        if (code && !codeExchangeAttempted) {
          codeExchangeAttempted = true; // Prevent double execution
          oauthInProgress = true;
          if (mounted) setAuthStatus('authenticating');

          console.log('OAuth code found, exchanging for session...');

          // Check if PKCE code verifier exists before attempting exchange
          if (!hasPKCECodeVerifier()) {
            console.warn('PKCE code verifier not found - user may have opened callback in different browser/tab');
            // Clean URL and clear any stale state
            window.history.replaceState({}, '', url.origin + url.pathname);
            clearPKCEState();
            oauthInProgress = false;
            codeExchangeAttempted = false;
            if (mounted) {
              setAuthStatus('unauthenticated');
              setLoading(false);
            }
            // Fall through to getSession to check if user has an existing session
          } else {
            try {
              const { data, error } = await supabase.auth.exchangeCodeForSession(code);

              // Clean URL after exchange attempt (success or failure)
              window.history.replaceState({}, '', url.origin + url.pathname);

              if (error) {
                console.error('Code exchange error:', error.message);
                // Clear stale PKCE state on error
                clearPKCEState();
                oauthInProgress = false;
                // Reset flag so user can try again
                codeExchangeAttempted = false;
                if (mounted) {
                  setAuthStatus('unauthenticated');
                }
                // Fall through to getSession below
              } else if (data.session && mounted) {
                console.log('Session obtained from code exchange');
                setAuthStatus('authenticated');
                setSession(data.session);
                setUser(data.session.user);
                // Brief delay to show "Authenticated" state with checkmark
                await new Promise(resolve => setTimeout(resolve, 1200));
                oauthInProgress = false;
                setLoading(false);
                return;
              }
            } catch (err) {
              console.error('Code exchange exception:', err);
              window.history.replaceState({}, '', url.origin + url.pathname);
              // Clear stale PKCE state on exception
              clearPKCEState();
              oauthInProgress = false;
              // Reset flag so user can try again
              codeExchangeAttempted = false;
              if (mounted) {
                setAuthStatus('unauthenticated');
              }
            }
          }
        }

        // Get existing session (or after failed code exchange)
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();

        if (error) {
          console.warn('Session error:', error.message);
          if (error.message?.includes('Refresh Token') || error.message?.includes('invalid')) {
            await supabase.auth.signOut();
          }
        }

        if (mounted) {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          setAuthStatus(currentSession ? 'authenticated' : 'unauthenticated');
          setLoading(false);
        }
      } catch (err) {
        console.error('Auth init error:', err);
        oauthInProgress = false;
        if (mounted) {
          setSession(null);
          setUser(null);
          setAuthStatus('unauthenticated');
          setLoading(false);
        }
      }
    };

    initSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;

        console.log('Auth event:', event);
        setSession(newSession);
        setUser(newSession?.user ?? null);

        // Don't override loading state during OAuth flow
        // This allows our custom loading screen to show
        if (!oauthInProgress) {
          setAuthStatus(newSession ? 'authenticated' : 'unauthenticated');
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signInWithGoogle = async () => {
    // Use the full current URL as redirect, not just origin
    // This ensures PKCE verifier is found after redirect on Vercel preview deployments
    const currentUrl = window.location.href.split('?')[0]; // Remove any query params

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: currentUrl,
      },
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    authStatus,
    setAuthStatus,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
