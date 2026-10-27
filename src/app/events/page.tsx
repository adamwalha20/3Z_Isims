'use client';

import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { EventItem } from '@/types/database.types';
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
} from 'lucide-react';

export default function EventsPage() {
  const { user, events, registerEvent } = useAuth();
  const [viewMode, setViewMode] = useState<'agenda' | 'month'>('agenda');
  const [selectedDay, setSelectedDay] = useState(24);
  const [showQRPass, setShowQRPass] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [checklist, setChecklist] = useState([
    { id: 'c1', text: 'Reserve Amphi A with administration', done: true, subtext: 'Completed by Bureau' },
    { id: 'c2', text: 'Send formal invitation to keynote speaker', done: true, subtext: 'Confirmed keynote slot' },
    { id: 'c3', text: 'Print badges & attendee feedback forms', done: false, subtext: 'Assigned to Comms • Due Oct 28' },
    { id: 'c4', text: 'Set up dual projector & livestream audio feed', done: false, subtext: 'Assigned to Tech Lead • Setup 13:00' },
  ]);

  const toggleChecklist = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
  };

  const doneCount = checklist.filter((c) => c.done).length;
  const readinessPercent = Math.round((doneCount / checklist.length) * 100);

  const mainEvent = events[0];

  return (
    <AppShell>
      <div className="pt-4 flex flex-col gap-4 max-w-4xl mx-auto w-full pb-20">
        {/* =========================================================================
            1. VIEW SWITCHER & CAMPUS SEMESTER STATUS (Stitch Screen 3)
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
              <span>Agenda</span>
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'month' ? 'bg-emerald-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Month</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200/80 text-xs font-semibold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>S1 • Oct 2024</span>
          </div>
        </div>

        {/* =========================================================================
            2. WEEKLY HORIZONTAL CALENDAR STRIP
        ========================================================================= */}
        <div className="bg-white p-4 rounded-3xl shadow-xs border border-emerald-900/10 flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-extrabold text-slate-900">October 2024</span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold">
                Week 4
              </span>
            </div>
            <div className="flex items-center gap-1 text-slate-400">
              <button aria-label="Previous week" className="p-1 rounded-full hover:bg-slate-100 transition-colors">
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <button aria-label="Next week" className="p-1 rounded-full hover:bg-slate-100 transition-colors">
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {[
              { day: 'Mon', num: 21 },
              { day: 'Tue', num: 22 },
              { day: 'Wed', num: 23 },
              { day: 'Thu', num: 24, hasDot: true },
              { day: 'Fri', num: 25 },
              { day: 'Sat', num: 26 },
              { day: 'Sun', num: 27 },
            ].map((d) => {
              const isSelected = selectedDay === d.num;
              return (
                <button
                  key={d.num}
                  onClick={() => setSelectedDay(d.num)}
                  className={`flex flex-col items-center py-2 px-1 rounded-2xl transition-all ${
                    isSelected
                      ? 'bg-emerald-800 text-white shadow-md scale-105'
                      : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span className={`text-[10px] font-semibold ${isSelected ? 'text-emerald-200' : 'text-slate-400'}`}>
                    {d.day}
                  </span>
                  <span className="text-sm font-extrabold mt-0.5">{d.num}</span>
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
            3. PRIORITY EVENT CARD (Main Feature)
        ========================================================================= */}
        {mainEvent && (
          <div className="bg-white rounded-3xl shadow-sm border border-emerald-900/10 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
            {/* Image Header with Gradient Scrim */}
            <div className="relative h-48 w-full bg-emerald-900 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=80"
                alt="Climate Talk Presentation Auditorium"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-between p-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-emerald-800 text-xs font-bold shadow-xs">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    Certified Green Activity
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-400 text-emerald-950 text-xs font-extrabold">
                    Flagship
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-emerald-300 text-xs font-semibold mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Friday, Oct 29 • 14:00 - 17:30</span>
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
                  Training • Innovation • Comms
                </span>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold">
                  +40 Karma XP
                </span>
              </div>

              <div className="flex items-start gap-2 text-slate-600">
                <MapPin className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs sm:text-sm text-slate-900 font-bold">{mainEvent.location}</p>
                  <p className="text-xs text-slate-400">Central Academic Wing • Ground Floor ISIMS</p>
                </div>
              </div>

              {/* Registration Progress Meter */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-800 font-bold">Attendance Seatings</span>
                  <div className="flex items-center gap-1">
                    <span className="font-extrabold text-emerald-800">{mainEvent.registrations_count || 48}</span>
                    <span className="text-slate-400">/ 60 Registered</span>
                    <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-bold">
                      80%
                    </span>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-emerald-200/60 overflow-hidden">
                  <div className="h-full bg-emerald-700 rounded-full transition-all duration-500" style={{ width: '80%' }}></div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => setShowQRPass(true)}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 active:scale-95 transition-all shadow-xs"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Show QR Pass</span>
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
                  <span>{mainEvent.user_registered ? 'Registered ✓' : 'Register Seat'}</span>
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
                <h3 className="font-extrabold text-sm text-slate-900">Event Readiness Log</h3>
                <p className="text-[11px] text-slate-500">Sprint prep tasks ahead of Oct 29</p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
              {readinessPercent}% Ready
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
                    {item.text}
                  </p>
                  <p className="text-[10px] text-emerald-800 mt-0.5 font-medium">{item.subtext}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* =========================================================================
            5. UPCOMING CLUB SCHEDULE FEED
        ========================================================================= */}
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900">Upcoming Club Schedule</h3>
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">3 Sessions</span>
          </div>

          {[
            {
              month: 'Oct',
              day: 28,
              badge: 'Governance',
              time: '10:00 - 11:30',
              title: 'Bureau Weekly Sync & Budget Review',
              loc: 'ISIMS Club Workspace Room 104',
            },
            {
              month: 'Oct',
              day: 31,
              badge: 'Tech Workshop',
              time: '14:30 - 16:30',
              title: 'Life Cycle Assessment with Eng. Tarek',
              loc: 'Computer Science Lab 3B',
            },
            {
              month: 'Nov',
              day: 10,
              badge: 'Mandatory',
              time: '13:00 - 16:00',
              title: 'General Assembly Q1 & Project Handover',
              loc: 'Conference Room Ibn Khaldoun',
              isMandatory: true,
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white shadow-xs border border-emerald-900/10 hover:shadow-md transition-shadow"
            >
              <div
                className={`flex flex-col items-center justify-center w-12 h-12 rounded-2xl shrink-0 ${
                  item.isMandatory ? 'bg-rose-100 text-rose-800' : 'bg-emerald-50 text-emerald-900'
                }`}
              >
                <span className="text-[10px] font-bold uppercase">{item.month}</span>
                <span className="text-base font-extrabold leading-none">{item.day}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                      item.isMandatory ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{item.time}</span>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate mt-0.5">{item.title}</h4>
                <p className="text-[11px] text-slate-500 truncate">{item.loc}</p>
              </div>
              <button aria-label="Bookmark" className="p-2 text-slate-400 hover:text-emerald-700 transition-colors">
                <Bookmark className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* QR Pass Modal */}
      {showQRPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center gap-4 text-center">
            <h3 className="font-extrabold text-base text-slate-900">Event Fast Check-In Pass</h3>
            <p className="text-xs text-slate-500">Scan at entrance for Amphi A climate sprint registration.</p>
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
              <QrCode className="w-56 h-56 text-emerald-900" />
            </div>
            <div className="font-mono text-xs text-slate-700">PASS-EVT-001 • Yassine Mezghani</div>
            <button
              onClick={() => setShowQRPass(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
