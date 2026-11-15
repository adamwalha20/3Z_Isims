import React from 'react';
import SessionAttendanceClient from './SessionAttendanceClient';

export function generateStaticParams() {
  return [
    { id: 'sess-001' },
    { id: 'sess-002' },
    { id: 'sess-003' },
  ];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SessionAttendanceDashboardPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 text-xs text-slate-500 font-bold">
          Loading ZEC Session Attendance Dashboard...
        </div>
      }
    >
      <SessionAttendanceClient id={id} />
    </React.Suspense>
  );
}
