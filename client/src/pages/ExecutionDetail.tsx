import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle, AlertCircle, RefreshCw, XCircle, Slash, StopCircle,
  Clock, DownloadCloud, Activity, Server, FileText, ChevronLeft, ChevronRight
} from 'lucide-react';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const getAuthHeaders = () => ({ headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` } });

export default function ExecutionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [execution, setExecution] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // --- DATA FETCHING ---
  const loadSummary = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/execution/${id}`, getAuthHeaders());
      setExecution(res.data);
    } catch (error) {
      alert("Failed to load execution details.");
      navigate('/executions');
    }
  };

  const loadLogs = async (pageNum = 1) => {
    setIsLogsLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/execution/${id}/logs?page=${pageNum}&limit=50`, getAuthHeaders());
      setLogs(res.data.logs || res.data.items || []);
      const totalLogs = res.data.total_logs || 0;
      setTotalPages(Math.ceil(totalLogs / 50) || 1);
      setPage(pageNum);
    } catch (error) {
      console.error("Failed to load logs");
    } finally {
      setIsLogsLoading(false);
    }
  };

  // --- POLLING IF ACTIVE ---
  useEffect(() => {
    setIsLoading(true);
    loadSummary().then(() => { loadLogs(1); setIsLoading(false); });
  }, [id]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (execution && ['running', 'queued'].includes(execution.status)) {
      interval = setInterval(() => {
        loadSummary();
        if (page === 1) loadLogs(1); // Auto-update logs only if on page 1
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [execution?.status, page]);

  // --- ACTIONS ---
  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to stop this execution?")) return;
    setIsCancelling(true);
    try {
      await axios.post(`${BASE_URL}/execution/${id}/cancel`, {}, getAuthHeaders());
      alert("Execution stopped.");
      loadSummary();
    } catch (error) {
      alert("Failed to cancel.");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleExport = () => {
    window.open(`${BASE_URL}/execution/${id}/export`, '_blank');
  };

  if (isLoading || !execution) return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center"><RefreshCw className="animate-spin text-[#059669]" size={32} /></div>;

  const isActive = ['running', 'queued'].includes(execution.status);
  const safeProgressPercent = execution.total > 0 ? (execution.processed / execution.total) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-[#111827] pb-12">
      
      {/* NAVBAR */}
      <div className="bg-white border-b border-[#E5E7EB] px-8 py-4 sticky top-0 z-40 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/executions')} className="p-2 text-[#6B7280] bg-[#F8FAFC] hover:bg-[#E5E7EB] rounded-lg transition-colors border border-[#E5E7EB]"><ArrowLeft size={18} /></button>
          <div>
            <h1 className="text-xl font-bold text-[#111827] flex items-center gap-2">
              Execution #{execution.execution_id}
              {execution.status === 'completed' && <span className="px-2 py-0.5 rounded bg-[#ECFDF5] text-[#059669] text-[10px] font-bold uppercase tracking-wider border border-[#A7F3D0]">Completed</span>}
              {execution.status === 'failed' && <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-bold uppercase tracking-wider border border-red-200">Failed</span>}
              {isActive && <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider border border-blue-200 flex items-center gap-1"><Activity size={10} className="animate-pulse"/> Running</span>}
              {execution.status === 'cancelled' && <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider border border-gray-300">Cancelled</span>}
            </h1>
          </div>
        </div>

        <div className="flex gap-3">
          {isActive && (
            <button onClick={handleCancel} disabled={isCancelling} className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 text-sm font-bold rounded-xl hover:bg-red-100 shadow-sm flex items-center gap-2">
              <StopCircle size={16}/> {isCancelling ? 'Stopping...' : 'Cancel Execution'}
            </button>
          )}
          <button onClick={handleExport} className="px-4 py-2 bg-white border border-[#E5E7EB] text-[#111827] text-sm font-bold rounded-xl hover:bg-[#F9FAFB] shadow-sm flex items-center gap-2">
            <DownloadCloud size={16}/> Export Full CSV
          </button>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto mt-8 px-6 space-y-6">
        
        {/* 1. SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E5E7EB] p-5 rounded-2xl shadow-sm md:col-span-2">
            <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-3">Configuration Summary</p>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-[11px] text-[#9CA3AF] uppercase">Template</p><p className="font-bold text-[#111827] truncate">{execution.template_name || `ID: ${execution.template_id}`}</p></div>
              <div><p className="text-[11px] text-[#9CA3AF] uppercase">Channel</p><p className="font-bold text-[#111827] capitalize">{execution.channel_type || 'Unknown'}</p></div>
              <div><p className="text-[11px] text-[#9CA3AF] uppercase">Started At</p><p className="font-bold text-[#111827]">{execution.started_at ? new Date(execution.started_at).toLocaleString() : '-'}</p></div>
              <div><p className="text-[11px] text-[#9CA3AF] uppercase">Duration</p><p className="font-bold text-[#111827] flex items-center gap-1"><Clock size={14}/> {execution.duration_seconds || 0}s</p></div>
            </div>
          </div>
          
          <div className="bg-[#ECFDF5] border border-[#A7F3D0] p-5 rounded-2xl shadow-sm text-center flex flex-col justify-center">
             <p className="text-xs font-bold text-[#059669] uppercase tracking-wider mb-1">Delivered</p>
             <p className="text-4xl font-black text-[#059669]">{execution.success?.toLocaleString() || 0}</p>
          </div>

          <div className="bg-red-50 border border-red-200 p-5 rounded-2xl shadow-sm text-center flex flex-col justify-center">
             <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Failed</p>
             <p className="text-4xl font-black text-red-600">{execution.failed?.toLocaleString() || 0}</p>
          </div>
        </div>

        {/* 2. LIVE PROGRESS BAR (If Active) */}
        {isActive && (
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
             <div className="flex justify-between text-sm font-bold mb-2">
                <span className="text-[#111827]">Engine Progress</span>
                <span className="text-[#059669]">{safeProgressPercent.toFixed(1)}% ({execution.processed} / {execution.total})</span>
              </div>
              <div className="w-full bg-[#F3F4F6] rounded-full h-3 overflow-hidden">
                <div className="bg-[#059669] h-3 transition-all duration-500 ease-out" style={{ width: `${safeProgressPercent}%` }} />
              </div>
          </div>
        )}

        {/* 3. LOGS TABLE */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[400px]">
          <div className="bg-[#F8FAFC] px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2">
              <Server size={16} className="text-[#059669]"/> Delivery Logs
            </h3>
            <button onClick={() => loadLogs(page)} className="p-1.5 text-[#6B7280] hover:text-[#111827] transition-colors"><RefreshCw size={14} className={isLogsLoading ? "animate-spin" : ""}/></button>
          </div>
          
          <div className="flex-1 overflow-x-auto">
            {isLogsLoading && logs.length === 0 ? (
               <div className="p-12 text-center text-[#6B7280]">Loading logs...</div>
            ) : logs.length === 0 ? (
               <div className="p-12 text-center text-[#6B7280]">No logs available yet.</div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-white border-b border-[#E5E7EB] text-[11px] uppercase tracking-wider font-bold text-[#6B7280]">
                  <tr>
                    <th className="px-6 py-3">Recipient</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Response Error</th>
                    <th className="px-6 py-3 text-center">Retries</th>
                    <th className="px-6 py-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {logs.map((log, i) => {
                    const status = log.delivery_status || log.status;
                    const error = log.error_message || log.error;
                    return (
                      <tr key={i} className="hover:bg-[#F9FAFB]">
                        <td className="px-6 py-3 font-mono font-medium text-[#111827]">{log.recipient}</td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${status === 'delivered' || status === 'success' ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]' : status === 'failed' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-100 text-gray-600 border-gray-300'}`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-xs">{error ? <span className="text-red-600 truncate max-w-xs block" title={error}>{error}</span> : <span className="text-[#9CA3AF] italic">-</span>}</td>
                        <td className="px-6 py-3 text-xs text-center">{log.retry_count}</td>
                        <td className="px-6 py-3 text-xs text-[#6B7280] text-right">{log.timestamp || log.sent_at ? new Date(log.timestamp || log.sent_at).toLocaleTimeString() : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* PAGINATION */}
          <div className="bg-[#F8FAFC] border-t border-[#E5E7EB] px-6 py-3 flex items-center justify-between">
            <p className="text-xs text-[#6B7280] font-bold">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-2">
              <button disabled={page === 1} onClick={() => loadLogs(page - 1)} className="p-1.5 bg-white border border-[#E5E7EB] rounded hover:bg-[#F9FAFB] disabled:opacity-50"><ChevronLeft size={16}/></button>
              <button disabled={page === totalPages} onClick={() => loadLogs(page + 1)} className="p-1.5 bg-white border border-[#E5E7EB] rounded hover:bg-[#F9FAFB] disabled:opacity-50"><ChevronRight size={16}/></button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}