'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Clock,
  User,
  Sparkles,
  CheckCircle2,
  Edit2,
  Save,
  X,
  Filter,
} from 'lucide-react';
import { MeetingTranscript, MeetingTranscriptSegment } from '@/types/database.types';

interface MeetingTranscriptViewProps {
  transcript?: MeetingTranscript | null;
  onSeek: (seconds: number) => void;
  canEdit?: boolean;
  onSaveEdit?: (updatedContent: string) => Promise<void>;
  currentTime?: number;
  onSaveTranscript?: (updatedSegments: MeetingTranscriptSegment[]) => void;
}

export default function MeetingTranscriptView({
  transcript,
  onSeek,
  canEdit = false,
  onSaveEdit,
  currentTime,
  onSaveTranscript,
}: MeetingTranscriptViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('all');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(transcript?.content || '');
  const [isSaving, setIsSaving] = useState(false);

  // Fallback segments if not yet decomposed into segments table
  const segments: MeetingTranscriptSegment[] = useMemo(() => {
    if (transcript?.segments && transcript.segments.length > 0) {
      return transcript.segments;
    }
    if (transcript?.content) {
      // Split raw content by paragraphs into simple mock segments
      return [
        {
          id: 'seg-auto-01',
          transcript_id: transcript.id,
          meeting_id: transcript.meeting_id,
          speaker_label: 'Speaker 1',
          start_seconds: 0,
          end_seconds: 60,
          content: transcript.content,
          created_at: transcript.created_at,
        },
      ];
    }
    return [];
  }, [transcript]);

  // Extract distinct speakers for filter dropdown
  const speakers = useMemo(() => {
    const set = new Set<string>();
    segments.forEach((s) => {
      if (s.speaker_label) set.add(s.speaker_label);
    });
    return Array.from(set);
  }, [segments]);

  // Filtered segments based on search query & speaker filter
  const filteredSegments = useMemo(() => {
    return segments.filter((s) => {
      if (selectedSpeaker !== 'all' && s.speaker_label !== selectedSpeaker) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return s.content.toLowerCase().includes(q) || s.speaker_label.toLowerCase().includes(q);
    });
  }, [segments, searchQuery, selectedSpeaker]);

  const formatTimestamp = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const highlightMatches = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-amber-200 text-amber-950 font-bold px-0.5 rounded-sm">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const handleSave = async () => {
    if (!onSaveEdit) return;
    setIsSaving(true);
    await onSaveEdit(editContent);
    setIsSaving(false);
    setIsEditing(false);
  };

  if (!transcript || segments.length === 0) {
    return (
      <div className="p-8 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-center flex flex-col items-center justify-center gap-2">
        <Sparkles className="w-8 h-8 text-slate-300" />
        <h4 className="font-extrabold text-sm text-slate-700">Transcript Not Yet Available</h4>
        <p className="text-xs text-slate-500 max-w-sm">
          Transcription processing begins automatically once the meeting recording is uploaded or completed by the recording bot.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col gap-4">
      {/* Search & Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search words, decisions, topics..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-slate-50/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {speakers.length > 1 && (
            <select
              value={selectedSpeaker}
              onChange={(e) => setSelectedSpeaker(e.target.value)}
              aria-label="Filter by speaker"
              className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none"
            >
              <option value="all">All Speakers</option>
              {speakers.map((spk) => (
                <option key={spk} value={spk}>
                  {spk}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Verification Status & Edit Trigger */}
        <div className="flex items-center gap-2">
          {transcript.is_edited ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Verified Transcript</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200">
              <Sparkles className="w-3 h-3 text-slate-400" />
              <span>AI Generated</span>
            </span>
          )}

          {canEdit && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1 transition-colors"
            >
              <Edit2 className="w-3 h-3" />
              <span>Correct Text</span>
            </button>
          )}
        </div>
      </div>

      {/* Editor Modal / Inline Edit Mode */}
      {isEditing ? (
        <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Editor: Correct Official Transcript Mistakes</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsEditing(false)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-3 py-1 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-bold flex items-center gap-1"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Corrections'}</span>
              </button>
            </div>
          </div>
          <textarea
            rows={8}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full p-3 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white leading-relaxed"
          />
        </div>
      ) : (
        /* Segments Flow */
        <div className="flex flex-col gap-3 max-h-[460px] overflow-y-auto pr-1">
          {filteredSegments.length > 0 ? (
            filteredSegments.map((seg) => (
              <div
                key={seg.id}
                className="p-3 rounded-2xl bg-slate-50/70 hover:bg-emerald-50/50 border border-slate-100 transition-colors flex items-start gap-3 group"
              >
                {/* Seek Timestamp Button */}
                <button
                  onClick={() => onSeek(seg.start_seconds)}
                  title={`Jump to ${formatTimestamp(seg.start_seconds)}`}
                  className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:border-emerald-600 group-hover:bg-emerald-700 group-hover:text-white font-mono text-[11px] font-bold text-emerald-800 transition-all shrink-0 flex items-center gap-1 shadow-2xs"
                >
                  <Clock className="w-3 h-3 text-emerald-600 group-hover:text-white" />
                  <span>{formatTimestamp(seg.start_seconds)}</span>
                </button>

                {/* Content Area */}
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[11px] text-slate-900">
                      {seg.speaker_label || 'Speaker'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {highlightMatches(seg.content, searchQuery)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              No matching transcript segments found for &ldquo;{searchQuery}&rdquo;.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
