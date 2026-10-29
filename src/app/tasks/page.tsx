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
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';

export default function TasksPage() {
  const {
    user,
    activeRole,
    isAdmin,
    tasks,
    members,
    toggleTaskDone,
    submitTaskForVerification,
    verifyTask,
    addTask,
  } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'todo' | 'in_progress' | 'waiting_verification' | 'done'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'urgent' | 'high'>('all');

  // Task creation state (Bureau & Admin only)
  const isBureauOrAdmin = activeRole === 'bureau' || activeRole === 'admin' || isAdmin;
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const [newReqVerification, setNewReqVerification] = useState(true);

  // Revision Modal State
  const [rejectModalTask, setRejectModalTask] = useState<Task | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');

  // Check if task is assigned to current user
  const isMyTask = (t: Task) =>
    t.assignees?.some((a) => a.id === user?.id) || t.creator_id === user?.id;

  // Filter tasks based on role, search & status filters
  const filteredTasks = tasks.filter((t) => {
    // Ordinary members only see tasks assigned to them or created for them
    if (activeRole === 'member' && !isAdmin) {
      if (!isMyTask(t)) return false;
    }

    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (priorityFilter === 'urgent' && t.priority !== 'urgent') return false;
    if (priorityFilter === 'high' && t.priority !== 'high' && t.priority !== 'urgent') return false;

    if (selectedFilter !== 'all' && t.status !== selectedFilter) return false;

    return true;
  });

  const todoTasks = filteredTasks.filter((t) => t.status === 'todo');
  const inProgressTasks = filteredTasks.filter((t) => t.status === 'in_progress');
  const waitingTasks = filteredTasks.filter((t) => t.status === 'waiting_verification');
  const completedTasks = filteredTasks.filter((t) => t.status === 'done');
  const urgentCount = filteredTasks.filter((t) => t.priority === 'urgent' && t.status !== 'done').length;

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBureauOrAdmin || !newTitle.trim()) return;

    const assignedMember = members.find((m) => m.id === newAssigneeId);

    addTask({
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      status: 'todo',
      priority: newPriority,
      creator_id: user?.id || 'usr-default',
      assignees: assignedMember ? [assignedMember] : (user ? [user] : []),
      requires_verification: newReqVerification,
      due_at: new Date(Date.now() + 86400000 * 3).toISOString(),
    });

    setNewTitle('');
    setNewDesc('');
    setNewAssigneeId('');
    setShowCreateModal(false);
  };

  return (
    <AppShell>
      <div className="pt-4 flex flex-col gap-4 max-w-4xl mx-auto w-full pb-20">
        {/* =========================================================================
            1. OVERVIEW METRICS STRIP
        ========================================================================= */}
        <section className="bg-white rounded-2xl p-3 shadow-xs border border-emerald-900/5">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-emerald-50/70 border border-emerald-100">
              <span className="text-xl font-extrabold text-emerald-800 leading-tight">
                {filteredTasks.filter((t) => t.status !== 'done').length}
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
            <div className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-amber-50 border border-amber-100">
              <span className="text-xl font-extrabold text-amber-800 leading-tight">
                {waitingTasks.length}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 mt-0.5">
                In Review
              </span>
            </div>
            <div className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-teal-50 border border-teal-100">
              <span className="text-xl font-extrabold text-teal-800 leading-tight">
                {completedTasks.length}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 mt-0.5">
                Verified Done
              </span>
            </div>
          </div>
        </section>

        {/* =========================================================================
            2. SEARCH, SEGMENTED SWITCHER & TASK CREATION BUTTON
        ========================================================================= */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center bg-white px-3 py-2 rounded-xl shadow-xs border border-emerald-900/10">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search assigned tasks, topics..."
                className="w-full bg-transparent border-0 p-0 pl-2 focus:outline-none focus:ring-0 text-slate-900 placeholder:text-slate-400 text-xs font-medium"
              />
            </div>

            {/* Segmented Switcher (List vs Board) */}
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

            {/* Task Creation Button: Strictly Bureau & Admin Only */}
            {isBureauOrAdmin && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-3 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 hover:bg-emerald-800 shrink-0 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Task</span>
              </button>
            )}
          </div>

          {/* Simple Filters: All, To do, In progress, Waiting for verification, Completed */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedFilter === 'all'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              All Tasks ({tasks.length})
            </button>
            <button
              onClick={() => setSelectedFilter('todo')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedFilter === 'todo'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              To Do ({todoTasks.length})
            </button>
            <button
              onClick={() => setSelectedFilter('in_progress')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedFilter === 'in_progress'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              In Progress ({inProgressTasks.length})
            </button>
            <button
              onClick={() => setSelectedFilter('waiting_verification')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedFilter === 'waiting_verification'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
              }`}
            >
              Waiting for Verification ({waitingTasks.length})
            </button>
            <button
              onClick={() => setSelectedFilter('done')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedFilter === 'done'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Completed ({completedTasks.length})
            </button>
          </div>
        </section>

        {/* =========================================================================
            3. TASKS CONTENT (LIST vs KANBAN)
        ========================================================================= */}
        {viewMode === 'list' ? (
          <div className="flex flex-col gap-2.5">
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  isBureauOrAdmin={isBureauOrAdmin}
                  currentUserId={user?.id}
                  onSubmit={() => submitTaskForVerification(task.id)}
                  onApprove={() => verifyTask(task.id, true)}
                  onReject={() => setRejectModalTask(task)}
                />
              ))
            ) : (
              <div className="p-10 bg-white rounded-3xl border border-slate-100 text-center text-slate-400 text-xs">
                No tasks found in this section.
              </div>
            )}
          </div>
        ) : (
          /* KANBAN BOARD VIEW */
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Column 1: To Do */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                  To Do ({todoTasks.length})
                </span>
              </div>
              {todoTasks.map((task) => (
                <TaskBoardCard
                  key={task.id}
                  task={task}
                  isBureauOrAdmin={isBureauOrAdmin}
                  onSubmit={() => submitTaskForVerification(task.id)}
                />
              ))}
            </div>

            {/* Column 2: In Progress */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                <span className="text-xs font-extrabold uppercase tracking-wider text-blue-700">
                  In Progress ({inProgressTasks.length})
                </span>
              </div>
              {inProgressTasks.map((task) => (
                <TaskBoardCard
                  key={task.id}
                  task={task}
                  isBureauOrAdmin={isBureauOrAdmin}
                  onSubmit={() => submitTaskForVerification(task.id)}
                />
              ))}
            </div>

            {/* Column 3: Waiting Verification */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-700">
                  In Review ({waitingTasks.length})
                </span>
              </div>
              {waitingTasks.map((task) => (
                <TaskBoardCard
                  key={task.id}
                  task={task}
                  isBureauOrAdmin={isBureauOrAdmin}
                  onApprove={() => verifyTask(task.id, true)}
                  onReject={() => setRejectModalTask(task)}
                />
              ))}
            </div>

            {/* Column 4: Completed */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                <span className="text-xs font-extrabold uppercase tracking-wider text-teal-800">
                  Completed ({completedTasks.length})
                </span>
              </div>
              {completedTasks.map((task) => (
                <TaskBoardCard key={task.id} task={task} isBureauOrAdmin={isBureauOrAdmin} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          REVISION / REJECTION FEEDBACK MODAL
      ========================================================================= */}
      {rejectModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col gap-4">
            <h3 className="font-extrabold text-sm text-slate-900">Task Revision Request</h3>
            <p className="text-xs text-slate-500">
              Provide feedback for <strong className="text-slate-800">{rejectModalTask.title}</strong> so the assigned member can revise the work.
            </p>
            <textarea
              rows={3}
              required
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              placeholder="e.g. Please format the presentation slides using club template."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModalTask(null)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await verifyTask(rejectModalTask.id, false, rejectionNote);
                  setRejectModalTask(null);
                  setRejectionNote('');
                }}
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700"
              >
                Send Revision
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TASK CREATION MODAL (Strictly Bureau Officers & Admins only)
      ========================================================================= */}
      {showCreateModal && isBureauOrAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900">Create & Assign Chapter Task</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 font-bold text-xs">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Task Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Prepare Hackathon mentor briefing pack"
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Description</label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Task instructions and deliverables..."
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full mt-1 px-2.5 py-2 text-xs rounded-xl border border-slate-200"
                  >
                    <option value="low">Low (10 XP)</option>
                    <option value="medium">Medium (10 XP)</option>
                    <option value="high">High (20 XP)</option>
                    <option value="urgent">Urgent 🔥 (20 XP)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Assign Member</label>
                  <select
                    value={newAssigneeId}
                    onChange={(e) => setNewAssigneeId(e.target.value)}
                    className="w-full mt-1 px-2.5 py-2 text-xs rounded-xl border border-slate-200"
                  >
                    <option value="">Select member...</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} ({m.student_id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  id="req_verify"
                  checked={newReqVerification}
                  onChange={(e) => setNewReqVerification(e.target.checked)}
                  className="rounded text-emerald-700"
                />
                <label htmlFor="req_verify" className="text-xs text-slate-700 font-medium cursor-pointer">
                  Require verification before awarding XP
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 text-white hover:bg-emerald-800"
                >
                  Create & Assign Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

// ==============================================================================
// Task List Item Component
// ==============================================================================

function TaskListItem({
  task,
  isBureauOrAdmin,
  currentUserId,
  onSubmit,
  onApprove,
  onReject,
}: {
  task: Task;
  isBureauOrAdmin: boolean;
  currentUserId?: string;
  onSubmit: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const isDone = task.status === 'done';
  const isWaiting = task.status === 'waiting_verification';

  return (
    <div className="bg-white p-4 rounded-2xl border border-emerald-900/10 flex items-start justify-between gap-3 shadow-xs hover:border-emerald-300 transition-colors">
      <div className="flex items-start gap-3 min-w-0">
        <button
          onClick={() => {
            if (!isDone && !isWaiting) onSubmit();
          }}
          disabled={isWaiting || isDone}
          className={`mt-0.5 w-6 h-6 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
            isDone
              ? 'bg-emerald-600 border-emerald-600 text-white'
              : isWaiting
              ? 'bg-amber-50 border-amber-300 text-amber-700'
              : 'border-slate-300 hover:border-emerald-600 bg-white text-slate-400'
          }`}
        >
          {isDone ? (
            <CheckCircle className="w-4 h-4 text-white" />
          ) : isWaiting ? (
            <Clock className="w-3.5 h-3.5 animate-pulse text-amber-600" />
          ) : (
            <span className="text-[10px] font-bold">✓</span>
          )}
        </button>

        <div className="flex flex-col min-w-0">
          <span
            className={`text-xs sm:text-sm font-bold text-slate-900 leading-snug ${
              isDone ? 'line-through text-slate-400' : ''
            }`}
          >
            {task.title}
          </span>

          {task.description && (
            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{task.description}</p>
          )}

          {task.rejection_reason && (
            <div className="mt-1.5 p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[10px] font-medium">
              <span className="font-bold">Revision requested:</span> {task.rejection_reason}
            </div>
          )}

          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                task.priority === 'urgent'
                  ? 'bg-rose-100 text-rose-800'
                  : task.priority === 'high'
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {task.priority}
            </span>

            {task.due_at && (
              <span className="font-mono text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                {new Date(task.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            )}

            {task.xp_awarded && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                +XP Awarded
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Area */}
      <div className="shrink-0 flex items-center gap-1.5">
        {isWaiting ? (
          isBureauOrAdmin ? (
            <div className="flex items-center gap-1">
              <button
                onClick={onReject}
                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold"
              >
                Revise
              </button>
              <button
                onClick={onApprove}
                className="px-3 py-1 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Approve</span>
              </button>
            </div>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
              In Review
            </span>
          )
        ) : isDone ? (
          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
            Done
          </span>
        ) : (
          <button
            onClick={onSubmit}
            className="px-3 py-1 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold transition-colors shadow-xs"
          >
            Mark as Done
          </button>
        )}
      </div>
    </div>
  );
}

// ==============================================================================
// Task Board Card Component (Kanban)
// ==============================================================================

function TaskBoardCard({
  task,
  isBureauOrAdmin,
  onSubmit,
  onApprove,
  onReject,
}: {
  task: Task;
  isBureauOrAdmin: boolean;
  onSubmit?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  const isDone = task.status === 'done';
  const isWaiting = task.status === 'waiting_verification';

  return (
    <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between gap-2">
      <div>
        <div className="flex items-center justify-between">
          <span
            className={`px-1.5 py-0.2 rounded-md text-[9px] font-bold ${
              task.priority === 'urgent'
                ? 'bg-rose-100 text-rose-800'
                : task.priority === 'high'
                ? 'bg-amber-100 text-amber-900'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {task.priority}
          </span>
          {task.due_at && (
            <span className="text-[9px] font-mono text-slate-400">
              {new Date(task.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>

        <h4 className={`font-bold text-xs text-slate-900 mt-1.5 ${isDone ? 'line-through text-slate-400' : ''}`}>
          {task.title}
        </h4>
        {task.description && (
          <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{task.description}</p>
        )}
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[9px] font-bold text-slate-400 uppercase">
          {task.status.replace('_', ' ')}
        </span>

        {isWaiting && isBureauOrAdmin && onApprove ? (
          <div className="flex gap-1">
            {onReject && (
              <button onClick={onReject} className="text-[9px] font-bold text-slate-500 hover:text-slate-700">
                Revise
              </button>
            )}
            <button onClick={onApprove} className="text-[9px] font-bold text-emerald-700 hover:underline">
              Approve
            </button>
          </div>
        ) : !isDone && !isWaiting && onSubmit ? (
          <button onClick={onSubmit} className="text-[10px] font-bold text-emerald-700 hover:underline">
            Submit Done
          </button>
        ) : null}
      </div>
    </div>
  );
}
