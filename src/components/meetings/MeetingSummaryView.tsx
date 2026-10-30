'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ClipboardList,
  ArrowRight,
  ShieldCheck,
  Clock,
  ThumbsUp,
  FileText,
} from 'lucide-react';
import { MeetingSummary, MeetingSummaryContent } from '@/types/database.types';

interface MeetingSummaryViewProps {
  summary?: MeetingSummary | null;
  meetingId?: string;
  canApprove?: boolean;
  onApprove?: (reviewStatus?: 'approved' | 'draft' | 'rejected', notes?: string) => Promise<void> | void;
  onSeek?: (seconds: number) => void;
  onCreateTask?: (item: { title?: string; task?: string; responsible?: string; assignee?: string; deadline?: string }) => void;
  onConvertToTask?: (item: { title?: string; task?: string; responsible?: string; assignee?: string; deadline?: string }) => void;
}

export default function MeetingSummaryView({
  summary,
  canApprove = false,
  onApprove,
  onSeek,
  onCreateTask,
  onConvertToTask,
}: MeetingSummaryViewProps) {
  const [isApproving, setIsApproving] = useState(false);

  const handleTaskConvert = onConvertToTask || onCreateTask;
  const content = summary?.content || summary?.summary_content;

  if (!summary || !content) {
    return (
      <div className="p-8 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-center flex flex-col items-center justify-center gap-2">
        <Sparkles className="w-8 h-8 text-slate-300" />
        <h4 className="font-extrabold text-sm text-slate-700">AI Meeting Summary In Progress</h4>
        <p className="text-xs text-slate-500 max-w-sm">
          Structured executive summary, decisions, and action items will appear here after automated transcription is completed.
        </p>
      </div>
    );
  }

  const summaryContent: MeetingSummaryContent = content;
  const isApproved = summary.review_status === 'approved' || Boolean(summary.approved_at);

  const handleApprove = async () => {
    if (!onApprove) return;
    setIsApproving(true);
    await onApprove('approved');
    setIsApproving(false);
  };

  const parseTimestampSeconds = (ts?: string): number => {
    if (!ts) return 0;
    const parts = ts.split(':').map((p) => parseInt(p, 10));
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col gap-6">
      {/* Approval Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-emerald-50/80 to-teal-50/50 border border-emerald-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold shadow-xs">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-slate-900">Structured Executive Summary</h3>
              {isApproved ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-700" />
                  <span>Approved by Organizer</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-700" />
                  <span>Pending Organizer Review</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Verified against recording transcript to eliminate AI fabrication.
            </p>
          </div>
        </div>

        {canApprove && !isApproved && (
          <button
            onClick={handleApprove}
            disabled={isApproving}
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-auto shrink-0"
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>{isApproving ? 'Approving...' : 'Approve Summary'}</span>
          </button>
        )}
      </div>

      {/* 1. Meeting Overview */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
          1. Meeting Overview
        </span>
        <p className="text-xs text-slate-800 leading-relaxed font-medium bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
          {content.overview}
        </p>
      </div>

      {/* 2 & 3: Key Topics & Important Updates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 2. Main Topics */}
        <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-100 flex flex-col gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-emerald-700" />
            <span>2. Main Topics Discussed</span>
          </span>
          <ul className="flex flex-col gap-1.5 text-xs text-slate-700 list-disc list-inside">
            {content.key_topics?.map((topic, i) => (
              <li key={i} className="leading-snug">
                {topic}
              </li>
            ))}
          </ul>
        </div>

        {/* 3. Important Updates */}
        <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-100 flex flex-col gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-700" />
            <span>3. Important Updates</span>
          </span>
          <ul className="flex flex-col gap-1.5 text-xs text-slate-700 list-disc list-inside">
            {content.important_updates?.map((upd, i) => (
              <li key={i} className="leading-snug">
                {upd}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 4. Confirmed Decisions Made */}
      <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100 flex flex-col gap-2">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
          <span>4. Formal Decisions Adopted</span>
        </span>
        <div className="flex flex-col gap-1.5">
          {content.decisions_made?.map((dec, i) => (
            <div key={i} className="p-2.5 rounded-xl bg-white border border-emerald-200/80 text-xs font-semibold text-slate-900 flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0"></span>
              <span>{dec}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 5 & 6: Problems & Pending Questions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 5. Problems & Challenges */}
        <div className="p-4 rounded-2xl bg-rose-50/40 border border-rose-100 flex flex-col gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>5. Problems & Challenges</span>
          </span>
          <ul className="flex flex-col gap-1 text-xs text-slate-700 list-disc list-inside">
            {content.problems_and_challenges?.map((prob, i) => (
              <li key={i} className="leading-snug">
                {prob}
              </li>
            ))}
          </ul>
        </div>

        {/* 6. Pending Questions */}
        <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-100 flex flex-col gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>6. Questions For Human Review</span>
          </span>
          <ul className="flex flex-col gap-1 text-xs text-slate-700 list-disc list-inside">
            {content.pending_questions?.map((q, i) => (
              <li key={i} className="leading-snug">
                {q}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 7. Action Items linked to Transcript */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <ClipboardList className="w-3.5 h-3.5 text-emerald-700" />
          <span>7. Action Items & Designated Responsibilities</span>
        </span>
        <div className="flex flex-col gap-2">
          {content.action_items?.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                {item.transcript_timestamp && onSeek && (
                  <button
                    onClick={() => onSeek(parseTimestampSeconds(item.transcript_timestamp))}
                    title={`Jump to timestamp ${item.transcript_timestamp}`}
                    className="px-2 py-0.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-mono text-[10px] font-bold shrink-0 flex items-center gap-1"
                  >
                    <Clock className="w-3 h-3 text-emerald-700" />
                    <span>{item.transcript_timestamp}</span>
                  </button>
                )}
                <div>
                  <h4 className="font-bold text-slate-900">{item.title || item.task}</h4>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    {(item.responsible || item.assignee) && (
                      <span>
                        Assigned: <strong className="text-slate-700">{item.responsible || item.assignee}</strong>
                      </span>
                    )}
                    {item.deadline && <span>• Due: {item.deadline}</span>}
                  </div>
                </div>
              </div>

              {handleTaskConvert && (
                <button
                  onClick={() => handleTaskConvert(item)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-600 hover:text-emerald-800 text-slate-700 text-xs font-bold transition-colors shrink-0 shadow-2xs flex items-center gap-1 self-start sm:self-auto"
                >
                  <span>Convert to Real Task</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 8. Next Steps */}
      <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex flex-col gap-1.5">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
          8. Next Steps
        </span>
        <ul className="flex flex-col gap-1 text-xs text-slate-700 list-disc list-inside">
          {content.next_steps?.map((step, i) => (
            <li key={i} className="leading-snug">
              {step}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
