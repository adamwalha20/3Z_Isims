'use client';

import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import {
  Megaphone,
  Pin,
  Clock,
  Plus,
  Send,
  Eye,
  CheckCircle,
} from 'lucide-react';

export default function AnnouncementsPage() {
  const { user, activeRole, announcements, addAnnouncement } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [audience, setAudience] = useState<'club' | 'department'>('club');

  const canPublish = activeRole === 'bureau' || activeRole === 'admin' || activeRole === 'lead';

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    addAnnouncement({
      title: title.trim(),
      body: body.trim(),
      author_id: user?.id || 'usr-yassine-001',
      audience_type: audience,
      status: 'published',
      is_pinned: isPinned,
      published_at: new Date().toISOString(),
    });

    setTitle('');
    setBody('');
    setIsPinned(false);
    setShowCreateModal(false);
  };

  return (
    <AppShell>
      <div className="pt-4 flex flex-col gap-4 max-w-4xl mx-auto w-full pb-20">
        {/* Header Strip */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs">
              <Megaphone className="w-5 h-5" />
            </span>
            <div>
              <h1 className="font-extrabold text-lg sm:text-xl text-slate-900">Announcements & Broadcasts</h1>
              <p className="text-xs text-slate-500">Official university club notices and department alerts</p>
            </div>
          </div>

          {canPublish && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs shadow-md hover:bg-emerald-800 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Broadcast Notice</span>
            </button>
          )}
        </div>

        {/* Announcements List */}
        <div className="flex flex-col gap-3.5">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className={`bg-white rounded-3xl p-5 shadow-xs border flex flex-col gap-3 relative overflow-hidden ${
                ann.is_pinned ? 'border-emerald-200' : 'border-slate-100'
              }`}
            >
              {ann.is_pinned && (
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-600 via-teal-500 to-green-400"></div>
              )}

              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {ann.is_pinned && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-extrabold uppercase">
                      <Pin className="w-3 h-3 text-emerald-700" />
                      Pinned Notice
                    </span>
                  )}
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">
                    {ann.audience_type === 'club' ? 'Campus Wide' : 'Department'}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(ann.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>

              <div>
                <h3 className="font-extrabold text-base text-slate-900 leading-snug">{ann.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal mt-1.5 whitespace-pre-line">
                  {ann.body}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-700 text-white font-bold text-[10px] flex items-center justify-center">
                    {ann.author?.full_name ? ann.author.full_name.slice(0, 2).toUpperCase() : 'SB'}
                  </div>
                  <span className="font-bold text-slate-900">
                    {ann.author?.full_name || 'Sarah Ben Salem'}{' '}
                    <span className="text-slate-400 font-normal">• Bureau</span>
                  </span>
                </div>
                <span className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Broadcast
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Broadcast Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-emerald-100 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900">Broadcast Campus Notice</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 text-sm font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handlePublish} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600">Announcement Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Schedule for General Assembly Q1"
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">Content / Memo</label>
                <textarea
                  rows={4}
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Official instructions and deadline details."
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="rounded text-emerald-700 w-4 h-4"
                  />
                  <span>Pin as official top notice</span>
                </label>

                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value as any)}
                  className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                >
                  <option value="club">All Club</option>
                  <option value="department">Department</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Publish Notice</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
