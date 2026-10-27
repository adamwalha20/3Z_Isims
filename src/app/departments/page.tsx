'use client';

import React from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import {
  Layers,
  Users,
  Award,
  Terminal,
  ArrowRight,
  Sparkles,
  CheckCircle,
  FileText,
  Rocket,
} from 'lucide-react';

export default function DepartmentsPage() {
  const { departments, tasks, projects } = useAuth();

  return (
    <AppShell>
      <div className="pt-4 flex flex-col gap-5 max-w-4xl mx-auto w-full pb-20">
        {/* Header Strip */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center shadow-xs">
              <Layers className="w-5 h-5" />
            </span>
            <div>
              <h1 className="font-extrabold text-lg sm:text-xl text-slate-900">Club Departments</h1>
              <p className="text-xs text-slate-500">ISIMS Chapter Operational Divisions & Task Pools</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold font-mono">
            {departments.length} Units Active
          </span>
        </div>

        {/* =========================================================================
            DEPARTMENT SPOTLIGHT: Training & Innovation (from Stitch Design)
        ========================================================================= */}
        <section className="rounded-3xl bg-white p-5 shadow-xs border border-emerald-900/10 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                Department Spotlight
              </span>
            </div>
            <span className="text-xs text-emerald-800 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Level 2 Academic Audit
            </span>
          </div>

          {/* Department Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#014f2e] to-[#007a4b] p-4 text-white flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center shrink-0 border border-white/20">
                <Terminal className="w-6 h-6" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-base sm:text-lg text-white leading-snug truncate">
                  Training & Innovation
                </span>
                <div className="flex items-center gap-1.5 mt-0.5 text-emerald-200 text-xs font-medium">
                  <span>Lead: Amira M.</span>
                  <span>•</span>
                  <span className="text-white font-semibold">ISIMS Sfax</span>
                </div>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-300 text-emerald-950 text-xs font-extrabold shrink-0 shadow-xs">
              4 Projects
            </span>
          </div>

          {/* Department Endorsements & Skills */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600">
              <span>DEPARTMENT PILLARS & TECH</span>
              <span className="text-emerald-700 font-extrabold">5 Endorsed</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                'Zero Carbon Advocate',
                'Flutter / Web',
                'Green AI',
                'IoT Sensor Telemetry',
                'Climate Accounting',
              ].map((skill, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Metrics Counters */}
          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
            <div className="bg-white rounded-xl p-2.5 flex flex-col items-center shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Members</span>
              <span className="font-extrabold text-xl text-slate-900 mt-0.5">18</span>
              <span className="text-[10px] text-emerald-700 font-semibold">Active</span>
            </div>
            <div className="bg-white rounded-xl p-2.5 flex flex-col items-center shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Workshops</span>
              <span className="font-extrabold text-xl text-emerald-600 mt-0.5">3</span>
              <span className="text-[10px] text-slate-500 font-medium">Completed</span>
            </div>
            <div className="bg-white rounded-xl p-2.5 flex flex-col items-center shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Club Rank</span>
              <span className="font-extrabold text-xl text-amber-500 mt-0.5">#4</span>
              <span className="text-[10px] text-slate-500 font-medium">Campus Wide</span>
            </div>
          </div>

          {/* Active Incubated Project Card */}
          <div className="rounded-2xl bg-gradient-to-r from-emerald-50/80 to-teal-50/80 p-3.5 border border-emerald-100 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                Flagship Student Submission
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-emerald-800 text-[10px] font-bold shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Feasibility Review
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm text-slate-900 truncate">Campus Solar Phone Station</span>
                <span className="text-xs text-slate-600 line-clamp-1">
                  Off-grid photovoltaic kiosk outside ISIMS amphitheater
                </span>
              </div>
              <Link
                href="/projects"
                className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 hover:bg-emerald-800 transition-colors shadow-xs"
              >
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* All Departments Grid */}
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-extrabold text-slate-900">All Club Units</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {departments.map((dept) => {
              const deptTasks = tasks.filter((t) => t.department_id === dept.id);
              const deptProjects = projects.filter((p) => p.department_id === dept.id);

              return (
                <div
                  key={dept.id}
                  className="bg-white p-4 rounded-3xl shadow-xs border border-emerald-900/10 flex flex-col justify-between gap-3 hover:border-emerald-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900">{dept.name}</h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{dept.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-600">
                    <span className="font-medium">{deptProjects.length} Projects</span>
                    <span className="font-medium">{deptTasks.length} Assigned Tasks</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[10px]">
                      Active
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
