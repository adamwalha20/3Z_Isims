'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await resetPassword(email);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-[#f4f9f6]">
      <div className="w-full max-w-md flex flex-col gap-5">
        <Link
          href="/login"
          className="self-start inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to sign in</span>
        </Link>

        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-900/10 flex flex-col gap-4">
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">Reset Password</h1>
            <p className="text-xs text-slate-500 mt-1">
              Enter your registered ISIMS club email to receive password recovery instructions.
            </p>
          </div>

          {submitted ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex flex-col items-center text-center gap-2">
              <CheckCircle className="w-6 h-6 text-emerald-700" />
              <span className="text-xs font-bold">Password Reset Instructions Sent</span>
              <p className="text-[11px] text-emerald-800">
                Please check your university mailbox ({email}) to finalize your credential recovery.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Account Email</label>
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

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 active:scale-95 transition-all shadow-sm"
              >
                Send Reset Link
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
