import React, { useState, useEffect } from 'react';
import { Check, Loader2 } from 'lucide-react';

type AuthStatus = 'initializing' | 'authenticating' | 'authenticated' | 'loading';

interface AuthLoadingScreenProps {
  status?: AuthStatus;
  message?: string;
}

export function AuthLoadingScreen({ status = 'loading', message }: AuthLoadingScreenProps) {
  const [currentStatus, setCurrentStatus] = useState<AuthStatus>(status);
  const [showCheckmark, setShowCheckmark] = useState(false);

  useEffect(() => {
    setCurrentStatus(status);
    if (status === 'authenticated') {
      // Small delay before showing checkmark for smooth animation
      const timer = setTimeout(() => setShowCheckmark(true), 100);
      return () => clearTimeout(timer);
    } else {
      setShowCheckmark(false);
    }
  }, [status]);

  const getStatusText = () => {
    if (message) return message;
    switch (currentStatus) {
      case 'initializing':
        return 'Initializing...';
      case 'authenticating':
        return 'Authenticating...';
      case 'authenticated':
        return 'Authenticated';
      default:
        return 'Loading...';
    }
  };

  const isComplete = currentStatus === 'authenticated';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      {/* Main Card */}
      <div className="flex flex-col items-center">
        {/* Icon Container */}
        <div
          className={`
            w-16 h-16 rounded-full flex items-center justify-center mb-6
            transition-all duration-500 ease-out
            ${isComplete
              ? 'bg-gray-900 scale-100'
              : 'bg-gray-100 scale-100'
            }
          `}
        >
          {isComplete && showCheckmark ? (
            <Check
              className="text-white animate-scale-in"
              size={32}
              strokeWidth={3}
            />
          ) : (
            <Loader2
              className="text-gray-600 animate-spin"
              size={28}
            />
          )}
        </div>

        {/* Status Text */}
        <p
          className={`
            text-lg font-medium transition-colors duration-300
            ${isComplete ? 'text-gray-900' : 'text-gray-600'}
          `}
        >
          {getStatusText()}
        </p>

        {/* Subtitle for authenticating state */}
        {currentStatus === 'authenticating' && (
          <p className="text-sm text-gray-400 mt-2 animate-pulse">
            Please wait...
          </p>
        )}
      </div>

      {/* Branding */}
      <div className="absolute bottom-8 text-center">
        <p className="text-xs text-gray-400 font-medium">
          Nexus QR Authentication
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
          animation: scale-in 0.4s ease-out forwards;
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
    <div className="min-h-screen bg-gray-50">
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
