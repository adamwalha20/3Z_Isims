'use client';

import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  Video,
  Shield,
  Layers,
  Sparkles,
  AlertCircle,
  FileText,
  MapPin,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { MeetingType, MeetingVisibility, Department } from '@/types/database.types';

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments?: Department[];
}

export default function ScheduleMeetingModal({
  isOpen,
  onClose,
  departments: propDepartments,
}: ScheduleMeetingModalProps) {
  const { user, activeRole, addMeeting, departments: authDepartments } = useAuth();
  const isBureauOrAdmin = activeRole === 'bureau' || activeRole === 'admin';
  const departments = propDepartments || authDepartments || [];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [location, setLocation] = useState('Google Meet & Room 104');
  const [meetingUrl, setMeetingUrl] = useState('https://meet.google.com/zec-isims-sync');
  const [meetingType, setMeetingType] = useState<MeetingType>('bureau');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [visibility, setVisibility] = useState<MeetingVisibility>('club');
  const [recordingEnabled, setRecordingEnabled] = useState(true);
  const [consentAcknowledged, setConsentAcknowledged] = useState(true);
  const [agenda, setAgenda] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isBureauOrAdmin) {
      setErrorMsg('Unauthorized: Only bureau officers and administrators can schedule meetings.');
      return;
    }

    if (!title.trim()) {
      setErrorMsg('Please specify a meeting title.');
      return;
    }

    const starts = dateStr ? new Date(dateStr).toISOString() : new Date().toISOString();
    const ends = new Date(new Date(starts).getTime() + durationMinutes * 60000).toISOString();

    setIsSubmitting(true);
    const res = await addMeeting({
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim(),
      starts_at: starts,
      ends_at: ends,
      department_id: departmentId || null,
      organizer_id: user?.id || 'usr-admin-001',
      meeting_url: meetingUrl.trim() || null,
      meeting_platform: 'google_meet',
      meeting_type: meetingType,
      recording_enabled: recordingEnabled,
      recording_status: recordingEnabled ? 'requested' : 'none',
      recording_consent_status: consentAcknowledged ? 'obtained' : 'pending',
      visibility,
      status: 'scheduled',
      agenda: agenda.trim() || undefined,
    });
    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to schedule meeting.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-emerald-900/10 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Schedule Chapter Meeting</h3>
              <p className="text-[11px] text-slate-500">Google Meet sync, recording bot & searchable archive</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {/* Title */}
          <div>
            <label className="text-xs font-bold text-slate-700">Meeting Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekly Bureau Strategy & Sprint Allocation"
              className="w-full mt-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* Meeting Type & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Meeting Type</label>
              <select
                value={meetingType}
                onChange={(e) => setMeetingType(e.target.value as MeetingType)}
                className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="bureau">Bureau Meeting</option>
                <option value="general">General Club Assembly</option>
                <option value="department">Department Sync</option>
                <option value="project">Project Work Session</option>
                <option value="event_prep">Event Preparation</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Department (Optional)</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="">Club-Wide (All Departments)</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date, Time & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Date & Start Time</label>
              <input
                type="datetime-local"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Duration (Minutes)</label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10))}
                className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1h 30m</option>
                <option value={120}>2 hours</option>
              </select>
            </div>
          </div>

          {/* Location & Google Meet URL */}
          <div className="flex flex-col gap-2">
            <div>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-blue-600" />
                <span>Google Meet URL</span>
              </label>
              <input
                type="url"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://meet.google.com/xxx-yyyy-zzz"
                className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <span className="text-[10px] text-slate-400 mt-0.5">
                Members can join directly through Google Meet independently of the app.
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Physical Location (Room / Campus)</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. ISIMS Room 104 or Main Amphitheater"
                className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Visibility */}
          <div>
            <label className="text-xs font-bold text-slate-700">Visibility in Archive</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {[
                { key: 'club', label: 'Club-Wide', desc: 'All active members' },
                { key: 'department', label: 'Department', desc: 'Department team' },
                { key: 'confidential', label: 'Confidential', desc: 'Invited bureau' },
              ].map((v) => (
                <button
                  type="button"
                  key={v.key}
                  onClick={() => setVisibility(v.key as MeetingVisibility)}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all ${
                    visibility === v.key
                      ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="text-xs font-bold">{v.label}</span>
                  <span className="text-[9px] text-slate-500">{v.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recording & Consent Settings */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={recordingEnabled}
                onChange={(e) => setRecordingEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 accent-emerald-600"
              />
              <span className="text-xs font-bold text-emerald-950">
                Enable ZEC Meeting Recorder (Bot & Transcription)
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer ml-6">
              <input
                type="checkbox"
                checked={consentAcknowledged}
                onChange={(e) => setConsentAcknowledged(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-emerald-600 accent-emerald-600"
              />
              <span className="text-[11px] text-slate-600">
                Notify participants of official recording and obtain consent at session opening.
              </span>
            </label>
          </div>

          {/* Agenda Outline */}
          <div>
            <label className="text-xs font-bold text-slate-700">Agenda Outline</label>
            <textarea
              rows={3}
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="1. Review of EcoHack milestones&#10;2. Sponsor pipeline review&#10;3. Assignment of task sprints"
              className="w-full mt-1 p-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 leading-relaxed"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 active:scale-95 transition-all shadow-xs"
            >
              {isSubmitting ? 'Scheduling...' : 'Confirm & Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
