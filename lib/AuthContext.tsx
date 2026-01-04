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

// Module-level flag to track OAuth in progress
let oauthInProgress = false;

// Reset flag on page load
if (typeof window !== 'undefined') {
  oauthInProgress = false;
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

        // Check for OAuth callback (tokens in URL hash for implicit flow)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');

        if (accessToken) {
          console.log('OAuth callback detected, processing session...');
          oauthInProgress = true;
          if (mounted) setAuthStatus('authenticating');

          // Clean URL (remove hash with tokens)
          window.history.replaceState({}, '', url.origin + url.pathname);
        }

        // Get session - Supabase automatically handles token from URL with detectSessionInUrl: true
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();

        if (error) {
          console.warn('Session error:', error.message);
          if (error.message?.includes('Refresh Token') || error.message?.includes('invalid')) {
            await supabase.auth.signOut();
          }
        }

        if (mounted) {
          if (currentSession) {
            console.log('Session found, user authenticated:', currentSession.user.email);
            setSession(currentSession);
            setUser(currentSession.user);
            setAuthStatus('authenticated');

            // Brief delay to show authenticated state if coming from OAuth
            if (oauthInProgress) {
              await new Promise(resolve => setTimeout(resolve, 1200));
              oauthInProgress = false;
            }
          } else {
            console.log('No session found');
            setAuthStatus('unauthenticated');
          }
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
