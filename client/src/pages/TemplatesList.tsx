import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Search, Plus, Trash2, Edit, CheckCircle2, 
  AlertCircle, Lock, RefreshCw, Filter 
} from 'lucide-react';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const getAuthHeaders = () => ({
  headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
});

interface Template {
  logical_id: string;
  version: number;
  name: string;
  description: string;
  status: 'published' | 'draft';
  updated_at: string;
}

export default function TemplatesList() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/campaign-template`, getAuthHeaders());
      // Handle various backend wrapper formats
      setTemplates(res.data.templates || res.data.items || res.data || []);
    } catch (error) {
      console.error("Failed to load templates", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleDelete = async (logical_id: string) => {
    if (!window.confirm("Archive this template? This will soft-delete all versions.")) return;
    try {
      await axios.delete(`${BASE_URL}/campaign-template/${logical_id}`, getAuthHeaders());
      setTemplates(prev => prev.filter(t => t.logical_id !== logical_id));
    } catch (error) {
      alert("Failed to archive template.");
    }
  };

  const handleQuickPublish = async (logical_id: string) => {
    try {
      await axios.post(`${BASE_URL}/campaign-template/${logical_id}/publish`, {}, getAuthHeaders());
      fetchTemplates(); // Reload to get updated status
    } catch (error) {
      alert("Failed to publish template.");
    }
  };

  const filtered = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-[#111827] p-8">
      <div className="max-w-[1200px] mx-auto">
        
        {/* HEADER & CONTROLS */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#111827]">Campaign Templates</h1>
            <p className="text-sm text-[#6B7280] mt-1">Manage, version, and publish your messaging workflows.</p>
          </div>
          <button 
            onClick={() => navigate('/templates/create')}
            className="px-4 py-2.5 bg-[#111827] text-white text-sm font-medium rounded-lg hover:bg-[#1F2937] shadow-sm flex items-center gap-2 transition-all"
          >
            <Plus size={16} /> New Template
          </button>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          
          {/* TOOLBAR */}
          <div className="p-4 border-b border-[#E5E7EB] bg-[#F8FAFC] flex flex-wrap gap-4 items-center justify-between">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={16} />
              <input 
                type="text" placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm focus:border-[#059669] outline-none shadow-sm"
              />
            </div>
            <div className="flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-lg p-1 shadow-sm">
              <Filter size={14} className="text-[#9CA3AF] ml-2" />
              {(['all', 'published', 'draft'] as const).map(s => (
                <button 
                  key={s} onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${statusFilter === s ? 'bg-[#ECFDF5] text-[#059669]' : 'text-[#6B7280] hover:bg-[#F3F4F6]'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* TABLE */}
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[#6B7280]"><RefreshCw className="animate-spin mb-2" /> Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <FileText className="text-[#E5E7EB] mb-4" size={48} />
              <p className="font-bold text-[#111827]">No templates found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-white border-b border-[#E5E7EB] text-[11px] uppercase tracking-wider font-semibold text-[#6B7280]">
                  <tr>
                    <th className="px-6 py-4">Name & Description</th>
                    <th className="px-6 py-4">Version</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Last Updated</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {filtered.map(t => (
                    <tr key={t.logical_id} className="hover:bg-[#F9FAFB] transition-colors group">
                      <td className="px-6 py-4">
                        <p className="font-bold text-[#111827]">{t.name}</p>
                        <p className="text-xs text-[#6B7280] mt-0.5 truncate max-w-xs">{t.description || 'No description'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-[#F3F4F6] text-[#4B5563] font-mono text-xs font-bold rounded border border-[#E5E7EB]">v{t.version}</span>
                      </td>
                      <td className="px-6 py-4">
                        {t.status === 'published' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#ECFDF5] text-[#059669] text-[11px] font-bold uppercase tracking-wider border border-[#A7F3D0]"><Lock size={12}/> Published</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#FFFBEB] text-[#D97706] text-[11px] font-bold uppercase tracking-wider border border-[#FDE68A]"><AlertCircle size={12}/> Draft</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-[#6B7280]">{new Date(t.updated_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {t.status === 'draft' && (
                            <button onClick={() => handleQuickPublish(t.logical_id)} className="p-1.5 text-[#059669] hover:bg-[#ECFDF5] rounded transition-colors" title="Publish Draft"><CheckCircle2 size={16}/></button>
                          )}
                          <button onClick={() => navigate(`/templates/${t.logical_id}`)} className="p-1.5 text-[#3B82F6] hover:bg-blue-50 rounded transition-colors" title="View / Edit"><Edit size={16}/></button>
                          <button onClick={() => handleDelete(t.logical_id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" title="Archive"><Trash2 size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}