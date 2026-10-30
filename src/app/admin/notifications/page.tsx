'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import {
  ScheduledEmailReminder,
  EmailDeliveryLog,
  ReminderType,
} from '@/types/database.types';
import {
  Mail,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldAlert,
  Server,
  Calendar,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function AdminNotificationsPage() {
  const { user, activeRole, isLiveSupabase, isAdmin } = useAuth();

  const isBureauOrAdmin = activeRole === 'admin' || activeRole === 'bureau' || isAdmin;

  // Stats
  const [stats, setStats] = useState({
    totalNotifications: 0,
    pendingReminders: 0,
    sentEmails: 0,
    failedEmails: 0,
  });

  // Scheduled reminders & logs
  const [scheduledReminders, setScheduledReminders] = useState<ScheduledEmailReminder[]>([]);
  const [deliveryLogs, setDeliveryLogs] = useState<EmailDeliveryLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Test email modal/form state
  const [testEmailRecipient, setTestEmailRecipient] = useState(user?.email || 'test@isims.tn');
  const [testReminderType, setTestReminderType] = useState<ReminderType>('48h');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

  // Manual cron trigger state
  const [isTriggeringCron, setIsTriggeringCron] = useState(false);
  const [cronResult, setCronResult] = useState<any | null>(null);

  // Retry state
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    const supabase = createClient();
    if (!supabase || !isLiveSupabase) {
      // Mock data for preview mode
      setStats({
        totalNotifications: 142,
        pendingReminders: 8,
        sentEmails: 124,
        failedEmails: 2,
      });
      setScheduledReminders([
        {
          id: 'rem-mock-1',
          meeting_id: 'meet-001',
          recipient_user_id: user?.id || 'usr-001',
          reminder_type: '48h',
          scheduled_at: new Date(Date.now() + 3600000 * 20).toISOString(),
          status: 'pending',
          idempotency_key: 'rem_meet-001_usr-001_48h',
          attempts: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'rem-mock-2',
          meeting_id: 'meet-001',
          recipient_user_id: user?.id || 'usr-001',
          reminder_type: 'morning_8am',
          scheduled_at: new Date(Date.now() + 3600000 * 10).toISOString(),
          status: 'pending',
          idempotency_key: 'rem_meet-001_usr-001_morning_8am',
          attempts: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'rem-mock-3',
          meeting_id: 'meet-002',
          recipient_user_id: user?.id || 'usr-001',
          reminder_type: '1h',
          scheduled_at: new Date(Date.now() - 3600000).toISOString(),
          status: 'sent',
          idempotency_key: 'rem_meet-002_usr-001_1h',
          attempts: 1,
          sent_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'rem-mock-4',
          meeting_id: 'meet-003',
          recipient_user_id: user?.id || 'usr-002',
          reminder_type: '1h',
          scheduled_at: new Date(Date.now() - 7200000).toISOString(),
          status: 'failed',
          idempotency_key: 'rem_meet-003_usr-002_1h',
          attempts: 3,
          error_message: 'Recipient address rejected: DNS verification failed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
      setDeliveryLogs([
        {
          id: 'log-mock-1',
          recipient_email: user?.email || 'admin@isims.tn',
          recipient_user_id: user?.id || 'usr-001',
          email_type: 'reminder',
          subject: '🔔 [REMINDER] Tomorrow: ISIMS Zero Carbon Campus Strategic Workshop',
          provider_message_id: 'msg_resend_mock_1',
          delivery_status: 'delivered',
          sent_at: new Date(Date.now() - 3600000).toISOString(),
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'log-mock-2',
          recipient_email: 'member@isims.tn',
          recipient_user_id: 'usr-002',
          email_type: 'reminder',
          subject: '🚨 [URGENT] Starting in 1 Hour: Clean Tech Hackathon Pitch',
          provider_message_id: 'msg_resend_mock_2',
          delivery_status: 'failed',
          error_message: 'Simulated 550 Mailbox unavailable',
          sent_at: new Date(Date.now() - 7200000).toISOString(),
          created_at: new Date(Date.now() - 7200000).toISOString(),
        },
      ]);
      setIsLoading(false);
      return;
    }

    try {
      // 1. Fetch counts
      const { count: notifCount } = await supabase.from('notifications').select('*', { count: 'exact', head: true });
      const { count: pendingCount } = await supabase.from('scheduled_email_reminders').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const { count: sentCount } = await supabase.from('email_delivery_logs').select('*', { count: 'exact', head: true }).in('status', ['sent', 'delivered']);
      const { count: failedCount } = await supabase.from('email_delivery_logs').select('*', { count: 'exact', head: true }).eq('status', 'failed');

      setStats({
        totalNotifications: notifCount || 0,
        pendingReminders: pendingCount || 0,
        sentEmails: sentCount || 0,
        failedEmails: failedCount || 0,
      });

      // 2. Fetch scheduled reminders
      const { data: reminders } = await supabase
        .from('scheduled_email_reminders')
        .select('*, recipient:profiles!scheduled_email_reminders_recipient_user_id_fkey(full_name, email), meeting:meetings(title, starts_at)')
        .order('scheduled_at', { ascending: false })
        .limit(25);

      if (reminders) {
        setScheduledReminders(reminders as any);
      }

      // 3. Fetch logs
      const { data: logs } = await supabase
        .from('email_delivery_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(25);

      if (logs) {
        setDeliveryLogs(logs as any);
      }
    } catch (err) {
      console.error('Error loading admin notification metrics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isLiveSupabase]);

  // Handle sending test email
  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/admin/emails/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: testEmailRecipient,
          reminderType: testReminderType,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: `Test email dispatched successfully! Provider message: ${data.message || data.providerMessage || 'Delivered'}`,
        });
        loadData();
      } else {
        setTestResult({
          success: false,
          error: data.error || 'Failed to dispatch test email',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err?.message || 'Network error occurred while sending test email',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  // Handle manual cron execution
  const handleTriggerCron = async () => {
    setIsTriggeringCron(true);
    setCronResult(null);

    try {
      const res = await fetch('/api/cron/meeting-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRun: true }),
      });

      const data = await res.json();
      setCronResult(data);
      loadData();
    } catch (err: any) {
      setCronResult({ success: false, error: err?.message || 'Cron trigger error' });
    } finally {
      setIsTriggeringCron(false);
    }
  };

  // Handle retry
  const handleRetryReminder = async (reminderId: string) => {
    setRetryingId(reminderId);
    try {
      const res = await fetch('/api/admin/emails/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderId }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Reminder queued for immediate retry.');
        loadData();
      } else {
        alert(`Retry failed: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Retry request failed: ${err?.message}`);
    } finally {
      setRetryingId(null);
    }
  };

  if (!isBureauOrAdmin) {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900">Access Restricted</h2>
          <p className="text-xs text-slate-500">
            Only club bureau officers and system administrators have access to central notification logs and automated email delivery systems.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-3xl p-6 md:p-8 border border-emerald-900/10 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-md">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                  Notification & Email Operations Center
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold uppercase">
                  Africa/Tunis Timezone
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                Manage transactional Resend reminders, scheduled queue workers, in-app notifications, and delivery logs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleTriggerCron}
              disabled={isTriggeringCron}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTriggeringCron ? 'animate-spin' : ''}`} />
              <span>{isTriggeringCron ? 'Executing Worker...' : 'Run Scheduler Now'}</span>
            </button>
            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="Refresh logs & statistics"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Cron Result Alert */}
        {cronResult && (
          <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-start gap-3 ${
            cronResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-extrabold">Scheduler Engine Execution Report:</div>
              <div>{cronResult.message || (cronResult.success ? `Processed ${cronResult.processedCount || 0} pending reminders.` : cronResult.error)}</div>
            </div>
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-3xl p-5 border border-emerald-900/10 shadow-xs space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total In-App Sent</span>
            <div className="text-2xl font-black text-slate-900">{stats.totalNotifications}</div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Persistent member records</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-emerald-900/10 shadow-xs space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Reminders</span>
            <div className="text-2xl font-black text-amber-600">{stats.pendingReminders}</div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Queued for Tunis schedule</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-emerald-900/10 shadow-xs space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Delivered Emails</span>
            <div className="text-2xl font-black text-emerald-700">{stats.sentEmails}</div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verified deliverability</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-emerald-900/10 shadow-xs space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Failed Deliveries</span>
            <div className="text-2xl font-black text-rose-600">{stats.failedEmails}</div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5 text-rose-500" />
              <span>Requires inspection/retry</span>
            </div>
          </div>
        </div>

        {/* Live Provider Health & Test Tool */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Provider Health Card */}
          <div className="bg-white rounded-3xl p-6 border border-emerald-900/10 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Email Infrastructure</h3>
                <span className="text-[11px] text-slate-500">Resend REST Provider + Vercel Cron</span>
              </div>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Default Club Timezone</span>
                <span className="font-bold text-slate-900">Africa/Tunis (UTC+1)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Morning Reminder Slot</span>
                <span className="font-bold text-slate-900">08:00 AM Tunis Time</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Cron Schedule</span>
                <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">*/15 * * * *</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Concurrency Safety</span>
                <span className="font-bold text-emerald-700">SKIP LOCKED (Atomic)</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <div className="font-bold text-slate-800">Deduplication Guarantee:</div>
              <p>
                When a meeting starts at 09:00 AM Tunis time, the 1-hour-before reminder aligns with 08:00 AM morning reminder. The engine automatically merges them into a single 1h reminder to prevent inbox fatigue.
              </p>
            </div>
          </div>

          {/* Test Email Dispatcher */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-emerald-900/10 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Send Test Transactional Email</h3>
                <span className="text-[11px] text-slate-500">Verify branded emerald HTML rendering & provider dispatch</span>
              </div>
            </div>

            <form onSubmit={handleSendTestEmail} className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700">Recipient Email</label>
                  <input
                    type="email"
                    required
                    value={testEmailRecipient}
                    onChange={(e) => setTestEmailRecipient(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700">Email Template Variant</label>
                  <select
                    value={testReminderType}
                    onChange={(e) => setTestReminderType(e.target.value as ReminderType)}
                    className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                  >
                    <option value="48h">48h Advance Notice</option>
                    <option value="morning_8am">Meeting Day 08:00 AM Morning Briefing</option>
                    <option value="1h">1 Hour Before (Urgent Countdown)</option>
                  </select>
                </div>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    testResult.success
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      : 'bg-rose-50 text-rose-900 border border-rose-200'
                  }`}
                >
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-700" /> : <AlertTriangle className="w-4 h-4 text-rose-700" />}
                  <span>{testResult.message || testResult.error}</span>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSendingTest}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs disabled:opacity-50 transition-colors"
                >
                  <Send className={`w-3.5 h-3.5 ${isSendingTest ? 'animate-bounce' : ''}`} />
                  <span>{isSendingTest ? 'Dispatching...' : 'Send Live Test Email'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Scheduled Email Reminders Queue Table */}
        <div className="bg-white rounded-3xl p-6 border border-emerald-900/10 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Scheduled Email Reminders Queue</h3>
              <p className="text-xs text-slate-500">Atomic pending reminders calculated for upcoming meetings</p>
            </div>
            <span className="text-xs font-bold text-slate-400">{scheduledReminders.length} jobs</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Recipient</th>
                  <th className="py-2.5 px-3">Reminder Type</th>
                  <th className="py-2.5 px-3">Scheduled (Tunis Time)</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Attempts</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scheduledReminders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No scheduled email reminders in queue
                    </td>
                  </tr>
                ) : (
                  scheduledReminders.map((rem) => {
                    const statusColors: Record<string, string> = {
                      pending: 'bg-amber-100 text-amber-800',
                      claimed: 'bg-blue-100 text-blue-800 animate-pulse',
                      sent: 'bg-emerald-100 text-emerald-800',
                      failed: 'bg-rose-100 text-rose-800',
                      cancelled: 'bg-slate-100 text-slate-500',
                    };

                    const typeLabels: Record<string, string> = {
                      '48h': '48h Advance Reminder',
                      morning_8am: '08:00 AM Morning Briefing',
                      '1h': '1h Urgent Reminder',
                    };

                    return (
                      <tr key={rem.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          {rem.recipient?.full_name || rem.recipient?.email || rem.recipient_user_id}
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-600">
                          {typeLabels[rem.reminder_type] || rem.reminder_type}
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                          {new Date(rem.scheduled_at).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${statusColors[rem.status] || 'bg-slate-100 text-slate-700'}`}>
                            {rem.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500">{rem.attempts}</td>
                        <td className="py-3 px-3 text-right">
                          {rem.status === 'failed' && (
                            <button
                              onClick={() => handleRetryReminder(rem.id)}
                              disabled={retryingId === rem.id}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] transition-colors inline-flex items-center gap-1"
                            >
                              <RotateCcw className={`w-3 h-3 ${retryingId === rem.id ? 'animate-spin' : ''}`} />
                              <span>Retry</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Delivery Logs Table */}
        <div className="bg-white rounded-3xl p-6 border border-emerald-900/10 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Email Delivery Audit Trail</h3>
              <p className="text-xs text-slate-500">Immutable record of dispatched notifications and provider callbacks</p>
            </div>
            <span className="text-xs font-bold text-slate-400">{deliveryLogs.length} entries</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Recipient Email</th>
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3">Provider</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Dispatched At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deliveryLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No delivery logs recorded yet
                    </td>
                  </tr>
                ) : (
                  deliveryLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-800">{log.recipient_email}</td>
                      <td className="py-3 px-3 text-slate-700 max-w-xs truncate">{log.subject}</td>
                      <td className="py-3 px-3 uppercase text-[10px] font-bold text-slate-500">
                        {log.provider_message_id?.startsWith('sim_') ? 'Simulated' : 'Resend'}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          log.delivery_status === 'sent' || log.delivery_status === 'delivered' || log.delivery_status === 'simulated'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {log.delivery_status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                        {log.sent_at || log.created_at
                          ? new Date(log.sent_at || log.created_at).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
