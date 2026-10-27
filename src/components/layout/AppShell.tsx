'use client';

import React from 'react';
import AppHeader from './AppHeader';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import OnboardingModal from '@/components/auth/OnboardingModal';
import PendingApprovalScreen from '@/components/auth/PendingApprovalScreen';
import { useAuth } from '@/lib/auth-context';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isApproved, isAdmin, needsOnboarding } = useAuth();

  // If user is authenticated but pending approval, display approval notice gate
  if (isAuthenticated && !isApproved && !isAdmin && !needsOnboarding) {
    return <PendingApprovalScreen />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f9f6]">
      <AppHeader />
      <div className="flex-1 flex pt-16">
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
