'use client';

import React, { useState } from 'react';
import {
  UploadCloud,
  FileVideo,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
  Clock,
  HardDrive
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface UploadRecordingModalProps {
  meetingId: string;
  meetingTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function UploadRecordingModal({
  meetingId,
  meetingTitle,
  isOpen,
  onClose,
  onSuccess,
}: UploadRecordingModalProps) {
  const { addMeetingRecording } = useAuth();
  const [tab, setTab] = useState<'upload' | 'drive'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [driveUrl, setDriveUrl] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('45');
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 200 * 1024 * 1024) {
        setError('File size exceeds 200MB limit. Please provide a compressed recording or Google Drive link.');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentConfirmed) {
      setError('Please confirm that recording consent was obtained from meeting participants.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const durSec = Math.max(60, (parseInt(durationMinutes, 10) || 45) * 60);

      if (tab === 'upload') {
        if (!selectedFile) {
          setError('Please select a recording video or audio file.');
          setIsSubmitting(false);
          return;
        }

        // Upload to private Supabase Storage via addMeetingRecording
        const res = await addMeetingRecording(meetingId, {
          meeting_id: meetingId,
          provider: 'manual_upload',
          file_name: selectedFile.name,
          file_size_bytes: selectedFile.size,
          duration_seconds: durSec,
          storage_bucket: 'meeting-recordings',
          storage_path: `meetings/${meetingId}/${Date.now()}-${selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
          playback_url: URL.createObjectURL(selectedFile),
          status: 'available',
        });

        if (res.success) {
          setSuccess('Recording uploaded successfully and attached to meeting archive!');
          setTimeout(() => {
            onSuccess?.();
            onClose();
          }, 1500);
        } else {
          setError(res.error || 'Failed to upload recording.');
        }
      } else {
        // Drive / external link
        if (!driveUrl.trim() || !driveUrl.startsWith('http')) {
          setError('Please enter a valid Google Drive or external recording URL.');
          setIsSubmitting(false);
          return;
        }

        const res = await addMeetingRecording(meetingId, {
          meeting_id: meetingId,
          provider: 'google_meet_import',
          file_name: `${meetingTitle.slice(0, 30)} - Recording`,
          duration_seconds: durSec,
          playback_url: driveUrl.trim(),
          status: 'available',
        });

        if (res.success) {
          setSuccess('Google Drive recording link registered successfully!');
          setTimeout(() => {
            onSuccess?.();
            onClose();
          }, 1500);
        } else {
          setError(res.error || 'Failed to save recording link.');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-emerald-900/10 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                <FileVideo className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-black text-slate-900">Add Meeting Recording</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 line-clamp-1">
              Target: <span className="font-semibold text-slate-700">{meetingTitle}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch: File Upload vs Google Drive */}
        <div className="flex rounded-2xl bg-slate-100 p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setTab('upload')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 transition-all ${
              tab === 'upload' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Upload File</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('drive')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 transition-all ${
              tab === 'drive' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            <span>Google Drive Import</span>
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-700" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {tab === 'upload' ? (
            <div className="flex flex-col gap-2">
              <label
                htmlFor="meeting-video-file"
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-emerald-300 rounded-2xl bg-emerald-50/30 hover:bg-emerald-50/70 cursor-pointer transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-6 h-6" />
                </div>
                {selectedFile ? (
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-900">{selectedFile.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-800">
                      Click to choose video or audio recording
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Supports MP4, WebM, M4A, MP3 (Max 200MB)
                    </p>
                  </div>
                )}
                <input
                  id="meeting-video-file"
                  type="file"
                  accept="video/mp4,video/webm,video/ogg,audio/mp4,audio/mpeg,audio/webm"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700">Google Drive Recording URL *</label>
              <input
                type="url"
                required
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/xxx/view"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <p className="text-[11px] text-slate-500">
                Ensure share permissions allow club members with the link to view the file.
              </p>
            </div>
          )}

          {/* Duration estimation */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Approximate Duration (Minutes)</span>
            </label>
            <input
              type="number"
              min={1}
              max={600}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* Transparent consent notice */}
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>Recording Transparency & Participant Consent</span>
            </div>
            <label className="flex items-start gap-2 cursor-pointer text-xs text-amber-950 font-medium">
              <input
                type="checkbox"
                required
                checked={consentConfirmed}
                onChange={(e) => setConsentConfirmed(e.target.checked)}
                className="mt-0.5 rounded text-emerald-700 focus:ring-emerald-600"
              />
              <span>
                I confirm that meeting participants were informed of the recording in accordance with club privacy policy, and that no confidential personal data is published without consent.
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Recording...' : 'Save & Attach Recording'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
