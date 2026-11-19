'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { PhysicalSession, Profile } from '@/types/database.types';
import { getSafeAvatar } from '@/lib/constants/avatars';
import {
  Camera,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Users,
  Search,
  ArrowRight,
  Sparkles,
  Clock,
  Play,
  Pause,
  StopCircle,
  ExternalLink,
  ShieldAlert,
  Calendar,
  MapPin,
  Award,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { formatTunisTime } from '@/lib/email/timezone-utils';
import { canAccessAttendanceScanner } from '@/lib/attendance/attendance-auth';
import { useTranslation } from '@/lib/i18n/context';

interface ScanResultCard {
  success: boolean;
  alreadyRegistered: boolean;
  member: {
    id: string;
    name: string;
    position: string;
    avatar?: string;
  };
  session: {
    id: string;
    title: string;
  };
  attendance: {
    checkedInAt: string;
    arrivalTimeFormatted: string;
    status: string;
    xpAwarded: number;
  };
  message?: string;
}

export default function AttendanceScannerPage() {
  const { t, isRtl } = useTranslation();
  const { user, activeRole, isAdmin, members, userBureauPositions, activeBureauPosition } = useAuth();
  const isAuthorized = canAccessAttendanceScanner({
    activeRole,
    isAdmin,
    userEmail: user?.email,
    userBureauPositions,
    activeBureauPosition,
  });

  // Session state
  const [sessions, setSessions] = useState<PhysicalSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [selectedSession, setSelectedSession] = useState<PhysicalSession | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState<boolean>(true);

  // Fresh refs to avoid stale closure traps in camera scanning callback
  const selectedSessionIdRef = useRef<string>('');
  const selectedSessionRef = useRef<PhysicalSession | null>(null);

  useEffect(() => {
    selectedSessionIdRef.current = selectedSessionId;
  }, [selectedSessionId]);

  useEffect(() => {
    selectedSessionRef.current = selectedSession;
  }, [selectedSession]);

  // Scanner state
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scannerError, setScannerError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [lastScannedPayload, setLastScannedPayload] = useState<string>('');
  const [isProcessingScan, setIsProcessingScan] = useState<boolean>(false);

  // Confirmation Result Card
  const [scanResult, setScanResult] = useState<ScanResultCard | null>(null);

  // Manual fallback search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCheckingInManual, setIsCheckingInManual] = useState<boolean>(false);

  // Html5Qrcode ref
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'attendance-qr-reader';
  const lastScanTimeRef = useRef<number>(0);

  // 1. Fetch available physical sessions
  const fetchSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const res = await fetch('/api/attendance/sessions');
      const data = await res.json();
      if (res.ok && data.success && data.sessions && data.sessions.length > 0) {
        setSessions(data.sessions);
        // Default to first open or draft session
        const openSess = data.sessions.find((s: PhysicalSession) => s.attendance_status === 'open');
        const defaultSess = openSess || data.sessions[0];
        if (defaultSess) {
          setSelectedSessionId(defaultSess.id);
          setSelectedSession(defaultSess);
        }
      } else {
        setSessions([]);
        setSelectedSessionId('');
        setSelectedSession(null);
      }
    } catch (err) {
      console.warn('Sessions load notice:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // Update selected session object when id changes
  useEffect(() => {
    const found = sessions.find((s) => s.id === selectedSessionId) || null;
    setSelectedSession(found);
  }, [selectedSessionId, sessions]);

  // Handle session lifecycle updates
  const handleUpdateSessionStatus = async (newStatus: 'open' | 'paused' | 'closed' | 'finalized') => {
    if (!selectedSessionId) return;
    try {
      const res = await fetch('/api/attendance/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: selectedSessionId, attendance_status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSessions((prev) =>
          prev.map((s) => (s.id === selectedSessionId ? { ...s, attendance_status: newStatus } : s))
        );
        setSelectedSession((prev) => (prev ? { ...prev, attendance_status: newStatus } : null));
      }
    } catch (err: any) {
      alert(`Error updating session status: ${err?.message}`);
    }
  };

  // 2. Start Camera Scanner
  const startCamera = async () => {
    setScannerError('');
    setIsScanning(true);

    try {
      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.stop().catch(() => {});
      }

      const qrScanner = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      html5QrCodeRef.current = qrScanner;

      await qrScanner.start(
        { facingMode: 'environment' }, // Rear camera preferred on mobile
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        async (decodedText) => {
          handleScanSuccess(decodedText);
        },
        (error) => {
          // Continuous search noise, ignore
        }
      );
    } catch (err: any) {
      setScannerError(err?.message || 'Unable to access device camera. Please check camera permissions.');
      setIsScanning(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
      } catch {}
    }
    setIsScanning(false);
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // 3. Process Scanned QR
  const handleScanSuccess = async (decodedText: string) => {
    const now = Date.now();
    // Throttle repeated scans within 3 seconds for the same text
    if (decodedText === lastScannedPayload && now - lastScanTimeRef.current < 3000) {
      return;
    }

    lastScanTimeRef.current = now;
    setLastScannedPayload(decodedText);

    const activeSessionId = selectedSessionIdRef.current || selectedSessionId;
    const activeSession = selectedSessionRef.current || selectedSession;

    // Guard 1: Verify a session is selected
    if (!activeSessionId || !activeSession) {
      setScanResult({
        success: false,
        alreadyRegistered: false,
        member: { id: '', name: 'No Session Selected', position: 'Action Required' },
        session: { id: '', title: 'None Selected' },
        attendance: { checkedInAt: new Date().toISOString(), arrivalTimeFormatted: '--:--', status: 'error', xpAwarded: 0 },
        message: 'Please select an in-person session above before scanning.',
      });
      return;
    }

    // Guard 2: Verify session attendance is currently open
    if (activeSession.attendance_status !== 'open') {
      setScanResult({
        success: false,
        alreadyRegistered: false,
        member: { id: '', name: 'Attendance Not Open', position: (activeSession.attendance_status || 'closed').toUpperCase() },
        session: { id: activeSession.id, title: activeSession.title },
        attendance: { checkedInAt: new Date().toISOString(), arrivalTimeFormatted: '--:--', status: 'error', xpAwarded: 0 },
        message: `Session attendance is currently "${activeSession.attendance_status}". Click "Open Attendance" above to begin scanning.`,
      });
      return;
    }

    setIsProcessingScan(true);

    try {
      const res = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrPayload: decodedText,
          sessionId: activeSessionId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setScanResult(data);
        // Play gentle audio feedback if supported
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.frequency.value = data.alreadyRegistered ? 400 : 880;
          gain.gain.value = 0.1;
          osc.start();
          osc.stop(audioCtx.currentTime + 0.15);
        } catch {}
      } else {
        setScanResult({
          success: false,
          alreadyRegistered: false,
          member: { id: '', name: 'Scan Error', position: 'Unverified' },
          session: { id: activeSessionId, title: activeSession?.title || 'Session' },
          attendance: { checkedInAt: new Date().toISOString(), arrivalTimeFormatted: '--:--', status: 'error', xpAwarded: 0 },
          message: data.error || 'Failed to verify member QR code',
        });
      }
    } catch (err: any) {
      setScanResult({
        success: false,
        alreadyRegistered: false,
        member: { id: '', name: 'Network Error', position: 'Unverified' },
        session: { id: activeSessionId, title: activeSession?.title || 'Session' },
        attendance: { checkedInAt: new Date().toISOString(), arrivalTimeFormatted: '--:--', status: 'error', xpAwarded: 0 },
        message: err?.message || 'Server request failed',
      });
    } finally {
      setIsProcessingScan(false);
    }
  };

  // 4. Manual Fallback Check-in
  const handleManualCheckIn = async (memberId: string) => {
    const activeSessionId = selectedSessionIdRef.current || selectedSessionId;
    const activeSession = selectedSessionRef.current || selectedSession;

    if (!activeSessionId || !activeSession) {
      alert('Please select an active session first.');
      return;
    }

    if (activeSession.attendance_status !== 'open') {
      alert(`Attendance is currently ${activeSession.attendance_status}. Please open attendance first.`);
      return;
    }
    setIsCheckingInManual(true);

    try {
      const res = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manualMemberId: memberId,
          sessionId: activeSessionId,
        }),
      });

      const data = await res.json();
      setScanResult(data);
      setSearchQuery('');
    } catch (err: any) {
      alert(`Manual check-in failed: ${err?.message}`);
    } finally {
      setIsCheckingInManual(false);
    }
  };

  // Filtered members for manual search
  const filteredMembers = members.filter((m) => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase();
    return (
      m.full_name?.toLowerCase().includes(q) ||
      m.student_id?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q)
    );
  });

  if (!isAuthorized) {
    return (
      <AppShell>
        <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900">{t('attendance.restrictedNotice')}</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {t('attendance.restrictedDesc')}
          </p>
          <div className="pt-2">
            <Link
              href="/attendance"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
            >
              <span>{t('attendance.backToAttendance')}</span>
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Header Banner */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-emerald-800 text-white flex items-center justify-center shadow-xs shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-slate-900 tracking-tight">
                  {t('attendance.scannerTitle')}
                </h1>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/70 text-[10px] font-semibold uppercase">
                  Live Scanner
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('attendance.scannerSubtitle')}
              </p>
            </div>
          </div>

          {selectedSession && (
            <Link
              href={`/attendance/sessions/${selectedSession.id}`}
              className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Users className="w-3.5 h-3.5 text-emerald-700" />
              <span>{t('attendance.sessionDashboard')}</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </Link>
          )}
        </div>

        {/* 1. Session Selector & Lifecycle Controller */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                Select Active In-Person Session
              </label>
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white text-slate-900"
              >
                {sessions.map((sess) => (
                  <option key={sess.id} value={sess.id}>
                    {sess.title} • {sess.date} ({sess.attendance_status.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            {/* Lifecycle Status Pill & Controls */}
            {selectedSession && (
              <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-4">
                <span className={`px-2 py-0.5 rounded-md text-xs font-medium uppercase ${
                  selectedSession.attendance_status === 'open'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : selectedSession.attendance_status === 'paused'
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {selectedSession.attendance_status}
                </span>

                {selectedSession.attendance_status !== 'open' ? (
                  <button
                    onClick={() => handleUpdateSessionStatus('open')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Open Attendance</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpdateSessionStatus('paused')}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {selectedSession && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{selectedSession.location}</span>
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Starts: {formatTunisTime(selectedSession.starts_at)}</span>
              </span>
              <span className="flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-slate-400" />
                <span>Punctual: +{selectedSession.xp_on_time} XP • Late: +{selectedSession.xp_late} XP</span>
              </span>
            </div>
          )}
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab('camera');
              if (!isScanning) startCamera();
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'camera'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Camera Scanner</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('manual');
              stopCamera();
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'manual'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Manual Fallback Search</span>
          </button>
        </div>

        {/* 2. Confirmation Card (Instant Verification Banner) */}
        {scanResult && (
          <div className={`p-4 rounded-xl border shadow-xs transition-colors ${
            scanResult.success
              ? 'bg-emerald-50/70 border-emerald-300'
              : scanResult.alreadyRegistered
              ? 'bg-amber-50/70 border-amber-300'
              : 'bg-rose-50 border-rose-300'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  scanResult.success ? 'bg-emerald-700 text-white' : scanResult.alreadyRegistered ? 'bg-amber-600 text-white' : 'bg-rose-600 text-white'
                }`}>
                  {scanResult.success ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{scanResult.member.name}</h3>
                    <span className="px-2 py-0.2 rounded-md text-[10px] font-medium bg-white text-slate-700 border border-slate-200 shadow-2xs">
                      {scanResult.member.position}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-0.5">
                    {scanResult.alreadyRegistered
                      ? scanResult.message
                      : scanResult.success
                      ? `Successfully checked in to ${scanResult.session.title}`
                      : scanResult.message}
                  </p>
                </div>
              </div>

              {scanResult.success && (
                <div className="text-right shrink-0">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                    scanResult.attendance.status === 'present'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {scanResult.attendance.status === 'present' ? 'On Time' : 'Late Arrival'}
                  </span>
                  <div className="text-emerald-700 font-extrabold text-xs mt-1">
                    +{scanResult.attendance.xpAwarded} XP Awarded
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Arrival Time: {scanResult.attendance.arrivalTimeFormatted} (Africa/Tunis)</span>
              <span className="text-emerald-800 font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ready for next scan</span>
              </span>
            </div>
          </div>
        )}

        {/* 3. Camera Scanner Interface */}
        {activeTab === 'camera' && (
          <div className="bg-white rounded-3xl p-6 border border-emerald-900/10 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Live Device Camera</h3>
                <p className="text-xs text-slate-500">Center the member&apos;s personal QR code in the viewport</p>
              </div>

              <div className="flex items-center gap-2">
                {!isScanning ? (
                  <button
                    onClick={startCamera}
                    disabled={selectedSession?.attendance_status !== 'open'}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Start Scanner</span>
                  </button>
                ) : (
                  <button
                    onClick={stopCamera}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <StopCircle className="w-3.5 h-3.5" />
                    <span>Stop</span>
                  </button>
                )}
              </div>
            </div>

            {selectedSession?.attendance_status !== 'open' && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    Attendance is currently {selectedSession?.attendance_status || 'closed'}. Click to enable scanning.
                  </span>
                </div>
                {selectedSession && (
                  <button
                    onClick={() => handleUpdateSessionStatus('open')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors shrink-0 self-start sm:self-auto shadow-xs"
                  >
                    Open Attendance Now
                  </button>
                )}
              </div>
            )}

            {scannerError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{scannerError}</span>
              </div>
            )}

            {/* Html5Qrcode Reader Container */}
            <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 min-h-[300px] flex items-center justify-center">
              <div id={scannerContainerId} className="w-full max-w-sm overflow-hidden" />
              {!isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-white gap-3 p-4">
                  <div className="w-14 h-14 rounded-3xl bg-white/10 flex items-center justify-center">
                    <QrCode className="w-8 h-8 text-emerald-400" />
                  </div>
                  <span className="text-xs font-bold">Camera is paused</span>
                  <button
                    onClick={startCamera}
                    disabled={selectedSession?.attendance_status !== 'open'}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50"
                  >
                    Activate Camera
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. Manual Fallback Search */}
        {activeTab === 'manual' && (
          <div className="bg-white rounded-3xl p-6 border border-emerald-900/10 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Manual Member Search</h3>
              <p className="text-xs text-slate-500">Search members by name, student ID, or email for manual arrival registration</p>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Type member name or student ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-slate-900"
              />
            </div>

            {searchQuery && (
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {filteredMembers.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No matching members found
                  </div>
                ) : (
                  filteredMembers.map((m) => (
                    <div key={m.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={getSafeAvatar(m.avatar_path)}
                          alt={m.full_name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900">{m.full_name}</div>
                          <div className="text-[11px] text-slate-500">{m.student_id || m.email}</div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleManualCheckIn(m.id)}
                        disabled={isCheckingInManual || selectedSession?.attendance_status !== 'open'}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        Register Check-in
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

