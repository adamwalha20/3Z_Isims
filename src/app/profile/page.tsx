'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
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
  Sparkles,
} from 'lucide-react';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80',
];

export default function ProfilePage() {
  const { user, activeRole, signOut, updateUserProfile } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [studentId, setStudentId] = useState(user?.student_id || '');
  const [studyField, setStudyField] = useState(user?.study_field || '');
  const [avatarPath, setAvatarPath] = useState(user?.avatar_path || AVATAR_PRESETS[0]);
  const [bio, setBio] = useState(user?.bio || '');
  const [skills, setSkills] = useState<string[]>(user?.skills || ['Climate Action', 'Innovation']);
  const [newSkill, setNewSkill] = useState('');
  const [emailNotifs, setEmailNotifs] = useState(user?.contact_preferences?.email ?? true);
  const [inAppNotifs, setInAppNotifs] = useState(user?.contact_preferences?.in_app ?? true);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Sync state when user profile is loaded
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setStudentId(user.student_id || '');
      setStudyField(user.study_field || '');
      setAvatarPath(user.avatar_path || AVATAR_PRESETS[0]);
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
                <div className="relative shrink-0">
                  <img
                    src={user?.avatar_path || avatarPath}
                    alt={user?.full_name || 'Profile'}
                    className="w-16 h-16 rounded-2xl object-cover ring-2 ring-emerald-500 shadow-sm"
                  />
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center ring-2 ring-white">
                    <span className="material-symbols-outlined text-[13px]">verified</span>
                  </span>
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

            {/* Avatar Preset Selector (Visible when Editing) */}
            {isEditing && (
              <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700">Choose Profile Avatar Preset:</span>
                <div className="flex items-center gap-3 overflow-x-auto pb-1">
                  {AVATAR_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatarPath(preset)}
                      className={`w-11 h-11 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                        avatarPath === preset ? 'border-emerald-600 ring-2 ring-emerald-300 scale-105' : 'border-transparent hover:opacity-80'
                      }`}
                    >
                      <img src={preset} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
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

            {/* Notification Preferences */}
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-700">Notification Preferences</span>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={emailNotifs}
                  onChange={(e) => setEmailNotifs(e.target.checked)}
                  className="rounded text-emerald-700"
                />
                <span>Email summaries for meetings & official announcements</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={inAppNotifs}
                  onChange={(e) => setInAppNotifs(e.target.checked)}
                  className="rounded text-emerald-700"
                />
                <span>Instant in-app alerts on new task assignments</span>
              </label>
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
