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
  Briefcase,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Check,
  Plus,
} from 'lucide-react';

const SUGGESTED_SKILLS = [
  'Web Development',
  'UI/UX Design',
  'Climate Action & Carbon Audits',
  'Event Organization & Logistics',
  'Marketing & Social Media',
  'Video Production & Photo',
  'Finance & Sponsorships',
  'IoT & Embedded Tech',
  'Community Management',
  'Public Speaking',
];

export default function SignUpPage() {
  const router = useRouter();
  const { signUp, signInWithGoogle, isLoading } = useAuth();

  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [studyField, setStudyField] = useState('L2 DSI — Software Development');
  const [departmentId, setDepartmentId] = useState('099d1db2-5d20-49c6-91d0-9fc8a9c715a4');
  const [skills, setSkills] = useState<string[]>(['Climate Action']);
  const [customSkill, setCustomSkill] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const toggleSkill = (skill: string) => {
    if (skills.includes(skill)) {
      setSkills(skills.filter((s) => s !== skill));
    } else {
      setSkills([...skills, skill]);
    }
  };

  const handleAddCustomSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (customSkill.trim() && !skills.includes(customSkill.trim())) {
      setSkills([...skills, customSkill.trim()]);
      setCustomSkill('');
    }
  };

  const handleGoogleSignUp = async () => {
    setErrorMsg('');
    setIsGoogleLoading(true);
    const res = await signInWithGoogle();
    setIsGoogleLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to sign in with Google. You can register with email below.');
    }
  };

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

    if (skills.length === 0) {
      setErrorMsg('Please select at least one skill.');
      return;
    }

    const res = await signUp({
      fullName,
      email,
      password,
      studentId: studentId.trim() || `ISIMS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      studyField,
      departmentId,
      skills,
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
                  Welcome to 3ZERO Club ISIMS, <span className="font-bold text-slate-900">{fullName}</span>! Your profile with your selected skills and department has been saved. The Bureau Administrator can now assign roles and project tasks to your profile.
                </p>
              </div>

              <div className="w-full p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-left text-xs flex flex-col gap-2 text-emerald-950">
                <div className="flex justify-between items-center text-[11px] font-bold text-emerald-800">
                  <span>Student ID</span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded-md border border-emerald-200">{studentId || 'ISIMS-PENDING'}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-emerald-700">Field of Study</span>
                  <span className="font-semibold">{studyField}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-emerald-700">Skills Attached</span>
                  <span className="font-semibold">{skills.length} skills</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-emerald-700">Membership Status</span>
                  <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full text-[10px]">Registered (Pending Review)</span>
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
                <h2 className="text-lg font-extrabold text-slate-900">Join 3ZERO Club ISIMS</h2>
                <p className="text-xs text-slate-500">
                  Register your skills and department to join climate projects or apply for bureau responsibilities.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Google Sign Up Button */}
              <button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={isLoading || isGoogleLoading}
                className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-2.5 shadow-xs disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isGoogleLoading ? 'Connecting to Google...' : 'Sign up with Google'}</span>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200"></div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">or register with email</span>
                <div className="flex-1 h-px bg-slate-200"></div>
              </div>

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
                        placeholder="e.g. Aziz Ben Salah"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">Student ID / Matricule *</label>
                    <div className="relative mt-1">
                      <input
                        type="text"
                        required
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
                      <option value="L2 DSI — Software Development">L2 DSI (Software Dev)</option>
                      <option value="L2 SEM — Embedded Systems & IoT">L2 SEM (Embedded IoT)</option>
                      <option value="L3 Multimedia & 3D Design">L3 Multimedia & 3D</option>
                      <option value="Master Climate Tech & Green AI">Master Green AI</option>
                      <option value="Engineering & Applied Sciences">Applied Sciences</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">Interested Department *</label>
                    <select
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                    >
                      <option value="099d1db2-5d20-49c6-91d0-9fc8a9c715a4">Training & Innovation</option>
                      <option value="3ffc2c42-b04d-4c83-a764-a1bcbac793d1">Communications & Media</option>
                      <option value="b63e6baf-df40-4599-b917-e6527ba69814">Events & Logistics</option>
                      <option value="72856269-e382-42e1-8526-7d9dd3ccd3e8">Partnerships & Sponsorships</option>
                      <option value="3dd6e459-84ef-42c7-9ba8-7a817a4f98fc">General Secretariat</option>
                    </select>
                  </div>
                </div>

                {/* Skills Picker */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">What Skills Do You Have? *</label>
                    <span className="text-[11px] text-emerald-700 font-semibold">{skills.length} selected</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 max-h-40 overflow-y-auto no-scrollbar">
                    {SUGGESTED_SKILLS.map((sk) => {
                      const active = skills.includes(sk);
                      return (
                        <button
                          key={sk}
                          type="button"
                          onClick={() => toggleSkill(sk)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                            active
                              ? 'bg-emerald-700 text-white shadow-xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {active && <Check className="w-3 h-3" />}
                          <span>{sk}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={customSkill}
                      onChange={(e) => setCustomSkill(e.target.value)}
                      placeholder="Add another skill (e.g. React, Permaculture, Blender)"
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomSkill}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
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
                  disabled={isLoading || isGoogleLoading}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 mt-1"
                >
                  <span>{isLoading ? 'Creating Account & Passport...' : 'Submit Registration'}</span>
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
