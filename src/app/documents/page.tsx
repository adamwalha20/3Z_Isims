'use client';

import React, { useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/lib/auth-context';
import { DocumentCategory, DocumentVisibility } from '@/types/database.types';
import {
  FolderLock,
  Upload,
  FileText,
  Download,
  Lock,
  Unlock,
  ShieldCheck,
  Search,
  BookOpen,
  History,
} from 'lucide-react';

export default function DocumentsPage() {
  const { user, activeRole, documents, addDocument } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('general');
  const [visibility, setVisibility] = useState<DocumentVisibility>('club');

  const filteredDocs = documents.filter((doc) => {
    const matchSearch =
      doc.title.toLowerCase().includes(search.toLowerCase()) ||
      (doc.description && doc.description.toLowerCase().includes(search.toLowerCase()));

    if (!matchSearch) return false;
    if (selectedCategory !== 'all' && doc.category !== selectedCategory) return false;
    return true;
  });

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addDocument({
      title: title.trim(),
      description: description.trim() || 'Uploaded club documentation.',
      storage_path: `vault/${category}/${title.toLowerCase().replace(/\s+/g, '_')}.pdf`,
      category,
      visibility,
      uploaded_by: user?.id || 'usr-yassine-001',
    });

    setTitle('');
    setDescription('');
    setShowUploadModal(false);
  };

  return (
    <AppShell>
      <div className="pt-4 flex flex-col gap-4 max-w-4xl mx-auto w-full pb-20">
        {/* Header Strip */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
              <FolderLock className="w-5 h-5" />
            </span>
            <div>
              <h1 className="font-extrabold text-lg sm:text-xl text-slate-900">Documents & Handover Vault</h1>
              <p className="text-xs text-slate-500">Secure institutional memory & official chapter records</p>
            </div>
          </div>

          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs shadow-md hover:bg-emerald-800 active:scale-95 transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>Upload File</span>
          </button>
        </div>

        {/* Handover Notice Banner */}
        <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50 to-white border border-emerald-200/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">2024-2025 Mandate Transition Pack</h3>
              <p className="text-xs text-slate-600">
                Statutes, CRDA agreements, sponsor registries, and event runbooks are cryptographically archived.
              </p>
            </div>
          </div>
          <button
            onClick={() => alert('Downloading official handover bundle (ZIP)...')}
            className="px-3.5 py-1.5 rounded-xl bg-white text-emerald-900 font-bold text-xs border border-emerald-300 hover:bg-emerald-50 shrink-0 shadow-xs"
          >
            Export Pack
          </button>
        </div>

        {/* Filter and Search */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="flex-1 w-full flex items-center bg-white px-3 py-2 rounded-xl shadow-xs border border-emerald-900/10">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents by title or keyword..."
              className="w-full bg-transparent border-0 p-0 pl-2 focus:outline-none text-xs text-slate-900"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
            {['all', 'charter', 'finance', 'event_runbook', 'handover', 'general'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white font-bold'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Documents Listing */}
        <div className="flex flex-col gap-2.5">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="bg-white p-4 rounded-3xl shadow-xs border border-emerald-900/10 flex items-center justify-between gap-3 hover:border-emerald-300 transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-100">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-sm text-slate-900 truncate">{doc.title}</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold capitalize">
                      {doc.category.replace('_', ' ')}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                      {doc.visibility}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{doc.description}</p>
                  <span className="text-[10px] font-mono text-slate-400 mt-1">{doc.storage_path}</span>
                </div>
              </div>

              <button
                onClick={() => alert(`Downloading verified document: ${doc.title}`)}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 transition-colors shrink-0"
                title="Download authorized file"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          ))}

          {filteredDocs.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
              No documents found matching the filter criteria.
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-emerald-100 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900">Upload to Chapter Vault</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 text-sm font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleUpload} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600">Document Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Q1 Expense Audit & Receipts"
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief note on purpose and date of approval."
                  className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-600">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full mt-1 px-2.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="charter">Charter / Statutes</option>
                    <option value="finance">Finance / Budget</option>
                    <option value="event_runbook">Event Runbook</option>
                    <option value="handover">Handover Memory</option>
                    <option value="training">Training Material</option>
                    <option value="general">General</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600">Visibility</label>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as any)}
                    className="w-full mt-1 px-2.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="club">Club (All Members)</option>
                    <option value="department">Department Only</option>
                    <option value="restricted">Restricted (Bureau)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                <Upload className="w-5 h-5 mx-auto text-emerald-700 mb-1" />
                <span>Simulated Supabase Storage upload path attached automatically.</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 text-white hover:bg-emerald-800"
                >
                  Save to Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
