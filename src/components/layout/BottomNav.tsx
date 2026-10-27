'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Home', href: '/', icon: 'home' },
    { label: 'Tasks', href: '/tasks', icon: 'check_box' },
    { label: '3Z Lab', href: '/projects', icon: 'rocket_launch' },
    { label: 'Calendar', href: '/events', icon: 'calendar_month' },
    { label: 'My ID', href: '/profile', icon: 'qr_code_2' },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe bg-white/95 backdrop-blur-xl border-t border-emerald-900/10 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      <div className="flex justify-around items-center h-16 px-2 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 w-14 h-12 rounded-xl transition-all relative ${
                isActive ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-emerald-700 font-medium'
              }`}
            >
              <div className="relative">
                <span
                  className="material-symbols-outlined text-[22px]"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.icon}
                </span>
                {item.label === 'My ID' && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white"></span>
                )}
              </div>
              <span className="text-[10px]">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-600"></span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
