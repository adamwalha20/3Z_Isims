'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Lock, Mail, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const res = await signIn(email, password);
    if (!res.success) {
      setErrorMsg(res.error || 'Authentication failed. Please verify your credentials.');
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-[#f4f9f6]">
      <div className="w-full max-w-md flex flex-col gap-5">
        {/* Logo and Brand Title */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-emerald-800 to-emerald-500 p-0.5 shadow-md flex items-center justify-center">
            <div className="w-full h-full bg-white rounded-[22px] flex items-center justify-center">
              <span className="material-symbols-outlined text-[30px] text-emerald-700 font-bold">eco</span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">3ZERO CLUB</h1>
              <span className="text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                ISIMS
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              ZERO EXCLUSION CARBON POVERTY • Sfax Chapter Hub
            </p>
          </div>
        </div>

        {/* Login Form Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-900/10 flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-extrabold text-slate-900">Sign in to Workspace</h2>
            <p className="text-xs text-slate-500">
              Private portal for authorized student members and bureau officers.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700">University / Club Email</label>
              <div className="relative mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="member@isims.u-sfax.tn"
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-bold text-emerald-700 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              <span>{isLoading ? 'Verifying Credentials...' : 'Access Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Access Note */}
          <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-100 flex items-center justify-between text-xs text-emerald-900">
            <span>Demo Mode Active</span>
            <button
              type="button"
              onClick={() => {
                setEmail('yassine.mezghani@isims.tn');
                setPassword('3Zero@2025');
              }}
              className="text-[11px] font-bold text-emerald-800 underline"
            >
              Fill Sample Credentials
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-slate-400">
          New student member? Contact your department lead or bureau for onboarding.
        </div>
      </div>
    </div>
  );
}
