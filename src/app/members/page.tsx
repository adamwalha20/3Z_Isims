'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import {
  Users,
  Shield,
  Layers,
  FileText,
  Megaphone,
  Download,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  LogOut,
  SlidersHorizontal,
  Search,
  Lock,
  Unlock,
  Terminal,
} from 'lucide-react';

export default function MembersDirectoryPage() {
  const { user, activeRole, setActiveRole, members, departments, documents, auditLogs, signOut } = useAuth();
  const [searchMember, setSearchMember] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');

  const filteredMembers = members.filter((m) => {
    const matchName = m.full_name.toLowerCase().includes(searchMember.toLowerCase()) ||
      m.student_id.toLowerCase().includes(searchMember.toLowerCase());
    return matchName;
  });

  return (
    <AppShell>
      <div className="pt-4 flex flex-col gap-5 max-w-4xl mx-auto w-full pb-20">
        {/* =========================================================================
            1. RICH EMERALD MEMBER BADGE CARD (Stitch Screen 4)
        ========================================================================= */}
        <section className="relative overflow-hidden rounded-3xl bg-white shadow-xl shadow-emerald-950/10 border border-emerald-100 flex flex-col">
          {/* Top Badge Banner */}
          <div className="relative bg-gradient-to-br from-[#024a29] via-[#056839] to-[#01864b] px-5 py-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center p-1 border border-white/20">
                <span className="material-symbols-outlined text-[22px] text-emerald-200">energy_savings_leaf</span>
              </div>
              <div>
                <div className="font-extrabold text-base tracking-tight uppercase">3ZERO CLUB</div>
                <p className="text-[10px] text-emerald-200 font-bold uppercase tracking-wider">ISIMS SFAX CHAPTER</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-black/25 backdrop-blur-md px-3 py-1 rounded-full border border-white/15">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-bold text-white tracking-wide">VERIFIED PASS</span>
            </div>
          </div>

          {/* Member Credentials & Role Info */}
          <div className="p-5 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="relative shrink-0">
                  <img
                    className="w-16 h-16 rounded-2xl object-cover ring-2 ring-emerald-500 shadow-md"
                    src={user?.avatar_path || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'}
                    alt={user?.full_name || 'Profile'}
                  />
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center ring-2 ring-white">
                    <span className="material-symbols-outlined text-[13px]">verified</span>
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <h2 className="font-extrabold text-lg sm:text-xl text-slate-900 leading-tight truncate">
                    {user?.full_name || 'Yassine Mezghani'}
                  </h2>
                  <span className="font-mono text-xs text-slate-500 font-semibold mt-0.5">
                    {user?.student_id || 'ISIMS-2024-8891'} • L2 DSI
                  </span>
                  <span className="text-xs text-slate-600 truncate mt-0.5 font-medium">
                    {user?.study_field || 'Computer Science & Multimedia'}
                  </span>
                </div>
              </div>

              <div className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-extrabold uppercase border border-emerald-200">
                {activeRole} View
              </div>
            </div>

            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100/90 text-emerald-900 font-bold text-xs">
                <span className="material-symbols-outlined text-[14px]">star</span> Lead Innovation
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
                Active 2024-2025
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-600 text-white font-bold text-xs shadow-xs">
                Sfax Central Node
              </span>
            </div>
          </div>
        </section>

        {/* =========================================================================
            2. VIBRANT CLUB OPERATIONS GRID (6 Modules)
        ========================================================================= */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <h2 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">Club Operations</h2>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
              6 modules ready
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Tile 1: Members */}
            <a
              href="#member-directory"
              className="rounded-3xl bg-white p-4 shadow-sm border border-emerald-900/10 hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-xs">
                  <span className="material-symbols-outlined text-[20px]">badge</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-black">
                  +8 new
                </span>
              </div>
              <div>
                <span className="font-extrabold text-sm text-slate-900 block">Members</span>
                <span className="text-xs text-slate-500 font-medium block mt-0.5">72 active • 8 pending</span>
                <span className="text-[10px] text-emerald-700 font-bold block mt-1">Directory & roles</span>
              </div>
            </a>

            {/* Tile 2: Departments */}
            <Link
              href="/departments"
              className="rounded-3xl bg-white p-4 shadow-sm border border-emerald-900/10 hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-400 flex items-center justify-center text-white shadow-xs">
                  <span className="material-symbols-outlined text-[20px]">hub</span>
                </div>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800">
                  5 Units
                </span>
              </div>
              <div>
                <span className="font-extrabold text-sm text-slate-900 block">Departments</span>
                <span className="text-xs text-slate-500 font-medium block mt-0.5">Training, Comms, HR</span>
                <span className="text-[10px] text-teal-700 font-bold block mt-1">Teams & task pools</span>
              </div>
            </Link>

            {/* Tile 3: Documents */}
            <Link
              href="/documents"
              className="rounded-3xl bg-white p-4 shadow-sm border border-emerald-900/10 hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-700 to-emerald-500 flex items-center justify-center text-white shadow-xs">
                  <span className="material-symbols-outlined text-[20px]">source</span>
                </div>
                <span className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700">
                  <Unlock className="w-3.5 h-3.5" />
                </span>
              </div>
              <div>
                <span className="font-extrabold text-sm text-slate-900 block">Documents</span>
                <span className="text-xs text-slate-500 font-medium block mt-0.5">Dossiers & memory</span>
                <span className="text-[10px] text-emerald-700 font-bold block mt-1">Official archives</span>
              </div>
            </Link>

            {/* Tile 4: Announcements */}
            <Link
              href="/announcements"
              className="rounded-3xl bg-white p-4 shadow-sm border border-emerald-900/10 hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-400 flex items-center justify-center text-white shadow-xs">
                  <span className="material-symbols-outlined text-[20px]">campaign</span>
                </div>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
              </div>
              <div>
                <span className="font-extrabold text-sm text-slate-900 block">Announcements</span>
                <span className="text-xs text-slate-500 font-medium block mt-0.5">Campus broadcast</span>
                <span className="text-[10px] text-rose-600 font-bold block mt-1">Pinned feeds</span>
              </div>
            </Link>

            {/* Tile 5: Meetings & PV */}
            <Link
              href="/meetings"
              className="rounded-3xl bg-white p-4 shadow-sm border border-emerald-900/10 hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-400 flex items-center justify-center text-white shadow-xs">
                  <span className="material-symbols-outlined text-[20px]">event_note</span>
                </div>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  PV #14
                </span>
              </div>
              <div>
                <span className="font-extrabold text-sm text-slate-900 block">Meetings & PV</span>
                <span className="text-xs text-slate-500 font-medium block mt-0.5">Agendas & minutes</span>
                <span className="text-[10px] text-blue-700 font-bold block mt-1">Decision logs</span>
              </div>
            </Link>

            {/* Tile 6: Training & Ideas */}
            <Link
              href="/departments"
              className="rounded-3xl bg-white p-4 shadow-sm border border-emerald-900/10 hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-400 flex items-center justify-center text-white shadow-xs">
                  <span className="material-symbols-outlined text-[20px]">psychology</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 text-[10px] font-bold">
                  Labs
                </span>
              </div>
              <div>
                <span className="font-extrabold text-sm text-slate-900 block">Training & Ideas</span>
                <span className="text-xs text-slate-500 font-medium block mt-0.5">Workshops & bank</span>
                <span className="text-[10px] text-violet-700 font-bold block mt-1">Skill verification</span>
              </div>
            </Link>
          </div>
        </section>

        {/* =========================================================================
            3. BUREAU HANDOVER VAULT SECTION
        ========================================================================= */}
        <section className="rounded-3xl bg-white p-5 shadow-xs border border-emerald-900/10 flex flex-col gap-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">history_edu</span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900">Bureau Handover Vault</h3>
                  <span className="px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    24/25 Mandate
                  </span>
                </div>
                <span className="text-xs text-slate-500 truncate">
                  Preserves institutional continuity across cohorts
                </span>
              </div>
            </div>
            <Link href="/documents" className="text-xs text-emerald-700 font-bold hover:underline shrink-0">
              View All (18)
            </Link>
          </div>

          <div className="flex flex-col gap-2">
            {documents.slice(0, 3).map((doc) => (
              <div
                key={doc.id}
                className="bg-slate-50 rounded-2xl p-3 flex items-center justify-between gap-2 border border-slate-100"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-emerald-700 shadow-xs shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-900 truncate">{doc.title}</span>
                    <span className="text-[10px] text-slate-500 truncate">{doc.description}</span>
                  </div>
                </div>
                <button
                  onClick={() => alert(`Downloading authorized file: ${doc.title}`)}
                  aria-label="Download document"
                  className="w-8 h-8 rounded-xl bg-white text-slate-600 hover:text-emerald-700 flex items-center justify-center shadow-xs shrink-0"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* =========================================================================
            4. MEMBER DIRECTORY (Searchable List)
        ========================================================================= */}
        <section id="member-directory" className="rounded-3xl bg-white p-5 shadow-xs border border-emerald-900/10 flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Member Directory</h3>
              <p className="text-xs text-slate-500">Authorized student members of ISIMS Chapter</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-mono text-xs font-bold">
              {filteredMembers.length} Members
            </span>
          </div>

          <div className="flex items-center bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchMember}
              onChange={(e) => setSearchMember(e.target.value)}
              placeholder="Search member by name or matricule..."
              className="w-full bg-transparent border-0 p-0 pl-2 focus:outline-none text-xs text-slate-900"
            />
          </div>

          <div className="flex flex-col gap-2.5">
            {filteredMembers.map((m) => (
              <div
                key={m.id}
                className="p-3.5 rounded-2xl bg-white border border-slate-100 flex items-center justify-between gap-3 shadow-xs hover:border-emerald-200 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={m.avatar_path || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'}
                    alt={m.full_name}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500 shrink-0"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">{m.full_name}</span>
                    <span className="font-mono text-[11px] text-slate-500">{m.student_id}</span>
                    <span className="text-[10px] text-emerald-700 font-semibold truncate">{m.study_field}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {m.skills.slice(0, 2).map((s, idx) => (
                    <span
                      key={idx}
                      className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold"
                    >
                      {s}
                    </span>
                  ))}
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* =========================================================================
            5. ADMINISTRATION CONTROLS (Audit & Permissions)
        ========================================================================= */}
        {(activeRole === 'admin' || activeRole === 'bureau') && (
          <section className="rounded-3xl bg-white p-5 shadow-xs border border-rose-100 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-extrabold text-sm text-slate-900">Admin Controls</h3>
                    <span className="px-2 py-0.2 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                      Elevated
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">President & Secretary Permissions</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Link
                href="/admin/members"
                className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-emerald-50/50 rounded-2xl border border-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-emerald-700">how_to_reg</span>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-900">Approve 8 Member Applications</span>
                    <span className="text-[10px] text-slate-500">Verification required for ISIMS matricule</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>

              <Link
                href="/admin"
                className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-emerald-50/50 rounded-2xl border border-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-emerald-700">security</span>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-900">Manage Role Permissions</span>
                    <span className="text-[10px] text-slate-500">Department heads, budget writers & leads</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>
          </section>
        )}

        {/* =========================================================================
            6. APP METADATA & SIGN OUT
        ========================================================================= */}
        <section className="flex flex-col items-center text-center gap-2.5 pt-2 pb-6">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs text-slate-500 font-semibold">
              3ZERO Campus Hub v2.0 • Sfax Chapter
            </span>
            <span className="text-[11px] text-slate-400">
              Cryptographically Signed by ISIMS • CEC V1.8
            </span>
          </div>

          <button
            onClick={signOut}
            className="w-full max-w-xs py-2.5 px-4 rounded-2xl bg-white hover:bg-rose-50 text-rose-600 text-xs font-bold flex items-center justify-center gap-1.5 border border-rose-200 transition-colors shadow-xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of 3ZERO Workspace</span>
          </button>
        </section>
      </div>
    </AppShell>
  );
}
