'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/context';
import { EventItem, Meeting } from '@/types/database.types';
import {
  Calendar as CalendarIcon,
  MapPin,
  QrCode,
  CheckSquare,
  Clock,
  Plus,
  Bookmark,
  Users,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Video,
  CheckCircle2,
  CalendarDays,
} from 'lucide-react';

export default function EventsPage() {
  const { user, events, meetings, registerEvent } = useAuth();
  const { t, formatDate, formatTime, locale } = useTranslation();

  const [viewMode, setViewMode] = useState<'agenda' | 'month'>('agenda');
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date('2026-11-16T12:00:00Z'));
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date('2026-11-16T12:00:00Z'));
  const [todayIso, setTodayIso] = useState<string>('2026-11-16');
  const [showQRPass, setShowQRPass] = useState(false);
  const [passEvent, setPassEvent] = useState<EventItem | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
    setTodayIso(now.toISOString().split('T')[0]);
  }, []);

  // Dynamic academic semester calculation (S1: Sep-Jan, S2: Feb-Jun)
  const currentMonthIdx = currentDate.getMonth();
  const semesterCode = currentMonthIdx >= 8 || currentMonthIdx <= 0 ? 'S1' : 'S2';
  const semesterLabel = `${semesterCode} • ${formatDate(currentDate, { month: 'short', year: 'numeric' })}`;

  // Week navigation (prev/next week)
  const handlePrevWeek = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const handleNextWeek = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Calculate 7 days for the active week (Monday to Sunday)
  const weekDays = useMemo(() => {
    const d = new Date(currentDate);
    const dayOfWeek = d.getDay(); // 0 is Sunday, 1 is Monday...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      const iso = dayDate.toISOString().split('T')[0];

      // Check if any event or meeting occurs on this date
      const hasItem =
        events.some((e) => e.starts_at?.startsWith(iso)) ||
        meetings.some((m) => m.starts_at?.startsWith(iso));

      // Localized short day name
      const dayName = new Intl.DateTimeFormat(locale === 'ar-TN' ? 'ar-TN' : locale === 'fr' ? 'fr-FR' : 'en-US', {
        weekday: 'short',
      }).format(dayDate);

      days.push({
        date: dayDate,
        iso,
        dayNum: dayDate.getDate(),
        dayName,
        hasDot: hasItem,
      });
    }
    return days;
  }, [currentDate, events, meetings, locale]);

  // Selected date ISO
  const selectedIso = selectedDate.toISOString().split('T')[0];

  // Week number in current month
  const weekNumber = Math.min(5, Math.ceil(currentDate.getDate() / 7));

  // Determine Main Priority/Featured Event
  const mainEvent = useMemo(() => {
    // 1. Check if selected date has a published event
    const eventOnDay = events.find((e) => e.starts_at?.startsWith(selectedIso));
    if (eventOnDay) return eventOnDay;

    // 2. Otherwise return earliest published event or first event
    if (events.length > 0) {
      const sorted = [...events].sort(
        (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
      );
      return sorted[0];
    }
    return null;
  }, [events, selectedIso]);

  // Combined Schedule items (events + meetings) sorted chronologically
  const scheduleItems = useMemo(() => {
    const list = [
      ...events.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        location: e.location || 'ISIMS Campus',
        starts_at: e.starts_at,
        ends_at: e.ends_at,
        type: 'event' as const,
        badge: e.department?.name || 'Club Event',
        capacity: e.capacity,
        registrations_count: e.registrations_count,
        user_registered: e.user_registered,
        isMeeting: false,
        url: undefined as string | undefined,
      })),
      ...meetings.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        location: m.location || m.meeting_platform || 'Google Meet',
        starts_at: m.starts_at,
        ends_at: m.ends_at,
        type: 'meeting' as const,
        badge: m.meeting_type === 'bureau' ? 'Governance' : 'Smart Meeting',
        capacity: undefined,
        registrations_count: undefined,
        user_registered: true,
        isMeeting: true,
        url: `/meetings/${m.id}` as string | undefined,
      })),
    ];

    return list.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  }, [events, meetings]);

  // Event Preparation Checklist
  const [checklist, setChecklist] = useState([
    { id: 'c1', textKey: 'events.checklistVenue', subKey: 'events.checklistVenueSub', done: true },
    { id: 'c2', textKey: 'events.checklistKeynote', subKey: 'events.checklistKeynoteSub', done: true },
    { id: 'c3', textKey: 'events.checklistBadges', subKey: 'events.checklistBadgesSub', done: false },
    { id: 'c4', textKey: 'events.checklistAV', subKey: 'events.checklistAVSub', done: false },
  ]);

  const toggleChecklist = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
  };

  const doneCount = checklist.filter((c) => c.done).length;
  const readinessPercent = Math.round((doneCount / checklist.length) * 100);

  const toggleBookmark = (id: string) => {
    setBookmarkedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openPassModal = (evt: EventItem) => {
    setPassEvent(evt);
    setShowQRPass(true);
  };

  // Month View Days Generation
  const monthGridDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sun
    const totalDays = lastDayOfMonth.getDate();

    // Fill preceding blanks
    const blanks = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
    const days: { dayNum: number | null; iso?: string; hasEvent?: boolean }[] = [];

    for (let i = 0; i < blanks; i++) {
      days.push({ dayNum: null });
    }

    for (let d = 1; d <= totalDays; d++) {
      const dayDate = new Date(year, month, d);
      const iso = dayDate.toISOString().split('T')[0];
      const hasEvent =
        events.some((e) => e.starts_at?.startsWith(iso)) ||
        meetings.some((m) => m.starts_at?.startsWith(iso));

      days.push({ dayNum: d, iso, hasEvent });
    }

    return days;
  }, [currentDate, events, meetings]);

  return (
    <AppShell>
      <div className="pt-4 flex flex-col gap-4 max-w-4xl mx-auto w-full pb-20">
        {/* =========================================================================
            1. VIEW SWITCHER & CAMPUS SEMESTER STATUS
        ========================================================================= */}
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex p-1 bg-slate-100 rounded-full shadow-inner">
            <button
              onClick={() => setViewMode('agenda')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'agenda' ? 'bg-emerald-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>{t('events.agendaView')}</span>
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'month' ? 'bg-emerald-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>{t('events.monthView')}</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200/80 text-xs font-semibold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{semesterLabel}</span>
          </div>
        </div>

        {/* =========================================================================
            2. INTERACTIVE HORIZONTAL WEEKLY CALENDAR STRIP
        ========================================================================= */}
        <div className="bg-white p-4 rounded-3xl shadow-xs border border-emerald-900/10 flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-extrabold text-slate-900">
                {formatDate(currentDate, { month: 'long', year: 'numeric' })}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold">
                {t('events.weekLabel', { count: weekNumber })}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-500">
              <button
                onClick={handleToday}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg hover:bg-slate-100 text-emerald-800 transition-colors"
              >
                {t('events.today')}
              </button>
              <button
                onClick={handlePrevWeek}
                aria-label="Previous week"
                className="p-1 rounded-full hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <button
                onClick={handleNextWeek}
                aria-label="Next week"
                className="p-1 rounded-full hover:bg-slate-100 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {weekDays.map((d) => {
              const isSelected = selectedIso === d.iso;
              const isToday = todayIso === d.iso;

              return (
                <button
                  key={d.iso}
                  onClick={() => {
                    setSelectedDate(d.date);
                    setCurrentDate(d.date);
                  }}
                  className={`flex flex-col items-center py-2 px-1 rounded-2xl transition-all ${
                    isSelected
                      ? 'bg-emerald-800 text-white shadow-md scale-105'
                      : isToday
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span className={`text-[10px] font-semibold capitalize ${isSelected ? 'text-emerald-200' : 'text-slate-400'}`}>
                    {d.dayName}
                  </span>
                  <span className="text-sm font-extrabold mt-0.5">{d.dayNum}</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-1 ${
                      isSelected ? 'bg-emerald-300' : d.hasDot ? 'bg-emerald-500' : 'bg-transparent'
                    }`}
                  ></span>
                </button>
              );
            })}
          </div>
        </div>

        {/* =========================================================================
            MONTH VIEW GRID (When Month mode active)
        ========================================================================= */}
        {viewMode === 'month' && (
          <div className="bg-white p-5 rounded-3xl shadow-xs border border-emerald-900/10 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-800">
                {formatDate(currentDate, { month: 'long', year: 'numeric' })}
              </span>
              <span className="text-xs text-slate-500">
                {t('events.sessionsCount', { count: scheduleItems.length })}
              </span>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dw, idx) => (
                <div key={idx} className="font-bold text-[10px] text-slate-400 uppercase py-1">
                  {dw}
                </div>
              ))}

              {monthGridDays.map((cell, idx) => {
                if (!cell.dayNum) {
                  return <div key={`empty-${idx}`} className="h-12 p-1" />;
                }

                const isSelected = selectedIso === cell.iso;
                const isToday = todayIso === cell.iso;

                return (
                  <button
                    key={`day-${cell.dayNum}`}
                    onClick={() => {
                      if (cell.iso) {
                        const newD = new Date(cell.iso);
                        setSelectedDate(newD);
                        setCurrentDate(newD);
                        setViewMode('agenda');
                      }
                    }}
                    className={`h-12 p-1 rounded-xl flex flex-col items-center justify-between transition-all border ${
                      isSelected
                        ? 'bg-emerald-800 text-white border-emerald-900 font-bold'
                        : isToday
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-semibold'
                        : 'bg-slate-50/70 hover:bg-slate-100 text-slate-700 border-transparent'
                    }`}
                  >
                    <span className="text-xs">{cell.dayNum}</span>
                    {cell.hasEvent && (
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-300' : 'bg-emerald-600'}`}></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            3. PRIORITY EVENT CARD (Dynamic Main Feature)
        ========================================================================= */}
        {mainEvent && (
          <div className="bg-white rounded-3xl shadow-sm border border-emerald-900/10 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
            {/* Image Header with Gradient Scrim */}
            <div className="relative h-48 sm:h-52 w-full bg-emerald-900 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=80"
                alt="Climate Talk Presentation Auditorium"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-between p-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-emerald-800 text-xs font-bold shadow-xs">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t('events.certifiedGreen')}</span>
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-400 text-emerald-950 text-xs font-extrabold">
                    {t('events.flagship')}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-emerald-300 text-xs font-semibold mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {formatDate(mainEvent.starts_at, { weekday: 'short', month: 'short', day: 'numeric' })} • {formatTime(mainEvent.starts_at)} - {formatTime(mainEvent.ends_at)}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-white leading-tight">
                    {mainEvent.title}
                  </h2>
                </div>
              </div>
            </div>

            {/* Event Body Details */}
            <div className="p-4 sm:p-5 flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                  {mainEvent.department?.name || 'Training & Innovation'}
                </span>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold">
                  +40 Karma XP
                </span>
              </div>

              <div className="flex items-start gap-2 text-slate-600">
                <MapPin className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs sm:text-sm text-slate-900 font-bold">{mainEvent.location}</p>
                  <p className="text-xs text-slate-400">ISIMS Chapter Venue • Verified Session</p>
                </div>
              </div>

              {/* Registration Progress Meter */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-800 font-bold">{t('events.attendanceSeatings')}</span>
                  <div className="flex items-center gap-1">
                    <span className="font-extrabold text-emerald-800">
                      {mainEvent.registrations_count || 48}
                    </span>
                    <span className="text-slate-400">
                      / {mainEvent.capacity || 60} Registered
                    </span>
                    <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-bold">
                      {Math.min(100, Math.round(((mainEvent.registrations_count || 48) / (mainEvent.capacity || 60)) * 100))}%
                    </span>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-emerald-200/60 overflow-hidden">
                  <div
                    className="h-full bg-emerald-700 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.round(((mainEvent.registrations_count || 48) / (mainEvent.capacity || 60)) * 100))}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => openPassModal(mainEvent)}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 active:scale-95 transition-all shadow-xs"
                >
                  <QrCode className="w-4 h-4" />
                  <span>{t('attendance.myQrTab')}</span>
                </button>
                <button
                  onClick={() => registerEvent(mainEvent.id)}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                    mainEvent.user_registered
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                      : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <CheckSquare className="w-4 h-4 text-emerald-700" />
                  <span>{mainEvent.user_registered ? t('events.registered') : t('events.register')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            4. EVENT READINESS LOG (Interactive Checklist Card)
        ========================================================================= */}
        <div className="bg-white p-5 rounded-3xl shadow-xs border border-emerald-900/10 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800">
                <CheckSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">{t('events.checklistTitle')}</h3>
                <p className="text-[11px] text-slate-500">{t('events.checklistSub')}</p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
              {readinessPercent}% {t('events.readinessScore')}
            </span>
          </div>

          <div className="flex flex-col gap-2 pt-1">
            {checklist.map((item) => (
              <label
                key={item.id}
                onClick={() => toggleChecklist(item.id)}
                className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50/50 transition-colors cursor-pointer border border-slate-100"
              >
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => {}}
                  className="mt-0.5 rounded text-emerald-700 focus:ring-0 cursor-pointer w-4 h-4"
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-bold ${item.done ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                    {t(item.textKey)}
                  </p>
                  <p className="text-[10px] text-emerald-800 mt-0.5 font-medium">{t(item.subKey)}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* =========================================================================
            5. UPCOMING CLUB SCHEDULE FEED (Dynamic from Live State)
        ========================================================================= */}
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900">{t('events.upcomingSchedule')}</h3>
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              {t('events.sessionsCount', { count: scheduleItems.length })}
            </span>
          </div>

          {scheduleItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
              {t('events.noUpcoming')}
            </div>
          ) : (
            scheduleItems.map((item) => {
              const itemDate = new Date(item.starts_at);
              const monthShort = new Intl.DateTimeFormat(locale === 'ar-TN' ? 'ar-TN' : locale === 'fr' ? 'fr-FR' : 'en-US', {
                month: 'short',
              }).format(itemDate);
              const dayNum = itemDate.getDate();
              const isBookmarked = Boolean(bookmarkedIds[item.id]);

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white shadow-xs border border-emerald-900/10 hover:shadow-md transition-shadow"
                >
                  <div
                    className={`flex flex-col items-center justify-center w-12 h-12 rounded-2xl shrink-0 ${
                      item.isMeeting ? 'bg-blue-50 text-blue-900 border border-blue-100' : 'bg-emerald-50 text-emerald-900 border border-emerald-100'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase">{monthShort}</span>
                    <span className="text-base font-extrabold leading-none">{dayNum}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                          item.isMeeting
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {item.badge}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatTime(item.starts_at)} - {formatTime(item.ends_at)}
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate mt-0.5">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 truncate">{item.location}</p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {item.isMeeting && item.url ? (
                      <Link
                        href={item.url}
                        className="p-2 rounded-xl bg-slate-50 hover:bg-blue-50 text-blue-700 transition-colors"
                        title="View meeting room"
                      >
                        <Video className="w-4 h-4" />
                      </Link>
                    ) : null}

                    <button
                      onClick={() => toggleBookmark(item.id)}
                      aria-label="Bookmark session"
                      className={`p-2 rounded-xl transition-colors ${
                        isBookmarked ? 'text-emerald-700 bg-emerald-50' : 'text-slate-400 hover:text-emerald-700 hover:bg-slate-50'
                      }`}
                    >
                      <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* QR Pass Modal */}
      {showQRPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center gap-4 text-center animate-in zoom-in-95 duration-150">
            <h3 className="font-extrabold text-base text-slate-900">{t('events.fastCheckInPass')}</h3>
            <p className="text-xs text-slate-500">
              {t('events.fastCheckInDesc')}
            </p>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 shadow-inner">
              <QrCode className="w-52 h-52 text-emerald-900" />
            </div>

            <div className="flex flex-col items-center gap-0.5">
              <span className="font-bold text-sm text-slate-900">{user?.full_name || 'Active Member'}</span>
              <span className="font-mono text-xs text-slate-500">{user?.student_id || 'ISIMS-2026-8891'}</span>
              <span className="font-mono text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md mt-1 font-semibold">
                PASS-{passEvent?.id?.toUpperCase() || 'EVT'}-{user?.id?.slice(-4) || 'ISIMS'}
              </span>
            </div>

            <button
              onClick={() => setShowQRPass(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-xs"
            >
              {t('events.done')}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}