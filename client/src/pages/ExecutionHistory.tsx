import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, CheckCircle, XCircle, Slash, Search, Filter, 
  PlayCircle, Eye, RefreshCw, Layers
} from 'lucide-react';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const getAuthHeaders = () => ({
  headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
});

interface Execution {
  execution_id: number;
  template_id?: number;
  template_name?: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  success: number;
  failed: number;
  created_at: string;
}

export default function ExecutionHistory() {
  const navigate = useNavigate();
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const fetchExecutions = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/execution/`, getAuthHeaders());
      setExecutions(res.data.executions || res.data.items || res.data || []);
    } catch (error) {
      console.error("Failed to load execution history.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchExecutions(); }, []);

  const filtered = executions.filter(ex => {
    const matchesStatus = statusFilter === 'all' || ex.status === statusFilter;
    const matchesSearch = ex.execution_id.toString().includes(search) || (ex.template_name || '').toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#ECFDF5] text-[#059669] text-[11px] font-bold uppercase tracking-wider border border-[#A7F3D0]"><CheckCircle size={12}/> Completed</span>;
      case 'failed': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-50 text-red-700 text-[11px] font-bold uppercase tracking-wider border border-red-200"><XCircle size={12}/> Failed</span>;
      case 'running': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-50 text-blue-700 text-[11px] font-bold uppercase tracking-wider border border-blue-200"><Activity className="animate-pulse" size={12}/> Running</span>;
      case 'queued': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-yellow-50 text-yellow-700 text-[11px] font-bold uppercase tracking-wider border border-yellow-200">Queued</span>;
      case 'cancelled': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-gray-100 text-gray-600 text-[11px] font-bold uppercase tracking-wider border border-gray-300"><Slash size={12}/> Cancelled</span>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-[#111827] p-8">
      <div className="max-w-[1200px] mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#111827]">Execution History</h1>
            <p className="text-sm text-[#6B7280] mt-1">Audit and monitor all past and active campaigns.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={fetchExecutions} className="p-2.5 bg-white border border-[#E5E7EB] text-[#4B5563] rounded-xl hover:bg-[#F9FAFB] shadow-sm transition-colors" title="Refresh">
              <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
            </button>
            <button onClick={() => navigate('/executions/new')} className="px-5 py-2.5 bg-[#059669] text-white text-sm font-bold rounded-xl hover:bg-[#047857] shadow-lg shadow-[#059669]/20 flex items-center gap-2 transition-all">
              <PlayCircle size={18} /> New Execution
            </button>
          </div>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          
          {/* TOOLBAR */}
          <div className="p-4 border-b border-[#E5E7EB] bg-[#F8FAFC] flex flex-wrap gap-4 items-center justify-between">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={16} />
              <input type="text" placeholder="Search ID or Template..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm focus:border-[#059669] outline-none shadow-sm" />
            </div>
            <div className="flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-lg p-1 shadow-sm overflow-x-auto">
              <Filter size={14} className="text-[#9CA3AF] ml-2 shrink-0" />
              {(['all', 'completed', 'running', 'failed', 'cancelled'] as const).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md transition-colors ${statusFilter === s ? 'bg-[#111827] text-white' : 'text-[#6B7280] hover:bg-[#F3F4F6]'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* TABLE */}
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[#6B7280]"><RefreshCw className="animate-spin mb-3 text-[#059669]" size={24} /> Loading History...</div>
          ) : filtered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-[#6B7280]">
              <Layers className="text-[#E5E7EB] mb-4" size={48} />
              <p className="font-bold text-[#111827] mb-1">No Executions Found</p>
              <p className="text-sm">Run your first campaign to see logs here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-white border-b border-[#E5E7EB] text-[11px] uppercase tracking-wider font-semibold text-[#6B7280]">
                  <tr>
                    <th className="px-6 py-4">Execution ID</th>
                    <th className="px-6 py-4">Template</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Success</th>
                    <th className="px-6 py-4">Failed</th>
                    <th className="px-6 py-4">Created At</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {filtered.map(ex => (
                    <tr key={ex.execution_id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-[#111827]">#{ex.execution_id}</td>
                      <td className="px-6 py-4 font-medium text-[#4B5563]">{ex.template_name || `Template ID: ${ex.template_id}`}</td>
                      <td className="px-6 py-4">{getStatusBadge(ex.status)}</td>
                      <td className="px-6 py-4 font-bold text-[#059669]">{ex.success?.toLocaleString() || 0}</td>
                      <td className="px-6 py-4 font-bold text-red-600">{ex.failed?.toLocaleString() || 0}</td>
                      <td className="px-6 py-4 text-xs text-[#6B7280]">{new Date(ex.created_at).toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => navigate(`/executions/${ex.execution_id}`)} className="px-4 py-1.5 bg-white border border-[#E5E7EB] text-[#111827] text-xs font-bold rounded-lg hover:bg-[#F9FAFB] shadow-sm flex items-center gap-1.5 ml-auto transition-colors">
                          <Eye size={14}/> View
                        </button>
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