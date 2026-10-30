'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import ScheduleMeetingModal from '@/components/meetings/ScheduleMeetingModal';
import {
  Calendar,
  Clock,
  Video,
  ExternalLink,
  Search,
  Plus,
  FileText,
  Sparkles,
  Eye,
  ChevronRight,
  Play,
  ListTodo
} from 'lucide-react';
import { Meeting, MeetingType } from '@/types/database.types';

export default function MeetingsPage() {
  const { user, activeRole, meetings } = useAuth();
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [tab, setTab] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [onlyWithRecording, setOnlyWithRecording] = useState(false);
  const [onlyWithTranscript, setOnlyWithTranscript] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  React.useEffect(() => {
    setNow(new Date());
  }, []);

  const canSchedule = activeRole === 'admin' || activeRole === 'bureau';

  const isConfidential = (m: Meeting) => m.visibility === 'restricted' || m.visibility === 'confidential';
  const getDeptName = (dept: Meeting['department']) => (typeof dept === 'string' ? dept : dept?.name || '');
  const getOrgName = (org: Meeting['organizer']) => (typeof org === 'string' ? org : org?.full_name || 'Organizer');
  const getDateStr = (m: Meeting) => m.date || (m.starts_at ? m.starts_at.slice(0, 10) : 'Upcoming');
  const getTimeStr = (m: Meeting) =>
    m.start_time && m.end_time
      ? `${m.start_time} - ${m.end_time}`
      : m.starts_at
      ? m.starts_at.slice(11, 16)
      : '';

  // Filter meetings based on user role and visibility
  const accessibleMeetings = useMemo(() => {
    return meetings.filter((m) => {
      if (isConfidential(m)) {
        const isInvited = m.participant_ids?.includes(user?.id || '');
        const isOrganizer = m.organizer_id === user?.id || m.created_by === user?.id;
        const isBureauOrAdmin = activeRole === 'admin' || activeRole === 'bureau';
        if (!isBureauOrAdmin && !isInvited && !isOrganizer) {
          return false;
        }
      }
      return true;
    });
  }, [meetings, user, activeRole]);

  // Apply tab (upcoming / past) and search filters
  const filteredMeetings = useMemo(() => {
    return accessibleMeetings.filter((m) => {
      const meetDate = m.starts_at || m.date || '';
      const isPast = m.status === 'completed' || (now && meetDate ? new Date(meetDate) < now : false);

      // Tab filter
      if (tab === 'upcoming' && isPast) return false;
      if (tab === 'past' && !isPast) return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = m.title.toLowerCase().includes(q);
        const matchesDesc = (m.description || '').toLowerCase().includes(q);
        const matchesAgenda = (m.agenda || '').toLowerCase().includes(q);
        const matchesOrganizer = getOrgName(m.organizer).toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesAgenda && !matchesOrganizer) {
          return false;
        }
      }

      // Department filter
      if (selectedDepartment !== 'all') {
        const dName = getDeptName(m.department);
        if (dName !== selectedDepartment) return false;
      }

      // Meeting Type filter
      if (selectedType !== 'all' && m.meeting_type !== selectedType) {
        return false;
      }

      // Recording & Transcript flags
      if (onlyWithRecording && (!m.recordings || m.recordings.length === 0)) {
        return false;
      }
      const hasTranscript = Boolean(m.transcript) || (m.transcripts && m.transcripts.length > 0);
      if (onlyWithTranscript && !hasTranscript) {
        return false;
      }

      return true;
    });
  }, [accessibleMeetings, tab, searchQuery, selectedDepartment, selectedType, onlyWithRecording, onlyWithTranscript]);

  const departments = ['Tech & Innovation', 'Green Projects', 'Communications', 'Logistics', 'Bureau'];
  const meetingTypes: { label: string; value: MeetingType }[] = [
    { label: 'General Club Meeting', value: 'general' },
    { label: 'Bureau Meeting', value: 'bureau' },
    { label: 'Department Meeting', value: 'department' },
    { label: 'Project Meeting', value: 'project' },
    { label: 'Event Preparation', value: 'event_prep' },
    { label: 'Other', value: 'other' },
  ];

  return (
    <AppShell>
      <div className="pt-4 flex flex-col gap-5 max-w-5xl mx-auto w-full pb-20">
        {/* Header Hero Strip */}
        <section className="bg-white rounded-3xl p-6 border border-emerald-900/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black shadow-sm shrink-0">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-xl text-slate-900">Smart Meeting Center</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                  Searchable Memory
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Google Meet integration, automatic recordings, searchable transcripts & institutional decisions
              </p>
            </div>
          </div>

          {canSchedule && (
            <button
              onClick={() => setShowScheduleModal(true)}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule New Meeting</span>
            </button>
          )}
        </section>

        {/* Tab Strip: Upcoming vs Past vs All */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex rounded-2xl bg-slate-100 p-1 text-xs font-bold">
            <button
              onClick={() => setTab('upcoming')}
              className={`px-4 py-2 rounded-xl transition-all ${
                tab === 'upcoming'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Upcoming Meetings
            </button>
            <button
              onClick={() => setTab('past')}
              className={`px-4 py-2 rounded-xl transition-all ${
                tab === 'past'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Past Archives & Recordings
            </button>
            <button
              onClick={() => setTab('all')}
              className={`px-4 py-2 rounded-xl transition-all ${
                tab === 'all'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Meetings ({accessibleMeetings.length})
            </button>
          </div>

          <div className="text-xs text-slate-500 font-semibold">
            Showing <span className="text-slate-900 font-bold">{filteredMeetings.length}</span> meeting{filteredMeetings.length === 1 ? '' : 's'}
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <section className="bg-white rounded-3xl p-4 border border-emerald-900/10 shadow-xs flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search meetings by title, agenda, topic, or organizer..."
                className="w-full pl-10 pr-4 py-2 text-xs rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-slate-50/50"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600 shrink-0"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600 shrink-0"
              >
                <option value="all">All Meeting Types</option>
                {meetingTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Filter Badges */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap text-xs font-semibold">
            <span className="text-[11px] text-slate-400 font-bold uppercase">Quick Filters:</span>
            <button
              onClick={() => setOnlyWithRecording(!onlyWithRecording)}
              className={`px-3 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
                onlyWithRecording
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-900 font-bold'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <Play className="w-3 h-3 text-emerald-700" />
              <span>With Recording</span>
            </button>
            <button
              onClick={() => setOnlyWithTranscript(!onlyWithTranscript)}
              className={`px-3 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
                onlyWithTranscript
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-900 font-bold'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <FileText className="w-3 h-3 text-emerald-700" />
              <span>With Transcript</span>
            </button>
            {(onlyWithRecording || onlyWithTranscript || selectedDepartment !== 'all' || selectedType !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedDepartment('all');
                  setSelectedType('all');
                  setOnlyWithRecording(false);
                  setOnlyWithTranscript(false);
                }}
                className="text-[11px] font-bold text-rose-600 hover:underline ml-auto"
              >
                Clear all filters
              </button>
            )}
          </div>
        </section>

        {/* Meetings List */}
        {filteredMeetings.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Calendar className="w-7 h-7" />
            </div>
            <h3 className="text-base font-extrabold text-slate-800">No meetings found</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              {searchQuery || selectedDepartment !== 'all' || selectedType !== 'all'
                ? 'Try adjusting your search criteria or filters to locate meeting archives.'
                : 'No meetings currently scheduled in this category.'}
            </p>
            {canSchedule && (
              <button
                onClick={() => setShowScheduleModal(true)}
                className="mt-2 px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800"
              >
                Schedule First Meeting
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredMeetings.map((meet) => {
              const hasRec = meet.recordings && meet.recordings.length > 0;
              const hasTrans = Boolean(meet.transcript) || (meet.transcripts && meet.transcripts.length > 0);
              const hasSummary = Boolean(meet.summary);
              const summaryData = meet.summary?.content || meet.summary?.summary_content;
              const actionCount = summaryData?.action_items?.length || meet.action_items?.length || 0;
              const deptLabel = getDeptName(meet.department);
              const orgLabel = getOrgName(meet.organizer);

              return (
                <div
                  key={meet.id}
                  className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-900/10 shadow-xs hover:shadow-md transition-all flex flex-col gap-4 group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-[10px] font-black uppercase tracking-wider border border-emerald-200">
                          {meet.meeting_type || 'General Club Meeting'}
                        </span>
                        {deptLabel && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-bold">
                            {deptLabel}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                            meet.status === 'live'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse'
                              : meet.status === 'completed'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {meet.status === 'live' ? '🔴 Live Session' : meet.status}
                        </span>
                        {isConfidential(meet) && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            <span>Restricted</span>
                          </span>
                        )}
                      </div>

                      <Link href={`/meetings/${meet.id}`}>
                        <h2 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {meet.title}
                        </h2>
                      </Link>

                      <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                        {meet.description || 'Club synchronization and sustainability milestone tracking.'}
                      </p>
                    </div>

                    {/* Prominent Google Meet Join Button */}
                    {meet.meeting_url && (
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={meet.meeting_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-xs transition-transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <Video className="w-4 h-4" />
                          <span>Join Google Meet</span>
                          <ExternalLink className="w-3 h-3 opacity-80" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Metadata Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span className="font-semibold text-slate-800">{getDateStr(meet)}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span className="font-semibold text-slate-800">{getTimeStr(meet)}</span>
                    </div>

                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-[11px] text-slate-400 font-bold uppercase">Organizer:</span>
                      <span className="font-semibold text-slate-800 truncate">{orgLabel}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 font-bold uppercase">Platform:</span>
                      <span className="font-semibold text-slate-800">Google Meet</span>
                    </div>
                  </div>

                  {/* Smart Artifact Badges & Link to Meeting Memory */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {hasRec && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-900 text-[10px] font-bold border border-emerald-200">
                          <Play className="w-3 h-3 text-emerald-600 fill-emerald-600" />
                          <span>Recording Available</span>
                        </span>
                      )}

                      {hasTrans && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-900 text-[10px] font-bold border border-blue-200">
                          <FileText className="w-3 h-3 text-blue-600" />
                          <span>Searchable Transcript</span>
                        </span>
                      )}

                      {hasSummary && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 text-[10px] font-bold border border-amber-200">
                          <Sparkles className="w-3 h-3 text-amber-600" />
                          <span>8D AI Summary</span>
                        </span>
                      )}

                      {actionCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-900 text-[10px] font-bold border border-purple-200">
                          <ListTodo className="w-3 h-3 text-purple-600" />
                          <span>{actionCount} Action Items</span>
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/meetings/${meet.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline ml-auto"
                    >
                      <span>Open Meeting Hub & Memory</span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Schedule Meeting */}
        <ScheduleMeetingModal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
        />
      </div>
    </AppShell>
  );
}
