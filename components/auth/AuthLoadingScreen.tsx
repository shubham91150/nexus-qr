import React, { useState, useEffect } from 'react';
import { Check, Loader2, QrCode } from 'lucide-react';

type AuthStatus = 'initializing' | 'authenticating' | 'authenticated' | 'loading';

interface AuthLoadingScreenProps {
  status?: AuthStatus;
  message?: string;
}

export function AuthLoadingScreen({ status = 'loading', message }: AuthLoadingScreenProps) {
  const [currentStatus, setCurrentStatus] = useState<AuthStatus>(status);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setCurrentStatus(status);
    if (status === 'authenticated') {
      setProgress(100);
      const timer = setTimeout(() => setShowCheckmark(true), 100);
      return () => clearTimeout(timer);
    } else if (status === 'authenticating') {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress(prev => Math.min(prev + Math.random() * 15, 85));
      }, 200);
      return () => clearInterval(interval);
    } else {
      setShowCheckmark(false);
      setProgress(0);
    }
  }, [status]);

  const getStatusText = () => {
    if (message) return message;
    switch (currentStatus) {
      case 'initializing':
        return 'Starting up...';
      case 'authenticating':
        return 'Signing you in...';
      case 'authenticated':
        return 'Welcome back!';
      default:
        return 'Loading...';
    }
  };

  const getSubText = () => {
    switch (currentStatus) {
      case 'initializing':
        return 'Preparing your workspace';
      case 'authenticating':
        return 'Verifying your credentials';
      case 'authenticated':
        return 'Redirecting to dashboard';
      default:
        return 'Please wait';
    }
  };

  const isComplete = currentStatus === 'authenticated';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-100 rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-100 rounded-full blur-3xl opacity-50" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo/Icon Container */}
        <div className="relative mb-8">
          {/* Outer ring */}
          <div
            className={`
              w-24 h-24 rounded-3xl flex items-center justify-center
              transition-all duration-700 ease-out
              ${isComplete
                ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-200'
                : 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200'
              }
            `}
          >
            {isComplete && showCheckmark ? (
              <Check
                className="text-white animate-scale-in"
                size={40}
                strokeWidth={3}
              />
            ) : currentStatus === 'initializing' ? (
              <QrCode className="text-white" size={36} />
            ) : (
              <Loader2
                className="text-white animate-spin"
                size={36}
              />
            )}
          </div>

          {/* Progress ring for authenticating */}
          {currentStatus === 'authenticating' && (
            <svg className="absolute inset-0 w-24 h-24 -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="44"
                fill="none"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="4"
              />
              <circle
                cx="48"
                cy="48"
                r="44"
                fill="none"
                stroke="white"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={276}
                strokeDashoffset={276 - (276 * progress) / 100}
                className="transition-all duration-300"
              />
            </svg>
          )}
        </div>

        {/* Status Text */}
        <h2
          className={`
            text-xl font-semibold transition-colors duration-300 mb-1
            ${isComplete ? 'text-green-600' : 'text-gray-900'}
          `}
        >
          {getStatusText()}
        </h2>

        {/* Subtitle */}
        <p className="text-sm text-gray-500">
          {getSubText()}
        </p>

        {/* Progress bar for authenticating */}
        {currentStatus === 'authenticating' && (
          <div className="mt-6 w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Success indicator dots */}
        {isComplete && (
          <div className="mt-6 flex items-center gap-1.5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-green-500 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Branding */}
      <div className="absolute bottom-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center">
            <QrCode size={14} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-700">Nexus QR</span>
        </div>
        <p className="text-xs text-gray-400">
          Secure Authentication
        </p>
      </div>

      {/* Custom Animation Styles */}
      <style>{`
        @keyframes scale-in {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

// Skeleton Loader Components
export function SkeletonPulse({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header Skeleton */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SkeletonPulse className="w-10 h-10 rounded-xl" />
            <div>
              <SkeletonPulse className="w-24 h-5 mb-1" />
              <SkeletonPulse className="w-32 h-3" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SkeletonPulse className="w-24 h-9 rounded-xl" />
            <SkeletonPulse className="w-9 h-9 rounded-full" />
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <SkeletonPulse className="w-10 h-10 rounded-xl" />
                <SkeletonPulse className="w-16 h-5 rounded-full" />
              </div>
              <SkeletonPulse className="w-20 h-8 mb-1" />
              <SkeletonPulse className="w-24 h-4" />
            </div>
          ))}
        </div>

        {/* QR List */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <SkeletonPulse className="w-32 h-6" />
              <SkeletonPulse className="w-28 h-9 rounded-xl" />
            </div>
          </div>

          {/* QR Items */}
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-5 border-b border-gray-50 flex items-center gap-4">
              <SkeletonPulse className="w-16 h-16 rounded-xl" />
              <div className="flex-1">
                <SkeletonPulse className="w-40 h-5 mb-2" />
                <SkeletonPulse className="w-64 h-4 mb-2" />
                <div className="flex gap-2">
                  <SkeletonPulse className="w-16 h-5 rounded-full" />
                  <SkeletonPulse className="w-20 h-5 rounded-full" />
                </div>
              </div>
              <div className="flex gap-2">
                <SkeletonPulse className="w-9 h-9 rounded-lg" />
                <SkeletonPulse className="w-9 h-9 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function GeneratorSkeleton() {
  return (
    <div className="max-w-[1000px] mx-auto pt-6 pb-20 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <SkeletonPulse className="w-10 h-10 rounded-xl" />
          <div>
            <SkeletonPulse className="w-24 h-5 mb-1" />
            <SkeletonPulse className="w-36 h-3" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SkeletonPulse className="w-24 h-9 rounded-xl" />
          <SkeletonPulse className="w-9 h-9 rounded-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="md:col-span-7">
          <div className="bg-white rounded-[24px] shadow-sm p-8">
            {/* Tabs */}
            <div className="flex items-center gap-3 mb-6">
              <SkeletonPulse className="w-8 h-8 rounded-full" />
              <SkeletonPulse className="w-36 h-4" />
            </div>
            <div className="flex gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <SkeletonPulse key={i} className="w-16 h-10 rounded-xl" />
              ))}
            </div>

            {/* Input Area */}
            <SkeletonPulse className="w-full h-32 rounded-xl mb-6" />

            {/* Toggle Options */}
            <div className="space-y-4 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <SkeletonPulse className="w-32 h-4" />
                <SkeletonPulse className="w-11 h-6 rounded-full" />
              </div>
              <div className="flex items-center justify-between">
                <SkeletonPulse className="w-28 h-4" />
                <SkeletonPulse className="w-11 h-6 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - QR Preview */}
        <div className="md:col-span-5">
          <div className="bg-white rounded-[24px] shadow-sm p-6">
            <SkeletonPulse className="w-full aspect-square rounded-2xl mb-4" />
            <div className="flex gap-2">
              <SkeletonPulse className="flex-1 h-12 rounded-xl" />
              <SkeletonPulse className="flex-1 h-12 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
