'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  Sparkles,
  GraduationCap,
  Briefcase,
  Check,
  Plus,
  X,
  ArrowRight,
  ShieldAlert,
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

export default function OnboardingModal() {
  const { user, needsOnboarding, setNeedsOnboarding, updateProfileOnboarding, departments } = useAuth();

  const [studentId, setStudentId] = useState(user?.student_id || '');
  const [studyField, setStudyField] = useState(user?.study_field || 'L2 DSI — Software Development');
  const [departmentId, setDepartmentId] = useState('099d1db2-5d20-49c6-91d0-9fc8a9c715a4');
  const [skills, setSkills] = useState<string[]>(user?.skills || ['Climate Action']);
  const [customSkill, setCustomSkill] = useState('');
  const [bio, setBio] = useState(user?.bio || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!needsOnboarding) return null;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (skills.length === 0) {
      setErrorMsg('Please select at least one skill or interest.');
      return;
    }

    setIsSubmitting(true);
    const finalMatricule = studentId.trim() || `ISIMS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const res = await updateProfileOnboarding({
      studentId: finalMatricule,
      studyField,
      skills,
      interestedDepartmentId: departmentId,
      bio,
    });

    setIsSubmitting(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to complete profile. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-emerald-900/10 flex flex-col gap-5 max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-800 to-emerald-500 p-0.5 shadow-md flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center text-emerald-700">
                <Sparkles className="w-6 h-6" />
              </div>
            </div>
            <div>
              <h2 className="font-extrabold text-lg text-slate-900 tracking-tight">
                Complete Your 3ZERO Passport
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Welcome, {user?.full_name || 'Member'}! Set up your skills and department to finalize your workspace credentials.
              </p>
            </div>
          </div>
          <button
            onClick={() => setNeedsOnboarding(false)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Student ID & Field of Study */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Student ID / Matricule *</label>
              <div className="relative mt-1">
                <input
                  type="text"
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g. ISIMS-2025-1042"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
                />
                <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

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
          </div>

          {/* Department Selection */}
          <div>
            <label className="text-xs font-bold text-slate-700">Department Interested In</label>
            <div className="relative mt-1">
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
              >
                <option value="099d1db2-5d20-49c6-91d0-9fc8a9c715a4">Training & Innovation</option>
                <option value="3ffc2c42-b04d-4c83-a764-a1bcbac793d1">Communications & Media</option>
                <option value="b63e6baf-df40-4599-b917-e6527ba69814">Events & Logistics</option>
                <option value="72856269-e382-42e1-8526-7d9dd3ccd3e8">Partnerships & Sponsorships</option>
                <option value="3dd6e459-84ef-42c7-9ba8-7a817a4f98fc">General Secretariat & Governance</option>
              </select>
              <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          {/* Skills Picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">Your Skills & Strengths *</label>
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

            {/* Custom Skill Input */}
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={customSkill}
                onChange={(e) => setCustomSkill(e.target.value)}
                placeholder="Add other skill (e.g. Flutter, 3D Blender, Copywriting)"
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

          {/* Short Bio */}
          <div>
            <label className="text-xs font-bold text-slate-700">Bio / Motivation (Optional)</label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="What drives your commitment to Zero Exclusion, Zero Carbon, Zero Poverty at ISIMS?"
              className="w-full mt-1 p-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 mt-1"
          >
            <span>{isSubmitting ? 'Saving Passport...' : 'Save & Enter 3ZERO Hub'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
