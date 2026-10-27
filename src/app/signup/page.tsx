'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  Lock,
  Mail,
  User,
  GraduationCap,
  Building,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const { signUp, isLoading } = useAuth();

  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [studyField, setStudyField] = useState('L2 DSI — Computer Science');
  const [departmentId, setDepartmentId] = useState('training-innovation');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    const res = await signUp({
      fullName,
      email,
      password,
      studentId: studentId.trim() || `ISIMS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      studyField,
      departmentId,
    });

    if (!res.success) {
      setErrorMsg(res.error || 'Registration failed. Please check your information.');
    } else {
      setIsSuccess(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-[#f4f9f6] py-12">
      <div className="w-full max-w-lg flex flex-col gap-6">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center gap-2">
          <Link href="/" className="group flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-emerald-800 to-emerald-500 p-0.5 shadow-md flex items-center justify-center group-hover:scale-105 transition-transform">
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
              <p className="text-xs text-slate-500 mt-0.5">
                ZERO EXCLUSION CARBON POVERTY • Sfax Chapter Hub
              </p>
            </div>
          </Link>
        </div>

        {/* Card Content */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-900/10 flex flex-col gap-5">
          {isSuccess ? (
            <div className="flex flex-col items-center text-center py-6 gap-4 animate-in fade-in zoom-in duration-300">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-extrabold text-slate-900">Application Submitted!</h2>
                <p className="text-xs text-slate-600 max-w-sm">
                  Welcome to 3ZERO Club ISIMS, <span className="font-bold text-slate-900">{fullName}</span>! Your student profile has been registered and queued for Bureau validation.
                </p>
              </div>

              <div className="w-full p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-left text-xs flex flex-col gap-1.5 text-emerald-950">
                <div className="flex justify-between items-center text-[11px] font-bold text-emerald-800">
                  <span>Student ID</span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded-md border border-emerald-200">{studentId || 'ISIMS-PENDING'}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-emerald-700">Department</span>
                  <span className="font-semibold">{departmentId}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-emerald-700">Membership Status</span>
                  <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full text-[10px]">Pending Approval</span>
                </div>
              </div>

              <button
                onClick={() => router.push('/')}
                className="w-full py-3 px-4 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm mt-2"
              >
                <span>Enter Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-extrabold text-slate-900">Student Member Onboarding</h2>
                <p className="text-xs text-slate-500">
                  Register your ISIMS student profile to join 3ZERO initiatives, events, and task groups.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Full Name & Student ID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Full Name *</label>
                    <div className="relative mt-1">
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Amine Ben Salem"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">Student ID / Matricule</label>
                    <div className="relative mt-1">
                      <input
                        type="text"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        placeholder="ISIMS-2025-XXXX"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
                      />
                      <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="text-xs font-bold text-slate-700">University / Personal Email *</label>
                  <div className="relative mt-1">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="student@isims.u-sfax.tn"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                {/* Study Field & Department Preference */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Field of Study</label>
                    <select
                      value={studyField}
                      onChange={(e) => setStudyField(e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                    >
                      <option value="L1 Computer Science & Multimedia">L1 CS & Multimedia</option>
                      <option value="L2 DSI — Software Engineering">L2 DSI (Software Dev)</option>
                      <option value="L2 SEM — Embedded Systems">L2 SEM (Embedded / IoT)</option>
                      <option value="L3 Multimedia & 3D Design">L3 Multimedia & 3D</option>
                      <option value="Master Climate Tech & AI">Master Green AI</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">Preferred Department</label>
                    <select
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                    >
                      <option value="training-innovation">Training & Innovation</option>
                      <option value="comms-media">Communications & Media</option>
                      <option value="events-logistics">Events & Logistics</option>
                      <option value="partnerships">Partnerships & Sponsorships</option>
                      <option value="governance">General Secretariat</option>
                    </select>
                  </div>
                </div>

                {/* Passwords */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Password *</label>
                    <div className="relative mt-1">
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">Confirm Password *</label>
                    <div className="relative mt-1">
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 pt-1 text-[11px] text-slate-500">
                  <span className="material-symbols-outlined text-[16px] text-emerald-700 shrink-0 mt-0.5">verified</span>
                  <span>
                    By registering, you commit to upholding the values of the 3ZERO charter: Zero Exclusion, Zero Carbon, Zero Poverty.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 mt-1"
                >
                  <span>{isLoading ? 'Creating Account & Passport...' : 'Submit Application & Join'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Already have an account */}
              <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                <span>Already registered as a member?</span>
                <Link href="/login" className="font-bold text-emerald-700 hover:underline">
                  Sign In
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-slate-400">
          ZERO EXCLUSION CARBON POVERTY • ISIMS University Campus Club
        </div>
      </div>
    </div>
  );
}
