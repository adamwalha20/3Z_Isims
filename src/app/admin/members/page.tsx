'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/context';
import { getSafeAvatar } from '@/lib/constants/avatars';
import {
  UserCheck,
  Check,
  X,
  ArrowLeft,
  Search,
  ShieldAlert,
  Lock,
  CheckCircle2,
  Mail,
  GraduationCap,
  Users,
  UserX,
  PauseCircle,
  PlayCircle,
  Trash2,
  History,
  Eye,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Award,
} from 'lucide-react';
import { isSuperAdminEmail } from '@/lib/constants/auth';
import { canManageMembers, canRemoveMember, canSuspendMember, canReactivateMember, canDeleteMemberAccount } from '@/lib/permissions/permission-checks';
import { formatTunisDate } from '@/lib/email/timezone-utils';

export default function AdminMembersManagementPage() {
  const {
    user,
    isAdmin,
    activeRole,
    members,
    departments,
    auditLogs,
    approveMembership,
    rejectMembership,
    removeMember,
    suspendMember,
    reactivateMember,
    deleteMemberAccount,
  } = useAuth();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'suspended' | 'removed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Dialog & Modal States
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [actionType, setActionType] = useState<'remove' | 'suspend' | 'reactivate' | 'delete' | 'history' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Authorization check (Admin, HR Manager, President, Secretary General)
  const isSuperAdmin = isSuperAdminEmail(user?.email);
  const isAuthorized = isAdmin || activeRole === 'admin' || isSuperAdmin || activeRole === 'bureau';

  const permCtx = {
    userId: user?.id,
    email: user?.email,
    role: isAdmin ? 'admin' : activeRole,
  };

  const pendingMembers = useMemo(() => {
    return members.filter((m) => m.membership?.membership_status === 'pending');
  }, [members]);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const status = m.membership?.membership_status || 'active';
      if (activeTab === 'pending' && status !== 'pending') return false;
      if (activeTab === 'suspended' && status !== 'suspended') return false;
      if (activeTab === 'removed' && status !== 'removed') return false;
      if (activeTab === 'all' && status === 'removed') return false; // Hide removed from main active view

      if (departmentFilter !== 'all' && m.department_id !== departmentFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = m.full_name?.toLowerCase().includes(q);
        const matchEmail = m.email?.toLowerCase().includes(q);
        const matchMatricule = m.student_id?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchMatricule) return false;
      }

      return true;
    });
  }, [members, activeTab, departmentFilter, searchQuery]);

  const handleApprove = async (id: string, name: string) => {
    setFeedback(null);
    const res = await approveMembership(id);
    if (res.success) {
      setFeedback({ text: `Approved ${name}. Student matricule verified & portal access granted!`, type: 'success' });
    } else {
      setFeedback({ text: res.error || 'Failed to approve member.', type: 'error' });
    }
  };

  const handleReject = async (id: string, name: string) => {
    setFeedback(null);
    const res = await rejectMembership(id);
    if (res.success) {
      setFeedback({ text: `Application suspended for ${name}.`, type: 'success' });
    } else {
      setFeedback({ text: res.error || 'Failed to update application.', type: 'error' });
    }
  };

  const handleExecuteMemberAction = async () => {
    if (!selectedMember || !actionType) return;

    if ((actionType === 'remove' || actionType === 'suspend' || actionType === 'delete') && !actionReason.trim()) {
      alert(t('admin.provideReason'));
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      if (actionType === 'remove') {
        const res = await removeMember(selectedMember.id, actionReason.trim());
        if (res.success) {
          setFeedback({ text: t('admin.memberRemoved'), type: 'success' });
          closeActionModal();
        } else {
          setFeedback({ text: res.error || 'Failed to remove member.', type: 'error' });
        }
      } else if (actionType === 'suspend') {
        const res = await suspendMember(selectedMember.id, actionReason.trim());
        if (res.success) {
          setFeedback({ text: t('admin.memberSuspended'), type: 'success' });
          closeActionModal();
        } else {
          setFeedback({ text: res.error || 'Failed to suspend member.', type: 'error' });
        }
      } else if (actionType === 'reactivate') {
        const res = await reactivateMember(selectedMember.id, actionReason.trim() || undefined);
        if (res.success) {
          setFeedback({ text: t('admin.memberReactivated'), type: 'success' });
          closeActionModal();
        } else {
          setFeedback({ text: res.error || 'Failed to reactivate member.', type: 'error' });
        }
      } else if (actionType === 'delete') {
        const res = await deleteMemberAccount(selectedMember.id, actionReason.trim(), false);
        if (res.success) {
          setFeedback({ text: t('admin.memberDeleted'), type: 'success' });
          closeActionModal();
        } else {
          setFeedback({ text: res.error || 'Failed to delete member account.', type: 'error' });
        }
      }
    } catch (e: any) {
      setFeedback({ text: e?.message || 'Error executing member operation.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeActionModal = () => {
    setSelectedMember(null);
    setActionType(null);
    setActionReason('');
  };

  // Member audit history items
  const memberHistoryLogs = useMemo(() => {
    if (!selectedMember) return [];
    return auditLogs.filter(
      (log) => log.entity_id === selectedMember.id || log.details?.includes(selectedMember.full_name)
    );
  }, [auditLogs, selectedMember]);

  if (!isAuthorized) {
    return (
      <AppShell>
        <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-base font-extrabold text-slate-900">Access Restricted</h2>
          <p className="text-xs text-slate-500 max-w-sm">
            Member management and HR controls require Human Resources or Administrator privileges.
          </p>
          <div className="mt-2 text-[11px] font-mono text-slate-400">Current account: {user?.email || 'Guest'}</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="pt-4 flex flex-col gap-5 max-w-5xl mx-auto w-full pb-24">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="p-2 rounded-xl bg-white text-slate-600 hover:text-slate-900 shadow-xs border border-slate-200"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="font-black text-lg sm:text-xl text-slate-900 tracking-tight flex items-center gap-2">
                <span>{t('admin.hrTitle')}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </h1>
              <p className="text-xs text-slate-500">{t('admin.hrSubtitle')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/recycle-bin"
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-500" />
              <span>{t('admin.recycleBin')}</span>
            </Link>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold font-mono">
              {members.length} REGISTERED
            </span>
          </div>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between border shadow-xs animate-in fade-in duration-200 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab Switcher & Search Bar */}
        <div className="bg-white rounded-3xl p-4 border border-emerald-900/10 shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="inline-flex p-1 bg-slate-100 rounded-2xl text-xs font-bold">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3.5 py-1.5 rounded-xl transition-all ${
                  activeTab === 'all' ? 'bg-emerald-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Active ({members.filter((m) => m.membership?.membership_status !== 'removed').length})
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-3.5 py-1.5 rounded-xl transition-all ${
                  activeTab === 'pending' ? 'bg-emerald-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pending ({pendingMembers.length})
              </button>
              <button
                onClick={() => setActiveTab('suspended')}
                className={`px-3.5 py-1.5 rounded-xl transition-all ${
                  activeTab === 'suspended' ? 'bg-emerald-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Suspended ({members.filter((m) => m.membership?.membership_status === 'suspended').length})
              </button>
              <button
                onClick={() => setActiveTab('removed')}
                className={`px-3.5 py-1.5 rounded-xl transition-all ${
                  activeTab === 'removed' ? 'bg-emerald-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Removed ({members.filter((m) => m.membership?.membership_status === 'removed').length})
              </button>
            </div>

            {/* Department Filter */}
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, email, or university matricule..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-700"
            />
          </div>
        </div>

        {/* Members Cards / Table */}
        <div className="flex flex-col gap-3">
          {filteredMembers.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200 flex flex-col items-center gap-2">
              <Users className="w-8 h-8 text-slate-300" />
              <span className="text-xs font-bold text-slate-600">No members match your criteria.</span>
            </div>
          ) : (
            filteredMembers.map((m) => {
              const status = m.membership?.membership_status || 'active';
              const isTargetAdmin = isSuperAdminEmail(m.email);
              const deptName = departments.find((d) => d.id === m.department_id)?.name || 'General Member';

              return (
                <div
                  key={m.id}
                  className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-emerald-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  {/* Left: Info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={getSafeAvatar(m.avatar_path)}
                      alt={m.full_name}
                      className="w-12 h-12 rounded-2xl object-cover ring-2 ring-emerald-500/80 shrink-0"
                    />

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-slate-900 truncate">{m.full_name}</span>
                        {isTargetAdmin && (
                          <span className="px-2 py-0.2 rounded-full bg-rose-100 text-rose-800 text-[10px] font-extrabold">
                            Admin
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                            status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : status === 'suspended'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {status.toUpperCase()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                        <span className="font-mono text-slate-600 font-semibold">{m.student_id}</span>
                        <span>•</span>
                        <span className="truncate">{m.email}</span>
                        <span>•</span>
                        <span className="text-emerald-800 font-medium truncate">{deptName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    {/* Pending Approvals Actions */}
                    {status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(m.id, m.full_name)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleReject(m.id, m.full_name)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-bold text-xs flex items-center gap-1 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}

                    {/* Member History Modal Trigger */}
                    <button
                      onClick={() => {
                        setSelectedMember(m);
                        setActionType('history');
                      }}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
                      title={t('admin.viewHistory')}
                    >
                      <History className="w-4 h-4" />
                    </button>

                    {/* HR Management Actions (for non-pending members) */}
                    {status === 'active' && !isTargetAdmin && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedMember(m);
                            setActionType('suspend');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs transition-colors flex items-center gap-1"
                          title={t('admin.suspendAccess')}
                        >
                          <PauseCircle className="w-3.5 h-3.5" />
                          <span>Suspend</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedMember(m);
                            setActionType('remove');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors flex items-center gap-1"
                          title={t('admin.removeFromClub')}
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </>
                    )}

                    {status === 'suspended' && (
                      <button
                        onClick={() => {
                          setSelectedMember(m);
                          setActionType('reactivate');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition-colors flex items-center gap-1"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>Reactivate</span>
                      </button>
                    )}

                    {status === 'removed' && (
                      <button
                        onClick={() => {
                          setSelectedMember(m);
                          setActionType('reactivate');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition-colors flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reinstate</span>
                      </button>
                    )}

                    {/* Delete Account (Soft Delete to Recycle Bin) */}
                    {!isTargetAdmin && (
                      <button
                        onClick={() => {
                          setSelectedMember(m);
                          setActionType('delete');
                        }}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                        title={t('admin.deleteAccount')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* =========================================================================
            ACTION CONFIRMATION & JUSTIFICATION MODAL
        ========================================================================= */}
        {selectedMember && actionType && actionType !== 'history' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      actionType === 'delete' || actionType === 'remove'
                        ? 'bg-rose-100 text-rose-700'
                        : actionType === 'suspend'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {actionType === 'delete' ? (
                      <Trash2 className="w-4 h-4" />
                    ) : actionType === 'remove' ? (
                      <UserX className="w-4 h-4" />
                    ) : actionType === 'suspend' ? (
                      <PauseCircle className="w-4 h-4" />
                    ) : (
                      <PlayCircle className="w-4 h-4" />
                    )}
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    {actionType === 'remove'
                      ? t('admin.confirmRemove')
                      : actionType === 'suspend'
                      ? t('admin.confirmSuspend')
                      : actionType === 'reactivate'
                      ? t('admin.reactivateMember')
                      : t('admin.confirmDelete')}
                  </h3>
                </div>

                <button onClick={closeActionModal} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Target info card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <img
                  src={getSafeAvatar(selectedMember.avatar_path)}
                  alt={selectedMember.full_name}
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-emerald-500"
                />
                <div className="flex flex-col min-w-0 text-xs">
                  <span className="font-bold text-slate-900 truncate">{selectedMember.full_name}</span>
                  <span className="text-[11px] font-mono text-slate-500">{selectedMember.student_id}</span>
                  <span className="text-[10px] text-slate-400">{selectedMember.email}</span>
                </div>
              </div>

              {/* Retained Data Notice */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900">
                <p className="font-semibold">{t('admin.retainedDataNotice')}</p>
              </div>

              {/* Reason input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">
                  {t('admin.provideReason')} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="e.g. End of mandate, lack of participation, policy violation..."
                  rows={3}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  onClick={closeActionModal}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>

                <button
                  onClick={handleExecuteMemberAction}
                  disabled={isSubmitting}
                  className={`px-4 py-2 rounded-xl text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 ${
                    actionType === 'delete' || actionType === 'remove'
                      ? 'bg-rose-700 hover:bg-rose-800'
                      : actionType === 'suspend'
                      ? 'bg-purple-700 hover:bg-purple-800'
                      : 'bg-emerald-700 hover:bg-emerald-800'
                  }`}
                >
                  <span>Confirm Action</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            MEMBER HISTORY & PREVIOUS ACTIONS MODAL
        ========================================================================= */}
        {selectedMember && actionType === 'history' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">{t('admin.viewHistory')}</h3>
                    <span className="text-[11px] text-slate-500">{selectedMember.full_name}</span>
                  </div>
                </div>

                <button onClick={closeActionModal} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Member Overview Mini-Card */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Status</span>
                  <span className="font-bold text-slate-900 capitalize">
                    {selectedMember.membership?.membership_status || 'active'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Joined Date</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {formatTunisDate(selectedMember.membership?.joined_at || selectedMember.created_at)}
                  </span>
                </div>
              </div>

              {/* History Timeline */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-900">Recorded Administrative Actions</span>
                {memberHistoryLogs.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    No disciplinary or administrative actions logged for this member yet.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {memberHistoryLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-900">{log.action}</span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {formatTunisDate(log.created_at)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600">{log.details || log.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 text-right">
                <button
                  onClick={closeActionModal}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
