'use client';

import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import {
  User,
  Shield,
  Award,
  Wallet,
  Share2,
  Download,
  Mail,
  Phone,
  BookOpen,
  Bell,
  LogOut,
  Save,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, activeRole, signOut } = useAuth();
  const [bio, setBio] = useState(user?.bio || '');
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [inAppNotifs, setInAppNotifs] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AppShell>
      <div className="pt-4 flex flex-col gap-5 max-w-2xl mx-auto w-full pb-20">
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
              #ZEC-8891
            </span>
          </div>

          <div className="p-5 flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <img
                src={user?.avatar_path || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'}
                alt={user?.full_name || 'Profile'}
                className="w-16 h-16 rounded-full object-cover ring-2 ring-emerald-500 shadow-sm"
              />
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">{user?.full_name}</h2>
                <p className="font-mono text-xs text-slate-500">{user?.student_id} • {user?.study_field}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold uppercase">
                    Active Member
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 text-[10px] font-bold uppercase">
                    {activeRole}
                  </span>
                </div>
              </div>
            </div>

            {/* Endorsed Skills */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-600">Endorsed Club Skills & Badges</span>
              <div className="flex flex-wrap gap-1.5">
                {user?.skills.map((s, idx) => (
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
                onClick={() => alert('Official member ID copied.')}
                className="py-2.5 px-3 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-50"
              >
                <Share2 className="w-4 h-4 text-emerald-700" />
                <span>Share Member ID</span>
              </button>
            </div>
          </div>
        </section>

        {/* Member Profile Form */}
        <section className="bg-white rounded-3xl p-5 shadow-xs border border-emerald-900/10 flex flex-col gap-4">
          <h3 className="font-extrabold text-base text-slate-900">Personal Information & Preferences</h3>
          <form onSubmit={handleSave} className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600">Bio & Green Tech Interests</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

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

            <div className="flex items-center justify-between pt-3">
              {saved && <span className="text-xs text-emerald-700 font-bold">Preferences saved! ✓</span>}
              <div className="ml-auto flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
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
