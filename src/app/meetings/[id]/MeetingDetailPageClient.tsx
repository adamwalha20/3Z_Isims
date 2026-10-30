'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import MeetingPlayer from '@/components/meetings/MeetingPlayer';
import MeetingTranscriptView from '@/components/meetings/MeetingTranscriptView';
import MeetingSummaryView from '@/components/meetings/MeetingSummaryView';
import UploadRecordingModal from '@/components/meetings/UploadRecordingModal';
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
  ListTodo
} from 'lucide-react';
import { Meeting, MeetingSummaryItem, MeetingTranscriptSegment } from '@/types/database.types';

interface MeetingDetailPageClientProps {
  id: string;
}

export default function MeetingDetailPageClient({ id }: MeetingDetailPageClientProps) {
  const {
    user,
    activeRole,
    meetings,
    updateMeetingSummary,
    addMeetingTranscript,
    createTaskFromMeetingAction,
    dispatchMeetingRecordingBot,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'recording' | 'transcript' | 'summary' | 'action_items'>('overview');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isBotDispatching, setIsBotDispatching] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Video player seek controller
  const [seekTime, setSeekTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  // Find meeting by ID from live Supabase / auth state
  const meeting = meetings.find((m) => m.id === id);

  const getDeptName = (dept: Meeting['department']) => (typeof dept === 'string' ? dept : dept?.name || '');
  const getOrgName = (org: Meeting['organizer']) => (typeof org === 'string' ? org : org?.full_name || 'Organizer');
  const getDateStr = (m: Meeting) => m.date || (m.starts_at ? m.starts_at.slice(0, 10) : 'Upcoming');
  const getTimeStr = (m: Meeting) =>
    m.start_time && m.end_time
      ? `${m.start_time} - ${m.end_time}`
      : m.starts_at
      ? m.starts_at.slice(11, 16)
      : '';

  const canManage = Boolean(
    activeRole === 'admin' ||
      activeRole === 'bureau' ||
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

  const activeRecording = meeting.recordings?.[0];
  const activeTranscript = meeting.transcript || meeting.transcripts?.[0];
  const activeSummary = meeting.summary;
  const summaryContent = activeSummary?.content || activeSummary?.summary_content;
  const decisionsList = summaryContent?.decisions || summaryContent?.decisions_made || [];
  const actionItemsList = summaryContent?.action_items || [];

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
                {/* Bot Dispatch */}
                {meeting.status !== 'completed' && meeting.meeting_url && (
                  <button
                    onClick={handleDispatchBot}
                    disabled={isBotDispatching}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-50"
                  >
                    <Bot className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{isBotDispatching ? 'Dispatching...' : 'Dispatch Recording Bot'}</span>
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
      </div>
    </AppShell>
  );
}

