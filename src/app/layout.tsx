import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'ZEC Campus Hub — 3ZERO Club ISIMS Sfax',
  description:
    'Official digital operations platform for ZERO EXCLUSION CARBON POVERTY — Campus Club ISIMS Sfax Chapter. Centralized workspace for members, bureau, projects, tasks, meetings, and handover records.',
  keywords: ['3ZERO', 'ISIMS', 'Sfax', 'Climate Tech', 'Carbon Poverty', 'University Club', 'Campus Hub'],
  authors: [{ name: 'ISIMS 3ZERO Bureau' }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#f4f9f6] text-[#0d1c32] antialiased min-h-screen flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
