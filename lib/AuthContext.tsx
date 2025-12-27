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

          try {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);

            // Clean URL after exchange attempt (success or failure)
            window.history.replaceState({}, '', url.origin + url.pathname);

            if (error) {
              console.error('Code exchange error:', error.message);
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
            oauthInProgress = false;
            // Reset flag so user can try again
            codeExchangeAttempted = false;
            if (mounted) {
              setAuthStatus('unauthenticated');
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
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
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
