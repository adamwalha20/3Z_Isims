'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/context';
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';
import MemberQRCard from '@/components/attendance/MemberQRCard';
import {
  User,
  Shield,
  Award,
  Wallet,
  Share2,
  Mail,
  LogOut,
  Save,
  Edit3,
  CheckCircle2,
  X,
  Camera,
  UploadCloud,
  Sparkles,
  ArrowRight,
  QrCode,
} from 'lucide-react';
import { DEFAULT_AVATAR, OFFICIAL_AVATAR_PRESETS, getSafeAvatar } from '@/lib/constants/avatars';

export default function ProfilePage() {
  const { t, isRtl } = useTranslation();
  const { user, activeRole, signOut, updateUserProfile, uploadAvatar, emailPreferences, updateEmailPreferences, userBureauPositions } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [studentId, setStudentId] = useState(user?.student_id || '');
  const [studyField, setStudyField] = useState(user?.study_field || '');
  const [avatarPath, setAvatarPath] = useState(getSafeAvatar(user?.avatar_path));
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [bio, setBio] = useState(user?.bio || '');
  const [skills, setSkills] = useState<string[]>(user?.skills || ['Climate Action', 'Innovation']);
  const [newSkill, setNewSkill] = useState('');
  const [emailNotifs, setEmailNotifs] = useState(user?.contact_preferences?.email ?? true);
  const [inAppNotifs, setInAppNotifs] = useState(user?.contact_preferences?.in_app ?? true);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Email Preferences feedback & testing state
  const [prefSaveStatus, setPrefSaveStatus] = useState<'' | 'saving' | 'saved' | 'error'>('');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [testEmailChannel, setTestEmailChannel] = useState<'meeting' | 'task' | 'event' | 'announcement'>('meeting');
  const [testEmailResult, setTestEmailResult] = useState<string | null>(null);

  const handleTogglePreference = async (key: string, value: boolean) => {
    setPrefSaveStatus('saving');
    const res = await updateEmailPreferences({ [key]: value } as any);
    if (res.success) {
      setPrefSaveStatus('saved');
      setTimeout(() => setPrefSaveStatus(''), 2500);
    } else {
      setPrefSaveStatus('error');
      setTimeout(() => setPrefSaveStatus(''), 4000);
    }
  };

  const handleSendTestEmail = async () => {
    if (!user?.email) return;
    setIsSendingTestEmail(true);
    setTestEmailResult(null);
    try {
      const res = await fetch('/api/email/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_email',
          payload: {
            email: user.email,
            name: user.full_name,
            channelType: testEmailChannel,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestEmailResult(
          data.status === 'simulated'
            ? `✓ Email simulé enregistré pour ${data.sentTo} (Journal public.email_delivery_logs)`
            : `✓ Email transactionnel envoyé avec succès à ${data.sentTo} !`
        );
      } else {
        setTestEmailResult(`✗ Erreur d'envoi: ${data.error || 'Erreur inconnue'}`);
      }
    } catch (err: any) {
      setTestEmailResult(`✗ Erreur réseau: ${err?.message || 'Échec de connexion'}`);
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  // Handle direct file upload from device
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    setErrorMessage('');
    setSavedMessage('');

    const res = await uploadAvatar(file);
    setIsUploadingAvatar(false);

    if (res.success && res.url) {
      setAvatarPath(res.url);
      setSavedMessage('Profile picture uploaded and saved successfully!');
      setTimeout(() => setSavedMessage(''), 4000);
    } else {
      setErrorMessage(res.error || 'Failed to upload photo. Please try a different image.');
    }

    e.target.value = '';
  };

  // Sync state when user profile is loaded
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setStudentId(user.student_id || '');
      setStudyField(user.study_field || '');
      setAvatarPath(getSafeAvatar(user.avatar_path));
      setBio(user.bio || '');
      setSkills(user.skills || ['Climate Action', 'Innovation']);
      setEmailNotifs(user.contact_preferences?.email ?? true);
      setInAppNotifs(user.contact_preferences?.in_app ?? true);
    }
  }, [user]);

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedMessage('');
    setErrorMessage('');

    const res = await updateUserProfile({
      fullName,
      studentId,
      studyField,
      avatarPath,
      bio,
      skills,
      contactPreferences: {
        email: emailNotifs,
        in_app: inAppNotifs,
      },
    });

    setIsSaving(false);
    if (res.success) {
      setSavedMessage('Profile and Digital Pass successfully updated in database!');
      setIsEditing(false);
      setTimeout(() => setSavedMessage(''), 4000);
    } else {
      setErrorMessage(res.error || 'Failed to save changes. Please try again.');
    }
  };

  return (
    <AppShell>
      <div className="pt-4 flex flex-col gap-5 max-w-2xl mx-auto w-full pb-20">
        {/* Status Toast Notifications */}
        {savedMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>{savedMessage}</span>
            </div>
            <button onClick={() => setSavedMessage('')} className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold flex items-center justify-between shadow-xs">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage('')} className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Profile Digital Badge Header */}
        <section className="rounded-3xl overflow-hidden card-luminous bg-white border border-emerald-100 shadow-md">
          <div className="badge-gradient p-5 text-white flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-200">
                Official Digital Member ID
              </span>
              <h1 className="text-xl font-extrabold tracking-tight">3ZERO CLUB ISIMS</h1>
            </div>
            <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold border border-white/30">
              {user?.student_id || '#ZEC-8891'}
            </span>
          </div>

          <div className="p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-4 min-w-0">
                <div className="relative shrink-0 group">
                  <img
                    src={getSafeAvatar(user?.avatar_path || avatarPath)}
                    alt={user?.full_name || 'Profile'}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-emerald-500 shadow-md group-hover:opacity-90 transition-opacity"
                  />
                  {isUploadingAvatar ? (
                    <div className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center text-white">
                      <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                    </div>
                  ) : (
                    <label
                      htmlFor="badge-avatar-upload"
                      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center ring-2 ring-white shadow-xs cursor-pointer transition-transform hover:scale-110"
                      title="Upload new profile picture"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <input
                        id="badge-avatar-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarFileChange}
                        disabled={isUploadingAvatar}
                      />
                    </label>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-black text-slate-900 truncate leading-tight">
                    {user?.full_name}
                  </h2>
                  <p className="font-mono text-xs text-slate-500 font-semibold mt-0.5">
                    {user?.student_id || 'ID Pending'} • {user?.study_field || 'Computer Science'}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono truncate">{user?.email}</p>
                </div>
              </div>

              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 border border-emerald-200"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Close Editor' : 'Edit Profile'}</span>
              </button>
            </div>

            {/* Endorsed Skills */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-600">Endorsed Club Skills & Badges</span>
              <div className="flex flex-wrap gap-1.5">
                {user?.skills?.map((s, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Wallet Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => alert('Exporting pass to Apple / Google Wallet.')}
                className="py-2.5 px-3 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-black"
              >
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span>Wallet Pass</span>
              </button>
              <button
                onClick={() => alert(`Official member ID copied: ${user?.student_id}`)}
                className="py-2.5 px-3 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-50"
              >
                <Share2 className="w-4 h-4 text-emerald-700" />
                <span>Share Member ID</span>
              </button>
            </div>
          </div>
        </section>

        {/* Member Profile Form / Editor */}
        <section className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-emerald-900/10 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-700" />
              <h3 className="font-extrabold text-base text-slate-900">
                {isEditing ? 'Edit Profile & Credentials' : 'Personal Information & Preferences'}
              </h3>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Details</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-4">
            {/* Full Name & Matricule */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  disabled={!isEditing}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Oussema Cherif"
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:bg-slate-50 disabled:text-slate-700"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Student Matricule (ISIMS) *</label>
                <input
                  type="text"
                  required
                  disabled={!isEditing}
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g. ISIMS-2024-9102"
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono disabled:bg-slate-50 disabled:text-slate-700"
                />
              </div>
            </div>

            {/* Study Field */}
            <div>
              <label className="text-xs font-bold text-slate-700">Academic Study Field / Speciality *</label>
              <input
                type="text"
                required
                disabled={!isEditing}
                value={studyField}
                onChange={(e) => setStudyField(e.target.value)}
                placeholder="e.g. L2 DSI — Software Engineering & Multimedia"
                className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:bg-slate-50 disabled:text-slate-700"
              />
            </div>

            {/* Profile Picture Configuration (Visible when Editing) */}
            {isEditing && (
              <div className="flex flex-col gap-3 p-4 bg-emerald-50/40 rounded-2xl border border-emerald-200/70">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-700" />
                    <span>Profile Picture & Pass Photo</span>
                  </span>
                  <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full">
                    Live Supabase Storage
                  </span>
                </div>

                {/* 1. Device File Upload Box */}
                <label
                  htmlFor="editor-avatar-upload"
                  className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-emerald-300 rounded-2xl bg-white hover:bg-emerald-50/50 cursor-pointer transition-all group shadow-2xs"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                    {isUploadingAvatar ? (
                      <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                    ) : (
                      <UploadCloud className="w-5 h-5 text-emerald-700" />
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-800 text-center">
                    {isUploadingAvatar ? 'Uploading picture to cloud...' : 'Click to upload your photo from your device'}
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5">
                    Supports JPG, PNG, WEBP (Max 5MB)
                  </span>
                  <input
                    id="editor-avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarFileChange}
                    disabled={isUploadingAvatar}
                  />
                </label>

                {/* 2. Custom URL Input */}
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-slate-600">Or paste image URL:</span>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={customAvatarUrl}
                      onChange={(e) => setCustomAvatarUrl(e.target.value)}
                      placeholder="https://example.com/my-photo.jpg"
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customAvatarUrl.trim()) {
                          setAvatarPath(customAvatarUrl.trim());
                          setCustomAvatarUrl('');
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shrink-0"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                {/* 3. Preset Avatars */}
                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Official 3D Cartoon Avatar Presets:</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Eco & Campus Hub Theme
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 pt-0.5">
                    {OFFICIAL_AVATAR_PRESETS.map((preset, idx) => {
                      const isSelected = avatarPath === preset;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setAvatarPath(preset)}
                          className={`relative group rounded-2xl overflow-hidden border-2 transition-all p-1 bg-white shadow-xs hover:shadow-md ${
                            isSelected
                              ? 'border-emerald-600 ring-2 ring-emerald-300 scale-105 bg-emerald-50/40'
                              : 'border-slate-200 hover:border-emerald-400 hover:scale-102'
                          }`}
                        >
                          <div className="w-full aspect-square rounded-xl overflow-hidden bg-slate-100">
                            <img
                              src={preset}
                              alt={`Cartoon Avatar ${idx + 1}`}
                              className="w-full h-full object-cover transition-transform group-hover:scale-110"
                            />
                          </div>
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-xs">
                              <CheckCircle2 className="w-3 h-3" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Bio & Green Tech Interests */}
            <div>
              <label className="text-xs font-bold text-slate-700">Bio & Green Tech Motivation</label>
              <textarea
                rows={3}
                disabled={!isEditing}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share your goals in 3ZERO Club, carbon-neutral projects, or technical skills..."
                className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:bg-slate-50 disabled:text-slate-700"
              />
            </div>

            {/* Skills & Badges Tags Editor */}
            {isEditing && (
              <div className="flex flex-col gap-2 p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                <label className="text-xs font-bold text-slate-700">Club Skills & Endorsement Badges</label>
                <div className="flex flex-wrap gap-1.5 mb-1">
                  {skills.map((sk) => (
                    <span
                      key={sk}
                      className="px-2.5 py-1 bg-white text-emerald-900 rounded-lg border border-emerald-200 flex items-center gap-1.5 text-xs font-semibold shadow-2xs"
                    >
                      <span>{sk}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(sk)}
                        className="text-emerald-700 hover:text-rose-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="Add custom skill (e.g. Flutter, Solar Audit, IoT)..."
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 outline-none text-xs bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-xs"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* Automated Email & Notification Preferences */}
            <div className="flex flex-col gap-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800">Automated Email & Notification Channels</span>
                  <p className="text-[11px] text-slate-500">Fine-tune transactional email deliveries sent to your registered address.</p>
                </div>
                <div className="flex items-center gap-2">
                  {prefSaveStatus === 'saving' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                      Saving to cloud...
                    </span>
                  )}
                  {prefSaveStatus === 'saved' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Saved to cloud
                    </span>
                  )}
                  {prefSaveStatus === 'error' && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold">
                      Save failed
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                    Africa/Tunis Time
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <label className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-slate-50/70 border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={emailPreferences?.meeting_reminders_enabled ?? true}
                    onChange={(e) => handleTogglePreference('meeting_reminders_enabled', e.target.checked)}
                    className="mt-0.5 rounded text-emerald-700 focus:ring-emerald-600 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Meeting Reminders</span>
                    <span className="text-[10px] text-slate-500 leading-tight block">48h advance, 08:00 AM meeting day & 1h urgent notice.</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-slate-50/70 border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={emailPreferences?.task_emails_enabled ?? true}
                    onChange={(e) => handleTogglePreference('task_emails_enabled', e.target.checked)}
                    className="mt-0.5 rounded text-emerald-700 focus:ring-emerald-600 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Task Assignments</span>
                    <span className="text-[10px] text-slate-500 leading-tight block">Instant alerts when tasks are assigned, verified, or rejected.</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-slate-50/70 border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={emailPreferences?.event_emails_enabled ?? true}
                    onChange={(e) => handleTogglePreference('event_emails_enabled', e.target.checked)}
                    className="mt-0.5 rounded text-emerald-700 focus:ring-emerald-600 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Club Events</span>
                    <span className="text-[10px] text-slate-500 leading-tight block">Updates on climate summits, green tech workshops & schedules.</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-slate-50/70 border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={emailPreferences?.announcement_emails_enabled ?? true}
                    onChange={(e) => handleTogglePreference('announcement_emails_enabled', e.target.checked)}
                    className="mt-0.5 rounded text-emerald-700 focus:ring-emerald-600 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Official Announcements</span>
                    <span className="text-[10px] text-slate-500 leading-tight block">Crucial club announcements and executive updates.</span>
                  </div>
                </label>
              </div>

              {/* Transactional Dispatch Verification & Test Tool */}
              <div className="mt-2 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Mail className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Test Transactional Email Dispatch</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-600">
                    Target: <span className="font-mono text-slate-700">{user?.email || 'N/A'}</span>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {(['meeting', 'task', 'event', 'announcement'] as const).map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setTestEmailChannel(ch)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all ${
                        testEmailChannel === ch
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {ch === 'meeting' ? 'Meeting Reminder' : ch === 'task' ? 'Task Alert' : ch === 'event' ? 'Club Event' : 'Official Notice'}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={handleSendTestEmail}
                    disabled={isSendingTestEmail || !user?.email}
                    className="ml-auto px-3 py-1 rounded-xl bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white text-[11px] font-bold shadow-xs flex items-center gap-1 transition-all"
                  >
                    {isSendingTestEmail ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span>Dispatching...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-emerald-300" />
                        <span>Send Test Dispatch</span>
                      </>
                    )}
                  </button>
                </div>

                {testEmailResult && (
                  <div className={`p-2 rounded-xl text-[11px] font-medium leading-relaxed ${
                    testEmailResult.startsWith('✓') ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {testEmailResult}
                  </div>
                )}
              </div>
            </div>

            {/* Language & Interface Preference */}
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2.5">
              <div>
                <h3 className="text-xs font-bold text-slate-900">{t('profile.languageSettings')}</h3>
                <p className="text-[11px] text-slate-500">{t('profile.languageHint')}</p>
              </div>
              <LanguageSwitcher variant="profile" />
            </div>

            {/* Action Buttons */}
            {isEditing && (
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            )}
          </form>
        </section>

        {/* My Attendance QR Card Section */}
        <section className="bg-white rounded-3xl p-6 md:p-8 border border-emerald-900/10 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">My Attendance QR</h2>
              <p className="text-xs text-slate-500">Official encrypted QR code for campus check-ins and session check-outs</p>
            </div>
            <Link
              href="/attendance"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
            >
              <span>View History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <MemberQRCard user={user} bureauPositions={userBureauPositions} />
        </section>

        {/* Sign Out Card */}
        <div className="flex justify-center">
          <button
            onClick={signOut}
            className="w-full max-w-sm py-2.5 px-4 rounded-2xl bg-white hover:bg-rose-50 text-rose-600 text-xs font-bold flex items-center justify-center gap-1.5 border border-rose-200 transition-colors shadow-xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of Workspace</span>
          </button>
        </div>
      </div>
    </AppShell>
  );
}
