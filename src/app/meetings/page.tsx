'use client';

import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import {
  FileText,
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  Plus,
  Users,
  ArrowRight,
  ClipboardList,
} from 'lucide-react';

export default function MeetingsPage() {
  const { user, activeRole, meetings, addMeeting } = useAuth();
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('ISIMS Room 104');
  const [description, setDescription] = useState('');
  const [dateStr, setDateStr] = useState('');

  const handleScheduleMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const starts = dateStr ? new Date(dateStr).toISOString() : new Date().toISOString();
    const ends = new Date(new Date(starts).getTime() + 5400000).toISOString();

    addMeeting({
      title: title.trim(),
      description: description.trim() || 'Official chapter sync.',
      location,
      starts_at: starts,
      ends_at: ends,
      organizer_id: user?.id || 'usr-yassine-001',
    });

    setTitle('');
    setDescription('');
    setShowScheduleModal(false);
  };

  return (
    <AppShell>
      <div className="pt-4 flex flex-col gap-4 max-w-4xl mx-auto w-full pb-20">
        {/* Header Strip */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h1 className="font-extrabold text-lg sm:text-xl text-slate-900">Meetings & Minutes (PV)</h1>
              <p className="text-xs text-slate-500">Official agendas, attendance logs & actionable decision tracker</p>
            </div>
          </div>

          <button
            onClick={() => setShowScheduleModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs shadow-md hover:bg-emerald-800 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Meeting</span>
          </button>
        </div>

        {/* Meetings List */}
        <div className="flex flex-col gap-4">
          {meetings.map((meet) => (
            <div
              key={meet.id}
              className="bg-white rounded-3xl p-5 shadow-xs border border-emerald-900/10 flex flex-col gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 font-mono text-xs font-bold border border-blue-200">
                      PV Official
                    </span>
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(meet.starts_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} •{' '}
                      {new Date(meet.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900 mt-1">{meet.title}</h3>
                  <p className="text-xs text-slate-600 mt-0.5">{meet.description}</p>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="font-medium">{meet.location}</span>
                </div>
              </div>

              {/* Recorded Minutes (PV) */}
              {meet.minutes && (
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex flex-col gap-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-900">
                    Adopted Minutes (Procès-Verbal)
                  </span>
                  <p className="text-xs text-slate-800 leading-relaxed font-medium">{meet.minutes}</p>
                </div>
              )}

              {/* Action Items Linked to Tasks */}
              {meet.action_items && meet.action_items.length > 0 && (
                <div className="flex flex-col gap-2 pt-1">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4 text-emerald-700" />
                    Decisions & Assigned Action Items ({meet.action_items.length})
                  </span>
                  <div className="flex flex-col gap-2">
                    {meet.action_items.map((act) => (
                      <div
                        key={act.id}
                        className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle className={`w-4 h-4 ${act.status === 'completed' ? 'text-emerald-600' : 'text-slate-400'}`} />
                          <span className="font-bold text-slate-900 truncate">{act.title}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            act.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {act.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Schedule Meeting Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-emerald-100 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900">Schedule Bureau Meeting</h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 text-sm font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleScheduleMeeting} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600">Meeting Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Weekly Bureau Strategy & Tasks"
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">Location / Room</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">Date & Time</label>
                <input
                  type="datetime-local"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">Agenda Outline</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Agenda items to review."
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 text-white hover:bg-emerald-800"
                >
                  Confirm Meeting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
