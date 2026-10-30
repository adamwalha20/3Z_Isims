import React from 'react';
import MeetingDetailPageClient from './MeetingDetailPageClient';

export function generateStaticParams() {
  return [
    { id: 'meet-001' },
    { id: 'meet-002' },
    { id: 'meet-003' },
    { id: 'meet-004' },
  ];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MeetingDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 text-xs text-slate-500 font-bold">
          Loading ZEC Meeting Archive...
        </div>
      }
    >
      <MeetingDetailPageClient id={id} />
    </React.Suspense>
  );
}
