import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, Loader2, QrCode } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);

  const { signInWithGoogle, signInWithMagicLink, user, setAuthStatus } = useAuth();

  // Create modal container on mount
  useEffect(() => {
    const modalRoot = document.createElement('div');
    modalRoot.id = 'auth-modal-root';
    document.body.appendChild(modalRoot);
    modalRef.current = modalRoot;

    return () => {
      if (modalRef.current && document.body.contains(modalRef.current)) {
        document.body.removeChild(modalRef.current);
      }
    };
  }, []);

  // Handle visibility with animation
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setShowEmailForm(false);
        setEmail('');
        setError(null);
        setMessage(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Auto-close when user logs in successfully
  useEffect(() => {
    if (user && isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [user, isOpen, onClose]);

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    setAuthStatus('authenticating');
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setError(error.message);
        setLoading(false);
        setAuthStatus('unauthenticated');
      }
    } catch (err) {
      setError('Failed to sign in with Google');
      setLoading(false);
      setAuthStatus('unauthenticated');
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (signInWithMagicLink) {
        const { error } = await signInWithMagicLink(email);
        if (error) {
          setError(error.message);
        } else {
          setMessage('Check your email for the magic link!');
        }
      } else {
        setShowEmailForm(true);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Don't render if not visible or modal root not ready
  if (!isVisible || !modalRef.current) return null;

  const modalContent = (
    <div
      className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-all duration-300 ${
        isAnimating ? 'bg-black/50 backdrop-blur-sm' : 'bg-black/0'
      }`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`bg-gradient-to-b from-gray-50 to-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden relative transition-all duration-300 ${
          isAnimating ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
        }`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all z-10"
        >
          <X size={18} />
        </button>

        {/* Content */}
        <div className="px-8 pt-14 pb-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center shadow-lg shadow-gray-900/20">
              <QrCode className="w-9 h-9 text-white" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-3">
            <h2 className="text-2xl font-bold text-gray-900 leading-tight">
              Sign in to manage your account
            </h2>
          </div>

          {/* Privacy notice */}
          <p className="text-center text-sm text-gray-500 mb-8">
            By continuing, you agree to our{' '}
            <a href="#" className="text-gray-900 underline underline-offset-2 hover:text-gray-700 transition-colors">
              Privacy Policy
            </a>
          </p>

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-gray-900 text-white py-4 px-5 rounded-xl font-semibold hover:bg-gray-800 active:scale-[0.98] transition-all duration-200 mb-4 shadow-lg shadow-gray-900/20"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="#fff"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#fff"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#fff"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#fff"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 bg-gradient-to-b from-gray-50 to-white text-gray-400 text-sm">or</span>
            </div>
          </div>

          {/* Email Input */}
          <form onSubmit={handleEmailSubmit}>
            <div className="relative mb-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-4 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:ring-4 focus:ring-gray-900/10 transition-all duration-200 outline-none text-base"
                placeholder="Enter your email"
                required
              />
            </div>

            {/* Email Continue Button */}
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-200 text-gray-600 py-4 px-5 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Mail size={20} />
              )}
              Continue with Email
            </button>
          </form>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm mt-4">
              <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <X size={12} />
              </div>
              {error}
            </div>
          )}

          {/* Success message */}
          {message && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-100 text-green-600 px-4 py-3 rounded-xl text-sm mt-4">
              <Mail size={16} className="flex-shrink-0" />
              {message}
            </div>
          )}
        </div>

        {/* Close text button */}
        <div className="border-t border-gray-100 py-4">
          <button
            onClick={onClose}
            className="w-full text-center text-gray-500 hover:text-gray-900 font-medium transition-colors text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  // Use createPortal to render outside main React tree - prevents DOM conflicts
  return createPortal(modalContent, modalRef.current);
}
