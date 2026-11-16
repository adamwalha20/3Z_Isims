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
  Languages,
  RefreshCw,
} from 'lucide-react';
import { MeetingTranscript, MeetingTranscriptSegment } from '@/types/database.types';
import { useI18n } from '@/lib/i18n/context';
import {
  getSegmentTextInLanguage,
  SupportedTranscriptLocale,
} from '@/lib/i18n/transcript-translator';

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
  const { locale } = useI18n();

  // Default to Tunisian Arabic 'ar-TN' as requested, with instant toggle to 'en' or 'fr'
  const [selectedLocale, setSelectedLocale] = useState<SupportedTranscriptLocale>('ar-TN');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('all');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(transcript?.content || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  // Extract segments safely
  const segments: MeetingTranscriptSegment[] = useMemo(() => {
    if (transcript?.segments && transcript.segments.length > 0) {
      return transcript.segments;
    }
    if (transcript?.content) {
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
      const spk = s.speaker_label || (s as any).speaker_name || (s as any).speaker;
      if (spk) set.add(spk);
    });
    return Array.from(set);
  }, [segments]);

  // Filtered segments based on search query, speaker filter, and current language
  const filteredSegments = useMemo(() => {
    return segments.filter((s) => {
      const speaker = s.speaker_label || (s as any).speaker_name || (s as any).speaker || 'Speaker';
      if (selectedSpeaker !== 'all' && speaker !== selectedSpeaker) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const localizedContent = getSegmentTextInLanguage(s, selectedLocale);
      const originalContent = s.content || (s as any).text || '';
      return (
        localizedContent.toLowerCase().includes(q) ||
        originalContent.toLowerCase().includes(q) ||
        speaker.toLowerCase().includes(q)
      );
    });
  }, [segments, searchQuery, selectedSpeaker, selectedLocale]);

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

  const handleTriggerTranslation = async (targetLang: SupportedTranscriptLocale) => {
    if (!transcript?.meeting_id) return;
    setIsTranslating(true);
    try {
      const res = await fetch('/api/meetings/transcript/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: transcript.meeting_id, targetLanguage: targetLang }),
      });
      const data = await res.json();
      if (data.success && data.segments && onSaveTranscript) {
        onSaveTranscript(data.segments);
      }
    } catch (err) {
      console.warn('Transcript translation sync notice:', err);
    } finally {
      setIsTranslating(false);
    }
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
      {/* Top Controls: Trilingual Selector & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        {/* Left: Language Selection Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 mr-1">
            <Languages className="w-4 h-4 text-emerald-700" />
            <span className="hidden sm:inline">Language:</span>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200">
            <button
              onClick={() => {
                setSelectedLocale('ar-TN');
                handleTriggerTranslation('ar-TN');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedLocale === 'ar-TN'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span>🇹🇳 تونسي (Derja)</span>
            </button>

            <button
              onClick={() => {
                setSelectedLocale('en');
                handleTriggerTranslation('en');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedLocale === 'en'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span>🇬🇧 English</span>
            </button>

            <button
              onClick={() => {
                setSelectedLocale('fr');
                handleTriggerTranslation('fr');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedLocale === 'fr'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span>🇫🇷 Français</span>
            </button>
          </div>

          {isTranslating && (
            <span className="text-[11px] font-bold text-emerald-700 animate-pulse flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Translating...</span>
            </span>
          )}
        </div>

        {/* Right: Search & Speaker Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                selectedLocale === 'ar-TN'
                  ? 'لوّج في نص الاجتماع...'
                  : selectedLocale === 'fr'
                  ? 'Rechercher dans la transcription...'
                  : 'Search words, decisions, topics...'
              }
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
              <option value="all">
                {selectedLocale === 'ar-TN'
                  ? 'كل المتحدثين'
                  : selectedLocale === 'fr'
                  ? 'Tous les intervenants'
                  : 'All Speakers'}
              </option>
              {speakers.map((spk) => (
                <option key={spk} value={spk}>
                  {spk}
                </option>
              ))}
            </select>
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
        <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
          {filteredSegments.length > 0 ? (
            filteredSegments.map((seg) => {
              const localizedText = getSegmentTextInLanguage(seg, selectedLocale);
              const isTunisian = selectedLocale === 'ar-TN';

              return (
                <div
                  key={seg.id}
                  className="p-3.5 rounded-2xl bg-slate-50/70 hover:bg-emerald-50/50 border border-slate-100 transition-colors flex items-start gap-3 group"
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
                  <div className={`flex flex-col gap-0.5 min-w-0 flex-1 ${isTunisian ? 'text-right' : 'text-left'}`}>
                    <div className={`flex items-center gap-2 ${isTunisian ? 'justify-end' : 'justify-start'}`}>
                      <span className="font-bold text-[11px] text-slate-900">
                        {seg.speaker_label || (seg as any).speaker_name || (seg as any).speaker || 'Speaker'}
                      </span>
                      {isTunisian && (
                        <span className="px-1.5 py-0.2 rounded-md bg-emerald-100/70 text-emerald-800 text-[9px] font-bold">
                          دارجة
                        </span>
                      )}
                    </div>
                    <p
                      dir={isTunisian ? 'rtl' : 'ltr'}
                      className={`text-xs text-slate-800 leading-relaxed ${
                        isTunisian ? 'font-medium font-sans text-sm tracking-normal' : ''
                      }`}
                    >
                      {highlightMatches(localizedText, searchQuery)}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-xs text-slate-400 italic">
              {selectedLocale === 'ar-TN'
                ? 'ما ثمة حتى كلام مطابق للبحث في النص.'
                : 'No transcript matches found for your filter criteria.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
