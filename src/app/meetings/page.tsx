'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/context';
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
  ListTodo,
  Pencil,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Meeting, MeetingType } from '@/types/database.types';
import { canEditMeeting, canDeleteMeeting } from '@/lib/permissions/permission-checks';

export default function MeetingsPage() {
  const { t, isRtl } = useTranslation();
  const { user, activeRole, userBureauPositions, meetings, editMeeting, deleteMeeting } = useAuth();
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [tab, setTab] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [onlyWithRecording, setOnlyWithRecording] = useState(false);
  const [onlyWithTranscript, setOnlyWithTranscript] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  // Edit / Delete meeting state
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editStartsAt, setEditStartsAt] = useState('');
  const [editEndsAt, setEditEndsAt] = useState('');
  const [editMeetingUrl, setEditMeetingUrl] = useState('');
  const [editVisibility, setEditVisibility] = useState('public');
  const [editReason, setEditReason] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [deletingMeeting, setDeletingMeeting] = useState<Meeting | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeletingMeeting, setIsDeletingMeeting] = useState(false);

  const permCtx = {
    userId: user?.id,
    email: user?.email,
    role: activeRole,
    bureauPositions: userBureauPositions || [],
    departmentId: (user as any)?.department_id,
  };

  const toInputDateTime = (isoStr?: string | null) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 16);
  };

  const openEditModal = (m: Meeting) => {
    setEditingMeeting(m);
    setEditTitle(m.title || '');
    setEditDescription(m.description || '');
    setEditLocation(m.location || '');
    setEditStartsAt(toInputDateTime(m.starts_at));
    setEditEndsAt(toInputDateTime(m.ends_at));
    setEditMeetingUrl(m.meeting_url || '');
    setEditVisibility(m.visibility || 'public');
    setEditReason('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeeting || !editTitle.trim() || !editReason.trim()) return;

    setIsSavingEdit(true);
    try {
      const updates = {
        title: editTitle.trim(),
        description: editDescription.trim(),
        location: editLocation.trim(),
        starts_at: editStartsAt ? new Date(editStartsAt).toISOString() : editingMeeting.starts_at,
        ends_at: editEndsAt ? new Date(editEndsAt).toISOString() : editingMeeting.ends_at,
        meeting_url: editMeetingUrl.trim() || null,
        visibility: editVisibility as any,
      };

      const res = await editMeeting(editingMeeting.id, updates, editReason.trim());
      if (res.success) {
        setEditingMeeting(null);
      } else {
        alert(res.error || 'Failed to update meeting');
      }
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingMeeting || !deleteReason.trim()) return;

    setIsDeletingMeeting(true);
    try {
      const res = await deleteMeeting(deletingMeeting.id, deleteReason.trim());
      if (res.success) {
        setDeletingMeeting(null);
      } else {
        alert(res.error || 'Failed to delete meeting');
      }
    } finally {
      setIsDeletingMeeting(false);
    }
  };

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
        <section className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-slate-900">{t('meetings.title')}</h1>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Searchable Memory
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('meetings.subtitle')}
              </p>
            </div>
          </div>

          {canSchedule && (
            <button
              onClick={() => setShowScheduleModal(true)}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{t('meetings.scheduleMeeting')}</span>
            </button>
          )}
        </section>

        {/* Tab Strip: Upcoming vs Past vs All */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
            <button
              onClick={() => setTab('upcoming')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                tab === 'upcoming'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('meetings.upcoming')}
            </button>
            <button
              onClick={() => setTab('past')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                tab === 'past'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('meetings.pastArchive')}
            </button>
            <button
              onClick={() => setTab('all')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                tab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('common.all')} ({accessibleMeetings.length})
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="text-slate-900 font-semibold">{filteredMeetings.length}</span> meeting{filteredMeetings.length === 1 ? '' : 's'}
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <section className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex flex-col gap-2.5">
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search meetings by title, agenda, topic, or organizer..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-600 bg-white"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:border-emerald-600 shrink-0"
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
          <div className="bg-white rounded-xl p-8 border border-slate-200 text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">No meetings found</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              {searchQuery || selectedDepartment !== 'all' || selectedType !== 'all'
                ? 'Try adjusting your search criteria or filters to locate meeting archives.'
                : 'No meetings currently scheduled in this category.'}
            </p>
            {canSchedule && (
              <button
                onClick={() => setShowScheduleModal(true)}
                className="mt-1 px-3.5 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800"
              >
                Schedule First Meeting
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
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
                  className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-colors flex flex-col gap-3.5 group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-semibold uppercase tracking-wider border border-emerald-200">
                          {meet.meeting_type || 'General Club Meeting'}
                        </span>
                        {deptLabel && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-medium">
                            {deptLabel}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${
                            meet.status === 'live'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                              : meet.status === 'completed'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {meet.status === 'live' ? '🔴 Live Session' : meet.status}
                        </span>
                        {isConfidential(meet) && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            <span>Restricted</span>
                          </span>
                        )}
                      </div>

                      <Link href={`/meetings/${meet.id}`}>
                        <h2 className="text-base font-semibold text-slate-900 group-hover:text-emerald-800 transition-colors">
                          {meet.title}
                        </h2>
                      </Link>

                      <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                        {meet.description || 'Club synchronization and sustainability milestone tracking.'}
                      </p>
                    </div>

                    {/* Actions: Google Meet, Edit, Delete */}
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      {meet.meeting_url && (
                        <a
                          href={meet.meeting_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                        >
                          <Video className="w-4 h-4" />
                          <span>Join Google Meet</span>
                          <ExternalLink className="w-3 h-3 opacity-80" />
                        </a>
                      )}
                      {canEditMeeting(permCtx, meet) && (
                        <button
                          onClick={() => openEditModal(meet)}
                          className="p-2 rounded-lg border border-slate-200 hover:border-emerald-500 bg-white text-slate-700 hover:text-emerald-800 transition-colors shadow-2xs"
                          title="Edit Meeting"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDeleteMeeting(permCtx, meet) && (
                        <button
                          onClick={() => {
                            setDeletingMeeting(meet);
                            setDeleteReason('');
                          }}
                          className="p-2 rounded-lg border border-rose-200 hover:bg-rose-100 bg-rose-50 text-rose-700 transition-colors shadow-2xs"
                          title="Move to Recycle Bin"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
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

        {/* Modal: Edit Meeting */}
        {editingMeeting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 flex flex-col gap-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                    <Pencil className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">Edit Meeting Details</h3>
                    <p className="text-[11px] text-slate-500">Authorized change tracked in club audit trail</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingMeeting(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-sm p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="flex flex-col gap-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-700">Meeting Title *</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Meeting title"
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Description</label>
                  <textarea
                    rows={2}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Meeting agenda and discussion topics..."
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Start Time *</label>
                    <input
                      type="datetime-local"
                      required
                      value={editStartsAt}
                      onChange={(e) => setEditStartsAt(e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">End Time *</label>
                    <input
                      type="datetime-local"
                      required
                      value={editEndsAt}
                      onChange={(e) => setEditEndsAt(e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Google Meet URL / Room Link</label>
                  <input
                    type="url"
                    value={editMeetingUrl}
                    onChange={(e) => setEditMeetingUrl(e.target.value)}
                    placeholder="https://meet.google.com/..."
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Physical Location</label>
                    <input
                      type="text"
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      placeholder="e.g. Room 104 / Online"
                      className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700">Visibility</label>
                    <select
                      value={editVisibility}
                      onChange={(e) => setEditVisibility(e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 font-medium bg-white"
                    >
                      <option value="public">Club-Wide</option>
                      <option value="department">Department Only</option>
                      <option value="restricted">Restricted / Invite Only</option>
                      <option value="confidential">Confidential Bureau</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>Reason for Changes *</span>
                    <span className="text-[10px] text-amber-800 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Required Audit Log</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    placeholder="e.g. Rescheduled timing / Updated Google Meet room."
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 font-medium"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingMeeting(null)}
                    className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit || !editReason.trim()}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSavingEdit ? 'Saving...' : 'Save & Log Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Delete Meeting */}
        {deletingMeeting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 flex flex-col gap-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0 border border-rose-100">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Move Meeting to Recycle Bin</h3>
                  <p className="text-[11px] text-slate-500">Non-destructive soft-delete with recovery</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/80 text-rose-950 text-xs flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 font-bold text-rose-900">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Preservation Notice</span>
                </div>
                <p className="text-[11px] leading-relaxed text-rose-900/80">
                  Meeting <strong>{deletingMeeting.title}</strong> will be moved to the Recycle Bin. Recordings, transcripts, AI summaries, and decisions remain safely preserved in storage and database.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Reason for Deletion *</span>
                  <span className="text-[10px] text-rose-700 font-semibold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">Required</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="e.g. Cancelled / Duplicate meeting."
                  className="w-full mt-1.5 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-rose-500 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeletingMeeting(null)}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeletingMeeting || !deleteReason.trim()}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isDeletingMeeting ? 'Deleting...' : 'Move to Recycle Bin'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
