'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import MeetingPlayer from '@/components/meetings/MeetingPlayer';
import MeetingTranscriptView from '@/components/meetings/MeetingTranscriptView';
import MeetingSummaryView from '@/components/meetings/MeetingSummaryView';
import UploadRecordingModal from '@/components/meetings/UploadRecordingModal';
import { canEditMeeting, canDeleteMeeting } from '@/lib/permissions/permission-checks';
import {
  Calendar,
  Clock,
  User,
  Users,
  Video,
  ExternalLink,
  Copy,
  Check,
  ChevronLeft,
  FileText,
  Sparkles,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Bot,
  UploadCloud,
  FileCheck,
  AlertCircle,
  Eye,
  CheckCircle2,
  ListTodo,
  Square,
  PhoneOff,
  RefreshCw,
  Pencil,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Meeting, MeetingSummaryItem, MeetingTranscriptSegment } from '@/types/database.types';

interface MeetingDetailPageClientProps {
  id: string;
}

export default function MeetingDetailPageClient({ id }: MeetingDetailPageClientProps) {
  const router = useRouter();
  const {
    user,
    activeRole,
    userBureauPositions,
    meetings,
    updateMeetingSummary,
    addMeetingTranscript,
    createTaskFromMeetingAction,
    dispatchMeetingRecordingBot,
    editMeeting,
    deleteMeeting,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'recording' | 'transcript' | 'summary' | 'action_items'>('overview');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isBotDispatching, setIsBotDispatching] = useState(false);
  const [isBotStopping, setIsBotStopping] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit Meeting Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editStartsAt, setEditStartsAt] = useState('');
  const [editEndsAt, setEditEndsAt] = useState('');
  const [editMeetingUrl, setEditMeetingUrl] = useState('');
  const [editMeetingPlatform, setEditMeetingPlatform] = useState('google_meet');
  const [editMeetingType, setEditMeetingType] = useState('bureau');
  const [editVisibility, setEditVisibility] = useState('public');
  const [editReason, setEditReason] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Meeting Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeletingMeeting, setIsDeletingMeeting] = useState(false);

  // Directly loaded intelligence data (transcripts, segments, summaries, decisions, action items)
  const [intelData, setIntelData] = useState<{
    transcript?: any;
    summary?: any;
    decisions?: any[];
    actionItems?: any[];
    recordings?: any[];
  } | null>(null);

  const fetchMeetingIntel = async (meetingId: string) => {
    try {
      const res = await fetch(`/api/meetings/intelligence?meetingId=${encodeURIComponent(meetingId)}`);
      const data = await res.json();
      if (data.success) {
        setIntelData({
          transcript: data.transcript,
          summary: data.summary,
          decisions: data.decisions,
          actionItems: data.actionItems,
          recordings: data.recordings,
        });
      }
    } catch (err) {
      console.warn('Meeting intelligence fetch failed:', err);
    }
  };

  useEffect(() => {
    if (id) {
      fetchMeetingIntel(id);
    }
  }, [id]);

  // Video player seek controller
  const [seekTime, setSeekTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  // Find meeting by ID from live Supabase / auth state
  const meeting = meetings.find((m) => m.id === id);

  // Auto-sync recording & AI intelligence without manual button clicking
  const autoSyncRecording = useCallback(
    async (silent = true) => {
      if (!id) return;
      if (!silent) setIsSyncing(true);
      try {
        const res = await fetch(`/api/meetings/recording/sync?meetingId=${encodeURIComponent(id)}`);
        const data = await res.json();
        if (data.success && data.isReady) {
          await fetchMeetingIntel(id);
          if (!silent) {
            setFeedbackMessage({
              type: 'success',
              text: 'Meeting recording and AI analysis successfully synced!',
            });
          }
        }
      } catch (err) {
        console.warn('Auto-sync check failed silently:', err);
        if (!silent) {
          setFeedbackMessage({ type: 'error', text: 'Sync failed' });
        }
      } finally {
        if (!silent) setIsSyncing(false);
      }
    },
    [id]
  );

  // Background auto-sync polling when recording is active, processing, or completed without transcript
  useEffect(() => {
    if (!meeting || !meeting.recording_enabled) return;

    const needsSync =
      meeting.recording_status === 'processing' ||
      meeting.recording_status === 'recording' ||
      meeting.recording_status === 'live' ||
      meeting.recording_status === 'waiting_admission' ||
      meeting.recording_status === 'joining' ||
      (meeting.recording_status === 'completed' && !intelData?.transcript);

    if (!needsSync) return;

    // Check immediately once
    autoSyncRecording(true);

    // Poll every 12 seconds while in flight until completed
    const interval = setInterval(() => {
      autoSyncRecording(true);
    }, 12000);

    return () => clearInterval(interval);
  }, [meeting?.recording_status, meeting?.recording_enabled, intelData?.transcript, autoSyncRecording]);

  // Auto-dispatch bot 5 minutes before scheduled start time
  useEffect(() => {
    if (!meeting || !meeting.recording_enabled || !meeting.meeting_url) return;
    if (meeting.recording_status !== 'none' && meeting.recording_status !== 'requested') return;
    if (!meeting.starts_at) return;

    const startTimeMs = new Date(meeting.starts_at).getTime();
    if (isNaN(startTimeMs)) return;

    const now = Date.now();
    const leadTimeMs = 5 * 60 * 1000; // 5 minutes before start
    const dispatchTargetTime = startTimeMs - leadTimeMs;
    const msUntilDispatch = dispatchTargetTime - now;

    const triggerAutoDispatch = async () => {
      try {
        await dispatchMeetingRecordingBot(meeting.id, 'dispatch');
      } catch (err) {
        console.warn('Auto-dispatch error:', err);
      }
    };

    // If within 5 minutes of start (or past start time but within 3 hours): dispatch immediately!
    if (msUntilDispatch <= 0 && now - startTimeMs < 3 * 60 * 60 * 1000) {
      triggerAutoDispatch();
      return;
    }

    // If scheduled in the future beyond 5 minutes, set an exact timer for T-minus 5 minutes!
    if (msUntilDispatch > 0 && msUntilDispatch < 24 * 60 * 60 * 1000) {
      const timerId = setTimeout(() => {
        triggerAutoDispatch();
      }, msUntilDispatch);
      return () => clearTimeout(timerId);
    }
  }, [
    meeting?.id,
    meeting?.starts_at,
    meeting?.recording_status,
    meeting?.recording_enabled,
    meeting?.meeting_url,
    dispatchMeetingRecordingBot,
  ]);

  const getDeptName = (dept: Meeting['department']) => (typeof dept === 'string' ? dept : dept?.name || '');
  const getOrgName = (org: Meeting['organizer']) => (typeof org === 'string' ? org : org?.full_name || 'Organizer');
  const getDateStr = (m: Meeting) => m.date || (m.starts_at ? m.starts_at.slice(0, 10) : 'Upcoming');
  const getTimeStr = (m: Meeting) =>
    m.start_time && m.end_time
      ? `${m.start_time} - ${m.end_time}`
      : m.starts_at
      ? m.starts_at.slice(11, 16)
      : '';

  const toInputDateTime = (isoStr?: string | null) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 16);
  };

  const permCtx = {
    userId: user?.id,
    email: user?.email,
    role: activeRole,
    bureauPositions: userBureauPositions || [],
    departmentId: (meeting?.department as any)?.id || (user as any)?.department_id,
  };

  const canEdit = canEditMeeting(permCtx, meeting);
  const canDelete = canDeleteMeeting(permCtx, meeting);

  const openEditModal = () => {
    if (!meeting) return;
    setEditTitle(meeting.title || '');
    setEditDescription(meeting.description || '');
    setEditLocation(meeting.location || '');
    setEditStartsAt(toInputDateTime(meeting.starts_at));
    setEditEndsAt(toInputDateTime(meeting.ends_at));
    setEditMeetingUrl(meeting.meeting_url || '');
    setEditMeetingPlatform(meeting.meeting_platform || 'google_meet');
    setEditMeetingType(meeting.meeting_type || 'bureau');
    setEditVisibility(meeting.visibility || 'public');
    setEditReason('');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meeting) return;
    if (!editTitle.trim()) {
      setFeedbackMessage({ type: 'error', text: 'Meeting title is required.' });
      return;
    }
    if (!editReason.trim()) {
      setFeedbackMessage({ type: 'error', text: 'A reason for changes is required for the audit log.' });
      return;
    }

    setIsSavingEdit(true);
    try {
      const updates = {
        title: editTitle.trim(),
        description: editDescription.trim(),
        location: editLocation.trim(),
        starts_at: editStartsAt ? new Date(editStartsAt).toISOString() : meeting.starts_at,
        ends_at: editEndsAt ? new Date(editEndsAt).toISOString() : meeting.ends_at,
        meeting_url: editMeetingUrl.trim() || null,
        meeting_platform: editMeetingPlatform,
        meeting_type: editMeetingType as any,
        visibility: editVisibility as any,
      };

      const res = await editMeeting(meeting.id, updates, editReason.trim());
      if (res.success) {
        setIsEditModalOpen(false);
        setFeedbackMessage({ type: 'success', text: 'Meeting details successfully updated and logged.' });
      } else {
        setFeedbackMessage({ type: 'error', text: res.error || 'Failed to update meeting' });
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err?.message || 'Error saving changes' });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!meeting) return;
    if (!deleteReason.trim()) {
      setFeedbackMessage({ type: 'error', text: 'A deletion reason is required for the audit log.' });
      return;
    }

    setIsDeletingMeeting(true);
    try {
      const res = await deleteMeeting(meeting.id, deleteReason.trim());
      if (res.success) {
        setIsDeleteModalOpen(false);
        router.push('/meetings');
      } else {
        setFeedbackMessage({ type: 'error', text: res.error || 'Failed to delete meeting' });
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err?.message || 'Error deleting meeting' });
    } finally {
      setIsDeletingMeeting(false);
    }
  };

  const canManage = Boolean(
    activeRole === 'admin' ||
      activeRole === 'bureau' ||
      canEdit ||
      canDelete ||
      (user && meeting && (meeting.organizer_id === user.id || meeting.created_by === user.id))
  );

  // Confidentiality access check
  const isConfidential = meeting?.visibility === 'restricted' || meeting?.visibility === 'confidential';
  const isInvited = meeting?.participant_ids?.includes(user?.id || '');
  const canView = !isConfidential || canManage || Boolean(isInvited);

  useEffect(() => {
    if (meeting && !canView) {
      setFeedbackMessage({
        type: 'error',
        text: 'This meeting is confidential and restricted to authorized bureau officers or invited participants.',
      });
    }
  }, [meeting, canView]);

  if (!meeting) {
    return (
      <AppShell>
        <div className="pt-8 max-w-4xl mx-auto w-full text-center py-20 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center">
            <Calendar className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Meeting Not Found</h1>
          <p className="text-xs text-slate-500 max-w-md">
            The requested meeting record could not be found or may have been archived.
          </p>
          <Link
            href="/meetings"
            className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors"
          >
            Back to Meetings Archive
          </Link>
        </div>
      </AppShell>
    );
  }

  if (!canView) {
    return (
      <AppShell>
        <div className="pt-8 max-w-4xl mx-auto w-full text-center py-20 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Restricted Meeting Access</h1>
          <p className="text-xs text-slate-600 max-w-md">
            This meeting is marked as confidential. Only invited participants and bureau leadership have permission to access its recordings, transcripts, and minutes.
          </p>
          <Link
            href="/meetings"
            className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors"
          >
            Back to Public Meetings
          </Link>
        </div>
      </AppShell>
    );
  }

  const handleCopyLink = () => {
    if (meeting.meeting_url) {
      navigator.clipboard.writeText(meeting.meeting_url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleSeekFromTranscript = (timestampSeconds: number) => {
    setActiveTab('recording');
    setSeekTime(timestampSeconds);
  };

  const handleDispatchBot = async () => {
    if (!meeting.meeting_url) {
      setFeedbackMessage({ type: 'error', text: 'Cannot dispatch bot without a valid Google Meet URL.' });
      return;
    }
    setIsBotDispatching(true);
    setFeedbackMessage(null);

    const res = await dispatchMeetingRecordingBot(meeting.id);
    setIsBotDispatching(false);

    if (res.success) {
      setFeedbackMessage({
        type: 'success',
        text: 'ZEC Meeting Recorder bot request submitted! Bot will join at scheduled time.',
      });
    } else {
      setFeedbackMessage({
        type: 'error',
        text: res.error || 'Failed to dispatch recording bot.',
      });
    }
  };

  const handleStopBot = async () => {
    setIsBotStopping(true);
    setFeedbackMessage(null);

    const res = await dispatchMeetingRecordingBot(meeting.id, 'leave');
    setIsBotStopping(false);

    if (res.success) {
      setFeedbackMessage({
        type: 'success',
        text: 'Bot leave command acknowledged. The bot is leaving the Google Meet session.',
      });
    } else {
      setFeedbackMessage({
        type: 'error',
        text: res.error || 'Failed to stop recording bot.',
      });
    }
  };

  const handleSyncRecording = async () => {
    setIsSyncing(true);
    setFeedbackMessage(null);

    try {
      const res = await fetch('/api/meetings/recording/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: meeting.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');

      if (meeting?.id) {
        await fetchMeetingIntel(meeting.id);
      }
      setFeedbackMessage({
        type: 'success',
        text: 'Meeting recording and AI analysis successfully synced! Updating view...',
      });
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      setFeedbackMessage({ type: 'error', text: msg });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTriggerTranscription = async () => {
    if (!meeting.recordings || meeting.recordings.length === 0) {
      setFeedbackMessage({ type: 'error', text: 'No recording is available to transcribe.' });
      return;
    }
    setIsTranscribing(true);
    setFeedbackMessage(null);

    try {
      const res = await fetch('/api/meetings/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meeting_id: meeting.id,
          recording_id: meeting.recordings[0].id,
          language: 'fr',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transcription failed');

      setFeedbackMessage({
        type: 'success',
        text: 'Audio processed! Generated searchable transcript with speaker identification.',
      });

      // Attach transcript to local meeting state
      if (data.transcript) {
        addMeetingTranscript(meeting.id, {
          meeting_id: meeting.id,
          recording_id: meeting.recordings[0].id,
          language: data.transcript.language || 'fr',
          content: data.transcript.full_text || data.transcript.content || '',
          segments: data.transcript.segments || [],
          processing_status: 'completed',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transcription failed';
      setFeedbackMessage({ type: 'error', text: msg });
    } finally {
      setIsTranscribing(false);
    }
  };

  const mAny = meeting as any;

  const activeRecording =
    intelData?.recordings?.[0] ||
    (Array.isArray(mAny?.recordings) ? mAny.recordings[0] : mAny?.recordings) ||
    null;

  const activeTranscript =
    intelData?.transcript ||
    (mAny?.transcript?.content ? mAny.transcript : null) ||
    (Array.isArray(mAny?.transcripts) && mAny.transcripts[0]?.content ? mAny.transcripts[0] : null) ||
    null;

  const activeSummary =
    intelData?.summary ||
    (mAny?.summary?.summary_content ? mAny.summary : null) ||
    (Array.isArray(mAny?.summaries) && mAny.summaries[0]?.summary_content ? mAny.summaries[0] : null) ||
    null;

  const summaryContent = activeSummary?.content || activeSummary?.summary_content;

  const decisionsList: string[] =
    (intelData?.decisions && intelData.decisions.length > 0
      ? intelData.decisions.map((d: any) => d.title || d.description).filter(Boolean)
      : null) ||
    summaryContent?.decisions ||
    summaryContent?.decisions_made ||
    [];

  const actionItemsList: any[] =
    (intelData?.actionItems && intelData.actionItems.length > 0
      ? intelData.actionItems.map((a: any) => ({
          title: a.title,
          task: a.title,
          responsible: a.confirmed_assignee?.full_name || a.suggested_assignee,
          assignee: a.confirmed_assignee?.full_name || a.suggested_assignee,
          deadline: a.deadline ? a.deadline.slice(0, 10) : undefined,
          priority: a.priority,
          evidence: a.evidence,
        }))
      : null) ||
    summaryContent?.action_items ||
    [];

  const handleTriggerSummary = async () => {
    if (!activeTranscript) {
      setFeedbackMessage({ type: 'error', text: 'Please generate or provide a transcript first.' });
      return;
    }
    setIsSummarizing(true);
    setFeedbackMessage(null);

    try {
      const res = await fetch('/api/meetings/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meeting_id: meeting.id,
          transcript_id: activeTranscript.id,
          meeting_title: meeting.title,
          meeting_type: meeting.meeting_type,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Summarization failed');

      if (data.summary) {
        updateMeetingSummary(meeting.id, data.summary.content, data.summary.review_status);
        setFeedbackMessage({
          type: 'success',
          text: 'AI Summary successfully created across 8 structured dimensions!',
        });
        setActiveTab('summary');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Summarization failed';
      setFeedbackMessage({ type: 'error', text: msg });
    } finally {
      setIsSummarizing(false);
    }
  };

  const deptLabel = getDeptName(meeting.department);
  const orgLabel = getOrgName(meeting.organizer);

  return (
    <AppShell>
      <div className="pt-4 flex flex-col gap-5 max-w-5xl mx-auto w-full pb-20">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/meetings"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Smart Meeting Archive</span>
          </Link>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                meeting.status === 'live'
                  ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse'
                  : meeting.status === 'completed'
                  ? 'bg-slate-100 text-slate-700 border border-slate-200'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
            >
              {meeting.status === 'live' ? '🔴 Live Session' : meeting.status}
            </span>
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                isConfidential
                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>{isConfidential ? 'Restricted' : 'Club-Wide'}</span>
            </span>
          </div>
        </div>

        {/* Feedback Alert Toast */}
        {feedbackMessage && (
          <div
            className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
              )}
              <span>{feedbackMessage.text}</span>
            </div>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Meeting Header Hero Banner */}
        <section className="bg-white rounded-3xl p-6 border border-emerald-900/10 shadow-xs flex flex-col gap-5">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 text-[10px] font-black uppercase tracking-wider border border-emerald-200">
                  {meeting.meeting_type || 'General Club Meeting'}
                </span>
                {deptLabel && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-bold">
                    {deptLabel}
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {meeting.title}
              </h1>
              <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                {meeting.description || 'Club meeting and sustainability coordination.'}
              </p>
            </div>

            {/* Quick Action: Join Google Meet */}
            {meeting.meeting_url && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                <a
                  href={meeting.meeting_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Video className="w-4 h-4" />
                  <span>Join Google Meet</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>

                <button
                  onClick={handleCopyLink}
                  className="px-3 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  title="Copy Google Meet Link"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span className="hidden sm:inline">{copiedLink ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Metadata Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Date</p>
                <p className="font-semibold text-slate-800">{getDateStr(meeting)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-700 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Schedule</p>
                <p className="font-semibold text-slate-800">{getTimeStr(meeting)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-700 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Organizer</p>
                <p className="font-semibold text-slate-800 truncate">{orgLabel}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-700 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Participants</p>
                <p className="font-semibold text-slate-800">
                  {meeting.participant_ids?.length || 0} Registered
                </p>
              </div>
            </div>
          </div>

          {/* Organizer / Admin Actions Bar */}
          {canManage && (
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 flex-wrap bg-slate-50/80 -mx-6 -mb-6 p-4 rounded-b-3xl">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Shield className="w-4 h-4 text-emerald-700" />
                <span>Organizer Controls:</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Bot Controls */}
                {['live', 'recording', 'joining', 'requested', 'waiting_admission'].includes(meeting.recording_status || '') ? (
                  <>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-rose-600 inline-block" />
                      <span>Bot In Call</span>
                    </div>
                    <button
                      onClick={handleStopBot}
                      disabled={isBotStopping}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-50"
                      title="Instruct the recording bot to leave Google Meet"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>{isBotStopping ? 'Stopping Bot...' : 'Stop Recording & Leave'}</span>
                    </button>
                  </>
                ) : (
                  meeting.status !== 'completed' && meeting.meeting_url && (
                    <>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Auto-joins 5m early</span>
                      </div>
                      <button
                        onClick={handleDispatchBot}
                        disabled={isBotDispatching}
                        className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-50"
                        title="Manually dispatch recording bot immediately"
                      >
                        <Bot className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{isBotDispatching ? 'Dispatching...' : 'Dispatch Bot Now'}</span>
                      </button>
                    </>
                  )
                )}

                {/* Real-time Automatic Sync Indicator & Force Refresh */}
                {isSyncing ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold animate-pulse shadow-2xs">
                    <RefreshCw className="w-3.5 h-3.5 text-amber-700 animate-spin" />
                    <span>Auto-Syncing AI & Recording...</span>
                  </div>
                ) : activeTranscript ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-xs font-bold shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Real-time Synced</span>
                    <button
                      onClick={handleSyncRecording}
                      disabled={isSyncing}
                      className="ml-1 p-0.5 rounded text-emerald-700 hover:text-emerald-950"
                      title="Force re-sync latest intelligence"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleSyncRecording}
                    disabled={isSyncing}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-50"
                    title="Auto-syncs automatically, or click to force sync"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-emerald-700 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                  </button>
                )}

                {/* Upload Recording */}
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Attach Recording</span>
                </button>

                {/* Trigger AI Transcription */}
                {activeRecording && !activeTranscript && (
                  <button
                    onClick={handleTriggerTranscription}
                    disabled={isTranscribing}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-50"
                  >
                    <FileText className="w-3.5 h-3.5 text-indigo-700" />
                    <span>{isTranscribing ? 'Transcribing...' : 'Run AI Transcription'}</span>
                  </button>
                )}

                {/* Trigger AI Summary */}
                {activeTranscript && !activeSummary && (
                  <button
                    onClick={handleTriggerSummary}
                    disabled={isSummarizing}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>{isSummarizing ? 'Analyzing...' : 'Generate 8D Summary'}</span>
                  </button>
                )}

                {/* Edit Meeting */}
                {canEdit && (
                  <button
                    onClick={openEditModal}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                    title="Edit meeting details and schedule"
                  >
                    <Pencil className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Edit Meeting</span>
                  </button>
                )}

                {/* Delete Meeting */}
                {canDelete && (
                  <button
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-800 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                    title="Move meeting to Recycle Bin (preserves recordings & transcripts)"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete Meeting</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-1 text-xs font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-t-2xl flex items-center gap-1.5 border-b-2 transition-all shrink-0 ${
              activeTab === 'overview'
                ? 'border-emerald-600 text-emerald-900 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Overview & Agenda</span>
          </button>

          <button
            onClick={() => setActiveTab('recording')}
            className={`px-4 py-2 rounded-t-2xl flex items-center gap-1.5 border-b-2 transition-all shrink-0 ${
              activeTab === 'recording'
                ? 'border-emerald-600 text-emerald-900 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Recording Player</span>
            {activeRecording && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
          </button>

          <button
            onClick={() => setActiveTab('transcript')}
            className={`px-4 py-2 rounded-t-2xl flex items-center gap-1.5 border-b-2 transition-all shrink-0 ${
              activeTab === 'transcript'
                ? 'border-emerald-600 text-emerald-900 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Smart Transcript</span>
            {activeTranscript && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
          </button>

          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 rounded-t-2xl flex items-center gap-1.5 border-b-2 transition-all shrink-0 ${
              activeTab === 'summary'
                ? 'border-emerald-600 text-emerald-900 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Meeting Summary</span>
            {activeSummary && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
          </button>

          <button
            onClick={() => setActiveTab('action_items')}
            className={`px-4 py-2 rounded-t-2xl flex items-center gap-1.5 border-b-2 transition-all shrink-0 ${
              activeTab === 'action_items'
                ? 'border-emerald-600 text-emerald-900 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ListTodo className="w-4 h-4" />
            <span>Decisions & Tasks</span>
            {actionItemsList.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">
                {actionItemsList.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Overview & Agenda */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2 flex flex-col gap-5">
              {/* Agenda */}
              <section className="bg-white rounded-3xl p-6 border border-emerald-900/10 shadow-xs flex flex-col gap-4">
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-700" />
                  <span>Meeting Agenda & Topics</span>
                </h2>
                {meeting.agenda ? (
                  <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                    {meeting.agenda}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No formal agenda has been specified for this session.</p>
                )}
              </section>

              {/* Official Minutes Text */}
              {meeting.minutes && (
                <section className="bg-white rounded-3xl p-6 border border-emerald-900/10 shadow-xs flex flex-col gap-4">
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Official Meeting Minutes</span>
                  </h2>
                  <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-emerald-50/30 p-4 rounded-2xl border border-emerald-100">
                    {meeting.minutes}
                  </div>
                </section>
              )}

              {/* AI Executive Briefing */}
              {summaryContent?.overview && (
                <section className="bg-gradient-to-r from-emerald-50/80 to-teal-50/50 rounded-3xl p-6 border border-emerald-100 shadow-xs flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-800">
                      <Sparkles className="w-4 h-4 text-emerald-700" />
                      <h2 className="text-sm font-extrabold text-slate-900">AI Executive Briefing</h2>
                    </div>
                    <button
                      onClick={() => setActiveTab('summary')}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                    >
                      <span>View Full 8D Analysis</span>
                      <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium bg-white/70 p-3.5 rounded-2xl border border-emerald-100/60">
                    {summaryContent.overview}
                  </p>
                </section>
              )}
            </div>

            {/* Sidebar info: Platform & Transparency */}
            <div className="flex flex-col gap-5">
              {/* Google Meet Connection Details */}
              <section className="bg-white rounded-3xl p-5 border border-emerald-900/10 shadow-xs flex flex-col gap-3">
                <span className="text-[11px] font-bold uppercase text-slate-400">Meeting Platform</span>
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
                    <Video className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-slate-900">Google Meet</p>
                    <p className="text-[11px] text-slate-500 truncate font-mono">
                      {meeting.meeting_url || 'Link pending'}
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Participation is conducted directly on Google Meet. Members do not need to stay logged in to ZEC Hub during the live session.
                </p>

                {meeting.meeting_url && (
                  <a
                    href={meeting.meeting_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <span>Launch Google Meet</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </section>

              {/* Recording Transparency Banner */}
              <section className="bg-white rounded-3xl p-5 border border-emerald-900/10 shadow-xs flex flex-col gap-2">
                <div className="flex items-center gap-2 text-slate-800 font-extrabold text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Recording Transparency & Privacy</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Under 3ZERO Club ISIMS privacy rules, all participants are notified upon joining when recording is enabled. Recordings and transcripts are strictly archived for active members and protected against public leakage.
                </p>
              </section>
            </div>
          </div>
        )}

        {/* Tab 2: Recording Player */}
        {activeTab === 'recording' && (
          <section className="flex flex-col gap-4">
            <MeetingPlayer
              meetingId={meeting.id}
              playbackUrl={activeRecording?.playback_url}
              storagePath={activeRecording?.storage_path}
              title={meeting.title}
              durationSeconds={activeRecording?.duration_seconds || 2700}
              recordingDate={getDateStr(meeting)}
              provider={activeRecording?.provider || 'manual_upload'}
              seekToSeconds={seekTime}
              onTimeUpdate={(t) => setCurrentTime(t)}
            />

            {!activeRecording && canManage && (
              <div className="p-6 bg-white rounded-3xl border border-dashed border-slate-300 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">No recording uploaded yet</h3>
                  <p className="text-xs text-slate-500 max-w-sm mt-0.5">
                    Attach an MP4 recording file or provide a Google Drive video link to enable online playback for members.
                  </p>
                </div>
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors"
                >
                  Upload Recording Now
                </button>
              </div>
            )}
          </section>
        )}

        {/* Tab 3: Smart Transcript */}
        {activeTab === 'transcript' && (
          <MeetingTranscriptView
            transcript={activeTranscript}
            currentTime={currentTime}
            onSeek={handleSeekFromTranscript}
            canEdit={canManage}
            onSaveTranscript={(updatedSegments: MeetingTranscriptSegment[]) => {
              if (activeTranscript) {
                activeTranscript.segments = updatedSegments;
                setFeedbackMessage({ type: 'success', text: 'Transcript corrections saved successfully.' });
              }
            }}
          />
        )}

        {/* Tab 4: AI Meeting Summary */}
        {activeTab === 'summary' && (
          <MeetingSummaryView
            summary={activeSummary}
            meetingId={meeting.id}
            canApprove={canManage}
            onApprove={async (reviewStatus = 'approved', notes) => {
              if (activeSummary && summaryContent) {
                await updateMeetingSummary(meeting.id, summaryContent, reviewStatus, notes);
                setFeedbackMessage({
                  type: 'success',
                  text: `Summary status updated to ${reviewStatus.toUpperCase()}!`,
                });
              }
            }}
            onConvertToTask={async (item: MeetingSummaryItem) => {
              const res = await createTaskFromMeetingAction(meeting.id, item);
              if (res.success) {
                setFeedbackMessage({
                  type: 'success',
                  text: `Action item converted into official Task: "${item.title || item.task}"!`,
                });
              } else {
                setFeedbackMessage({
                  type: 'error',
                  text: res.error || 'Failed to create task.',
                });
              }
            }}
          />
        )}

        {/* Tab 5: Decisions & Action Items */}
        {activeTab === 'action_items' && (
          <section className="bg-white rounded-3xl p-6 border border-emerald-900/10 shadow-xs flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-emerald-700" />
                <h2 className="text-base font-extrabold text-slate-900">
                  Decisions & Assigned Action Items
                </h2>
              </div>
              <span className="text-xs font-bold text-slate-500">
                Institutional Memory Archive
              </span>
            </div>

            {/* Decisions List */}
            {decisionsList.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-black uppercase text-slate-400">Formal Decisions Taken:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {decisionsList.map((dec, i) => (
                    <div key={i} className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-xs font-semibold text-slate-800 leading-snug">{dec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Items with Convert to Hub Task */}
            <div className="flex flex-col gap-3 pt-3">
              <h3 className="text-xs font-black uppercase text-slate-400">Action Items & Deliverables:</h3>
              {actionItemsList.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  {actionItemsList.map((action, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex-1">
                        <p className="text-xs font-black text-slate-900">{action.title || action.task}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500 font-semibold flex-wrap">
                          <span className="inline-flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Assignee: {action.responsible || action.assignee || 'Unassigned'}</span>
                          </span>
                          {action.deadline && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Due: {action.deadline}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {canManage && (
                        <button
                          onClick={async () => {
                            const res = await createTaskFromMeetingAction(meeting.id, action);
                            if (res.success) {
                              setFeedbackMessage({
                                type: 'success',
                                text: `Task "${action.title || action.task}" registered in Hub Tasks!`,
                              });
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-2xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Convert to Hub Task</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No action items registered for this meeting.</p>
              )}
            </div>
          </section>
        )}

        {/* Modal: Upload / Attach Recording */}
        <UploadRecordingModal
          meetingId={meeting.id}
          meetingTitle={meeting.title}
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={() => {
            setFeedbackMessage({
              type: 'success',
              text: 'Meeting recording uploaded successfully! Online playback is now active.',
            });
            setActiveTab('recording');
          }}
        />

        {/* Modal: Edit Meeting */}
        {isEditModalOpen && (
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
                  onClick={() => setIsEditModalOpen(false)}
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
                    placeholder="e.g. Chapter Weekly Governance Sync"
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Description</label>
                  <textarea
                    rows={2}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Meeting agenda notes and objectives..."
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
                    placeholder="https://meet.google.com/xyz-abc-def"
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
                    placeholder="e.g. Rescheduled timing due to faculty exam schedule / Updated Google Meet link."
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 font-medium"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit || !editReason.trim()}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSavingEdit ? 'Saving Changes...' : 'Save & Log Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Delete Meeting (Soft-delete to Recycle Bin) */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 flex flex-col gap-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0 border border-rose-100">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Move Meeting to Recycle Bin</h3>
                  <p className="text-[11px] text-slate-500">Non-destructive soft-delete with full recovery support</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/80 text-rose-950 text-xs flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 font-bold text-rose-900">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Permanent Preservation Guaranteed</span>
                </div>
                <p className="text-[11px] leading-relaxed text-rose-900/80">
                  Moving <strong>{meeting.title}</strong> to the Recycle Bin will hide it from the active schedule. Recordings, transcripts, AI summaries, and decisions are safely kept in storage and can be restored at any time by an administrator.
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
                  placeholder="e.g. Session cancelled / Duplicate scheduling conflict."
                  className="w-full mt-1.5 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-rose-500 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
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

