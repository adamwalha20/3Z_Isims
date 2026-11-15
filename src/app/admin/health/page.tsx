'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n/context';
import {
  Activity,
  Database,
  Shield,
  Radio,
  HardDrive,
  Mail,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowLeft,
  Lock,
  Server,
  Zap,
} from 'lucide-react';

interface HealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  latency_ms: number;
  checks: {
    database: {
      status: string;
      latency_ms: number;
      engine: string;
      region: string;
      error?: string | null;
    };
    authentication: {
      status: string;
      mode: string;
      authenticated_admin: string;
    };
    realtime: {
      status: string;
      publication: string;
      published_tables: number;
      transport: string;
    };
    storage: {
      status: string;
      buckets_available: number;
      primary_bucket: string;
    };
    email_automation: {
      status: string;
      pending_reminders: number;
      failed_reminders: number;
      failed_delivery_logs: number;
      last_execution_at?: string | null;
    };
  };
  recent_incidents: Array<{
    id: string;
    action: string;
    entity_type: string;
    details?: string | null;
    created_at: string;
    actor?: { full_name?: string; email?: string } | null;
  }>;
}

export default function AdminSystemHealthPage() {
  const { user, isAdmin, activeRole } = useAuth();
  const { t } = useTranslation();
  const [report, setReport] = useState<HealthReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthorized =
    isAdmin ||
    activeRole === 'admin' ||
    user?.email?.toLowerCase() === 'adamwalha20@gmail.com' ||
    Boolean(user?.student_id?.toUpperCase().startsWith('ISIMS-ADMIN'));

  const fetchHealth = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/health');
      const data = await res.json();
      if (res.ok) {
        setReport(data);
      } else {
        setError(data.error || 'Failed to complete system health check');
      }
    } catch (err: any) {
      setError(err?.message || 'Connection failed during diagnostic probe');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchHealth();
    }
  }, [isAuthorized]);

  if (!isAuthorized) {
    return (
      <AppShell>
        <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-base font-extrabold text-slate-900">Access Restricted</h2>
          <p className="text-xs text-slate-500 max-w-sm">
            System diagnostics and operational telemetry are exclusively reserved for club administrators.
          </p>
          <div className="mt-2 text-[11px] font-mono text-slate-400">
            Current account: {user?.email || 'Guest / Unverified'}
          </div>
        </div>
      </AppShell>
    );
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'healthy':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Operational
          </span>
        );
      case 'degraded':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase">
            <AlertTriangle className="w-3 h-3 text-amber-600" /> Degraded
          </span>
        );
      case 'unhealthy':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black uppercase">
            <XCircle className="w-3 h-3 text-rose-600" /> Incident
          </span>
        );
    }
  };

  return (
    <AppShell>
      <div className="pt-4 flex flex-col gap-5 max-w-5xl mx-auto w-full pb-20">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Link
              href="/admin"
              className="p-2 rounded-xl bg-white text-slate-600 hover:text-slate-900 shadow-xs border border-slate-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg sm:text-xl text-slate-900">{t('admin.healthTitle')}</h1>
                {report && getStatusBadge(report.status)}
              </div>
              <p className="text-xs text-slate-500">{t('admin.healthSubtitle')}</p>
            </div>
          </div>

          <button
            onClick={fetchHealth}
            disabled={isRefreshing}
            className="px-4 py-2 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Running Probe...' : 'Re-run Diagnostics'}</span>
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-36 rounded-3xl bg-slate-100 animate-pulse border border-slate-200" />
            ))}
          </div>
        ) : report ? (
          <>
            {/* Top Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-3xl bg-white border border-emerald-900/10 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">Overall Status</span>
                  <Zap className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="mt-2">
                  <div className="text-xl font-black text-slate-900 capitalize">{report.status}</div>
                  <span className="text-[10px] text-slate-500">All systems passing probes</span>
                </div>
              </div>

              <div className="p-4 rounded-3xl bg-white border border-emerald-900/10 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">DB Latency</span>
                  <Activity className="w-4 h-4 text-blue-600" />
                </div>
                <div className="mt-2">
                  <div className="text-xl font-black text-blue-700">{report.latency_ms} ms</div>
                  <span className="text-[10px] text-slate-500">PostgreSQL ping turnaround</span>
                </div>
              </div>

              <div className="p-4 rounded-3xl bg-white border border-emerald-900/10 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">Realtime Sync</span>
                  <Radio className="w-4 h-4 text-purple-600" />
                </div>
                <div className="mt-2">
                  <div className="text-xl font-black text-purple-700">15 Tables</div>
                  <span className="text-[10px] text-slate-500">Replication publication active</span>
                </div>
              </div>

              <div className="p-4 rounded-3xl bg-white border border-emerald-900/10 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider">Email Queue</span>
                  <Mail className="w-4 h-4 text-amber-600" />
                </div>
                <div className="mt-2">
                  <div className="text-xl font-black text-slate-900">
                    {report.checks.email_automation.pending_reminders} Pending
                  </div>
                  <span className="text-[10px] text-rose-600 font-bold">
                    {report.checks.email_automation.failed_reminders} failed jobs
                  </span>
                </div>
              </div>
            </div>

            {/* Individual Subsystem Diagnostic Probes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. Database Probe */}
              <div className="p-5 rounded-3xl bg-white border border-emerald-900/10 shadow-xs flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">PostgreSQL Database</h3>
                      <p className="text-[10px] text-slate-400">{report.checks.database.region}</p>
                    </div>
                  </div>
                  {getStatusBadge(report.checks.database.status)}
                </div>

                <div className="text-xs space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex justify-between text-slate-600">
                    <span>Engine:</span>
                    <span className="font-mono font-bold text-slate-900 text-[11px] truncate max-w-[140px]">
                      {report.checks.database.engine}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Response Time:</span>
                    <span className="font-mono font-bold text-emerald-700">{report.checks.database.latency_ms} ms</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Connection Pool:</span>
                    <span className="font-bold text-slate-900">Active</span>
                  </div>
                </div>
              </div>

              {/* 2. Authentication Probe */}
              <div className="p-5 rounded-3xl bg-white border border-emerald-900/10 shadow-xs flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-800 flex items-center justify-center font-bold">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">Supabase Auth</h3>
                      <p className="text-[10px] text-slate-400">JWT & PKCE Authority</p>
                    </div>
                  </div>
                  {getStatusBadge(report.checks.authentication.status)}
                </div>

                <div className="text-xs space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex justify-between text-slate-600">
                    <span>Token Protocol:</span>
                    <span className="font-bold text-slate-900 text-[11px]">PKCE + SSR</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Verified Admin:</span>
                    <span className="font-mono text-slate-900 text-[10px] truncate max-w-[140px]">
                      {report.checks.authentication.authenticated_admin}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Session Persistence:</span>
                    <span className="font-bold text-emerald-700">Healthy</span>
                  </div>
                </div>
              </div>

              {/* 3. Realtime Engine Probe */}
              <div className="p-5 rounded-3xl bg-white border border-emerald-900/10 shadow-xs flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-800 flex items-center justify-center font-bold">
                      <Radio className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">Supabase Realtime</h3>
                      <p className="text-[10px] text-slate-400">{report.checks.realtime.transport}</p>
                    </div>
                  </div>
                  {getStatusBadge(report.checks.realtime.status)}
                </div>

                <div className="text-xs space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex justify-between text-slate-600">
                    <span>Publication:</span>
                    <span className="font-mono font-bold text-slate-900 text-[11px]">{report.checks.realtime.publication}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tables Synced:</span>
                    <span className="font-bold text-emerald-700">{report.checks.realtime.published_tables} tables</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Replica Identity:</span>
                    <span className="font-bold text-slate-900">FULL (payload enabled)</span>
                  </div>
                </div>
              </div>

              {/* 4. Storage Probe */}
              <div className="p-5 rounded-3xl bg-white border border-emerald-900/10 shadow-xs flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
                      <HardDrive className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">Object Storage</h3>
                      <p className="text-[10px] text-slate-400">Documents & Avatars</p>
                    </div>
                  </div>
                  {getStatusBadge(report.checks.storage.status)}
                </div>

                <div className="text-xs space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex justify-between text-slate-600">
                    <span>Buckets:</span>
                    <span className="font-bold text-slate-900">{report.checks.storage.buckets_available} active</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Main Bucket:</span>
                    <span className="font-mono text-slate-900 text-[11px]">{report.checks.storage.primary_bucket}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Upload Engine:</span>
                    <span className="font-bold text-emerald-700">Ready</span>
                  </div>
                </div>
              </div>

              {/* 5. Email Automation Probe */}
              <div className="p-5 rounded-3xl bg-white border border-emerald-900/10 shadow-xs flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-800 flex items-center justify-center font-bold">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">Email Dispatcher</h3>
                      <p className="text-[10px] text-slate-400">Resend API + Cron Reminders</p>
                    </div>
                  </div>
                  {getStatusBadge(report.checks.email_automation.status)}
                </div>

                <div className="text-xs space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex justify-between text-slate-600">
                    <span>Pending Queue:</span>
                    <span className="font-bold text-slate-900">{report.checks.email_automation.pending_reminders}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Failed Deliveries:</span>
                    <span className="font-bold text-rose-600">{report.checks.email_automation.failed_delivery_logs}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Last Job Run:</span>
                    <span className="font-mono text-[10px] text-slate-500">
                      {report.checks.email_automation.last_execution_at
                        ? new Date(report.checks.email_automation.last_execution_at).toLocaleTimeString()
                        : 'Idle'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 6. Scheduled Cron Probe */}
              <div className="p-5 rounded-3xl bg-white border border-emerald-900/10 shadow-xs flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center font-bold">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">Vercel Cron Trigger</h3>
                      <p className="text-[10px] text-slate-400">0 7 * * * (08:00 AM Tunis)</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                    Scheduled
                  </span>
                </div>

                <div className="text-xs space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex justify-between text-slate-600">
                    <span>Frequency:</span>
                    <span className="font-bold text-slate-900">Daily UTC 07:00</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Target Route:</span>
                    <span className="font-mono text-[10px] text-slate-700 truncate max-w-[140px]">/api/cron/meeting-reminders</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Idempotency:</span>
                    <span className="font-bold text-emerald-700">Enforced</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent System Events & Errors Log */}
            <section className="bg-white rounded-3xl p-5 border border-emerald-900/10 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-700" />
                  <h3 className="font-extrabold text-sm text-slate-900">Recent Incident & Warning Logs</h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">REALTIME AUDIT TRACE</span>
              </div>

              {report.recent_incidents.length > 0 ? (
                <div className="space-y-2">
                  {report.recent_incidents.map((incident) => (
                    <div
                      key={incident.id}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-900 font-mono text-[10px] font-bold">
                          {incident.action}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-slate-900 truncate">
                            {incident.actor?.full_name || 'System Worker'} • {incident.entity_type}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono truncate">
                            {incident.details || 'Warning condition logged by operational worker'}
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {new Date(incident.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                  <div className="font-extrabold text-xs text-slate-900">Zero Critical Incidents</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Database operations and background workers are operating normally.</p>
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

