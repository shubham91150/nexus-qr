import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, Lock, Loader2, Eye, EyeOff, Sparkles, QrCode, Shield, Zap } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);

  const { signIn, signUp, signInWithGoogle, user, setAuthStatus } = useAuth();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (isLogin) {
        // Show full-screen loading for sign in
        setAuthStatus('authenticating');
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
          setAuthStatus('unauthenticated');
        } else {
          setAuthStatus('authenticated');
          // Brief delay to show authenticated state
          await new Promise(resolve => setTimeout(resolve, 800));
          onClose();
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          setError(error.message);
        } else {
          setMessage('Check your email for confirmation link!');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
      setAuthStatus('unauthenticated');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    // Immediately show full-screen loading
    setAuthStatus('authenticating');
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setError(error.message);
        setLoading(false);
        setAuthStatus('unauthenticated');
      }
      // Don't set loading to false here - page will redirect
    } catch (err) {
      setError('Failed to sign in with Google');
      setLoading(false);
      setAuthStatus('unauthenticated');
    }
  };

  // Don't render if not visible or modal root not ready
  if (!isVisible || !modalRef.current) return null;

  const features = [
    { icon: QrCode, text: 'Dynamic QR Codes' },
    { icon: Zap, text: 'Real-time Analytics' },
    { icon: Shield, text: 'Secure & Reliable' },
  ];

  const modalContent = (
    <div
      className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-all duration-300 ${
        isAnimating ? 'bg-black/60 backdrop-blur-sm' : 'bg-black/0'
      }`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden relative flex transition-all duration-300 ${
          isAnimating ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
        }`}
      >
        {/* Left Panel - Branding */}
        <div className="hidden md:flex md:w-2/5 bg-gradient-to-br from-gray-900 via-gray-800 to-black p-8 flex-col justify-between relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          {/* Logo and tagline */}
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                <QrCode className="w-7 h-7 text-gray-900" />
              </div>
              <span className="text-2xl font-bold text-white">Nexus QR</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">
              {isLogin ? 'Welcome back!' : 'Join Nexus QR'}
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              {isLogin
                ? 'Sign in to access your dashboard and manage your QR codes with powerful analytics.'
                : 'Create an account to start generating dynamic QR codes with real-time tracking.'}
            </p>
          </div>

          {/* Features list */}
          <div className="relative z-10 space-y-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3 text-gray-300">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <feature.icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Bottom decoration */}
          <div className="relative z-10 flex items-center gap-2 text-gray-500 text-xs">
            <Sparkles className="w-4 h-4" />
            <span>Trusted by 10,000+ businesses</span>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="flex-1 p-8 md:p-10 relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-all"
          >
            <X size={20} />
          </button>

          {/* Mobile Logo */}
          <div className="flex md:hidden items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Nexus QR</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              {isLogin ? 'Sign in to your account' : 'Create your account'}
            </h2>
            <p className="text-gray-500">
              {isLogin
                ? 'Enter your credentials to continue'
                : 'Start your free trial today'}
            </p>
          </div>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 py-3.5 px-4 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all duration-200 mb-6 group"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" className="group-hover:scale-110 transition-transform">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
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
              <span className="px-4 bg-white text-gray-400 text-sm">or continue with email</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email address
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-900 transition-colors" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-gray-900 focus:ring-4 focus:ring-gray-900/10 transition-all duration-200 outline-none"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-900 transition-colors" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:border-gray-900 focus:ring-4 focus:ring-gray-900/10 transition-all duration-200 outline-none"
                  placeholder="Enter your password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 flex items-center justify-center text-gray-400 hover:text-gray-600 focus:text-gray-600 focus:outline-none transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Forgot password link for login */}
            {isLogin && (
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm">
                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <X size={12} />
                </div>
                {error}
              </div>
            )}

            {/* Success message */}
            {message && (
              <div className="flex items-center gap-3 bg-green-50 border border-green-100 text-green-600 px-4 py-3 rounded-xl text-sm">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={12} />
                </div>
                {message}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white py-3.5 px-4 rounded-xl font-semibold hover:bg-gray-800 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-gray-900/20"
            >
              {loading && <Loader2 className="animate-spin" size={20} />}
              {isLogin ? 'Sign in' : 'Create account'}
            </button>
          </form>

          {/* Toggle */}
          <p className="text-center text-gray-500 mt-8">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setMessage(null);
              }}
              className="text-gray-900 font-semibold hover:underline underline-offset-2"
            >
              {isLogin ? 'Sign up for free' : 'Sign in'}
            </button>
          </p>

          {/* Terms */}
          {!isLogin && (
            <p className="text-center text-xs text-gray-400 mt-4">
              By signing up, you agree to our{' '}
              <a href="#" className="text-gray-600 hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-gray-600 hover:underline">Privacy Policy</a>
            </p>
          )}
        </div>
      </div>
    </div>
  );

  // Use createPortal to render outside main React tree - prevents DOM conflicts
  return createPortal(modalContent, modalRef.current);
}
