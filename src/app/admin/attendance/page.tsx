'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase/client';
import { getSafeAvatar } from '@/lib/constants/avatars';
import { PhysicalSession, SessionAttendance } from '@/types/database.types';
import {
  BarChart3,
  Users,
  Award,
  Download,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Camera,
  Calendar,
  Filter,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  PlusCircle,
  Shield,
  UserCheck,
  UserX,
} from 'lucide-react';
import { canAccessAttendanceScanner } from '@/lib/attendance/attendance-auth';

interface BureauPositionRecord {
  id: string;
  key: string;
  display_name: string;
  description?: string;
  order_index: number;
  user_bureau_positions?: Array<{
    user_id: string;
    profiles?: any;
  }>;
}

export default function BureauAttendanceAnalyticsPage() {
  const { user, activeRole, isAdmin, userBureauPositions, activeBureauPosition, bureauMembers } = useAuth();
  const isBureauOrAdmin = activeRole === 'admin' || activeRole === 'bureau' || isAdmin;
  const canScan = canAccessAttendanceScanner({
    activeRole,
    isAdmin,
    userEmail: user?.email,
    userBureauPositions,
    activeBureauPosition,
  });

  const [positions, setPositions] = useState<BureauPositionRecord[]>([]);
  const [sessions, setSessions] = useState<PhysicalSession[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<SessionAttendance[]>([]);
  const [selectedSessionFilter, setSelectedSessionFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Load physical sessions, attendance records, and bureau positions live from Supabase
  const loadData = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) return;

    try {
      const [sessionsRes, attendanceRes, positionsRes] = await Promise.all([
        supabase
          .from('sessions')
          .select('*, organizer:profiles!sessions_organizer_id_fkey(full_name, email), department:departments(name)')
          .order('starts_at', { ascending: false }),
        supabase
          .from('session_attendance')
          .select('*, member:profiles!session_attendance_member_id_fkey(id, full_name, email, avatar_path)'),
        supabase
          .from('bureau_positions')
          .select(`
            id, key, display_name, description, order_index,
            user_bureau_positions(
              user_id,
              profiles!user_bureau_positions_user_id_fkey(id, full_name, email, avatar_path, student_id)
            )
          `)
          .order('order_index', { ascending: true }),
      ]);

      if (sessionsRes.data) {
        setSessions(sessionsRes.data as PhysicalSession[]);
      }
      if (attendanceRes.data) {
        setAttendanceRecords(attendanceRes.data as SessionAttendance[]);
      }
      if (positionsRes.data) {
        setPositions(positionsRes.data as unknown as BureauPositionRecord[]);
      }
    } catch (err) {
      console.warn('Analytics live load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Subscribe to realtime changes in Supabase
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel('admin-attendance-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_attendance' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_bureau_positions' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // Handle Manual Refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setTimeout(() => setIsRefreshing(false), 400);
  };

  // Sessions to consider according to filter
  const filteredSessions = useMemo(() => {
    if (selectedSessionFilter === 'all') return sessions;
    return sessions.filter((s) => s.id === selectedSessionFilter);
  }, [sessions, selectedSessionFilter]);

  // Compute Bureau Position Statistics (100% Live)
  const bureauStats = useMemo(() => {
    const relevantSessions = filteredSessions;
    const relevantSessionIds = new Set(relevantSessions.map((s) => s.id));

    return positions.map((pos) => {
      // Find assigned users for this position
      const assignments = pos.user_bureau_positions || [];
      const assignedProfiles = assignments
        .map((a) => (Array.isArray(a.profiles) ? a.profiles[0] : a.profiles))
        .filter(Boolean) as Array<{ id: string; full_name: string; email?: string; avatar_path?: string }>;

      // If no assignments found in table, check fallback from bureauMembers auth context
      const matchedFallback = bureauMembers.find(
        (bm) => bm.position_key === pos.key && bm.member_name && bm.member_name !== 'Unassigned'
      );

      const assignedOfficers =
        assignedProfiles.length > 0
          ? assignedProfiles.map((p) => ({
              id: p.id,
              name: p.full_name,
              email: p.email,
              avatar: getSafeAvatar(p.avatar_path),
            }))
          : matchedFallback
          ? [
              {
                id: 'fallback-id',
                name: matchedFallback.member_name,
                email: matchedFallback.email,
                avatar: getSafeAvatar(matchedFallback.avatar),
              },
            ]
          : [];

      const totalOfficers = assignedOfficers.length;
      const isVacant = totalOfficers === 0;

      // Calculate attendance across the relevant sessions
      let presentCount = 0;
      let lateCount = 0;
      let absentCount = 0;

      if (!isVacant && relevantSessions.length > 0) {
        assignedOfficers.forEach((officer) => {
          relevantSessions.forEach((sess) => {
            const record = attendanceRecords.find(
              (r) => r.session_id === sess.id && r.member_id === officer.id
            );
            if (record) {
              if (record.attendance_status === 'present') {
                presentCount++;
              } else if (record.attendance_status === 'late') {
                lateCount++;
              } else {
                absentCount++;
              }
            } else {
              absentCount++;
            }
          });
        });
      }

      const totalPossibleCheckIns = totalOfficers * relevantSessions.length;
      const pct =
        totalPossibleCheckIns > 0
          ? Math.round(((presentCount + lateCount) / totalPossibleCheckIns) * 100)
          : 0;

      return {
        id: pos.id,
        position_key: pos.key,
        position_name: pos.display_name,
        assignedOfficers,
        total_members: totalOfficers,
        present_count: presentCount,
        late_count: lateCount,
        absent_count: absentCount,
        attendance_percentage: pct,
        isVacant,
        hasSessions: relevantSessions.length > 0,
      };
    });
  }, [positions, filteredSessions, bureauMembers, attendanceRecords]);

  // Overall unique bureau officers (deduplicated across all roles)
  const uniqueBureauOfficers = useMemo(() => {
    const officerIds = new Set<string>();
    bureauStats.forEach((stat) => {
      stat.assignedOfficers.forEach((o) => officerIds.add(o.name));
    });
    return officerIds.size;
  }, [bureauStats]);

  // Average Bureau Presence across active officers
  const averageBureauPresence = useMemo(() => {
    const assignedStats = bureauStats.filter((s) => !s.isVacant && s.hasSessions);
    if (assignedStats.length === 0) return 0;
    const sum = assignedStats.reduce((acc, curr) => acc + curr.attendance_percentage, 0);
    return Math.round(sum / assignedStats.length);
  }, [bureauStats]);

  const assignedPositionsCount = useMemo(() => {
    return bureauStats.filter((s) => !s.isVacant).length;
  }, [bureauStats]);

  const vacantPositionsCount = useMemo(() => {
    return bureauStats.filter((s) => s.isVacant).length;
  }, [bureauStats]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Bureau Position',
      'Assigned Officers',
      'Present Count',
      'Late Count',
      'Absent Count',
      'Attendance Rate',
      'Status',
    ];
    const rows = bureauStats.map((b) => [
      `"${b.position_name}"`,
      `"${b.assignedOfficers.map((o) => o.name).join('; ') || 'Vacant'}"`,
      b.present_count,
      b.late_count,
      b.absent_count,
      b.hasSessions && !b.isVacant ? `${b.attendance_percentage}%` : 'N/A',
      b.isVacant ? 'VACANT' : b.attendance_percentage >= 75 ? 'ACTIVE' : 'ATTENTION',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Bureau_Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isBureauOrAdmin) {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900">Access Restricted</h2>
          <p className="text-xs text-slate-500">
            Bureau role attendance analytics and governance reports are restricted to authorized Bureau Officers and
            Administrators.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6">
        {/* Navigation & Actions Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Link
            href="/attendance"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Attendance Hub</span>
          </Link>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-xs"
              title="Refresh live attendance data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>

            {canScan && (
              <Link
                href="/attendance/scanner"
                className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Open Scanner</span>
              </Link>
            )}

            <Link
              href="/admin/roles"
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Manage Roles</span>
            </Link>
          </div>
        </div>

        {/* Header Banner */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-emerald-900/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-md shrink-0">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                  Bureau Role Attendance Analytics
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-extrabold uppercase border border-emerald-200 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live Data
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                Real-time attendance tracking across executive roles. An officer holding multiple positions is
                deduplicated in total headcount.
              </p>
            </div>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-2xl bg-slate-50 hover:bg-emerald-50 text-emerald-800 border border-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 self-start md:self-auto shadow-xs"
          >
            <Download className="w-4 h-4 text-emerald-700" />
            <span>Export Report CSV</span>
          </button>
        </div>

        {/* Overall Bureau Metric Cards (100% Live) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Unique Bureau Officers */}
          <div className="bg-white rounded-3xl p-5 border border-emerald-900/10 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Unique Bureau Officers
            </span>
            <div className="text-2xl font-black text-slate-900">{uniqueBureauOfficers}</div>
            <div className="text-[11px] text-slate-500">
              {uniqueBureauOfficers > 0
                ? `${uniqueBureauOfficers} active officer(s) assigned`
                : 'No officers assigned yet'}
            </div>
          </div>

          {/* Card 2: Average Bureau Presence */}
          <div className="bg-white rounded-3xl p-5 border border-emerald-900/10 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Average Bureau Presence
            </span>
            <div className="text-2xl font-black text-emerald-700">
              {sessions.length > 0 && uniqueBureauOfficers > 0 ? `${averageBureauPresence}%` : '—'}
            </div>
            <div className="text-[11px] text-slate-500">
              {sessions.length > 0
                ? `Across ${sessions.length} tracked session(s)`
                : 'No campus sessions held yet'}
            </div>
          </div>

          {/* Card 3: Monitored Positions */}
          <div className="bg-white rounded-3xl p-5 border border-emerald-900/10 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Monitored Positions
            </span>
            <div className="text-2xl font-black text-slate-900">{positions.length || 12}</div>
            <div className="text-[11px] text-slate-500">
              <span className="text-emerald-700 font-bold">{assignedPositionsCount} assigned</span> •{' '}
              <span className="text-amber-600 font-semibold">{vacantPositionsCount} vacant</span>
            </div>
          </div>

          {/* Card 4: Physical Sessions */}
          <div className="bg-white rounded-3xl p-5 border border-emerald-900/10 shadow-xs space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Physical Sessions
            </span>
            <div className="text-2xl font-black text-blue-700">{sessions.length}</div>
            <div className="text-[11px] text-slate-500">
              {sessions.length > 0
                ? `${sessions.filter((s) => s.attendance_status === 'open').length} currently active`
                : 'Tracked in-person meetings'}
            </div>
          </div>
        </div>

        {/* Empty State Banner when no sessions recorded */}
        {sessions.length === 0 && (
          <div className="bg-emerald-50/80 border border-emerald-200 p-4 sm:p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">No Physical Attendance Sessions Yet</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Launch a campus assembly, workshop, or council session in the Attendance Hub to track real-time
                  QR code scans.
                </p>
              </div>
            </div>
            <Link
              href="/attendance"
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shrink-0 shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Session</span>
            </Link>
          </div>
        )}

        {/* Position Breakdown Table */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-900/10 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Attendance by Functional Bureau Role</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Official mandate roster and verified in-person check-in metrics.
              </p>
            </div>

            {/* Filter by Session */}
            {sessions.length > 0 && (
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedSessionFilter}
                  onChange={(e) => setSelectedSessionFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Tracked Sessions ({sessions.length})</option>
                  {sessions.map((sess) => (
                    <option key={sess.id} value={sess.id}>
                      {sess.title} ({sess.date || new Date(sess.starts_at).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Bureau Position</th>
                  <th className="py-2.5 px-3">Assigned Officer(s)</th>
                  <th className="py-2.5 px-3 text-center">Present</th>
                  <th className="py-2.5 px-3 text-center">Late</th>
                  <th className="py-2.5 px-3">Attendance Rate</th>
                  <th className="py-2.5 px-3 text-right">Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bureauStats.map((stat) => (
                  <tr key={stat.position_key} className="hover:bg-slate-50/70 transition-colors">
                    {/* Position Name */}
                    <td className="py-3 px-3 font-extrabold text-slate-900">
                      {stat.position_name}
                    </td>

                    {/* Assigned Officers */}
                    <td className="py-3 px-3">
                      {stat.assignedOfficers.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={stat.assignedOfficers[0].avatar}
                            alt={stat.assignedOfficers[0].name}
                            className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-slate-900 truncate">
                              {stat.assignedOfficers[0].name}
                            </span>
                            {stat.assignedOfficers[0].email && (
                              <span className="text-[10px] text-slate-400 truncate">
                                {stat.assignedOfficers[0].email}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-amber-700">
                          <span className="italic text-[11px] font-medium">Vacant</span>
                          <Link
                            href="/admin/roles"
                            className="text-[10px] font-bold text-emerald-700 hover:underline inline-flex items-center gap-0.5"
                          >
                            + Assign
                          </Link>
                        </div>
                      )}
                    </td>

                    {/* Present Count */}
                    <td className="py-3 px-3 text-center font-bold text-emerald-700">
                      {stat.present_count}
                    </td>

                    {/* Late Count */}
                    <td className="py-3 px-3 text-center font-medium text-amber-600">
                      {stat.late_count}
                    </td>

                    {/* Attendance Rate */}
                    <td className="py-3 px-3">
                      {stat.hasSessions && !stat.isVacant ? (
                        <div className="flex items-center gap-2">
                          <div className="w-20 sm:w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                stat.attendance_percentage >= 75
                                  ? 'bg-emerald-600'
                                  : stat.attendance_percentage >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${stat.attendance_percentage}%` }}
                            />
                          </div>
                          <span className="font-extrabold text-slate-800">
                            {stat.attendance_percentage}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-medium">
                          {stat.isVacant ? '—' : 'No Sessions Yet'}
                        </span>
                      )}
                    </td>

                    {/* Performance Status Badge */}
                    <td className="py-3 px-3 text-right">
                      {stat.isVacant ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-500 border border-slate-200">
                          Vacant
                        </span>
                      ) : !stat.hasSessions ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Active Officer
                        </span>
                      ) : stat.attendance_percentage >= 75 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800">
                          Active
                        </span>
                      ) : stat.attendance_percentage >= 50 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800">
                          Moderate
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-100 text-rose-800">
                          Attention
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
