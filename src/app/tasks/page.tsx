'use client';

import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { Task, TaskPriority, TaskStatus } from '@/types/database.types';
import {
  CheckCircle,
  Search,
  List,
  Kanban,
  Paperclip,
  MessageSquare,
  Clock,
  Calendar,
  Send,
  SlidersHorizontal,
  ChevronDown,
  Flame,
  Plus,
} from 'lucide-react';

export default function TasksPage() {
  const { user, tasks, toggleTaskDone, addTask } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'urgent' | 'innovation' | 'comms' | 'events' | 'bureau'>('all');
  const [showCompleted, setShowCompleted] = useState(true);
  const [quickInput, setQuickInput] = useState('');
  const [quickDept, setQuickDept] = useState('Training & Innovation');

  // Filter tasks based on search & category
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (selectedFilter === 'urgent') return t.priority === 'urgent';
    if (selectedFilter === 'innovation') return t.department?.slug === 'training-innovation' || t.department?.name.includes('Innovation');
    if (selectedFilter === 'comms') return t.department?.slug === 'comms-media' || t.department?.name.includes('Comms');
    if (selectedFilter === 'events') return t.department?.slug === 'events-logistics' || t.department?.name.includes('Events');
    if (selectedFilter === 'bureau') return t.department?.slug === 'governance' || t.department?.name.includes('Governance');
    return true;
  });

  const inProgressTasks = filteredTasks.filter((t) => t.status === 'in_progress');
  const todoTasks = filteredTasks.filter((t) => t.status === 'todo');
  const completedTasks = filteredTasks.filter((t) => t.status === 'done');
  const urgentCount = tasks.filter((t) => t.priority === 'urgent' && t.status !== 'done').length;

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    addTask({
      title: quickInput.trim(),
      description: 'Quick task assigned from tasks board.',
      status: 'todo',
      priority: 'medium',
      creator_id: user?.id || 'usr-yassine-001',
      due_at: new Date(Date.now() + 86400000 * 3).toISOString(),
    });
    setQuickInput('');
  };

  return (
    <AppShell>
      <div className="pt-4 flex flex-col gap-4 max-w-4xl mx-auto w-full pb-20">
        {/* =========================================================================
            1. OVERVIEW METRIC STRIP (Stitch Screen 5)
        ========================================================================= */}
        <section className="bg-white rounded-2xl p-3 shadow-xs border border-emerald-900/5">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-emerald-50/70 border border-emerald-100">
              <span className="text-xl font-extrabold text-emerald-800 leading-tight">
                {tasks.filter((t) => t.status !== 'done').length}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800/80 mt-0.5">
                Active
              </span>
            </div>
            <div className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-rose-50 border border-rose-100">
              <div className="flex items-center gap-0.5">
                <span className="text-xl font-extrabold text-rose-700 leading-tight">{urgentCount}</span>
                <Flame className="w-4 h-4 text-rose-600 fill-rose-600" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 mt-0.5">
                Urgent
              </span>
            </div>
            <div className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-blue-50/70 border border-blue-100">
              <span className="text-xl font-extrabold text-slate-800 leading-tight">4</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mt-0.5">
                Due Week
              </span>
            </div>
            <div className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-teal-50 border border-teal-100">
              <span className="text-xl font-extrabold text-teal-800 leading-tight">
                {tasks.filter((t) => t.status === 'done').length}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 mt-0.5">
                Done
              </span>
            </div>
          </div>
        </section>

        {/* =========================================================================
            2. SEARCH & SEGMENTED SWITCHER (List vs Board)
        ========================================================================= */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center bg-white px-3 py-2 rounded-xl shadow-xs border border-emerald-900/10">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sprints, tasks, tags..."
                className="w-full bg-transparent border-0 p-0 pl-2 focus:outline-none focus:ring-0 text-slate-900 placeholder:text-slate-400 text-xs font-medium"
              />
            </div>

            {/* Segmented Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl shadow-inner shrink-0">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>List</span>
              </button>
              <button
                onClick={() => setViewMode('board')}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'board'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Kanban className="w-3.5 h-3.5" />
                <span>Board</span>
              </button>
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: 'all', label: 'All' },
              { id: 'urgent', label: 'Urgent 🔥' },
              { id: 'innovation', label: 'Innovation 💡' },
              { id: 'comms', label: 'Comms 📣' },
              { id: 'events', label: 'Events 🎪' },
              { id: 'bureau', label: 'Bureau 🏛️' },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setSelectedFilter(chip.id as any)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  selectedFilter === chip.id
                    ? 'bg-emerald-800 text-white font-bold shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </section>

        {/* =========================================================================
            3. TASK VIEWS (List vs Board)
        ========================================================================= */}
        {viewMode === 'list' ? (
          <div className="flex flex-col gap-5">
            {/* IN PROGRESS SECTION */}
            <section className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                  </span>
                  <h2 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">In Progress</h2>
                </div>
                <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  {inProgressTasks.length} Tasks
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {inProgressTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onToggle={() => toggleTaskDone(task.id)} />
                ))}
                {inProgressTasks.length === 0 && (
                  <div className="p-6 text-center text-xs text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                    No active tasks currently in progress.
                  </div>
                )}
              </div>
            </section>

            {/* TO DO SECTION */}
            <section className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                  <h2 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">To Do</h2>
                </div>
                <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full">
                  {todoTasks.length} Tasks
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {todoTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onToggle={() => toggleTaskDone(task.id)} />
                ))}
              </div>
            </section>

            {/* COMPLETED TASKS COLLAPSIBLE */}
            <section className="flex flex-col gap-2">
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center justify-between p-3 rounded-2xl bg-white border border-emerald-900/5 text-slate-700 hover:text-slate-900 transition-colors shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-900">Completed Tasks</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {completedTasks.length}
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    showCompleted ? 'rotate-0' : '-rotate-90'
                  }`}
                />
              </button>

              {showCompleted && (
                <div className="flex flex-col gap-1.5">
                  {completedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/80 border border-slate-100"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          onClick={() => toggleTaskDone(task.id)}
                          className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0 hover:bg-emerald-700"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs text-slate-500 line-through truncate font-medium">
                          {task.title}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 ml-2">Completed</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          /* KANBAN BOARD VIEW */
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <span className="text-xs font-bold uppercase text-slate-600">To Do ({todoTasks.length})</span>
              </div>
              {todoTasks.map((task) => (
                <TaskCard key={task.id} task={task} onToggle={() => toggleTaskDone(task.id)} isCompact />
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <span className="text-xs font-bold uppercase text-emerald-800">
                  In Progress ({inProgressTasks.length})
                </span>
              </div>
              {inProgressTasks.map((task) => (
                <TaskCard key={task.id} task={task} onToggle={() => toggleTaskDone(task.id)} isCompact />
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <span className="text-xs font-bold uppercase text-teal-700">
                  Done ({completedTasks.length})
                </span>
              </div>
              {completedTasks.map((task) => (
                <TaskCard key={task.id} task={task} onToggle={() => toggleTaskDone(task.id)} isCompact />
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            4. STICKY QUICK ADD TASK BAR (Stitch Floating Bar)
        ========================================================================= */}
        <aside className="fixed bottom-20 lg:bottom-4 left-0 right-0 z-40 max-w-md lg:max-w-xl mx-auto px-4 pointer-events-none">
          <form
            onSubmit={handleQuickAdd}
            className="pointer-events-auto bg-white p-2.5 rounded-2xl shadow-xl border border-emerald-900/10 flex flex-col gap-1.5"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                placeholder="+ Add a quick chapter task..."
                className="flex-1 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600 text-slate-900 placeholder:text-slate-400 text-xs font-medium"
              />
              <button
                type="submit"
                aria-label="Create task"
                className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs active:scale-95 transition-transform hover:bg-emerald-800 shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <span>Assign to:</span>
                {['Innovation', 'Comms', 'Events'].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setQuickDept(d)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors ${
                      quickDept === d ? 'bg-emerald-100 text-emerald-900 font-bold' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <span className="font-mono text-[10px] text-emerald-700">Sprint Backlog</span>
            </div>
          </form>
        </aside>
      </div>
    </AppShell>
  );
}

function TaskCard({ task, onToggle, isCompact = false }: { task: Task; onToggle: () => void; isCompact?: boolean }) {
  const isDone = task.status === 'done';
  const checklistPercent =
    task.checklist_total && task.checklist_total > 0
      ? Math.round(((task.checklist_done || 0) / task.checklist_total) * 100)
      : null;

  return (
    <article className="bg-white rounded-2xl p-4 shadow-xs border border-emerald-900/5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* Top Tag Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {task.department && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              {task.department.name}
            </span>
          )}
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              task.priority === 'urgent'
                ? 'bg-rose-100 text-rose-800 flex items-center gap-0.5'
                : task.priority === 'high'
                ? 'bg-amber-100 text-amber-900'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {task.priority === 'urgent' && <Flame className="w-3 h-3 text-rose-600 fill-rose-600" />}
            {task.priority}
          </span>
        </div>
        {task.due_at && (
          <span className="text-[10px] font-mono text-slate-500 font-semibold flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            {new Date(task.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      {/* Title & Description */}
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          className={`shrink-0 w-5 h-5 rounded-lg border flex items-center justify-center transition-all mt-0.5 ${
            isDone
              ? 'bg-emerald-600 border-emerald-600 text-white'
              : 'border-slate-300 hover:border-emerald-600 bg-white text-transparent'
          }`}
        >
          <CheckCircle className={`w-3.5 h-3.5 ${isDone ? 'opacity-100' : 'opacity-0'}`} />
        </button>
        <div className="flex-1 min-w-0">
          <h3
            className={`text-xs sm:text-sm font-bold text-slate-900 leading-tight ${
              isDone ? 'line-through text-slate-400' : ''
            }`}
          >
            {task.title}
          </h3>
          {task.description && !isCompact && (
            <p className="text-xs text-slate-600 line-clamp-2 mt-1 leading-relaxed">
              {task.description}
            </p>
          )}
        </div>
      </div>

      {/* Checklist Bar */}
      {checklistPercent !== null && !isCompact && (
        <div className="flex flex-col gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-600 font-medium">
              Subtasks Checklist ({task.checklist_done}/{task.checklist_total})
            </span>
            <span className="font-bold text-emerald-700">{checklistPercent}%</span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${checklistPercent}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Footer: Collaborators & Comments */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
        <div className="flex items-center -space-x-1.5">
          <div className="w-6 h-6 rounded-full bg-emerald-700 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-white">
            YM
          </div>
          <div className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-white">
            AM
          </div>
        </div>

        <div className="flex items-center gap-3 text-slate-400 text-xs">
          <div className="flex items-center gap-1 font-medium">
            <Paperclip className="w-3.5 h-3.5" />
            <span>2</span>
          </div>
          <div className="flex items-center gap-1 font-medium">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{task.comments_count || 3}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
