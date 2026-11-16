'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/context';
import { Project, ProjectStatus } from '@/types/database.types';
import {
  Rocket,
  Plus,
  Coins,
  Users,
  HeartPulse,
  Flame,
  Calendar,
  Handshake,
  CheckCircle2,
  Lightbulb,
  ArrowRight,
  MoreVertical,
  TreePine,
  Trash2,
  Pencil,
  AlertTriangle,
} from 'lucide-react';
import { canEditProject, canDeleteProject } from '@/lib/permissions/permission-checks';

export default function ProjectsPage() {
  const { user, activeRole, userBureauPositions, projects, addProject, editProject, deleteProject } = useAuth();
  const { t } = useTranslation();
  const [filter, setFilter] = useState<'all' | 'active' | 'planning' | 'completed'>('all');
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('500');
  const [dueDate, setDueDate] = useState('');

  // Edit / Delete Project State
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStatus, setEditStatus] = useState<ProjectStatus>('planning');
  const [editBudget, setEditBudget] = useState('500');
  const [editDueDate, setEditDueDate] = useState('');
  const [editReason, setEditReason] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeletingProject, setIsDeletingProject] = useState(false);

  const permCtx = {
    userId: user?.id,
    email: user?.email,
    role: activeRole,
    bureauPositions: userBureauPositions || [],
    departmentId: (user as any)?.department_id,
  };

  const openEditModal = (p: Project) => {
    setEditingProject(p);
    setEditName(p.name || '');
    setEditDesc(p.description || '');
    setEditStatus(p.status || 'planning');
    setEditBudget(String(p.budget_tnd || 0));
    setEditDueDate(p.due_date || '');
    setEditReason('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editName.trim() || !editReason.trim()) return;

    setIsSavingEdit(true);
    try {
      const updates = {
        name: editName.trim(),
        description: editDesc.trim(),
        status: editStatus,
        budget_tnd: parseFloat(editBudget) || 0,
        due_date: editDueDate || null,
      };

      const res = await editProject(editingProject.id, updates, editReason.trim());
      if (res.success) {
        setEditingProject(null);
      } else {
        alert(res.error || 'Failed to update project');
      }
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingProject || !deleteReason.trim()) return;

    setIsDeletingProject(true);
    try {
      const res = await deleteProject(deletingProject.id, deleteReason.trim());
      if (res.success) {
        setDeletingProject(null);
      } else {
        alert(res.error || 'Failed to delete project');
      }
    } finally {
      setIsDeletingProject(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  const totalBudget = projects.reduce((sum, p) => sum + (Number(p.budget_tnd) || 0), 0);

  const handleProposeProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addProject({
      name: name.trim(),
      description: description.trim() || 'Student climate initiative proposal.',
      status: 'planning',
      budget_tnd: parseFloat(budget) || 0,
      due_date: dueDate || new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
      owner_id: user?.id || 'usr-yassine-001',
      created_by: user?.id || 'usr-yassine-001',
    });

    setName('');
    setDescription('');
    setShowProposeModal(false);
  };

  return (
    <AppShell>
      <div className="pt-4 flex flex-col gap-4 max-w-4xl mx-auto w-full pb-20">
        {/* =========================================================================
            1. TOP ACTION & CONTEXT STRIP (Stitch Screen 2)
        ========================================================================= */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
              <Rocket className="w-5 h-5" />
            </span>
            <div>
              <h1 className="font-extrabold text-lg sm:text-xl text-slate-900">{t('projects.title')}</h1>
              <p className="text-xs text-slate-500">{t('projects.subtitle')}</p>
            </div>
          </div>

          <button
            onClick={() => setShowProposeModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs shadow-md hover:bg-emerald-800 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t('projects.proposeProject')}</span>
          </button>
        </div>

        {/* =========================================================================
            2. PORTFOLIO METRIC BANNER CARD
        ========================================================================= */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#006948] via-[#00855d] to-[#006e2a] text-white p-5 shadow-xl">
          <div className="absolute -right-10 -bottom-10 w-36 h-36 rounded-full bg-emerald-300/20 blur-2xl pointer-events-none"></div>
          <div className="absolute right-4 top-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
            <span className="text-[11px] font-bold tracking-wider uppercase text-white">{t('projects.cycleName')}</span>
          </div>

          <div className="relative z-10 flex flex-col gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-100">
                {t('projects.portfolioTitle')}
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-3xl font-extrabold tracking-tight">{totalBudget.toLocaleString()}</span>
                <span className="text-lg font-bold text-emerald-200">TND Pool</span>
              </div>
            </div>

            {/* Trio Metrics Grid */}
            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-black/20 backdrop-blur-md p-3 text-center">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-emerald-100/80">Contributors</span>
                <span className="text-base sm:text-lg font-extrabold mt-0.5">26</span>
                <span className="text-[10px] text-emerald-300 font-semibold">Active peers</span>
              </div>
              <div className="flex flex-col items-center bg-white/10 rounded-xl py-1">
                <span className="text-[10px] text-emerald-100/80">Club Health</span>
                <span className="text-base sm:text-lg font-extrabold text-emerald-300 mt-0.5">82%</span>
                <span className="text-[10px] text-emerald-100/90 font-semibold">Optimal</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-emerald-100/80">Pipeline</span>
                <span className="text-base sm:text-lg font-extrabold mt-0.5">{projects.length}</span>
                <span className="text-[10px] text-emerald-100/90 font-semibold">Initiatives</span>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            3. CATEGORY FILTER CHIPS
        ========================================================================= */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { key: 'all', label: `${t('projects.filterAll')} (${projects.length})` },
            { key: 'active', label: `${t('projects.filterActive')} (${projects.filter((p) => p.status === 'active').length})` },
            { key: 'planning', label: `${t('projects.filterPlanning')} (${projects.filter((p) => p.status === 'planning').length})` },
            { key: 'completed', label: `${t('projects.filterCompleted')} (${projects.filter((p) => p.status === 'completed').length})` },
          ].map((chip) => (
            <button
              key={chip.key}
              onClick={() => setFilter(chip.key as any)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filter === chip.key
                  ? 'bg-slate-900 text-white font-bold shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* =========================================================================
            4. PROJECTS LISTING
        ========================================================================= */}
        <div className="flex flex-col gap-4">
          {filteredProjects.map((project) => {
            const isFlagship = project.id === 'proj-ecohack';
            const progressPercent =
              project.tasks_count && project.tasks_count > 0
                ? Math.round(((project.completed_tasks_count || 0) / project.tasks_count) * 100)
                : 25;

            return (
              <div
                key={project.id}
                className="rounded-3xl bg-white shadow-sm border border-emerald-900/10 overflow-hidden flex flex-col gap-3 hover:shadow-md transition-shadow"
              >
                {/* Optional Hero Banner for Flagship */}
                {isFlagship && (
                  <div className="relative w-full h-44 overflow-hidden bg-emerald-900">
                    <img
                      src="https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1000&q=80"
                      alt="EcoHack ISIMS Hackathon workspace"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-emerald-800 text-[11px] font-bold shadow-xs">
                        <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        Featured Flagship
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400 text-emerald-950 font-extrabold text-[11px] shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-800 animate-ping"></span>
                        Live In Progress
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
                      <div>
                        <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">
                          48-Hr Student Hackathon
                        </span>
                        <h2 className="text-xl font-extrabold text-white leading-tight">{project.name}</h2>
                      </div>
                      <div className="flex items-center gap-1 bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-xl text-white font-mono text-xs font-bold">
                        <Coins className="w-3.5 h-3.5 text-emerald-300" />
                        {project.budget_tnd} TND
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 sm:p-5 flex flex-col gap-3">
                  {!isFlagship && (
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-100">
                          {project.id === 'proj-greenwall' ? (
                            <TreePine className="w-6 h-6" />
                          ) : (
                            <Rocket className="w-6 h-6" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                                project.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : project.status === 'planning'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {project.status}
                            </span>
                            <span className="text-[10px] font-medium text-slate-500">
                              Budget: {project.budget_tnd} TND
                            </span>
                          </div>
                          <h3 className="font-extrabold text-base text-slate-900 mt-0.5">{project.name}</h3>
                        </div>
                      </div>
                      <button aria-label="Project options" className="text-slate-400 hover:text-slate-600 p-1">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                    {project.description}
                  </p>

                  {/* Progress Section */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-700 font-semibold">Sprint Milestones</span>
                      <span className="text-emerald-800 font-bold">
                        {progressPercent}% ({project.completed_tasks_count || 3} of {project.tasks_count || 8} tasks)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Team Stack & CTA */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-700 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-white">
                          YM
                        </div>
                        <div className="w-7 h-7 rounded-full bg-teal-600 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-white">
                          AM
                        </div>
                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center ring-2 ring-white">
                          +5
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium">Volunteers Active</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {canEditProject(permCtx, project) && (
                        <button
                          onClick={() => openEditModal(project)}
                          className="p-1.5 rounded-xl border border-slate-200 hover:border-emerald-500 bg-white text-slate-700 hover:text-emerald-800 transition-colors shadow-2xs"
                          title="Edit Project"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDeleteProject(permCtx, project) && (
                        <button
                          onClick={() => {
                            setDeletingProject(project);
                            setDeleteReason('');
                          }}
                          className="p-1.5 rounded-xl border border-rose-200 hover:bg-rose-100 bg-rose-50 text-rose-700 transition-colors shadow-2xs"
                          title="Move to Recycle Bin"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <Link
                        href="/tasks"
                        className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-black transition-all active:scale-95 shadow-xs"
                      >
                        <span>Task Board</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* End of List Campus Nudge Message */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/60 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-200 text-emerald-900 flex items-center justify-center shrink-0">
            <Lightbulb className="w-5 h-5 text-emerald-800" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-slate-800 leading-snug">
              Got a green micro-grant idea? Pitch to the <strong>ISIMS 3ZERO Bureau</strong> before Friday 18:00 for cycle allocation.
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          PROPOSE PROJECT MODAL
      ========================================================================= */}
      {showProposeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-emerald-100 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900">Propose Chapter Project</h3>
              <button
                onClick={() => setShowProposeModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProposeProject} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600">Project Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Solar Smart Charging Station"
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">Description & Goals</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Outline the climate impact, student participation, and timeline."
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-600">Budget Pool (TND)</label>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600">Target Completion</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowProposeModal(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 text-white hover:bg-emerald-800"
                >
                  {t('common.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 flex flex-col gap-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Edit Project</h3>
                  <p className="text-[11px] text-slate-500">Tracked modification with audit logging</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex flex-col gap-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700">Project Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Description</label>
                <textarea
                  rows={2}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 font-medium bg-white"
                  >
                    <option value="planning">In Planning</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Budget (TND)</label>
                  <input
                    type="number"
                    value={editBudget}
                    onChange={(e) => setEditBudget(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Due Date</label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 font-medium"
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Reason for Changes *</span>
                  <span className="text-[10px] text-amber-800 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Required Audit Log</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="e.g. Budget increase / Updated delivery roadmap."
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit || !editReason.trim()}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSavingEdit ? 'Saving...' : 'Save & Log Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Project Modal (Soft-delete to Recycle Bin) */}
      {deletingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0 border border-rose-100">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">Move Project to Recycle Bin</h3>
                <p className="text-[11px] text-slate-500">Non-destructive soft-delete with full recovery</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/80 text-rose-950 text-xs flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 font-bold text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Permanent Preservation Guaranteed</span>
              </div>
              <p className="text-[11px] leading-relaxed text-rose-900/80">
                Project <strong>{deletingProject.name}</strong> will be moved to the Recycle Bin. Associated tasks, member contributions, and micro-grant records remain safely preserved and can be restored at any time by an administrator.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Reason for Deletion *</span>
                <span className="text-[10px] text-rose-700 font-semibold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">Required</span>
              </label>
              <textarea
                rows={2}
                required
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="e.g. Budget reallocation / Cycle concluded."
                className="w-full mt-1.5 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-rose-500 font-medium"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingProject(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeletingProject || !deleteReason.trim()}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeletingProject ? 'Deleting...' : 'Move to Recycle Bin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
