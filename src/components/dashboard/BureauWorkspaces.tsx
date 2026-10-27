'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth, ActiveBureauPosition } from '@/lib/auth-context';
import {
  Shield,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Share2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  Sparkles,
  TreePine,
  Recycle,
  Zap,
  Clock,
  Layers,
  Award,
  ExternalLink,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Partner, FinancialTransaction, MarketingCampaign, SustainabilityInitiative, Decision, RecruitmentApplication } from '@/types/database.types';

// ==============================================================================
// 1. POSITION SELECTION TABS
// ==============================================================================

export function BureauPositionSelector() {
  const { activeBureauPosition, setActiveBureauPosition, bureauMembers } = useAuth();

  const positions: { key: ActiveBureauPosition; label: string; icon: string; member: string }[] = [
    { key: 'all', label: 'All Operations', icon: 'dashboard', member: 'Global Bureau View' },
    { key: 'vice_president', label: 'Vice President', icon: 'shield_with_heart', member: 'Heba Sanaa' },
    { key: 'secretary_general', label: 'Secretary General', icon: 'history_edu', member: 'Nawress' },
    { key: 'treasurer', label: 'Treasurer', icon: 'payments', member: 'Ahmed Bahri' },
    { key: 'hr_manager', label: 'HR Manager', icon: 'badge', member: 'Med Aziz Turky' },
    { key: 'marketing_design_manager', label: 'Marketing & Design', icon: 'palette', member: 'Sa' },
    { key: 'sustainable_campus_manager', label: 'Sustainable Campus', icon: 'eco', member: 'Oussema' },
    { key: 'communication_engagement_manager', label: 'Comms & Engagement', icon: 'campaign', member: 'drvcou' },
    { key: 'events_manager', label: 'Events Manager', icon: 'event', member: 'Chaima Besbes' },
    { key: 'project_manager', label: 'Project Manager', icon: 'rocket_launch', member: 'Ayoub' },
    { key: 'partnerships_sponsorship_manager', label: 'Partnerships', icon: 'handshake', member: 'Sponsor Lead' },
  ];

  return (
    <div className="w-full flex flex-col gap-2 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-700 text-[20px]">switch_account</span>
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
            Bureau Officer Workspace Views
          </span>
        </div>
        <span className="text-[11px] font-medium text-slate-500 hidden sm:inline">
          Switch view to access dedicated role cockpit
        </span>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 no-scrollbar">
        {positions.map((pos) => {
          const isSelected = activeBureauPosition === pos.key;
          return (
            <button
              key={pos.key}
              onClick={() => setActiveBureauPosition(pos.key)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 border ${
                isSelected
                  ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
              }`}
            >
              <span
                className="material-symbols-outlined text-[16px]"
                style={isSelected ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {pos.icon}
              </span>
              <span>{pos.label}</span>
              {pos.key !== 'all' && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-normal ${isSelected ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-100 text-slate-500'}`}>
                  {pos.member.split(' ')[0]}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ==============================================================================
// 2. VICE PRESIDENT COCKPIT (Heba Sanaa)
// ==============================================================================

export function VicePresidentCockpit() {
  const { tasks, projects, decisions, addDecision } = useAuth();
  const [showCoordModal, setShowCoordModal] = useState(false);

  const overdue = tasks.filter((t) => t.priority === 'urgent' && t.status !== 'done');
  const unresolvedDecisions = decisions.filter((d) => d.status === 'under_execution');

  return (
    <div className="p-5 bg-gradient-to-br from-white to-emerald-50/40 rounded-3xl border border-emerald-900/10 shadow-sm flex flex-col gap-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-emerald-900/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-800 text-white flex items-center justify-center font-bold shadow-xs">
            <span className="material-symbols-outlined text-[22px]">shield_with_heart</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-sm text-slate-900">Vice President Operational Oversight</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                Heba Sanaa
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Cross-department execution, bottleneck mitigation & executive decisions</p>
          </div>
        </div>

        <button
          onClick={() => setShowCoordModal(true)}
          className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Executive Follow-up</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Metric 1 */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Overdue Bottlenecks</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-rose-600">{overdue.length}</span>
            <span className="text-[11px] font-bold text-rose-700">Urgent Tasks</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Requires VP coordination intervention</span>
        </div>

        {/* Metric 2 */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Decisions Under Execution</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-800">{unresolvedDecisions.length}</span>
            <span className="text-[11px] font-bold text-emerald-700">Active Mandates</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">From Assembly meeting resolutions</span>
        </div>

        {/* Metric 3 */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Active Department Units</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900">5 / 5</span>
            <span className="text-[11px] font-bold text-slate-600">Sync Healthy</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Zero communication deadlocks</span>
        </div>
      </div>

      {/* Decisions Tracking List */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold text-slate-800">Assembly Mandates Tracking</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {decisions.map((dec) => (
            <div key={dec.id} className="p-3 bg-white rounded-2xl border border-slate-100 flex items-start justify-between gap-2 shadow-xs">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-slate-900">{dec.title}</span>
                <span className="text-[10px] text-slate-500 line-clamp-1">{dec.details}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${
                dec.status === 'adopted' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {dec.status.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==============================================================================
// 3. TREASURER WORKSPACE (Ahmed Bahri)
// ==============================================================================

export function TreasurerCockpit() {
  const { transactions, budgets, addTransaction, approveTransaction } = useAuth();
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<any>('logistics');
  const [desc, setDesc] = useState('');

  const totalIncome = transactions
    .filter((t) => t.transaction_type === 'income' && t.approval_status === 'approved')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const totalExpense = transactions
    .filter((t) => t.transaction_type === 'expense' && t.approval_status === 'approved')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const netBalance = totalIncome - totalExpense;
  const pendingApprovals = transactions.filter((t) => t.approval_status === 'pending');

  const handleRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !desc) return;
    addTransaction({
      amount: parseFloat(amount),
      currency: 'TND',
      transaction_type: txType,
      category,
      description: desc,
      date: new Date().toISOString().split('T')[0],
      approval_status: 'approved',
    });
    setAmount('');
    setDesc('');
    setShowAddTxModal(false);
  };

  return (
    <div className="p-5 bg-gradient-to-br from-white to-amber-50/30 rounded-3xl border border-amber-900/15 shadow-sm flex flex-col gap-5 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-amber-900/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-700 text-white flex items-center justify-center font-bold shadow-xs">
            <span className="material-symbols-outlined text-[22px]">payments</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-sm text-slate-900">Treasury & Financial Workspace</h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                Ahmed Bahri
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Club accounts, budget periods, cash flow & expense verification</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddTxModal(true)}
          className="px-3.5 py-1.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Record Transaction (TND)</span>
        </button>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Inflows</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-black text-emerald-700 mt-1">
            +{totalIncome.toFixed(2)} <span className="text-xs font-bold text-slate-500">TND</span>
          </span>
          <span className="text-[10px] text-slate-400 mt-1">Sponsorships & council grants</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Outflows</span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <span className="text-2xl font-black text-rose-600 mt-1">
            -{totalExpense.toFixed(2)} <span className="text-xs font-bold text-slate-500">TND</span>
          </span>
          <span className="text-[10px] text-slate-400 mt-1">Event print, logistics & catering</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-emerald-300 shadow-xs flex flex-col bg-gradient-to-br from-white to-emerald-50/50">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Net Cash Position</span>
            <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
          </div>
          <span className="text-2xl font-black text-slate-900 mt-1">
            {netBalance.toFixed(2)} <span className="text-xs font-bold text-emerald-700">TND</span>
          </span>
          <span className="text-[10px] text-emerald-800 font-semibold mt-1">Audited University Account</span>
        </div>
      </div>

      {/* Pending Reviews Queue if any */}
      {pendingApprovals.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-bold text-amber-900">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-700" />
              <span>Pending Expense Approvals ({pendingApprovals.length})</span>
            </div>
            <span className="text-[10px] font-normal text-amber-700">Requires Treasurer sign-off</span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {pendingApprovals.map((tx) => (
              <div key={tx.id} className="p-2.5 bg-white rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900">{tx.description}</span>
                  <div className="text-[10px] text-slate-500">{tx.category} • {tx.date}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-black text-rose-600">{tx.amount} TND</span>
                  <button
                    onClick={() => approveTransaction(tx.id, 'approved')}
                    className="px-2 py-1 rounded-md bg-emerald-700 text-white font-bold text-[10px] hover:bg-emerald-800"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => approveTransaction(tx.id, 'rejected')}
                    className="px-2 py-1 rounded-md bg-slate-200 text-slate-700 font-bold text-[10px] hover:bg-slate-300"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Ledger */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold text-slate-800">Recent Financial Ledger</span>
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="divide-y divide-slate-100">
            {transactions.slice(0, 4).map((tx) => (
              <div key={tx.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    tx.transaction_type === 'income' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    <span className="material-symbols-outlined text-[18px]">
                      {tx.transaction_type === 'income' ? 'arrow_downward' : 'arrow_upward'}
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-slate-900 truncate">{tx.description}</span>
                    <span className="text-[10px] text-slate-400 capitalize">{tx.category.replace('_', ' ')} • {tx.date}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`font-black ${tx.transaction_type === 'income' ? 'text-emerald-700' : 'text-slate-900'}`}>
                    {tx.transaction_type === 'income' ? '+' : '-'}{Number(tx.amount).toFixed(2)} TND
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {tx.approval_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Record Modal */}
      {showAddTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in">
            <h3 className="text-sm font-extrabold text-slate-900">Record Financial Cash Flow</h3>
            <form onSubmit={handleRecord} className="flex flex-col gap-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTxType('expense')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border ${txType === 'expense' ? 'bg-rose-50 text-rose-800 border-rose-300' : 'border-slate-200 text-slate-600'}`}
                >
                  Expense (-)
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('income')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border ${txType === 'income' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'border-slate-200 text-slate-600'}`}
                >
                  Income (+)
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Amount (TND) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 250.00"
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-600 outline-none"
                >
                  <option value="sponsorship">Sponsorship Income</option>
                  <option value="university_subsidy">University Council Grant</option>
                  <option value="logistics">Logistics & Print</option>
                  <option value="catering">Catering & Snacks</option>
                  <option value="equipment">Hardware & IoT Sensors</option>
                  <option value="misc">Miscellaneous</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Description / Justification *</label>
                <input
                  type="text"
                  required
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="e.g. Banners print for amphitheatre foyer"
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-600 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTxModal(false)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-800 text-white hover:bg-amber-900 shadow-xs"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==============================================================================
// 4. HUMAN RESOURCES MANAGER (Med Aziz Turky)
// ==============================================================================

export function HrManagerCockpit() {
  const { recruitmentApps, updateApplicationStatus, members } = useAuth();

  return (
    <div className="p-5 bg-gradient-to-br from-white to-blue-50/30 rounded-3xl border border-blue-900/15 shadow-sm flex flex-col gap-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-blue-900/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-800 text-white flex items-center justify-center font-bold shadow-xs">
            <span className="material-symbols-outlined text-[22px]">badge</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-sm text-slate-900">Human Resources & Onboarding Workspace</h2>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                Med Aziz Turky
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Student recruitment pipeline, department dispatch & team development</p>
          </div>
        </div>

        <Link
          href="/admin/members"
          className="px-3.5 py-1.5 rounded-xl bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
        >
          <span>Member Roster ({members.length})</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Recruitment Pipeline */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold text-slate-800">Spring 2025 Student Recruitment Pipeline</span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {recruitmentApps.map((app) => (
            <div key={app.id} className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between gap-2">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">{app.full_name}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                    app.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {app.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">{app.student_id} • {app.study_field}</div>
                <div className="text-[10px] text-emerald-800 font-medium mt-1">Choice: {app.department_preference}</div>
                {app.hr_notes && (
                  <p className="text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded-lg mt-2 line-clamp-2">
                    {app.hr_notes}
                  </p>
                )}
              </div>

              {app.status !== 'accepted' && (
                <div className="flex gap-1.5 mt-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => updateApplicationStatus(app.id, 'accepted')}
                    className="flex-1 py-1 rounded-lg bg-emerald-700 text-white font-bold text-[10px] hover:bg-emerald-800"
                  >
                    Accept Member
                  </button>
                  <button
                    onClick={() => updateApplicationStatus(app.id, 'interview_scheduled')}
                    className="flex-1 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-bold text-[10px]"
                  >
                    Interview
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==============================================================================
// 5. MARKETING & DESIGN MANAGER (Sa)
// ==============================================================================

export function MarketingCockpit() {
  const { campaigns, addCampaign, updateCampaignStatus } = useAuth();
  const [showNewCamp, setShowNewCamp] = useState(false);
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState<any>('instagram');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    addCampaign({
      title,
      platform,
      status: 'in_production',
      planned_date: '2026-11-05',
    });
    setTitle('');
    setShowNewCamp(false);
  };

  return (
    <div className="p-5 bg-gradient-to-br from-white to-purple-50/30 rounded-3xl border border-purple-900/15 shadow-sm flex flex-col gap-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-purple-900/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-800 text-white flex items-center justify-center font-bold shadow-xs">
            <span className="material-symbols-outlined text-[22px]">palette</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-sm text-slate-900">Marketing & Design Creative Workspace</h2>
              <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
                Sa
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Social campaigns, visual identity assets, creative briefs & publication calendar</p>
          </div>
        </div>

        <button
          onClick={() => setShowNewCamp(true)}
          className="px-3.5 py-1.5 rounded-xl bg-purple-800 hover:bg-purple-900 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Creative Campaign</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {campaigns.map((camp) => (
          <div key={camp.id} className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between gap-2">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                  {camp.platform}
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                  camp.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                }`}>
                  {camp.status.replace('_', ' ')}
                </span>
              </div>
              <h3 className="font-bold text-xs text-slate-900 mt-2">{camp.title}</h3>
              {camp.caption_draft && (
                <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 italic">{camp.caption_draft}</p>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-400">
              <span>Date: {camp.planned_date || 'Pending'}</span>
              {camp.status !== 'published' && (
                <button
                  onClick={() => updateCampaignStatus(camp.id, 'published')}
                  className="text-emerald-700 font-bold hover:underline"
                >
                  Mark Published
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showNewCamp && (
        <form onSubmit={handleAdd} className="p-3 bg-white rounded-2xl border border-purple-200 flex flex-col gap-2">
          <span className="text-xs font-bold text-slate-900">Add Campaign Brief</span>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Campaign title (e.g. EcoHack Teaser Trailer)"
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowNewCamp(false)} className="text-xs text-slate-500">Cancel</button>
            <button type="submit" className="px-3 py-1 bg-purple-800 text-white text-xs font-bold rounded-lg">Save</button>
          </div>
        </form>
      )}
    </div>
  );
}

// ==============================================================================
// 6. SUSTAINABLE CAMPUS MANAGER (Oussema)
// ==============================================================================

export function SustainableCampusCockpit() {
  const { initiatives, updateInitiativeProgress } = useAuth();

  return (
    <div className="p-5 bg-gradient-to-br from-white to-emerald-50/40 rounded-3xl border border-emerald-900/15 shadow-sm flex flex-col gap-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-emerald-900/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-bold shadow-xs">
            <span className="material-symbols-outlined text-[22px]">eco</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-sm text-slate-900">Sustainable Campus Ecological Tracker</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                Oussema
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Documented carbon reduction, reforestation metrics & green campus projects</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {initiatives.map((init) => {
          const pct = Math.min(100, Math.round((init.current_metric / init.target_metric) * 100));
          return (
            <div key={init.id} className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                    {init.category.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] font-black text-emerald-700">{pct}%</span>
                </div>
                <h3 className="font-bold text-xs text-slate-900 mt-1">{init.title}</h3>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3">
                  <div className="bg-emerald-600 h-full rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                </div>

                <div className="flex justify-between items-baseline mt-1 text-xs">
                  <span className="font-black text-slate-900">{init.current_metric}</span>
                  <span className="text-[10px] text-slate-400">Target: {init.target_metric} {init.metric_unit}</span>
                </div>

                {init.calculation_method && (
                  <p className="text-[10px] text-slate-500 bg-emerald-50/60 p-2 rounded-xl mt-2 border border-emerald-100">
                    <span className="font-bold text-emerald-900">Audit Protocol:</span> {init.calculation_method}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => updateInitiativeProgress(init.id, init.current_metric + 10)}
                  className="w-full py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-200 transition-colors"
                >
                  + Log Verified Progress (+10)
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==============================================================================
// 7. PARTNERSHIPS & SPONSORSHIPS MANAGER
// ==============================================================================

export function PartnershipsCockpit() {
  const { partners, updatePartnerStage } = useAuth();

  const totalCommitted = partners
    .filter((p) => p.pipeline_stage === 'confirmed')
    .reduce((acc, p) => acc + Number(p.sponsorship_amount_tnd), 0);

  return (
    <div className="p-5 bg-gradient-to-br from-white to-teal-50/30 rounded-3xl border border-teal-900/15 shadow-sm flex flex-col gap-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-teal-900/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-800 text-white flex items-center justify-center font-bold shadow-xs">
            <span className="material-symbols-outlined text-[22px]">handshake</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-sm text-slate-900">Partnerships & Sponsorship CRM</h2>
              <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold">
                External Relations
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Corporate partners, CRDA MOU dossiers, sponsorship pipeline & commitments</p>
          </div>
        </div>

        <div className="px-3 py-1 bg-white rounded-xl border border-teal-200 text-xs font-bold text-teal-900">
          Committed Grants: <span className="font-black text-emerald-700">{totalCommitted.toFixed(2)} TND</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {partners.map((partner) => (
          <div key={partner.id} className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between gap-2">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-slate-900 line-clamp-1">{partner.organization_name}</span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full capitalize ${
                  partner.pipeline_stage === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {partner.pipeline_stage.replace('_', ' ')}
                </span>
              </div>
              <div className="text-[11px] font-semibold text-slate-600 mt-1">
                {partner.contact_name} • <span className="font-mono text-[10px]">{partner.contact_phone}</span>
              </div>
              <div className="text-xs font-black text-teal-800 mt-2">
                Pledged: {partner.sponsorship_amount_tnd} TND
              </div>

              {partner.deliverables && partner.deliverables.length > 0 && (
                <div className="mt-2 flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Deliverables:</span>
                  {partner.deliverables.map((deliv, idx) => (
                    <span key={idx} className="text-[10px] text-slate-600 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-teal-600"></span>
                      {deliv}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {partner.pipeline_stage !== 'confirmed' && (
              <div className="pt-2 border-t border-slate-100 mt-2">
                <button
                  onClick={() => updatePartnerStage(partner.id, 'confirmed')}
                  className="w-full py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 font-bold text-[10px] border border-teal-200 transition-colors"
                >
                  Confirm Sponsorship MOU
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
