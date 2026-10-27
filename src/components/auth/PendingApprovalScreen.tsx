'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  Clock,
  ShieldCheck,
  UserCheck,
  LogOut,
  RefreshCw,
  Edit3,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Sparkles,
  Save,
  X,
} from 'lucide-react';

export default function PendingApprovalScreen() {
  const { user, signOut, updateUserProfile } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Edit form state
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [studentId, setStudentId] = useState(user?.student_id || '');
  const [studyField, setStudyField] = useState(user?.study_field || 'L2 DSI — Software Development');
  const [bio, setBio] = useState(user?.bio || '');
  const [skills, setSkills] = useState<string[]>(user?.skills || ['Climate Action', 'Innovation']);
  const [newSkill, setNewSkill] = useState('');

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await updateUserProfile({
      fullName,
      studentId,
      studyField,
      bio,
      skills,
    });

    if (res.success) {
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        setIsEditing(false);
      }, 1200);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f9f6] flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-xl flex flex-col gap-5">
        {/* Top Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-900/10 flex flex-col items-center text-center gap-4">
          {/* Pulsing Status Icon */}
          <div className="relative">
            <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shadow-inner">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center text-white text-[10px] font-bold">
              !
            </span>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/80 text-amber-900 text-xs font-bold uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
              <span>Pending Administrator Verification</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Welcome to 3ZERO CLUB ISIMS
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-md leading-relaxed">
              Your account has been registered and is currently in the verification queue. In accordance with university club governance, the designated administrator (
              <span className="font-bold text-slate-900 font-mono">adamwalha20@gmail.com</span>
              ) must verify your student credentials before full platform access is granted.
            </p>
          </div>

          {/* Student Pass Preview Card */}
          <div className="w-full bg-gradient-to-br from-emerald-950 to-emerald-800 text-white p-5 rounded-2xl shadow-md text-left flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400 text-[18px]">verified_user</span>
                <span className="font-extrabold uppercase tracking-wider text-[11px] text-emerald-200">
                  Student Member Pass Application
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold uppercase border border-amber-400/30">
                Under Review
              </span>
            </div>

            <div className="flex items-center gap-3.5">
              <img
                src={user?.avatar_path || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'}
                alt="Avatar"
                className="w-14 h-14 rounded-2xl object-cover ring-2 ring-emerald-400 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="text-base font-black truncate">{user?.full_name}</div>
                <div className="text-xs text-emerald-200 font-mono">{user?.student_id || 'Matricule Pending'}</div>
                <div className="text-xs text-emerald-300 truncate mt-0.5">{user?.study_field || 'Computer Science & Multimedia'}</div>
              </div>
            </div>

            {user?.skills && user.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/10">
                {user.skills.map((sk) => (
                  <span
                    key={sk}
                    className="px-2 py-0.5 rounded-md bg-white/15 text-white text-[10px] font-semibold"
                  >
                    {sk}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="w-full flex flex-col sm:flex-row items-center gap-2.5 pt-2">
            <button
              onClick={() => setIsEditing(true)}
              className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Edit3 className="w-4 h-4 text-emerald-700" />
              <span>Edit My Profile</span>
            </button>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Checking...' : 'Check Approval Status'}</span>
            </button>
          </div>

          <button
            onClick={signOut}
            className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-1 pt-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out & Return to Login</span>
          </button>
        </div>

        {/* Security Assurance Footer */}
        <div className="text-center text-[11px] text-slate-400 font-medium">
          ISIMS Campus Node • Zero Exclusion, Zero Carbon, Zero Poverty • Mandate 2024-2025
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-700" />
                <h3 className="font-extrabold text-sm text-slate-900">Update Profile Details</h3>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Oussema Cherif"
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Student Matricule (ISIMS) *</label>
                  <input
                    type="text"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g. ISIMS-2024-9102"
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-600 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700">Study Field / Level *</label>
                  <input
                    type="text"
                    required
                    value={studyField}
                    onChange={(e) => setStudyField(e.target.value)}
                    placeholder="e.g. L2 DSI Multimedia"
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Bio & Club Interests</label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Brief statement about your motivation or background..."
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Skills & Club Pillars</label>
                <div className="flex flex-wrap gap-1.5 mt-1.5 mb-2">
                  {skills.map((sk) => (
                    <span
                      key={sk}
                      className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 flex items-center gap-1 font-semibold"
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
                    placeholder="Add custom skill (e.g. Mobile Dev, AI)..."
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 outline-none text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700"
                  >
                    Add
                  </button>
                </div>
              </div>

              {savedSuccess && (
                <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl font-bold flex items-center gap-2 border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Profile updated successfully!</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold hover:bg-emerald-800 flex items-center gap-1.5 shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
