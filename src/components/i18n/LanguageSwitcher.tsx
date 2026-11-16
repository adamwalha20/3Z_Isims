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
              className={`p-3.5 rounded-xl border text-start transition-colors flex items-center justify-between gap-3 ${
                isSelected
                  ? 'bg-emerald-50/70 border-emerald-600 ring-1 ring-emerald-600/30'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xl shrink-0" role="img" aria-label={item.name}>
                  {item.flag}
                </span>
                <div className="min-w-0">
                  <div className={`text-xs font-semibold truncate ${isSelected ? 'text-emerald-900' : 'text-slate-800'}`}>
                    {item.nativeName}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    {item.name}
                  </div>
                </div>
              </div>
              {isSelected && (
                <div className="w-4 h-4 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
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
      <div className={`flex flex-col gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200 ${className}`}>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2 py-0.5">
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
                className={`py-1.5 px-2 rounded-lg text-center text-xs font-medium transition-colors flex flex-col items-center gap-0.5 ${
                  isSelected
                    ? 'bg-emerald-700 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span className="text-sm">{item.flag}</span>
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
        className="h-8 px-2.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-600/30"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Switch Language"
      >
        <span className="text-xs shrink-0">{currentLocaleConfig.flag}</span>
        <span className="hidden sm:inline-block font-medium text-slate-800 text-[11px]">
          {currentLocaleConfig.nativeName}
        </span>
        <ChevronDown
          className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-emerald-700' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 mt-1.5 w-48 rounded-xl bg-white border border-slate-200 shadow-lg py-1 z-50 animate-in fade-in zoom-in-95 duration-100`}
        >
          <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1 flex items-center gap-1.5">
            <Globe className="w-3 h-3 text-emerald-700" />
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
                className={`w-full px-2.5 py-1.5 text-start text-xs font-medium flex items-center justify-between transition-colors ${
                  isSelected
                    ? 'bg-emerald-50 text-emerald-900 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm shrink-0">{item.flag}</span>
                  <div className="truncate">
                    <div>{item.nativeName}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{item.name}</div>
                  </div>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

