import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to handle OAuth callback with PKCE flow support
async function handleOAuthCallback(): Promise<{ success: boolean }> {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const accessToken = hashParams.get('access_token');

  // Clean URL helper
  const cleanUrl = () => {
    const clean = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, clean);
  };

  // Handle PKCE flow (code in query params)
  if (code) {
    try {
      // Check if we have a code verifier in storage (required for PKCE)
      const codeVerifier = sessionStorage.getItem('supabase.auth.code_verifier') ||
                          localStorage.getItem('supabase.auth.code_verifier');

      if (!codeVerifier) {
        console.warn('No code verifier found, checking existing session...');
        // Code verifier missing - might already be exchanged, check session
        const { data: { session } } = await supabase.auth.getSession();
        cleanUrl();
        return { success: !!session };
      }

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        // If code already used or invalid, try getting existing session
        if (error.message?.includes('invalid') ||
            error.message?.includes('expired') ||
            error.message?.includes('non-empty')) {
          console.warn('Code exchange failed, checking existing session...');
          const { data: { session } } = await supabase.auth.getSession();
          cleanUrl();
          return { success: !!session };
        }

        console.error('Code exchange error:', error.message);
        cleanUrl();
        return { success: false };
      }

      cleanUrl();
      return { success: !!data.session };
    } catch (err) {
      console.error('OAuth callback error:', err);
      cleanUrl();
      // Try to get existing session on error
      try {
        const { data: { session } } = await supabase.auth.getSession();
        return { success: !!session };
      } catch {
        return { success: false };
      }
    }
  }

  // Handle implicit flow (tokens in hash - fallback)
  if (accessToken) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      cleanUrl();
      return { success: !!session };
    } catch (err) {
      console.error('Hash token handling error:', err);
      cleanUrl();
      return { success: false };
    }
  }

  return { success: false };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        // Check if there's an OAuth callback to handle
        const url = new URL(window.location.href);
        const hasAuthCode = url.searchParams.has('code');
        const hasHashToken = window.location.hash.includes('access_token');

        if (hasAuthCode || hasHashToken) {
          // Handle OAuth callback
          await handleOAuthCallback();
        }

        // Get current session
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();

        if (error) {
          // If refresh token error, clear and start fresh
          if (error.message?.includes('Refresh Token') ||
              error.message?.includes('refresh_token')) {
            console.warn('Invalid refresh token, signing out...');
            await supabase.auth.signOut();
            if (isMounted) {
              setSession(null);
              setUser(null);
              setLoading(false);
            }
            return;
          }
          console.warn('Session retrieval error:', error.message);
        }

        if (isMounted) {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          setLoading(false);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (isMounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return;

        console.log('Auth state changed:', event);

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(newSession);
          setUser(newSession?.user ?? null);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
        } else if (event === 'USER_UPDATED') {
          setSession(newSession);
          setUser(newSession?.user ?? null);
        } else {
          // For other events, just update if we have a session
          setSession(newSession);
          setUser(newSession?.user ?? null);
        }
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
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
