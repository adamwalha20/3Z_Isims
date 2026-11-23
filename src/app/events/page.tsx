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
  X,
  History,
  Layers,
  Pencil,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Shield,
  Building,
  Mic2,
  Ticket,
  Cpu,
  Check,
} from 'lucide-react';
import { canEditEvent, canDeleteEvent, canAccessRecycleBin } from '@/lib/permissions/permission-checks';
import { UserPermissionContext } from '@/lib/permissions/access-control';

export default function EventsPage() {
  const {
    user,
    events,
    meetings,
    registerEvent,
    editEvent,
    deleteEvent,
    isAdmin,
    activeRole,
    userBureauPositions,
    activeBureauPosition,
  } = useAuth();
  const { t, formatDate, formatTime, locale } = useTranslation();

  const [viewMode, setViewMode] = useState<'agenda' | 'month'>('agenda');
  const [scheduleFilter, setScheduleFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [selectedDayIso, setSelectedDayIso] = useState<string | null>(null);

  const [currentDate, setCurrentDate] = useState<Date>(() => new Date('2026-11-22T00:00:00Z'));
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date('2026-11-22T00:00:00Z'));
  const [todayIso, setTodayIso] = useState<string>('2026-11-22');
  const [nowTimestamp, setNowTimestamp] = useState<number>(() => new Date('2026-11-22T00:00:00Z').getTime());

  const [showQRPass, setShowQRPass] = useState(false);
  const [passEvent, setPassEvent] = useState<EventItem | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Record<string, boolean>>({});

  // RBAC Permission Context
  const permCtx: UserPermissionContext = useMemo(
    () => ({
      userId: user?.id,
      email: user?.email,
      role: isAdmin ? 'admin' : activeRole,
      bureauPositions: userBureauPositions,
      activeBureauPosition: activeBureauPosition,
      departmentId: user?.department_id,
    }),
    [user, isAdmin, activeRole, userBureauPositions, activeBureauPosition]
  );

  const canManageRecycleBin = canAccessRecycleBin(permCtx);

  // Edit Event State
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    location: '',
    starts_at: '',
    ends_at: '',
    capacity: 60,
    reason: '',
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Event State
  const [deletingEvent, setDeletingEvent] = useState<EventItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Action Feedback Toast
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string; link?: string } | null>(null);

  useEffect(() => {
    const now = new Date();
    setNowTimestamp(now.getTime());
    setCurrentDate(now);
    setSelectedDate(now);
    setTodayIso(now.toISOString().split('T')[0]);

    // Live sync timer: keep time accurate every minute without page refresh
    const timer = setInterval(() => {
      const liveNow = new Date();
      setNowTimestamp(liveNow.getTime());
      setTodayIso(liveNow.toISOString().split('T')[0]);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const openEditModal = (event: EventItem) => {
    setEditingEvent(event);
    setEditForm({
      title: event.title || '',
      description: event.description || '',
      location: event.location || '',
      starts_at: event.starts_at ? event.starts_at.slice(0, 16) : '',
      ends_at: event.ends_at ? event.ends_at.slice(0, 16) : '',
      capacity: event.capacity || 60,
      reason: '',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingEvent) return;
    if (!editForm.title.trim()) {
      setFeedback({ type: 'error', text: 'Title is required.' });
      return;
    }
    if (!editForm.reason.trim()) {
      setFeedback({ type: 'error', text: 'A reason for modifying this event is required.' });
      return;
    }

    setIsSavingEdit(true);
    setFeedback(null);
    try {
      const res = await editEvent(
        editingEvent.id,
        {
          title: editForm.title.trim(),
          description: editForm.description.trim(),
          location: editForm.location.trim(),
          starts_at: editForm.starts_at ? new Date(editForm.starts_at).toISOString() : editingEvent.starts_at,
          ends_at: editForm.ends_at ? new Date(editForm.ends_at).toISOString() : editingEvent.ends_at,
          capacity: Number(editForm.capacity) || 60,
        },
        editForm.reason.trim()
      );

      if (res.success) {
        setIsEditModalOpen(false);
        setEditingEvent(null);
        setFeedback({
          type: 'success',
          text: t('events.eventUpdated') || 'Event updated successfully.',
          link: '/admin/audit-logs',
        });
      } else {
        setFeedback({ type: 'error', text: res.error || 'Failed to update event' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Failed to update event' });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const openDeleteModal = (event: EventItem) => {
    setDeletingEvent(event);
    setDeleteReason('');
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingEvent) return;
    if (!deleteReason.trim()) {
      setFeedback({ type: 'error', text: 'A reason for deleting this event is required.' });
      return;
    }

    setIsDeleting(true);
    setFeedback(null);
    try {
      const res = await deleteEvent(deletingEvent.id, deleteReason.trim());
      if (res.success) {
        setIsDeleteModalOpen(false);
        setDeletingEvent(null);
        setFeedback({
          type: 'success',
          text: t('events.eventMovedToRecycleBin') || 'Event moved to Recycle Bin. Registrations and XP preserved.',
          link: '/admin/recycle-bin',
        });
      } else {
        setFeedback({ type: 'error', text: res.error || 'Failed to delete event' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Failed to delete event' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Dynamic academic semester calculation (S1: Sep-Jan, S2: Feb-Jun)
  const currentMonthIdx = currentDate.getMonth();
  const semesterCode = currentMonthIdx >= 8 || currentMonthIdx <= 0 ? 'S1' : 'S2';
  const semesterLabel = `${semesterCode} • ${formatDate(currentDate, { month: 'short', year: 'numeric' })}`;

  // Week navigation (prev/next week in agenda mode)
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

  // Month navigation (prev/next month in month mode)
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedDayIso(null);
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDayIso(null);
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
    setSelectedDayIso(null);
  };

  // Check if an item has ended or is marked completed/cancelled
  const isItemPast = (item: { starts_at: string; ends_at?: string | null; status?: string }) => {
    if (item.status === 'completed' || item.status === 'cancelled') return true;
    const dateStr = (item.ends_at || item.starts_at || '').slice(0, 10);
    if (dateStr && dateStr < todayIso) return true;
    const endOrStartTime = item.ends_at || item.starts_at;
    if (!endOrStartTime) return false;
    const itemDate = new Date(endOrStartTime);
    if (isNaN(itemDate.getTime())) return false;
    return itemDate.getTime() < nowTimestamp;
  };

  // Combined Schedule items (events + meetings) sorted chronologically
  const scheduleItems = useMemo(() => {
    const list = [
      ...events
        .filter((e) => !e.is_deleted)
        .map((e) => ({
          id: e.id,
          title: e.title,
          description: e.description,
          location: e.location || 'ISIMS Campus',
          starts_at: e.starts_at,
          ends_at: e.ends_at,
          status: e.status,
          type: 'event' as const,
          badge: e.department?.name || 'Club Event',
          capacity: e.capacity,
          registrations_count: e.registrations_count,
          user_registered: e.user_registered,
          isMeeting: false,
          url: undefined as string | undefined,
          rawEvent: e,
        })),
      ...meetings
        .filter((m) => !m.is_deleted)
        .map((m) => ({
          id: m.id,
          title: m.title,
          description: m.description,
          location: m.location || m.meeting_platform || 'Google Meet',
          starts_at: m.starts_at,
          ends_at: m.ends_at,
          status: m.status,
          type: 'meeting' as const,
          badge: m.meeting_type === 'bureau' ? 'Governance' : 'Smart Meeting',
          capacity: undefined,
          registrations_count: undefined,
          user_registered: true,
          isMeeting: true,
          url: `/meetings/${m.id}` as string | undefined,
          rawEvent: undefined,
        })),
    ];

    return list.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  }, [events, meetings]);

  // Filtered upcoming vs past lists
  const upcomingItems = useMemo(() => {
    return scheduleItems.filter((item) => !isItemPast(item));
  }, [scheduleItems, nowTimestamp]);

  const pastItems = useMemo(() => {
    return scheduleItems.filter((item) => isItemPast(item));
  }, [scheduleItems, nowTimestamp]);

  // Selected date ISO
  const selectedIso = selectedDate.toISOString().split('T')[0];

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

      // Check if any upcoming event or meeting occurs on this date
      const dayUpcoming = scheduleItems.filter(
        (it) => it.starts_at?.startsWith(iso) && !isItemPast(it)
      );
      const dayTotal = scheduleItems.filter((it) => it.starts_at?.startsWith(iso));

      // Localized short day name
      const dayName = new Intl.DateTimeFormat(locale === 'ar-TN' ? 'ar-TN' : locale === 'fr' ? 'fr-FR' : 'en-US', {
        weekday: 'short',
      }).format(dayDate);

      days.push({
        date: dayDate,
        iso,
        dayNum: dayDate.getDate(),
        dayName,
        hasUpcoming: dayUpcoming.length > 0,
        hasItem: dayTotal.length > 0,
      });
    }
    return days;
  }, [currentDate, scheduleItems, locale, nowTimestamp]);

  // Week number in current month
  const weekNumber = Math.min(5, Math.ceil(currentDate.getDate() / 7));

  // Determine Main Priority/Featured Event
  const mainEvent = useMemo(() => {
    // 1. Check if selected date has an upcoming event
    const upcomingOnSelectedDay = events.find(
      (e) => e.starts_at?.startsWith(selectedIso) && !isItemPast(e)
    );
    if (upcomingOnSelectedDay) return upcomingOnSelectedDay;

    // 2. Earliest upcoming event
    const upcomingList = events
      .filter((e) => !isItemPast(e))
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    if (upcomingList.length > 0) return upcomingList[0];

    // 3. Fallback to any event on selected day or first event
    return events.find((e) => e.starts_at?.startsWith(selectedIso)) || events[0] || null;
  }, [events, selectedIso, nowTimestamp]);

  // Event Preparation Checklist
  const [checklist, setChecklist] = useState([
    {
      id: 'c1',
      textKey: 'events.checklistVenue',
      subKey: 'events.checklistVenueSub',
      done: true,
      category: 'Venue & Admin',
      icon: Building,
    },
    {
      id: 'c2',
      textKey: 'events.checklistKeynote',
      subKey: 'events.checklistKeynoteSub',
      done: true,
      category: 'Keynotes & Panelists',
      icon: Mic2,
    },
    {
      id: 'c3',
      textKey: 'events.checklistBadges',
      subKey: 'events.checklistBadgesSub',
      done: false,
      category: 'Comms & Badges',
      icon: Ticket,
    },
    {
      id: 'c4',
      textKey: 'events.checklistAV',
      subKey: 'events.checklistAVSub',
      done: false,
      category: 'Livestream & IoT',
      icon: Cpu,
    },
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

  // Month View Days Generation with items grouped
  const monthGridDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sun
    const totalDays = lastDayOfMonth.getDate();

    // Fill preceding blanks (Monday-based start)
    const blanks = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
    const days: {
      dayNum: number | null;
      date?: Date;
      iso?: string;
      items: typeof scheduleItems;
      upcomingItems: typeof scheduleItems;
      pastItems: typeof scheduleItems;
    }[] = [];

    for (let i = 0; i < blanks; i++) {
      days.push({ dayNum: null, items: [], upcomingItems: [], pastItems: [] });
    }

    for (let d = 1; d <= totalDays; d++) {
      const dayDate = new Date(year, month, d);
      const y = dayDate.getFullYear();
      const m = String(dayDate.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const iso = `${y}-${m}-${dayStr}`;

      const items = scheduleItems.filter((item) => item.starts_at?.startsWith(iso));
      const upcoming = items.filter((item) => !isItemPast(item));
      const past = items.filter((item) => isItemPast(item));

      days.push({
        dayNum: d,
        date: dayDate,
        iso,
        items,
        upcomingItems: upcoming,
        pastItems: past,
      });
    }

    return days;
  }, [currentDate, scheduleItems, nowTimestamp]);

  // Current Month schedule items
  const currentMonthYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const monthScheduleItems = useMemo(() => {
    return scheduleItems.filter((item) => {
      const d = new Date(item.starts_at);
      return !isNaN(d.getTime()) && d.getFullYear() === currentMonthYear && d.getMonth() === currentMonth;
    });
  }, [scheduleItems, currentMonthYear, currentMonth]);

  const monthUpcomingItems = useMemo(() => {
    return monthScheduleItems.filter((item) => !isItemPast(item));
  }, [monthScheduleItems, nowTimestamp]);

  const monthPastItems = useMemo(() => {
    return monthScheduleItems.filter((item) => isItemPast(item));
  }, [monthScheduleItems, nowTimestamp]);

  // Sessions to display in Schedule feed (supports tab filtering and day selection)
  const displayedScheduleItems = useMemo(() => {
    // If in month mode and a specific day is clicked:
    if (viewMode === 'month' && selectedDayIso) {
      const daySessions = scheduleItems.filter((it) => it.starts_at?.startsWith(selectedDayIso));
      if (scheduleFilter === 'upcoming') return daySessions.filter((it) => !isItemPast(it));
      if (scheduleFilter === 'past') return daySessions.filter((it) => isItemPast(it));
      return daySessions;
    }

    // If in month mode without day filter:
    if (viewMode === 'month') {
      if (scheduleFilter === 'upcoming') return monthUpcomingItems;
      if (scheduleFilter === 'past') return monthPastItems;
      return monthScheduleItems;
    }

    // In agenda mode:
    if (scheduleFilter === 'upcoming') return upcomingItems;
    if (scheduleFilter === 'past') return pastItems;
    return scheduleItems;
  }, [
    viewMode,
    selectedDayIso,
    scheduleFilter,
    upcomingItems,
    pastItems,
    scheduleItems,
    monthUpcomingItems,
    monthPastItems,
    monthScheduleItems,
    nowTimestamp,
  ]);

  const monthNameYear = formatDate(currentDate, { month: 'long', year: 'numeric' });

  return (
    <AppShell>
      <div className="pt-4 flex flex-col gap-4 max-w-4xl mx-auto w-full pb-20">
        {/* =========================================================================
            1. VIEW SWITCHER & CAMPUS SEMESTER STATUS
        ========================================================================= */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="inline-flex p-1 bg-slate-100 rounded-full shadow-inner">
            <button
              onClick={() => {
                setViewMode('agenda');
                setSelectedDayIso(null);
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'agenda' ? 'bg-emerald-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>{t('events.agendaView')}</span>
            </button>
            <button
              onClick={() => {
                setViewMode('month');
                setSelectedDayIso(null);
              }}
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

        {/* Governance / Admin Shortcuts */}
        {canManageRecycleBin && (
          <div className="flex items-center justify-between gap-2 p-2.5 px-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs flex-wrap">
            <div className="flex items-center gap-2 text-slate-700 font-bold">
              <Shield className="w-4 h-4 text-emerald-700" />
              <span>Event Governance & Traceability</span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/admin/recycle-bin"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 text-slate-700 hover:text-emerald-800 font-bold transition-all shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>{t('events.recycleBin')}</span>
              </Link>
              <Link
                href="/admin/audit-logs"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 text-slate-700 hover:text-emerald-800 font-bold transition-all shadow-2xs"
              >
                <History className="w-3.5 h-3.5 text-indigo-600" />
                <span>{t('events.auditLogs')}</span>
              </Link>
            </div>
          </div>
        )}

        {/* Feedback Alert Banner */}
        {feedback && (
          <div
            className={`p-3 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
            <div className="flex items-center gap-2">
              {feedback.link && (
                <Link href={feedback.link} className="underline text-emerald-800 hover:text-emerald-950 font-extrabold">
                  View
                </Link>
              )}
              <button onClick={() => setFeedback(null)} className="p-1 rounded hover:bg-black/5">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            2. INTERACTIVE HORIZONTAL WEEKLY STRIP (AGENDA MODE ONLY)
        ========================================================================= */}
        {viewMode === 'agenda' && (
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
                        isSelected
                          ? 'bg-emerald-300'
                          : d.hasUpcoming
                          ? 'bg-emerald-500'
                          : d.hasItem
                          ? 'bg-slate-300'
                          : 'bg-transparent'
                      }`}
                    ></span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            3. DEDICATED MONTH CALENDAR (MONTH MODE ONLY)
        ========================================================================= */}
        {viewMode === 'month' && (
          <div className="bg-white p-5 rounded-3xl shadow-xs border border-emerald-900/10 flex flex-col gap-4">
            {/* Month Navigation & Session Counter */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <h2 className="text-base sm:text-lg font-black text-slate-900 capitalize tracking-tight">
                  {monthNameYear}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold">
                  {monthUpcomingItems.length} {t('events.upcomingTab', { count: monthUpcomingItems.length }).split(' ')[0]}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleToday}
                  className="px-3 py-1 text-xs font-bold rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors"
                >
                  {t('events.today')}
                </button>
                <button
                  onClick={handlePrevMonth}
                  aria-label={t('events.prevMonth')}
                  className="p-1.5 rounded-xl hover:bg-slate-100 transition-colors text-slate-600"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextMonth}
                  aria-label={t('events.nextMonth')}
                  className="p-1.5 rounded-xl hover:bg-slate-100 transition-colors text-slate-600"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 7 Columns: Mon to Sun */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dw, idx) => (
                <div key={idx} className="font-bold text-[10px] sm:text-xs text-slate-400 uppercase py-1">
                  {dw}
                </div>
              ))}

              {monthGridDays.map((cell, idx) => {
                if (!cell.dayNum || !cell.iso) {
                  return <div key={`empty-${idx}`} className="min-h-[72px] sm:min-h-[88px] rounded-2xl bg-slate-50/30" />;
                }

                const isSelected = selectedDayIso ? selectedDayIso === cell.iso : selectedIso === cell.iso;
                const isToday = todayIso === cell.iso;
                const hasUpcoming = cell.upcomingItems.length > 0;
                const totalItems = cell.items.length;

                return (
                  <button
                    key={`day-${cell.dayNum}`}
                    onClick={() => {
                      if (cell.iso) {
                        const newD = new Date(cell.iso);
                        setSelectedDate(newD);
                        // Toggle selected day filter
                        setSelectedDayIso((prev) => (prev === cell.iso ? null : cell.iso!));
                      }
                    }}
                    className={`min-h-[72px] sm:min-h-[88px] p-1.5 rounded-2xl flex flex-col justify-between transition-all border text-left ${
                      isSelected
                        ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm ring-2 ring-emerald-500/30'
                        : isToday
                        ? 'bg-emerald-50/90 text-emerald-950 border-emerald-300 font-semibold'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-100'
                    }`}
                  >
                    {/* Top Row: Day Number & Today indicator */}
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-xs sm:text-sm font-extrabold ${isSelected ? 'text-white' : ''}`}>
                        {cell.dayNum}
                      </span>
                      {isToday && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                          isSelected ? 'bg-emerald-700 text-emerald-100' : 'bg-emerald-200 text-emerald-900'
                        }`}>
                          {t('events.today')}
                        </span>
                      )}
                    </div>

                    {/* Middle: Event Pills/Badges */}
                    <div className="flex flex-col gap-1 w-full my-1">
                      {/* Show upcoming sessions first with rich pill badge */}
                      {cell.upcomingItems.slice(0, 2).map((it) => (
                        <div
                          key={it.id}
                          className={`text-[9px] sm:text-[10px] font-bold truncate px-1.5 py-0.5 rounded-md flex items-center gap-1 ${
                            isSelected
                              ? 'bg-emerald-700 text-white'
                              : it.isMeeting
                              ? 'bg-blue-50 text-blue-800 border border-blue-200/70'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-200/70'
                          }`}
                          title={`${it.title} (${formatTime(it.starts_at)})`}
                        >
                          {it.isMeeting ? (
                            <Video className="w-2.5 h-2.5 shrink-0" />
                          ) : (
                            <Sparkles className="w-2.5 h-2.5 shrink-0 text-emerald-600" />
                          )}
                          <span className="truncate">{it.title}</span>
                        </div>
                      ))}

                      {/* If no upcoming sessions, show past session pill in muted tone */}
                      {cell.upcomingItems.length === 0 && cell.pastItems.slice(0, 1).map((it) => (
                        <div
                          key={it.id}
                          className={`text-[9px] font-medium truncate px-1.5 py-0.5 rounded-md ${
                            isSelected ? 'bg-emerald-700/60 text-emerald-200' : 'bg-slate-100 text-slate-400 line-through'
                          }`}
                          title={`${it.title} (Ended)`}
                        >
                          <span className="truncate">{it.title}</span>
                        </div>
                      ))}

                      {/* More sessions indicator */}
                      {totalItems > 2 && (
                        <span className={`text-[8px] sm:text-[9px] font-bold px-1 ${
                          isSelected ? 'text-emerald-200' : 'text-slate-400'
                        }`}>
                          {t('events.moreEvents', { count: totalItems - 2 })}
                        </span>
                      )}
                    </div>

                    {/* Bottom Status Dot */}
                    <div className="flex items-center gap-1">
                      {hasUpcoming && (
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-300' : 'bg-emerald-600'}`} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            4. PRIORITY FEATURED EVENT CARD (AGENDA MODE ONLY)
        ========================================================================= */}
        {viewMode === 'agenda' && mainEvent && (
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

              {/* Bureau / Admin Event Management Actions */}
              {mainEvent && (canEditEvent(permCtx, mainEvent) || canDeleteEvent(permCtx, mainEvent)) && (
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  {canEditEvent(permCtx, mainEvent) && (
                    <button
                      onClick={() => openEditModal(mainEvent)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5 text-slate-600" />
                      <span>{t('events.editEvent')}</span>
                    </button>
                  )}
                  {canDeleteEvent(permCtx, mainEvent) && (
                    <button
                      onClick={() => openDeleteModal(mainEvent)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>{t('events.deleteEvent')}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            5. SESSIONS SCHEDULE FEED (UPCOMING CLUB SCHEDULE - PRIORITIZED FIRST)
        ========================================================================= */}
        <div className="flex flex-col gap-3 pt-2">
          {/* Header & Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                {viewMode === 'month' && selectedDayIso
                  ? t('events.eventsOnDate', { date: formatDate(selectedDayIso, { month: 'short', day: 'numeric' }) })
                  : viewMode === 'month'
                  ? t('events.upcomingInMonth', { month: monthNameYear })
                  : t('events.upcomingSchedule')}
              </h3>

              {viewMode === 'month' && selectedDayIso && (
                <button
                  onClick={() => setSelectedDayIso(null)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 text-[11px] font-bold transition-colors"
                >
                  <X className="w-3 h-3" />
                  <span>{t('events.viewAllMonth', { month: monthNameYear.split(' ')[0] })}</span>
                </button>
              )}
            </div>

            {/* Filter Tabs: Upcoming (Default), Past, All */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-bold self-start sm:self-auto">
              <button
                onClick={() => setScheduleFilter('upcoming')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  scheduleFilter === 'upcoming'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('events.upcomingTab', {
                  count: viewMode === 'month' ? monthUpcomingItems.length : upcomingItems.length,
                })}
              </button>
              <button
                onClick={() => setScheduleFilter('past')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  scheduleFilter === 'past'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('events.pastTab', {
                  count: viewMode === 'month' ? monthPastItems.length : pastItems.length,
                })}
              </button>
              <button
                onClick={() => setScheduleFilter('all')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  scheduleFilter === 'all'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('events.allTab', {
                  count: viewMode === 'month' ? monthScheduleItems.length : scheduleItems.length,
                })}
              </button>
            </div>
          </div>

          {/* Session Cards List */}
          {displayedScheduleItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-3xl border border-dashed border-slate-200 flex flex-col items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-slate-300" />
              <span>
                {scheduleFilter === 'past'
                  ? t('events.noPast')
                  : t('events.noUpcoming')}
              </span>
              {scheduleFilter === 'upcoming' && (
                <button
                  onClick={() => setScheduleFilter('all')}
                  className="mt-1 text-emerald-700 hover:underline font-bold"
                >
                  {t('events.allTab', { count: scheduleItems.length })}
                </button>
              )}
            </div>
          ) : (
            displayedScheduleItems.map((item) => {
              const itemDate = new Date(item.starts_at);
              const monthShort = new Intl.DateTimeFormat(locale === 'ar-TN' ? 'ar-TN' : locale === 'fr' ? 'fr-FR' : 'en-US', {
                month: 'short',
              }).format(itemDate);
              const dayNum = itemDate.getDate();
              const isBookmarked = Boolean(bookmarkedIds[item.id]);
              const itemIsPast = isItemPast(item);

              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3.5 p-3.5 rounded-2xl bg-white shadow-xs border transition-all hover:shadow-md ${
                    itemIsPast
                      ? 'border-slate-100 opacity-80'
                      : 'border-emerald-900/10'
                  }`}
                >
                  {/* Date Badge */}
                  <div
                    className={`flex flex-col items-center justify-center w-12 h-12 rounded-2xl shrink-0 ${
                      itemIsPast
                        ? 'bg-slate-100 text-slate-500 border border-slate-200'
                        : item.isMeeting
                        ? 'bg-blue-50 text-blue-900 border border-blue-100'
                        : 'bg-emerald-50 text-emerald-900 border border-emerald-100'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase">{monthShort}</span>
                    <span className="text-base font-extrabold leading-none">{dayNum}</span>
                  </div>

                  {/* Body Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                          itemIsPast
                            ? 'bg-slate-100 text-slate-600'
                            : item.isMeeting
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {item.badge}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatTime(item.starts_at)} - {formatTime(item.ends_at)}
                      </span>
                      {itemIsPast && (
                        <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-500 text-[9px] font-bold">
                          {t('events.done')}
                        </span>
                      )}
                    </div>

                    <h4 className={`text-xs sm:text-sm font-bold truncate mt-0.5 ${
                      itemIsPast ? 'text-slate-600' : 'text-slate-900'
                    }`}>
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 truncate">{item.location}</p>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {item.type === 'event' && item.rawEvent && (
                      <>
                        {canEditEvent(permCtx, item.rawEvent) && (
                          <button
                            onClick={() => openEditModal(item.rawEvent!)}
                            aria-label="Edit event"
                            title={t('events.editEvent')}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {canDeleteEvent(permCtx, item.rawEvent) && (
                          <button
                            onClick={() => openDeleteModal(item.rawEvent!)}
                            aria-label="Delete event"
                            title={t('events.deleteEvent')}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}

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

      {/* =========================================================================
          6. EVENT OPERATIONAL CHECKLIST (REPOSITIONED BELOW SCHEDULE & REDESIGNED ELEGANTLY)
      ========================================================================= */}
      {viewMode === 'agenda' && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-emerald-900/10 flex flex-col gap-4 mt-2">
          {/* Header with Title, Progress Bar, and Score Badge */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-xs">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                      {t('events.checklistTitle')}
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-extrabold border border-emerald-200">
                      <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                      Logistics Ready
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{t('events.checklistSub')}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-extrabold text-xs shadow-xs border border-emerald-200/80">
                  {readinessPercent}% {t('events.readinessScore')}
                </span>
              </div>
            </div>

            {/* Linear Visual Progress Gauge */}
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400 rounded-full transition-all duration-500 ease-out shadow-xs"
                style={{ width: `${readinessPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 px-0.5">
              <span>
                {doneCount} of {checklist.length} sprint milestones completed
              </span>
              <span className="text-emerald-700 font-bold">
                {readinessPercent === 100 ? 'All Systems Verified' : `${100 - readinessPercent}% remaining`}
              </span>
            </div>
          </div>

          {/* Checklist Items Stack */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {checklist.map((item) => {
              const ItemIcon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => toggleChecklist(item.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none group ${
                    item.done
                      ? 'bg-emerald-50/40 border-emerald-200/80 shadow-2xs'
                      : 'bg-white border-slate-200/90 hover:border-emerald-300 hover:bg-slate-50/60 shadow-2xs'
                  }`}
                >
                  {/* Custom Modern Checkbox Button */}
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      item.done
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'border-2 border-slate-300 group-hover:border-emerald-500 bg-white'
                    }`}
                  >
                    {item.done && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1 flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                        <ItemIcon className="w-3 h-3 text-slate-500" />
                        <span>{item.category}</span>
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                          item.done
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {item.done ? 'Done' : 'Pending'}
                      </span>
                    </div>

                    <p
                      className={`text-xs font-bold leading-snug transition-colors ${
                        item.done ? 'line-through text-slate-500 decoration-emerald-600/60' : 'text-slate-900'
                      }`}
                    >
                      {t(item.textKey)}
                    </p>

                    <p className="text-[11px] text-emerald-800 font-medium">
                      {t(item.subKey)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {isEditModalOpen && editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800">
                  <Pencil className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base text-slate-900">{t('events.editEvent')}</h3>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingEvent(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto px-1">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Location / Venue</label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm((p) => ({ ...p, location: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Capacity</label>
                  <input
                    type="number"
                    value={editForm.capacity}
                    onChange={(e) => setEditForm((p) => ({ ...p, capacity: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    value={editForm.starts_at}
                    onChange={(e) => setEditForm((p) => ({ ...p, starts_at: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    value={editForm.ends_at}
                    onChange={(e) => setEditForm((p) => ({ ...p, ends_at: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200">
                <label className="text-xs font-extrabold text-amber-900 block mb-1">
                  {t('events.editReasonLabel')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('events.editReasonPlaceholder')}
                  value={editForm.reason}
                  onChange={(e) => setEditForm((p) => ({ ...p, reason: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[10px] text-amber-800 mt-1">
                  This reason will be permanently recorded in the immutable audit log with your signature snapshot.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingEvent(null);
                }}
                disabled={isSavingEdit}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                {t('events.cancel')}
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSavingEdit || !editForm.title.trim() || !editForm.reason.trim()}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
              >
                {isSavingEdit ? 'Saving...' : t('events.saveChangesBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Event Modal */}
      {isDeleteModalOpen && deletingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
                  <Trash2 className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base text-slate-900">{t('events.deleteConfirmTitle')}</h3>
              </div>
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeletingEvent(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              {t('events.deleteConfirmDesc')}
            </p>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <p className="font-bold text-slate-900">{deletingEvent.title}</p>
              <p className="text-slate-500 text-[11px] mt-0.5">
                {formatDate(deletingEvent.starts_at, { month: 'short', day: 'numeric', year: 'numeric' })} • {deletingEvent.location}
              </p>
            </div>

            <div>
              <label className="text-xs font-extrabold text-slate-800 block mb-1">
                {t('events.deleteReasonLabel')}
              </label>
              <textarea
                rows={2}
                required
                placeholder={t('events.deleteReasonPlaceholder')}
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-rose-300 text-xs outline-none focus:ring-2 focus:ring-rose-500 resize-none"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Soft-deleted items can be inspected or restored from the <Link href="/admin/recycle-bin" className="underline font-bold text-slate-700">Recycle Bin</Link>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeletingEvent(null);
                }}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                {t('events.cancel')}
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting || !deleteReason.trim()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : t('events.confirmDeleteBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

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
