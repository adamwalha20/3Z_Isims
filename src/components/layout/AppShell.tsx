'use client';

import React from 'react';
import AppHeader from './AppHeader';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import OnboardingModal from '@/components/auth/OnboardingModal';
import PendingApprovalScreen from '@/components/auth/PendingApprovalScreen';
import { useAuth } from '@/lib/auth-context';
import { isSuperAdminEmail } from '@/lib/constants/auth';
import { Eye, RotateCcw } from 'lucide-react';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const {
    isAuthenticated,
    isApproved,
    isAdmin,
    needsOnboarding,
    activeRole,
    setActiveRole,
    activeBureauPosition,
    setActiveBureauPosition,
    isRealAdmin,
    user,
  } = useAuth();

  // If user is authenticated but pending approval, display approval notice gate
  if (isAuthenticated && !isApproved && !isAdmin && !needsOnboarding) {
    return <PendingApprovalScreen />;
  }

  const isSuperAdmin = isRealAdmin || isSuperAdminEmail(user?.email);
  const isPreviewMode = isSuperAdmin && activeRole !== 'admin';
  const previewRoleLabel =
    activeRole === 'bureau' && activeBureauPosition !== 'all'
      ? activeBureauPosition.replace(/_/g, ' ').toUpperCase()
      : activeRole.toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <AppHeader />
      {isPreviewMode && (
        <div className="fixed top-14 left-0 right-0 z-40 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white px-4 py-1.5 shadow-sm">
          <div className="mx-auto max-w-7xl w-full flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-2 w-2 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              <Eye className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                Role Preview Active: <strong className="font-bold underline tracking-wide">{previewRoleLabel}</strong> — UI, navigation, permissions, and visible data reflect this role.
              </span>
            </div>
            <button
              onClick={() => {
                setActiveRole('admin');
                setActiveBureauPosition('all');
              }}
              className="shrink-0 px-2.5 py-0.5 rounded-md bg-white text-amber-900 hover:bg-amber-100 text-[11px] font-bold shadow-xs transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Return to Admin</span>
            </button>
          </div>
        </div>
      )}
      <div className={`flex-1 flex ${isPreviewMode ? 'pt-[5.75rem]' : 'pt-14'}`}>
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 pb-24 lg:pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
      <BottomNav />
      <OnboardingModal />
    </div>
  );
}
