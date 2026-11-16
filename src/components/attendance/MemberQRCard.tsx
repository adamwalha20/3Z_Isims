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
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs max-w-md mx-auto text-center space-y-4">
      {/* Member Header */}
      <div className="flex flex-col items-center gap-2">
        <div className="w-14 h-14 rounded-full border border-slate-200 p-0.5 bg-white shadow-xs overflow-hidden">
          <img
            src={user?.avatar_path || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'}
            alt={user?.full_name || 'Member profile'}
            className="w-full h-full rounded-full object-cover"
          />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900">{user?.full_name || 'Club Member'}</h3>
          <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/70 capitalize">
            {displayPositions}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 font-medium">
          ISIMS Sfax Chapter • Official In-Person Attendance Pass
        </p>
      </div>

      {/* QR Code Container */}
      <div className="relative p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center">
        {isLoading ? (
          <div className="h-60 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-700" />
            <span className="text-xs font-medium">Generating encrypted pass...</span>
          </div>
        ) : (
          <div className="bg-white p-2.5 rounded-lg shadow-xs border border-slate-200">
            <img
              src={qrDataUrl}
              alt="Personal Attendance QR Code"
              className="w-56 h-56 object-contain"
            />
          </div>
        )}

        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>Cryptographically Signed & Replay Protected</span>
        </div>
      </div>

      {/* Success / Error Alerts */}
      {successMessage && (
        <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Security Privacy Notice */}
      <p className="text-[10px] text-slate-400 leading-relaxed px-2">
        This QR code contains an opaque, salted cryptographic credential. No personal email, phone number, or raw database ID is exposed.
      </p>

      {/* Actions */}
      <div className="flex items-center justify-center gap-2.5 pt-1 border-t border-slate-100">
        <button
          onClick={handleDownload}
          disabled={!qrDataUrl || isLoading}
          className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>Download PNG</span>
        </button>

        <button
          onClick={handleRegenerate}
          disabled={isRegenerating || isLoading}
          className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
          title="Revoke and generate a fresh QR token"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
          <span>Renew QR</span>
        </button>
      </div>
    </div>
  );
}

