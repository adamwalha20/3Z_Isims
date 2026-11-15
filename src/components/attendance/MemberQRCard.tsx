'use client';

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Profile } from '@/types/database.types';
import {
  QrCode,
  Download,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface MemberQRCardProps {
  user: Profile | null;
  bureauPositions?: string[];
  onRegenerate?: () => void;
}

export default function MemberQRCard({ user, bureauPositions = [], onRegenerate }: MemberQRCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrPayload, setQrPayload] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const fetchCredential = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/attendance/qr/credential');
      const data = await res.json();
      if (res.ok && data.success && data.qrPayload) {
        setQrPayload(data.qrPayload);
        const url = await QRCode.toDataURL(data.qrPayload, {
          width: 320,
          margin: 2,
          color: {
            dark: '#064e3b', // Deep emerald
            light: '#ffffff',
          },
        });
        setQrDataUrl(url);
      } else {
        setErrorMessage(data?.error || 'Unable to retrieve cryptographic pass. Please click regenerate.');
        setQrPayload('');
        setQrDataUrl('');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Network error fetching attendance pass.');
      setQrPayload('');
      setQrDataUrl('');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCredential();
  }, [user?.id]);

  const handleRegenerate = async () => {
    if (!confirm('Regenerate your personal attendance QR code? Previous QR screenshots will immediately expire.')) {
      return;
    }

    setIsRegenerating(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const res = await fetch('/api/attendance/qr/credential', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate' }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.qrPayload) {
        setQrPayload(data.qrPayload);
        const url = await QRCode.toDataURL(data.qrPayload, {
          width: 320,
          margin: 2,
          color: { dark: '#064e3b', light: '#ffffff' },
        });
        setQrDataUrl(url);
        setSuccessMessage('Your QR credentials have been renewed. Old QR codes are revoked.');
        if (onRegenerate) onRegenerate();
      } else {
        setErrorMessage(data.error || 'Failed to regenerate credentials');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Network error during regeneration');
    } finally {
      setIsRegenerating(false);
      setTimeout(() => setSuccessMessage(''), 4000);
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `3ZERO_ISIMS_QR_${user?.full_name?.replace(/\s+/g, '_') || 'Member'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const displayPositions = bureauPositions.length > 0
    ? bureauPositions.map((p) => p.replace(/_/g, ' ')).join(' & ')
    : 'Club Member';

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-900/10 shadow-sm max-w-md mx-auto text-center space-y-5">
      {/* Member Header */}
      <div className="flex flex-col items-center gap-2">
        <div className="w-16 h-16 rounded-full ring-4 ring-emerald-500/20 p-0.5 bg-white shadow-xs overflow-hidden">
          <img
            src={user?.avatar_path || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'}
            alt={user?.full_name || 'Member profile'}
            className="w-full h-full rounded-full object-cover"
          />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-900">{user?.full_name || 'Club Member'}</h3>
          <span className="inline-block mt-0.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-200 capitalize">
            {displayPositions}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 font-medium">
          ISIMS Sfax Chapter • Official In-Person Attendance Pass
        </p>
      </div>

      {/* QR Code Container */}
      <div className="relative p-5 bg-gradient-to-b from-emerald-50/50 to-slate-50/50 rounded-3xl border border-emerald-100 flex flex-col items-center justify-center">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <span className="text-xs font-semibold">Generating encrypted QR pass...</span>
          </div>
        ) : (
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
            <img
              src={qrDataUrl}
              alt="Personal Attendance QR Code"
              className="w-60 h-60 object-contain rounded-xl"
            />
          </div>
        )}

        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-800 font-bold">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Cryptographically Signed & Replay Protected</span>
        </div>
      </div>

      {/* Success / Error Alerts */}
      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Security Privacy Notice */}
      <p className="text-[10px] text-slate-400 leading-relaxed px-2">
        This QR code contains an opaque, salted cryptographic credential. No personal email, phone number, or raw database ID is exposed.
      </p>

      {/* Actions */}
      <div className="flex items-center justify-center gap-3 pt-1 border-t border-slate-100">
        <button
          onClick={handleDownload}
          disabled={!qrDataUrl || isLoading}
          className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>Download PNG</span>
        </button>

        <button
          onClick={handleRegenerate}
          disabled={isRegenerating || isLoading}
          className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
          title="Revoke and generate a fresh QR token"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
          <span>Renew QR</span>
        </button>
      </div>
    </div>
  );
}

