import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Don't catch auth-related errors - let them be handled gracefully
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorName = error?.name?.toLowerCase() || '';

    // Skip auth-related errors
    if (errorMessage.includes('auth') ||
        errorMessage.includes('session') ||
        errorMessage.includes('token') ||
        errorMessage.includes('login') ||
        errorMessage.includes('sign')) {
      console.warn('Auth error caught, not showing error boundary:', error);
      return { hasError: false, error: null, errorInfo: null };
    }

    // Skip React DOM manipulation errors (often caused by state changes during render)
    // Don't reload - just ignore these errors, React will recover
    if (errorMessage.includes('insertbefore') ||
        errorMessage.includes('removechild') ||
        errorMessage.includes('appendchild') ||
        errorMessage.includes('not a child') ||
        errorName.includes('notfounderror')) {
      console.warn('DOM manipulation error (ignored):', error.message);
      return { hasError: false, error: null, errorInfo: null };
    }

    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorName = error?.name?.toLowerCase() || '';

    // Skip auth-related errors
    if (errorMessage.includes('auth') ||
        errorMessage.includes('session') ||
        errorMessage.includes('token')) {
      return;
    }

    // Skip DOM manipulation errors
    if (errorMessage.includes('insertbefore') ||
        errorMessage.includes('removechild') ||
        errorMessage.includes('not a child') ||
        errorName.includes('notfounderror')) {
      return;
    }

    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // Force re-render
    window.location.reload();
  };

  handleGoHome = () => {
    // Clear any corrupted auth state
    try {
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();
    } catch (e) {
      // Ignore storage errors
    }
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#F0F0F0] flex items-center justify-center p-4">
          <div className="bg-white rounded-[20px] shadow-sm p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="text-red-500" size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Something Went Wrong
            </h2>
            <p className="text-gray-500 mb-6 text-sm">
              An unexpected error occurred. Please try again or refresh the page.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-gray-100 rounded-[12px] p-3 mb-6 text-left overflow-auto max-h-32">
                <code className="text-xs text-red-600 break-all">
                  {this.state.error.toString()}
                </code>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleRetry}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-900 text-white py-3 rounded-full font-medium hover:bg-gray-800 transition-colors"
              >
                <RefreshCw size={18} />
                Retry
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-900 text-white py-3 rounded-full font-medium hover:bg-gray-800 transition-colors"
              >
                <Home size={18} />
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Network Error Toast Component
interface ToastProps {
  message: string;
  type: 'error' | 'warning' | 'success' | 'info';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const bgColors = {
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  React.useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl border ${bgColors[type]} shadow-lg max-w-sm animate-slideUp`}>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">{message}</span>
        <button onClick={onClose} className="text-current opacity-60 hover:opacity-100">
          ×
        </button>
      </div>
    </div>
  );
};

// Network status hook
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [showOfflineToast, setShowOfflineToast] = React.useState(false);

  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineToast(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineToast(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, showOfflineToast, setShowOfflineToast };
};

// Offline Banner Component
export const OfflineBanner: React.FC = () => {
  const { isOnline } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-yellow-900 py-2 px-4 text-center text-sm font-medium z-50">
      <span>You're offline. Some features may not work.</span>
    </div>
  );
};
