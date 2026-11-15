'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n/context';
import { Locale, LOCALES } from '@/lib/i18n/types';
import { Globe, ChevronDown, Check } from 'lucide-react';

interface LanguageSwitcherProps {
  variant?: 'header' | 'compact' | 'profile' | 'mobile';
  className?: string;
}

export default function LanguageSwitcher({
  variant = 'header',
  className = '',
}: LanguageSwitcherProps) {
  const { locale, setLocale, isRtl } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const currentLocaleConfig = LOCALES[locale] || LOCALES.en;

  const handleSelect = async (loc: Locale) => {
    await setLocale(loc);
    setIsOpen(false);
  };

  // 1. Profile Setting Card Variant
  if (variant === 'profile') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${className}`}>
        {(Object.keys(LOCALES) as Locale[]).map((locKey) => {
          const item = LOCALES[locKey];
          const isSelected = locale === locKey;
          return (
            <button
              key={locKey}
              type="button"
              onClick={() => handleSelect(locKey)}
              className={`p-4 rounded-2xl border text-start transition-all flex items-center justify-between gap-3 ${
                isSelected
                  ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl shrink-0" role="img" aria-label={item.name}>
                  {item.flag}
                </span>
                <div className="min-w-0">
                  <div className={`text-xs font-bold truncate ${isSelected ? 'text-emerald-950' : 'text-slate-800'}`}>
                    {item.nativeName}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    {item.name} • {item.dir.toUpperCase()}
                  </div>
                </div>
              </div>
              {isSelected && (
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // 2. Mobile BottomNav Drawer / Full Width Variant
  if (variant === 'mobile') {
    return (
      <div className={`flex flex-col gap-1.5 p-2 rounded-2xl bg-slate-50 border border-slate-200/80 ${className}`}>
        <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 py-1">
          Language / Langue / اللّغة
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {(Object.keys(LOCALES) as Locale[]).map((locKey) => {
            const item = LOCALES[locKey];
            const isSelected = locale === locKey;
            return (
              <button
                key={locKey}
                type="button"
                onClick={() => handleSelect(locKey)}
                className={`py-2 px-2.5 rounded-xl text-center text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                  isSelected
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                <span className="text-base">{item.flag}</span>
                <span className="text-[11px] truncate w-full">{item.nativeName}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 3. Header & Compact Dropdown Pill Variant
  return (
    <div className={`relative inline-block text-start ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 px-2.5 sm:px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs hover:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Switch Language"
      >
        <span className="text-sm shrink-0">{currentLocaleConfig.flag}</span>
        <span className="hidden sm:inline-block font-semibold text-slate-800">
          {currentLocaleConfig.nativeName}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-emerald-600' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute ${
            isRtl ? 'left-0' : 'right-0'
          } mt-2 w-48 rounded-2xl bg-white border border-slate-200 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100`}
        >
          <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1 flex items-center gap-1.5">
            <Globe className="w-3 h-3 text-emerald-600" />
            <span>Select Language</span>
          </div>

          {(Object.keys(LOCALES) as Locale[]).map((locKey) => {
            const item = LOCALES[locKey];
            const isSelected = locale === locKey;
            return (
              <button
                key={locKey}
                type="button"
                onClick={() => handleSelect(locKey)}
                className={`w-full px-3 py-2 text-start text-xs font-semibold flex items-center justify-between transition-colors ${
                  isSelected
                    ? 'bg-emerald-50/80 text-emerald-950 font-bold'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-base shrink-0">{item.flag}</span>
                  <div className="truncate">
                    <div>{item.nativeName}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{item.name}</div>
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
