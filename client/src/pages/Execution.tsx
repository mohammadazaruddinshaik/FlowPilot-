// import React, { useState, useEffect, useRef } from 'react';
// import { 
//   FileText, UploadCloud, Settings, PlayCircle, CheckCircle, 
//   AlertCircle, ChevronRight, ChevronLeft, MessageSquare, 
//   Mail, Activity, Server, Users, RefreshCw, XCircle, Slash, StopCircle,
//   List, Clock, Zap, Eye, DownloadCloud, Database
// } from 'lucide-react';
// import { useNavigate } from 'react-router-dom';
// import axios from 'axios';

// // --- CONFIGURATION & API ---
// const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
// const WS_BASE_URL = BASE_URL.replace(/^http/, 'ws');

// const getAuthHeaders = (isFormData = false) => {
//   const token = localStorage.getItem('access_token');
//   if (isFormData) {
//     return { headers: { 'Authorization': `Bearer ${token}` } };
//   }
//   return { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } };
// };

// const getErrorMessage = (error: any, fallback: string) => {
//   const detail = error.response?.data?.detail;
//   if (Array.isArray(detail)) return detail[0]?.msg || fallback;
//   if (typeof detail === 'string') return detail;
//   return error.message || fallback;
// };

// // --- STRICT API SERVICES ---
// const api = {
//   getTemplates: async () => {
//     const res = await axios.get(`${BASE_URL}/campaign-template`, getAuthHeaders());
//     return res.data;
//   },
//   previewCsv: async (file: File) => {
//     const formData = new FormData();
//     formData.append('file', file);
//     const res = await axios.post(`${BASE_URL}/execution/preview-schema`, formData, getAuthHeaders(true));
//     return res.data;
//   },
//   getIntegrations: async () => {
//     const res = await axios.get(`${BASE_URL}/integrations`, getAuthHeaders());
//     return res.data;
//   },
//   testFilter: async (logicalId: string, file: File) => {
//     const formData = new FormData();
//     formData.append("logical_id", logicalId);
//     formData.append("file", file);
//     const res = await axios.post(`${BASE_URL}/campaign-template/test-filter`, formData, getAuthHeaders(true));
//     return res.data;
//   },
//   startExecution: async (payload: FormData) => {
//     const res = await axios.post(`${BASE_URL}/execution/run`, payload, getAuthHeaders(true));
//     return res.data;
//   },
//   cancelExecution: async (id: number) => {
//     const res = await axios.post(`${BASE_URL}/execution/${id}/cancel`, {}, getAuthHeaders());
//     return res.data;
//   },
//   getExecutionLogs: async (id: number, page = 1) => {
//     const res = await axios.get(`${BASE_URL}/execution/${id}/logs?page=${page}&limit=50`, getAuthHeaders());
//     return res.data;
//   },
//   exportFailedLogs: (id: number) => {
//     window.open(`${BASE_URL}/execution/${id}/export-failed`, '_blank');
//   }
// };

// // --- TYPES ---
// interface Template { logical_id: string; version: number; name: string; status: string; variables?: string[]; filter_definition?: any; filter_dsl?: any; }
// interface SchemaItem { name: string; type: string; }
// interface Integration { id: number; channel_type: string; provider_name: string; is_active: boolean; }
// interface WsData { status: string; processed: number; total: number; success: number; failed: number; progress_percent: number; error?: string; }
// interface LogEntry { recipient: string; status: string; delivery_status?: string; retry_count: number; timestamp?: string; sent_at?: string; error?: string; error_message?: string; }

// export default function Executor() {
//   const navigate = useNavigate();
//   const [activeStep, setActiveStep] = useState<number>(1);
//   const [toast, setToast] = useState<{message: string, type: 'success'|'error'|'warning'} | null>(null);

//   // Data States
//   const [templates, setTemplates] = useState<Template[]>([]);
//   const [integrations, setIntegrations] = useState<Integration[]>([]);
//   const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  
//   // CSV States
//   const [csvFile, setCsvFile] = useState<File | null>(null);
//   const [schema, setSchema] = useState<SchemaItem[]>([]);
//   const [sampleRows, setSampleRows] = useState<any[]>([]);
//   const [rowCount, setRowCount] = useState(0);
  
//   // Config States
//   const [channelType, setChannelType] = useState<'whatsapp' | 'email'>('whatsapp');
//   const [selectedIntegrationId, setSelectedIntegrationId] = useState<number | ''>('');
//   const [recipientColumn, setRecipientColumn] = useState<string>('');
  
//   // Review States
//   const [matchedCount, setMatchedCount] = useState<number | null>(null);
//   const [matchedRows, setMatchedRows] = useState<any[]>([]);
//   const [isTestingFilter, setIsTestingFilter] = useState(false);

//   // Monitor States
//   const [isStarting, setIsStarting] = useState(false);
//   const [executionId, setExecutionId] = useState<number | null>(null);
//   const [wsData, setWsData] = useState<WsData | null>(null);
//   const wsRef = useRef<WebSocket | null>(null);
//   const executionStartTime = useRef<number>(0);
//   const [executionDuration, setExecutionDuration] = useState<number>(0);

//   // Logs States
//   const [logs, setLogs] = useState<LogEntry[]>([]);
//   const [isLoadingLogs, setIsLoadingLogs] = useState(false);
//   const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
//   const [isCancelling, setIsCancelling] = useState(false);

//   const showToast = (msg: string, type: 'success'|'error'|'warning') => { 
//     setToast({ message: msg, type }); 
//     setTimeout(() => setToast(null), 4000); 
//   };

//   // --- INITIAL LOAD ---
//   useEffect(() => {
//     api.getTemplates().then(res => {
//       const allTpls = res.templates || res.items || res || [];
//       setTemplates(allTpls.filter((t: Template) => t.status === 'published'));
//     }).catch((err) => showToast(getErrorMessage(err, "Failed to load templates"), "error"));

//     api.getIntegrations().then(res => {
//       setIntegrations(res.integrations || res.items || res || []);
//     }).catch((err) => showToast(getErrorMessage(err, "Failed to load integrations"), "error"));
//   }, []);

//   const resetFileState = () => {
//     setCsvFile(null); 
//     setSchema([]); 
//     setSampleRows([]); 
//     setRowCount(0); 
//     setRecipientColumn('');
//     setMatchedCount(null);
//     setMatchedRows([]);
//   };

//   // --- CSV UPLOAD & SCHEMA DETECTION ---
//   const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     try {
//       const res = await api.previewCsv(file);
//       setCsvFile(file);
//       const fetchedSchema = res.schema || [];
//       setSchema(fetchedSchema);
//       setSampleRows(res.sample_rows || res.preview_rows || []);
//       setRowCount(res.row_count || fetchedSchema.length || 0);
      
//       const searchTerms = channelType === 'whatsapp' ? ['phone', 'mobile', 'whatsapp', 'contact'] : ['email', 'mail'];
//       const match = fetchedSchema.find((c:any) => searchTerms.some(term => c.name.toLowerCase().includes(term)));
//       if (match) setRecipientColumn(match.name);
      
//     } catch (error: any) {
//       showToast(getErrorMessage(error, "Failed to process CSV."), 'error');
//       resetFileState();
//     }
//   };

//   // --- STRICT SCHEMA COMPATIBILITY VALIDATION ---
//   const missingVariables = (selectedTemplate?.variables || []).filter(v => !schema.some(s => s.name.toLowerCase() === v.toLowerCase()));
//   const filterDef = selectedTemplate?.filter_definition || selectedTemplate?.filter_dsl;
//   const filterColumns = filterDef?.conditions?.map((c: any) => c.column) || [];
//   const missingFilterCols = filterColumns.filter((col: string) => !schema.some(s => s.name.toLowerCase() === col.toLowerCase()));
//   const totalMissing = [...new Set([...missingVariables, ...missingFilterCols])];

//   const activeIntegrations = integrations.filter(i => i.channel_type === channelType && i.is_active);

//   // --- TEST FILTER PREVIEW ---
//   const runFilterPreview = async () => {
//     if (!selectedTemplate || !csvFile) return;
    
//     if (!filterDef || !filterDef.conditions || filterDef.conditions.length === 0) {
//       setMatchedCount(rowCount);
//       setMatchedRows(sampleRows);
//       setActiveStep(4);
//       return;
//     }

//     setIsTestingFilter(true);
//     try {
//       const res = await api.testFilter(selectedTemplate.logical_id, csvFile);
//       setMatchedCount(res.matched_count);
//       setMatchedRows(res.matched_rows || []);
//       setActiveStep(4);
//     } catch (error: any) {
//       showToast(getErrorMessage(error, "Failed to test filter."), "error");
//     } finally {
//       setIsTestingFilter(false);
//     }
//   };

//   // --- START EXECUTION ENGINE ---
//   const handleStartExecution = async () => {
//     if (!selectedTemplate || !csvFile || !recipientColumn || !selectedIntegrationId) return;
    
//     if (matchedCount === 0) {
//       if (!window.confirm("0 rows matched your filter. Are you sure you want to run this campaign?")) return;
//     }

//     setIsStarting(true);
//     try {
//       const formData = new FormData();
//       formData.append('logical_id', selectedTemplate.logical_id);
//       formData.append('channel_type', channelType);
//       formData.append('recipient_column', recipientColumn);
//       formData.append('integration_id', selectedIntegrationId.toString());
//       formData.append('file', csvFile);

//       const res = await api.startExecution(formData);
//       showToast("Campaign Execution Started!", "success");
      
//       const newExecutionId = res.execution_id;
//       setExecutionId(newExecutionId);
//       executionStartTime.current = Date.now();
      
//       // Open WebSocket ONLY
//       startWebSocket(newExecutionId);
//     } catch (error: any) {
//       showToast(getErrorMessage(error, "Failed to start execution."), "error");
//       setIsStarting(false);
//     }
//   };

//   // --- 🔥 STRICT WEBSOCKET LOGIC (NO POLLING) ---
//   const startWebSocket = (id: number) => {
//     const token = localStorage.getItem('access_token');
//     wsRef.current = new WebSocket(`${WS_BASE_URL}/ws/execution/${id}?token=${token}`);

//     wsRef.current.onmessage = (event) => {
//       const data = JSON.parse(event.data);
//       setWsData(data); // 👈 Updates the entire UI strictly from WS Data
      
//       // ONLY fetch logs when execution is fully terminated
//       if (['completed', 'failed', 'cancelled'].includes(data.status)) {
//         setExecutionDuration(Math.floor((Date.now() - executionStartTime.current) / 1000));
//         wsRef.current?.close();
//         fetchLogsOnce(id); // 👈 Called EXACTLY ONCE
//       }
//     };

//     wsRef.current.onclose = () => {
//       console.log("WebSocket Connection Closed.");
//     };
//   };

//   // Cleanup WS on unmount
//   useEffect(() => { return () => { if (wsRef.current) wsRef.current.close(); }; }, []);

//   // --- SINGLE LOGS FETCH (AFTER COMPLETION) ---
//   const fetchLogsOnce = async (id: number) => {
//     setIsLoadingLogs(true);
//     try {
//       const res = await api.getExecutionLogs(id, 1);
//       setLogs(res.logs || res.items || []);
//     } catch (err) {
//       console.warn("Could not load logs.", err);
//     } finally {
//       setIsLoadingLogs(false);
//     }
//   };

//   const handleCancelExecution = async () => {
//     if (!executionId) return;
//     setIsCancelling(true);
//     try {
//       await api.cancelExecution(executionId);
//       setWsData(prev => prev ? { ...prev, status: 'cancelled' } : null);
//       if (wsRef.current) wsRef.current.close();
//       showToast("Execution cancelled.", "success");
//       setIsCancelModalOpen(false);
//       fetchLogsOnce(executionId);
//     } catch (error: any) {
//       showToast(getErrorMessage(error, "Failed to cancel."), 'error');
//     } finally {
//       setIsCancelling(false);
//     }
//   };


//   // ==========================================
//   // RENDER 1: LIVE EXECUTION MONITOR
//   // ==========================================
//   if (executionId) {
//     const isActive = wsData?.status === 'running' || wsData?.status === 'queued';
//     const totalRecords = wsData?.total || matchedCount || 0;
//     const processedRecords = wsData?.processed || 0;
//     const safeProgressPercent = totalRecords > 0 ? (processedRecords / totalRecords) * 100 : 0;
    
//     let throughput = 0;
//     let etaSeconds = 0;
//     if (isActive && processedRecords > 0) {
//       const elapsedSec = (Date.now() - executionStartTime.current) / 1000;
//       throughput = processedRecords / elapsedSec;
//       etaSeconds = (totalRecords - processedRecords) / (throughput || 1);
//     }

//     return (
//       <div className="min-h-screen bg-[#F8FAFC] py-10 px-6 font-sans text-[#111827]">
//         {toast && (
//           <div className={`fixed top-6 right-6 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-in slide-in-from-right ${toast.type === 'success' ? 'bg-[#ECFDF5] border border-[#059669]/20 text-[#047857]' : 'bg-red-50 border border-red-200 text-red-700'}`}>
//             {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
//             <span className="text-sm font-medium">{toast.message}</span>
//           </div>
//         )}

//         {/* CANCEL MODAL */}
//         {isCancelModalOpen && (
//           <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
//             <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-[#E5E7EB] overflow-hidden animate-in zoom-in-95 duration-200">
//               <div className="p-6">
//                 <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4"><StopCircle className="text-red-600" size={24} /></div>
//                 <h3 className="text-lg font-bold text-[#111827]">Stop Execution?</h3>
//                 <p className="text-sm text-[#6B7280] mt-2">Are you sure you want to halt this campaign? Sent messages cannot be undone.</p>
//               </div>
//               <div className="bg-[#F8FAFC] px-6 py-4 border-t border-[#E5E7EB] flex items-center justify-end gap-3">
//                 <button onClick={() => setIsCancelModalOpen(false)} disabled={isCancelling} className="px-4 py-2 text-sm font-medium text-[#4B5563] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB]">Keep Running</button>
//                 <button onClick={handleCancelExecution} disabled={isCancelling} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center gap-2">
//                   {isCancelling ? 'Stopping...' : 'Yes, Stop Execution'}
//                 </button>
//               </div>
//             </div>
//           </div>
//         )}

//         <div className="max-w-[1000px] mx-auto space-y-6">
//           <button onClick={() => { setExecutionId(null); setWsData(null); navigate('/executions'); }} className="flex items-center gap-2 text-sm font-medium text-[#6B7280] hover:text-[#111827]">
//             <ChevronLeft size={18} /> Back to Executions
//           </button>

//           {/* DYNAMIC PROGRESS CARD */}
//           <div className={`bg-white rounded-2xl border shadow-lg overflow-hidden animate-in zoom-in-95 ${wsData?.status === 'completed' ? 'border-[#A7F3D0]' : 'border-[#E5E7EB]'}`}>
            
//             <div className={`px-8 py-6 text-white flex justify-between items-center ${wsData?.status === 'completed' ? 'bg-[#059669]' : wsData?.status === 'failed' ? 'bg-red-600' : wsData?.status === 'cancelled' ? 'bg-gray-600' : 'bg-[#111827]'}`}>
//               <div>
//                 <h2 className="text-2xl font-bold flex items-center gap-3">
//                   {isActive && <Activity className="animate-pulse" />} 
//                   {wsData?.status === 'completed' && <CheckCircle />}
//                   {wsData?.status === 'failed' && <XCircle />}
//                   {wsData?.status === 'cancelled' && <Slash />}
//                   Execution #{executionId}
//                 </h2>
//                 <p className="text-sm opacity-90 capitalize font-medium text-white/80 mt-1">Status: {wsData?.status || 'Initializing...'}</p>
//               </div>
//               {isActive && (
//                 <button onClick={() => setIsCancelModalOpen(true)} className="px-4 py-2 bg-red-500/20 hover:bg-red-500 text-white rounded-lg text-sm font-medium border border-red-500/30 flex items-center gap-2">
//                   <StopCircle size={16} /> Stop
//                 </button>
//               )}
//             </div>

//             <div className="p-8 space-y-8">
//               {/* Progress Bar */}
//               <div>
//                 <div className="flex justify-between text-sm font-medium mb-2">
//                   <span className="text-[#111827]">Completion Progress</span>
//                   <span className={isActive ? "text-[#059669]" : "text-[#6B7280]"}>{safeProgressPercent.toFixed(1)}%</span>
//                 </div>
//                 <div className="w-full bg-[#F3F4F6] rounded-full h-4 overflow-hidden border border-[#E5E7EB]">
//                   <div className={`h-4 transition-all duration-500 ease-out ${wsData?.status === 'failed' ? 'bg-red-500' : wsData?.status === 'cancelled' ? 'bg-gray-400' : 'bg-[#059669]'}`} style={{ width: `${safeProgressPercent}%` }} />
//                 </div>
//               </div>

//               {/* Stats Grid */}
//               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//                 <div className="bg-[#F8FAFC] p-5 rounded-xl border border-[#E5E7EB]">
//                   <p className="text-xs text-[#6B7280] font-bold uppercase tracking-wider">Total Rows</p>
//                   <p className="text-2xl font-black text-[#111827] mt-1">{totalRecords}</p>
//                 </div>
//                 <div className="bg-[#F8FAFC] p-5 rounded-xl border border-[#E5E7EB]">
//                   <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Processed</p>
//                   <p className="text-2xl font-black text-blue-700 mt-1">{processedRecords}</p>
//                 </div>
//                 <div className="bg-[#ECFDF5] p-5 rounded-xl border border-[#A7F3D0]">
//                   <p className="text-xs text-[#059669] font-bold uppercase tracking-wider">Success</p>
//                   <p className="text-2xl font-black text-[#059669] mt-1">{wsData?.success ?? 0}</p>
//                 </div>
//                 <div className="bg-red-50 p-5 rounded-xl border border-red-200">
//                   <p className="text-xs text-red-600 font-bold uppercase tracking-wider">Failed</p>
//                   <p className="text-2xl font-black text-red-600 mt-1">{wsData?.failed ?? 0}</p>
//                 </div>
//               </div>
              
//               {/* Error Alert */}
//               {wsData?.error && (
//                 <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3">
//                   <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
//                   <div><h4 className="text-sm font-bold text-red-800">Execution Error</h4><p className="text-sm text-red-700 mt-1">{wsData.error}</p></div>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* 🔥 STRICTLY CONDITIONAL LOGS SECTION */}
//           <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
//             <div className="p-6 border-b border-[#E5E7EB] bg-[#F8FAFC] flex items-center justify-between">
//               <h3 className="text-lg font-bold text-[#111827] flex items-center gap-2"><List size={20} className="text-[#059669]"/> Execution Logs</h3>
//             </div>
            
//             <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
//               {isActive ? (
//                 <div className="p-16 text-center text-[#6B7280] flex flex-col items-center justify-center bg-white">
//                   <Activity className="animate-pulse mb-4 text-[#059669]" size={40} />
//                   <p className="font-bold text-[#111827] mb-1">Execution in progress...</p>
//                   <p className="text-sm">Detailed logs will be fetched and displayed here once the execution completes.</p>
//                 </div>
//               ) : (
//                 <table className="w-full text-left text-sm text-[#4B5563] whitespace-nowrap">
//                   <thead className="bg-white border-b border-[#E5E7EB] text-[11px] uppercase tracking-wider font-semibold text-[#6B7280] sticky top-0 shadow-sm">
//                     <tr>
//                       <th className="px-6 py-4">Recipient</th>
//                       <th className="px-6 py-4">Status</th>
//                       <th className="px-6 py-4">Response Details</th>
//                       <th className="px-6 py-4 text-center">Retries</th>
//                       <th className="px-6 py-4 text-right">Timestamp</th>
//                     </tr>
//                   </thead>
//                   <tbody className="divide-y divide-[#E5E7EB] bg-white">
//                     {isLoadingLogs ? (
//                       <tr><td colSpan={5} className="px-6 py-12 text-center text-[#6B7280]">Fetching final logs...</td></tr>
//                     ) : logs.length === 0 ? (
//                       <tr><td colSpan={5} className="px-6 py-12 text-center text-[#6B7280]">No logs generated.</td></tr>
//                     ) : (
//                       logs.map((log, idx) => {
//                         const status = log.delivery_status || log.status;
//                         const errorMsg = log.error_message || log.error;
//                         const timeStr = log.sent_at || log.timestamp;
                        
//                         return (
//                           <tr key={idx} className="hover:bg-[#F9FAFB] transition-colors">
//                             <td className="px-6 py-3 font-medium text-[#111827]">{log.recipient}</td>
//                             <td className="px-6 py-3">
//                               <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${status === 'delivered' || status === 'success' ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]' : 'bg-red-50 text-red-700 border-red-200'}`}>{status}</span>
//                             </td>
//                             <td className="px-6 py-3 text-xs">{errorMsg ? <div className="flex items-center gap-1.5 text-red-600 max-w-xs" title={errorMsg}><AlertCircle size={14}/><span className="truncate">{errorMsg}</span></div> : <span className="text-[#9CA3AF] italic">Success</span>}</td>
//                             <td className="px-6 py-3 text-xs text-center">{log.retry_count}</td>
//                             <td className="px-6 py-3 text-xs text-[#6B7280] text-right">{timeStr ? new Date(timeStr).toLocaleTimeString() : '-'}</td>
//                           </tr>
//                         );
//                       })
//                     )}
//                   </tbody>
//                 </table>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // ==========================================
//   // RENDER 2: EXECUTION WIZARD (PRE-FLIGHT)
//   // ==========================================
//   const STEPS = [
//     { num: 1, title: 'Select Template' },
//     { num: 2, title: 'Upload Dataset' },
//     { num: 3, title: 'Configure Channel' },
//     { num: 4, title: 'Review & Run' }
//   ];

//   const canProceedToStep2 = selectedTemplate !== null;
//   const canProceedToStep3 = csvFile !== null && totalMissing.length === 0 && rowCount > 0;
//   const canProceedToStep4 = recipientColumn !== '' && selectedIntegrationId !== '';

//   const nextStep = () => {
//     if (activeStep === 3) runFilterPreview();
//     else setActiveStep(prev => Math.min(prev + 1, 4));
//   };

//   return (
//     <div className="min-h-screen bg-[#F8FAFC] font-sans text-[#111827] py-10 px-6">
      
//       {toast && (
//         <div className={`fixed top-6 right-6 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-in slide-in-from-right ${toast.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : toast.type === 'warning' ? 'bg-[#FFFBEB] text-amber-800 border border-[#FDE68A]' : 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'}`}>
//           <AlertCircle size={18} /> <span className="text-sm font-medium">{toast.message}</span>
//         </div>
//       )}

//       {/* HEADER & STEPPER */}
//       <div className="max-w-[1000px] mx-auto mb-10 flex flex-col items-center">
//         <h1 className="text-2xl font-bold text-[#111827]">Launch Campaign Execution</h1>
//         <p className="text-sm text-[#6B7280] mt-1">Select a published template, map your data, and execute.</p>
        
//         <div className="mt-8 flex items-center justify-between w-full max-w-2xl relative">
//           <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-[#E5E7EB] z-0 rounded-full" />
//           <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[#059669] z-0 rounded-full transition-all duration-300" style={{ width: `${((activeStep - 1) / 3) * 100}%` }} />
//           {STEPS.map((step) => {
//             const isCompleted = step.num < activeStep;
//             const isActive = step.num === activeStep;
//             return (
//               <div key={step.num} className="relative z-10 flex flex-col items-center gap-2">
//                 <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${isActive ? 'bg-[#059669] text-white ring-4 ring-[#059669]/20 shadow-lg' : isCompleted ? 'bg-[#059669] text-white' : 'bg-white border-2 border-[#E5E7EB] text-[#9CA3AF]'}`}>
//                   {isCompleted ? <CheckCircle size={20} /> : step.num}
//                 </div>
//                 <span className={`text-xs font-medium absolute -bottom-6 w-max ${isActive ? 'text-[#111827]' : isCompleted ? 'text-[#059669]' : 'text-[#9CA3AF]'}`}>{step.title}</span>
//               </div>
//             );
//           })}
//         </div>
//       </div>

//       <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm max-w-[1000px] mx-auto overflow-hidden flex flex-col min-h-[500px]">
//         <div className="p-8 flex-1">
          
//           {/* STEP 1: SELECT TEMPLATE */}
//           {activeStep === 1 && (
//             <div className="animate-in fade-in space-y-6">
//               <h2 className="text-xl font-bold text-[#111827] text-center mb-6">Choose a Published Template</h2>
//               {templates.length === 0 ? (
//                 <div className="text-center p-12 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl">
//                   <FileText className="mx-auto text-[#9CA3AF] mb-3" size={32}/>
//                   <p className="text-[#111827] font-medium">No published templates available.</p>
//                   <p className="text-sm text-[#6B7280]">You must publish a template in the Template Manager first.</p>
//                 </div>
//               ) : (
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   {templates.map(tpl => (
//                     <div key={tpl.logical_id} onClick={() => setSelectedTemplate(tpl)} className={`cursor-pointer border rounded-xl p-5 transition-all ${selectedTemplate?.logical_id === tpl.logical_id ? 'border-[#059669] bg-[#ECFDF5]/50 ring-1 ring-[#059669]' : 'border-[#E5E7EB] hover:border-[#9CA3AF] hover:shadow-sm'}`}>
//                       <div className="flex justify-between items-start mb-2">
//                         <h3 className="font-bold text-[#111827]">{tpl.name}</h3>
//                         <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">v{tpl.version}</span>
//                       </div>
//                       <p className="text-xs text-[#6B7280]"><span className="font-semibold text-[#4B5563]">Variables:</span> {tpl.variables?.join(', ') || 'None'}</p>
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </div>
//           )}

//           {/* STEP 2: UPLOAD CSV & VALIDATE SCHEMA */}
//           {activeStep === 2 && (
//             <div className="animate-in fade-in space-y-6">
//               <h2 className="text-xl font-bold text-[#111827] text-center mb-6">Upload Execution Data</h2>
//               {!csvFile ? (
//                  <div className="border-2 border-dashed border-[#E5E7EB] rounded-2xl bg-[#F8FAFC] p-16 flex flex-col items-center justify-center hover:border-[#059669] hover:bg-[#059669]/5 transition-colors group relative cursor-pointer max-w-xl mx-auto">
//                    <input type="file" accept=".csv" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileUpload} />
//                    <UploadCloud className="text-[#059669] mb-4 group-hover:scale-110 transition-transform" size={40} />
//                    <h3 className="text-base font-semibold text-[#111827]">Upload CSV Dataset</h3>
//                  </div>
//               ) : (
//                 <div className="space-y-6 max-w-3xl mx-auto">
//                   <div className="flex items-center justify-between bg-white border border-[#E5E7EB] p-5 rounded-xl shadow-sm">
//                     <div>
//                       <p className="text-base font-bold text-[#111827] flex items-center gap-2"><FileText className="text-[#059669]" size={18}/> {csvFile.name}</p>
//                       <p className="text-sm text-[#6B7280] mt-1">{rowCount} rows detected</p>
//                     </div>
//                     <button onClick={resetFileState} className="text-sm text-[#6B7280] underline hover:text-[#111827]">Change File</button>
//                   </div>

//                   {/* Schema Validation Blocker */}
//                   {totalMissing.length > 0 ? (
//                     <div className="bg-red-50 border border-red-200 p-5 rounded-xl flex items-start gap-3">
//                       <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
//                       <div>
//                         <h4 className="font-bold text-red-800">Schema Validation Failed</h4>
//                         <p className="text-sm text-red-700 mt-1 mb-2">Your template requires variables or filters that are not present in this CSV:</p>
//                         <ul className="list-disc ml-5 text-sm text-red-700 font-bold">{totalMissing.map(v => <li key={v}>{v}</li>)}</ul>
//                       </div>
//                     </div>
//                   ) : (
//                     <div className="bg-[#ECFDF5] border border-[#A7F3D0] p-4 rounded-xl flex items-center gap-3 text-[#059669]">
//                       <CheckCircle size={18} />
//                       <span className="text-sm font-medium">Schema validated successfully against template requirements.</span>
//                     </div>
//                   )}

//                   <div className="border border-[#E5E7EB] rounded-lg overflow-x-auto shadow-sm">
//                     <div className="bg-[#F8FAFC] border-b border-[#E5E7EB] px-4 py-2 flex items-center gap-2">
//                       <Database size={14} className="text-[#6B7280]"/> <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Detected Schema & Preview</span>
//                     </div>
//                     <table className="w-full text-left text-sm text-[#4B5563] whitespace-nowrap">
//                       <thead className="bg-white border-b border-[#E5E7EB]"><tr className="text-[#6B7280]">{schema.slice(0, 5).map(c => <th key={c.name} className="px-4 py-3 font-medium">{c.name} <span className="text-[10px] bg-[#F3F4F6] px-1.5 py-0.5 rounded ml-1 uppercase">{c.type}</span></th>)}</tr></thead>
//                       <tbody className="divide-y divide-[#E5E7EB] bg-white">
//                         {sampleRows.slice(0,3).map((r, i) => <tr key={i} className="hover:bg-[#F9FAFB]">{schema.slice(0, 5).map(c => <td key={c.name} className="px-4 py-2.5">{r[c.name] ?? r[c.name.toLowerCase()]}</td>)}</tr>)}
//                       </tbody>
//                     </table>
//                   </div>
//                 </div>
//               )}
//             </div>
//           )}

//           {/* STEP 3: CONFIGURE */}
//           {activeStep === 3 && (
//             <div className="animate-in fade-in space-y-6 max-w-2xl mx-auto">
//               <h2 className="text-xl font-bold text-[#111827] text-center mb-6">Execution Configuration</h2>
              
//               <div className="bg-white border border-[#E5E7EB] p-8 rounded-xl shadow-sm space-y-8">
//                 <div>
//                   <label className="block text-sm font-bold text-[#111827] mb-3">1. Delivery Channel</label>
//                   <div className="grid grid-cols-2 gap-4">
//                     <button onClick={() => setChannelType('whatsapp')} className={`p-4 rounded-xl border flex items-center justify-center gap-2 font-medium transition-all ${channelType === 'whatsapp' ? 'border-[#059669] bg-[#ECFDF5] text-[#059669]' : 'border-[#E5E7EB] text-[#6B7280] hover:bg-[#F8FAFC]'}`}><MessageSquare size={18}/> WhatsApp</button>
//                     <button onClick={() => setChannelType('email')} className={`p-4 rounded-xl border flex items-center justify-center gap-2 font-medium transition-all ${channelType === 'email' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-[#E5E7EB] text-[#6B7280] hover:bg-[#F8FAFC]'}`}><Mail size={18}/> Email</button>
//                   </div>
//                 </div>

//                 <div>
//                   <label className="block text-sm font-bold text-[#111827] mb-3">2. Provider Integration</label>
//                   {activeIntegrations.length === 0 ? (
//                     <div className="p-4 bg-[#FFFBEB] border border-[#FDE68A] text-amber-800 text-sm rounded-lg flex items-center gap-2"><AlertCircle size={16}/> No active {channelType} integrations found.</div>
//                   ) : (
//                     <select value={selectedIntegrationId} onChange={e => setSelectedIntegrationId(Number(e.target.value))} className="w-full p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg text-sm focus:border-[#059669] outline-none">
//                       <option value="" disabled>Select active integration...</option>
//                       {activeIntegrations.map(i => <option key={i.id} value={i.id}>{i.provider_name}</option>)}
//                     </select>
//                   )}
//                 </div>

//                 <div>
//                   <label className="block text-sm font-bold text-[#111827] mb-1">3. Target Recipient Column</label>
//                   <select value={recipientColumn} onChange={e => setRecipientColumn(e.target.value)} className="w-full p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg text-sm focus:border-[#059669] outline-none">
//                     <option value="" disabled>Select recipient column...</option>
//                     {schema.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
//                   </select>
//                 </div>
//               </div>
//             </div>
//           )}

//           {/* STEP 4: REVIEW & FILTER TEST */}
//           {activeStep === 4 && (
//             <div className="animate-in fade-in space-y-6 max-w-4xl mx-auto">
//               <div className="text-center mb-8">
//                 <div className="w-16 h-16 bg-[#F8FAFC] border border-[#E5E7EB] rounded-full flex items-center justify-center mx-auto mb-4"><Server className="text-[#059669]" size={32} /></div>
//                 <h2 className="text-2xl font-bold text-[#111827]">Review & Target Audience</h2>
//               </div>

//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
//                   <div className="space-y-4">
//                     <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider border-b border-[#E5E7EB] pb-2">Configuration Summary</h3>
//                     <div><p className="text-xs text-[#6B7280] uppercase tracking-wider font-semibold">Template</p><p className="font-medium text-[#111827] mt-1">{selectedTemplate?.name} (v{selectedTemplate?.version})</p></div>
//                     <div><p className="text-xs text-[#6B7280] uppercase tracking-wider font-semibold">Channel</p><p className="font-medium text-[#111827] mt-1 capitalize">{channelType}</p></div>
//                     <div><p className="text-xs text-[#6B7280] uppercase tracking-wider font-semibold">Recipient Column</p><p className="font-medium text-[#111827] mt-1">{recipientColumn}</p></div>
//                   </div>
                  
//                   <div className="pt-6 mt-6 border-t border-[#E5E7EB]">
//                     <p className="text-xs text-[#6B7280] uppercase tracking-wider font-semibold">Target Audience Size</p>
//                     <div className="flex items-end gap-2 mt-1">
//                       <span className="text-3xl font-bold text-[#059669]">{matchedCount ?? rowCount}</span>
//                       <span className="text-sm font-medium text-[#6B7280] mb-1">/ {rowCount} CSV rows</span>
//                     </div>
//                   </div>
//                 </div>

//                 <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm flex flex-col h-full">
//                    <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider border-b border-[#E5E7EB] pb-2 mb-4 flex items-center gap-2"><Eye size={16} className="text-[#059669]" /> Target Audience Preview</h3>
//                    {matchedRows.length > 0 ? (
//                      <div className="border border-[#E5E7EB] rounded-lg overflow-x-auto shadow-inner flex-1 bg-[#F8FAFC]">
//                         <table className="w-full text-left text-xs text-[#4B5563] whitespace-nowrap">
//                            <thead className="bg-white border-b border-[#E5E7EB]"><tr className="text-[#6B7280]">{schema.slice(0, 4).map(c => <th key={c.name} className="px-3 py-2 font-medium">{c.name}</th>)}</tr></thead>
//                            <tbody className="divide-y divide-[#E5E7EB] bg-white">
//                              {matchedRows.slice(0, 5).map((r, i) => <tr key={i} className="hover:bg-[#F9FAFB]">{schema.slice(0, 4).map(c => <td key={c.name} className="px-3 py-2">{r[c.name] ?? r[c.name.toLowerCase()]}</td>)}</tr>)}
//                            </tbody>
//                         </table>
//                      </div>
//                    ) : (
//                      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[#6B7280]">
//                         <Users size={32} className="text-[#E5E7EB] mb-3" />
//                         <p className="text-sm font-medium text-[#111827]">No Audience Preview</p>
//                      </div>
//                    )}
//                 </div>
//               </div>
//             </div>
//           )}

//         </div>

//         {/* BOTTOM ACTION BAR */}
//         <div className="px-8 py-5 border-t border-[#E5E7EB] bg-[#F8FAFC] flex items-center justify-between">
//           {activeStep > 1 && (
//             <button onClick={() => setActiveStep(prev => prev - 1)} className="mr-auto px-5 py-2.5 flex items-center gap-2 text-sm font-bold text-[#4B5563] bg-white border border-[#E5E7EB] rounded-xl hover:bg-[#F9FAFB] shadow-sm">
//               <ChevronLeft size={16} /> Back
//             </button>
//           )}
          
//           {activeStep < 4 ? (
//             <button onClick={nextStep} disabled={(activeStep === 1 && !canProceedToStep2) || (activeStep === 2 && !canProceedToStep3) || (activeStep === 3 && !canProceedToStep4) || isTestingFilter} className="px-8 py-3 bg-[#111827] text-white text-sm font-bold rounded-xl hover:bg-[#1F2937] shadow-lg flex items-center gap-2 disabled:opacity-50 ml-auto">
//               {isTestingFilter ? <RefreshCw className="animate-spin" size={18} /> : 'Continue'} {!isTestingFilter && <ChevronRight size={18} />}
//             </button>
//           ) : (
//              <button onClick={handleStartExecution} disabled={isStarting || matchedCount === 0} className="px-10 py-3.5 bg-[#059669] text-white text-base font-bold rounded-xl hover:bg-[#047857] shadow-xl shadow-[#059669]/20 flex items-center gap-3 disabled:opacity-50 ml-auto">
//               {isStarting ? <RefreshCw className="animate-spin" size={20} /> : <PlayCircle size={20} />} {isStarting ? 'Starting Engine...' : 'Run Campaign'} 
//             </button>
//           )}
//         </div>

//       </div>
//     </div>
//   );
// }


import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, UploadCloud, Settings, PlayCircle, CheckCircle, 
  AlertCircle, ChevronRight, ChevronLeft, MessageSquare, 
  Mail, Activity, Server, Users, RefreshCw, XCircle, Slash, StopCircle,
  List, Clock, Zap, Eye, DownloadCloud, Database
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// --- CONFIGURATION & API ---
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const WS_BASE_URL = BASE_URL.replace(/^http/, 'ws');

// ✅ FIX: Omits Content-Type for FormData so browser strictly sets the boundary.
const getAuthHeaders = (isFormData = false) => {
  const token = localStorage.getItem('access_token');
  if (isFormData) {
    return { headers: { 'Authorization': `Bearer ${token}` } };
  }
  return { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } };
};

// ✅ FIX: Safely extracts FastAPI error strings to prevent React crashes.
const getErrorMessage = (error: any, fallback: string) => {
  const detail = error.response?.data?.detail;
  if (Array.isArray(detail)) return detail[0]?.msg || fallback;
  if (typeof detail === 'string') return detail;
  return error.message || fallback;
};

// --- STRICT API SERVICES ---
const api = {
  getTemplates: async () => {
    const res = await axios.get(`${BASE_URL}/campaign-template`, getAuthHeaders());
    return res.data;
  },
  previewCsv: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await axios.post(`${BASE_URL}/execution/preview-schema`, formData, getAuthHeaders(true));
    return res.data;
  },
  getIntegrations: async () => {
    const res = await axios.get(`${BASE_URL}/integrations`, getAuthHeaders());
    return res.data;
  },
  testFilter: async (logicalId: string, file: File) => {
    const formData = new FormData();
    formData.append("logical_id", logicalId);
    formData.append("file", file);
    const res = await axios.post(`${BASE_URL}/campaign-template/test-filter`, formData, getAuthHeaders(true));
    return res.data;
  },
  // ✅ FIX: Hits the correct /run endpoint
  startExecution: async (payload: FormData) => {
    const res = await axios.post(`${BASE_URL}/execution/run`, payload, getAuthHeaders(true));
    return res.data;
  },
  cancelExecution: async (id: number) => {
    const res = await axios.post(`${BASE_URL}/execution/${id}/cancel`, {}, getAuthHeaders());
    return res.data;
  },
  getExecutionLogs: async (id: number, page = 1) => {
    const res = await axios.get(`${BASE_URL}/execution/${id}/logs?page=${page}&limit=50`, getAuthHeaders());
    return res.data;
  },
  exportFailedLogs: (id: number) => {
    window.open(`${BASE_URL}/execution/${id}/export-failed`, '_blank');
  }
};

// --- TYPES ---
interface Template { logical_id: string; version: number; name: string; status: string; variables?: string[]; filter_definition?: any; filter_dsl?: any; }
interface SchemaItem { name: string; type: string; }
interface Integration { id: number; channel_type: string; provider_name: string; is_active: boolean; }
interface WsData { status: string; processed: number; total: number; success: number; failed: number; progress_percent: number; error?: string; }
interface LogEntry { recipient: string; status: string; delivery_status?: string; retry_count: number; timestamp?: string; sent_at?: string; error?: string; error_message?: string; }

export default function Executor() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState<number>(1);
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'|'warning'} | null>(null);

  // Data States
  const [templates, setTemplates] = useState<Template[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  
  // CSV States
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [schema, setSchema] = useState<SchemaItem[]>([]);
  const [sampleRows, setSampleRows] = useState<any[]>([]);
  const [rowCount, setRowCount] = useState(0);
  
  // Config States
  const [channelType, setChannelType] = useState<'whatsapp' | 'email'>('whatsapp');
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<number | ''>('');
  const [recipientColumn, setRecipientColumn] = useState<string>('');
  
  // Review States
  const [matchedCount, setMatchedCount] = useState<number | null>(null);
  const [matchedRows, setMatchedRows] = useState<any[]>([]);
  const [isTestingFilter, setIsTestingFilter] = useState(false);

  // Monitor States
  const [isStarting, setIsStarting] = useState(false);
  const [executionId, setExecutionId] = useState<number | null>(null);
  const [wsData, setWsData] = useState<WsData | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const executionStartTime = useRef<number>(0);
  const [executionDuration, setExecutionDuration] = useState<number>(0);

  // Logs States
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const showToast = (msg: string, type: 'success'|'error'|'warning') => { 
    setToast({ message: msg, type }); 
    setTimeout(() => setToast(null), 4000); 
  };

  // --- INITIAL LOAD ---
  useEffect(() => {
    api.getTemplates().then(res => {
      const allTpls = res.templates || res.items || res || [];
      // STRICT RULE: Only Published Templates allowed in execution
      setTemplates(allTpls.filter((t: Template) => t.status === 'published'));
    }).catch((err) => showToast(getErrorMessage(err, "Failed to load templates"), "error"));

    api.getIntegrations().then(res => {
      setIntegrations(res.integrations || res.items || res || []);
    }).catch((err) => showToast(getErrorMessage(err, "Failed to load integrations"), "error"));
  }, []);

  // ✅ FIX: Fully defined reset state
  const resetFileState = () => {
    setCsvFile(null); 
    setSchema([]); 
    setSampleRows([]); 
    setRowCount(0); 
    setRecipientColumn('');
    setMatchedCount(null);
    setMatchedRows([]);
  };

  // --- CSV UPLOAD & SCHEMA DETECTION ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await api.previewCsv(file);
      setCsvFile(file);
      const fetchedSchema = res.schema || [];
      setSchema(fetchedSchema);
      setSampleRows(res.sample_rows || res.preview_rows || []);
      setRowCount(res.row_count || fetchedSchema.length || 0);
      
      const searchTerms = channelType === 'whatsapp' ? ['phone', 'mobile', 'whatsapp', 'contact'] : ['email', 'mail'];
      const match = fetchedSchema.find((c:any) => searchTerms.some(term => c.name.toLowerCase().includes(term)));
      if (match) setRecipientColumn(match.name);
      
    } catch (error: any) {
      showToast(getErrorMessage(error, "Failed to process CSV."), 'error');
      resetFileState();
    }
  };

  // --- STRICT SCHEMA COMPATIBILITY VALIDATION ---
  const missingVariables = (selectedTemplate?.variables || []).filter(v => !schema.some(s => s.name.toLowerCase() === v.toLowerCase()));
  const filterDef = selectedTemplate?.filter_definition || selectedTemplate?.filter_dsl;
  const filterColumns = filterDef?.conditions?.map((c: any) => c.column) || [];
  const missingFilterCols = filterColumns.filter((col: string) => !schema.some(s => s.name.toLowerCase() === col.toLowerCase()));
  const totalMissing = [...new Set([...missingVariables, ...missingFilterCols])];

  const activeIntegrations = integrations.filter(i => i.channel_type === channelType && i.is_active);

  // --- TEST FILTER PREVIEW (Pre-flight check) ---
  const runFilterPreview = async () => {
    if (!selectedTemplate || !csvFile) return;
    
    if (!filterDef || !filterDef.conditions || filterDef.conditions.length === 0) {
      setMatchedCount(rowCount);
      setMatchedRows(sampleRows);
      setActiveStep(4);
      return;
    }

    setIsTestingFilter(true);
    try {
      const formData = new FormData();
      formData.append("logical_id", selectedTemplate.logical_id);
      formData.append("file", csvFile);

      const res = await axios.post(`${BASE_URL}/campaign-template/test-filter`, formData, getAuthHeaders(true));
      
      setMatchedCount(res.data.matched_count);
      setMatchedRows(res.data.matched_rows || []);
      setActiveStep(4);
    } catch (error: any) {
      showToast(getErrorMessage(error, "Failed to test filter."), "error");
    } finally {
      setIsTestingFilter(false);
    }
  };

  // --- START EXECUTION ENGINE ---
  const handleStartExecution = async () => {
    if (!selectedTemplate || !csvFile || !recipientColumn || !selectedIntegrationId) return;
    
    if (matchedCount === 0) {
      if (!window.confirm("0 rows matched your filter. Are you sure you want to run this campaign?")) return;
    }

    setIsStarting(true);
    try {
      const formData = new FormData();
      formData.append('logical_id', selectedTemplate.logical_id);
      formData.append('channel_type', channelType);
      formData.append('recipient_column', recipientColumn);
      formData.append('integration_id', selectedIntegrationId.toString());
      formData.append('file', csvFile);

      const res = await api.startExecution(formData);
      showToast("Campaign Execution Started!", "success");
      
      const newExecutionId = res.execution_id;
      setExecutionId(newExecutionId);
      executionStartTime.current = Date.now();
      
      // Open WebSocket ONLY. Zero logs polling.
      startWebSocket(newExecutionId);
    } catch (error: any) {
      showToast(getErrorMessage(error, "Failed to start execution."), "error");
      setIsStarting(false);
    }
  };

  // --- 🔥 STRICT WEBSOCKET LOGIC (NO POLLING) ---
  const startWebSocket = (id: number) => {
    const token = localStorage.getItem('access_token');
    wsRef.current = new WebSocket(`${WS_BASE_URL}/ws/execution/${id}?token=${token}`);

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setWsData(data); // 👈 Updates the entire UI strictly from WS Data
      
      // ONLY fetch logs when execution is fully terminated
      if (['completed', 'failed', 'cancelled'].includes(data.status)) {
        setExecutionDuration(Math.floor((Date.now() - executionStartTime.current) / 1000));
        wsRef.current?.close();
        fetchLogsOnce(id); // 👈 Called EXACTLY ONCE at the very end
      }
    };

    wsRef.current.onclose = () => {
      console.log("WebSocket Connection Closed.");
    };
  };

  // Cleanup WS on unmount
  useEffect(() => { return () => { if (wsRef.current) wsRef.current.close(); }; }, []);

  // --- SINGLE LOGS FETCH (AFTER COMPLETION ONLY) ---
  const fetchLogsOnce = async (id: number) => {
    setIsLoadingLogs(true);
    try {
      const res = await api.getExecutionLogs(id, 1);
      setLogs(res.logs || res.items || []);
    } catch (err) {
      console.warn("Could not load logs.", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleCancelExecution = async () => {
    if (!executionId) return;
    setIsCancelling(true);
    try {
      await api.cancelExecution(executionId);
      setWsData(prev => prev ? { ...prev, status: 'cancelled' } : null);
      if (wsRef.current) wsRef.current.close();
      showToast("Execution cancelled.", "success");
      setIsCancelModalOpen(false);
      fetchLogsOnce(executionId); // Fetch final state logs
    } catch (error: any) {
      showToast(getErrorMessage(error, "Failed to cancel."), 'error');
    } finally {
      setIsCancelling(false);
    }
  };


  // ==========================================
  // RENDER 1: LIVE EXECUTION MONITOR
  // ==========================================
  if (executionId) {
    const isActive = wsData?.status === 'running' || wsData?.status === 'queued';
    const totalRecords = wsData?.total || matchedCount || 0;
    const processedRecords = wsData?.processed || 0;
    
    // 🔥 Strict Frontend Progress Math
    const safeProgressPercent = totalRecords > 0 ? Math.floor((processedRecords / totalRecords) * 100) : 0;
    
    let throughput = 0;
    let etaSeconds = 0;
    if (isActive && processedRecords > 0) {
      const elapsedSec = (Date.now() - executionStartTime.current) / 1000;
      throughput = processedRecords / elapsedSec;
      etaSeconds = (totalRecords - processedRecords) / (throughput || 1);
    }

    return (
      <div className="min-h-screen bg-[#F8FAFC] py-10 px-6 font-sans text-[#111827]">
        {toast && (
          <div className={`fixed top-6 right-6 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-in slide-in-from-right ${toast.type === 'success' ? 'bg-[#ECFDF5] border border-[#059669]/20 text-[#047857]' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        )}

        {/* CANCEL MODAL */}
        {isCancelModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-[#E5E7EB] overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4"><StopCircle className="text-red-600" size={24} /></div>
                <h3 className="text-lg font-bold text-[#111827]">Stop Execution?</h3>
                <p className="text-sm text-[#6B7280] mt-2">Are you sure you want to halt this campaign? Sent messages cannot be undone.</p>
              </div>
              <div className="bg-[#F8FAFC] px-6 py-4 border-t border-[#E5E7EB] flex items-center justify-end gap-3">
                <button onClick={() => setIsCancelModalOpen(false)} disabled={isCancelling} className="px-4 py-2 text-sm font-medium text-[#4B5563] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB]">Keep Running</button>
                <button onClick={handleCancelExecution} disabled={isCancelling} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center gap-2">
                  {isCancelling ? 'Stopping...' : 'Yes, Stop Execution'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WIDENED CONTAINER */}
        <div className="max-w-[1200px] mx-auto space-y-6">
          <button onClick={() => { setExecutionId(null); setWsData(null); navigate('/executions'); }} className="flex items-center gap-2 text-sm font-medium text-[#6B7280] hover:text-[#111827]">
            <ChevronLeft size={18} /> Back to Executions
          </button>

          {/* DYNAMIC PROGRESS CARD */}
          <div className={`bg-white rounded-2xl border shadow-lg overflow-hidden animate-in zoom-in-95 ${wsData?.status === 'completed' ? 'border-[#A7F3D0]' : 'border-[#E5E7EB]'}`}>
            
            <div className={`px-8 py-6 text-white flex justify-between items-center ${wsData?.status === 'completed' ? 'bg-[#059669]' : wsData?.status === 'failed' ? 'bg-red-600' : wsData?.status === 'cancelled' ? 'bg-gray-600' : 'bg-[#111827]'}`}>
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  {isActive && <Activity className="animate-pulse" />} 
                  {wsData?.status === 'completed' && <CheckCircle />}
                  {wsData?.status === 'failed' && <XCircle />}
                  {wsData?.status === 'cancelled' && <Slash />}
                  Execution #{executionId}
                </h2>
                <div className="flex items-center gap-4 mt-2">
                  <p className="text-sm opacity-90 capitalize font-medium text-white/80">Status: {wsData?.status || 'Initializing...'}</p>
                  {isActive && throughput > 0 && (
                    <>
                      <span className="text-white/40">•</span>
                      <p className="text-xs font-mono text-white/80 flex items-center gap-1"><Zap size={12}/> {throughput.toFixed(1)} msgs/sec</p>
                      <span className="text-white/40">•</span>
                      <p className="text-xs font-mono text-white/80 flex items-center gap-1"><Clock size={12}/> ETA: {Math.ceil(etaSeconds)}s</p>
                    </>
                  )}
                </div>
              </div>
              {isActive && (
                <button onClick={() => setIsCancelModalOpen(true)} className="px-5 py-2.5 bg-red-500/20 hover:bg-red-500 text-white rounded-lg text-sm font-bold border border-red-500/30 flex items-center gap-2 transition-all">
                  <StopCircle size={18} /> Cancel Execution
                </button>
              )}
            </div>

            <div className="p-8 space-y-8">
              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-sm font-bold mb-3">
                  <span className="text-[#111827]">Completion Progress</span>
                  <span className={isActive ? "text-[#059669]" : "text-[#6B7280]"}>{safeProgressPercent}%</span>
                </div>
                <div className="w-full bg-[#F3F4F6] rounded-full h-5 overflow-hidden border border-[#E5E7EB] shadow-inner">
                  <div className={`h-5 transition-all duration-500 ease-out ${wsData?.status === 'failed' ? 'bg-red-500' : wsData?.status === 'cancelled' ? 'bg-gray-400' : 'bg-[#059669]'}`} style={{ width: `${safeProgressPercent}%` }} />
                </div>
              </div>

              {/* Strict 4-Card Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-[#F8FAFC] p-6 rounded-xl border border-[#E5E7EB] shadow-sm">
                  <p className="text-xs text-[#6B7280] font-bold uppercase tracking-wider">Total Rows</p>
                  <p className="text-3xl font-black text-[#111827] mt-2">{totalRecords}</p>
                </div>
                <div className="bg-[#F8FAFC] p-6 rounded-xl border border-[#E5E7EB] shadow-sm">
                  <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Processed</p>
                  <p className="text-3xl font-black text-blue-700 mt-2">{processedRecords}</p>
                </div>
                <div className="bg-[#ECFDF5] p-6 rounded-xl border border-[#A7F3D0] shadow-sm">
                  <p className="text-xs text-[#059669] font-bold uppercase tracking-wider">Delivered</p>
                  <p className="text-3xl font-black text-[#059669] mt-2">{wsData?.success ?? 0}</p>
                </div>
                <div className="bg-red-50 p-6 rounded-xl border border-red-200 shadow-sm">
                  <p className="text-xs text-red-600 font-bold uppercase tracking-wider">Failed</p>
                  <p className="text-3xl font-black text-red-600 mt-2">{wsData?.failed ?? 0}</p>
                </div>
              </div>
              
              {/* Error Alert */}
              {wsData?.error && (
                <div className="bg-red-50 border border-red-200 p-5 rounded-xl flex items-start gap-3">
                  <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
                  <div><h4 className="text-base font-bold text-red-800">Execution Error</h4><p className="text-sm text-red-700 mt-1">{wsData.error}</p></div>
                </div>
              )}
            </div>
          </div>

          {/* LOGS TABLE SECTION */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
            <div className="p-6 border-b border-[#E5E7EB] bg-[#F8FAFC] flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#111827] flex items-center gap-2"><List size={20} className="text-[#059669]"/> Live Logs</h3>
              <div className="flex items-center gap-3">
                {isActive && <span className="text-xs font-bold text-[#059669] flex items-center gap-1.5 bg-[#ECFDF5] px-2.5 py-1 rounded-full border border-[#A7F3D0]"><span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse"></span> Auto-updating</span>}
              </div>
            </div>
            
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-left text-sm text-[#4B5563] whitespace-nowrap">
                <thead className="bg-white border-b border-[#E5E7EB] text-xs uppercase tracking-wider font-bold text-[#6B7280] sticky top-0 shadow-sm">
                  <tr>
                    <th className="px-6 py-4">Recipient</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Retry</th>
                    <th className="px-6 py-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] bg-white">
                  {isActive ? (
                    <tr>
                      <td colSpan={4} className="p-16 text-center text-[#6B7280]">
                         <Activity className="animate-pulse mx-auto mb-4 text-[#059669]" size={40} />
                         <p className="font-bold text-[#111827] mb-1">Execution in progress...</p>
                         <p className="text-sm">Detailed logs will be available here once the campaign completes.</p>
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-[#6B7280] font-medium">No logs generated.</td></tr>
                  ) : (
                    logs.map((log, idx) => {
                      const status = log.delivery_status || log.status;
                      const errorMsg = log.error_message || log.error;
                      const timeStr = log.sent_at || log.timestamp;
                      
                      return (
                        <tr key={idx} className="hover:bg-[#F9FAFB] transition-colors">
                          <td className="px-6 py-4 font-mono font-medium text-[#111827]">{log.recipient}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className={`w-max px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${status === 'delivered' || status === 'success' ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]' : 'bg-red-50 text-red-700 border-red-200'}`}>{status}</span>
                              {errorMsg && <span className="text-xs text-red-600 truncate max-w-[250px]" title={errorMsg}>{errorMsg}</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-mono text-center">{log.retry_count}</td>
                          <td className="px-6 py-4 text-xs text-[#6B7280] text-right">{timeStr ? new Date(timeStr).toLocaleTimeString() : '-'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER 2: EXECUTION WIZARD (PRE-FLIGHT)
  // ==========================================
  const STEPS = [
    { num: 1, title: 'Select Template' },
    { num: 2, title: 'Upload Dataset' },
    { num: 3, title: 'Configure Channel' },
    { num: 4, title: 'Review & Run' }
  ];

  const canProceedToStep2 = selectedTemplate !== null;
  const canProceedToStep3 = csvFile !== null && totalMissing.length === 0 && rowCount > 0;
  const canProceedToStep4 = recipientColumn !== '' && selectedIntegrationId !== '';

  const nextStep = () => {
    if (activeStep === 3) runFilterPreview();
    else setActiveStep(prev => Math.min(prev + 1, 4));
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-[#111827] py-10 px-6">
      
      {toast && (
        <div className={`fixed top-6 right-6 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-in slide-in-from-right ${toast.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : toast.type === 'warning' ? 'bg-[#FFFBEB] text-amber-800 border border-[#FDE68A]' : 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'}`}>
          <AlertCircle size={18} /> <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* HEADER & STEPPER */}
      <div className="max-w-[1000px] mx-auto mb-10 flex flex-col items-center">
        <h1 className="text-2xl font-bold text-[#111827]">Launch Campaign Execution</h1>
        <p className="text-sm text-[#6B7280] mt-1">Select a published template, map your data, and execute.</p>
        
        <div className="mt-8 flex items-center justify-between w-full max-w-2xl relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-[#E5E7EB] z-0 rounded-full" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[#059669] z-0 rounded-full transition-all duration-300" style={{ width: `${((activeStep - 1) / 3) * 100}%` }} />
          {STEPS.map((step) => {
            const isCompleted = step.num < activeStep;
            const isActive = step.num === activeStep;
            return (
              <div key={step.num} className="relative z-10 flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${isActive ? 'bg-[#059669] text-white ring-4 ring-[#059669]/20 shadow-lg' : isCompleted ? 'bg-[#059669] text-white' : 'bg-white border-2 border-[#E5E7EB] text-[#9CA3AF]'}`}>
                  {isCompleted ? <CheckCircle size={20} /> : step.num}
                </div>
                <span className={`text-xs font-medium absolute -bottom-6 w-max ${isActive ? 'text-[#111827]' : isCompleted ? 'text-[#059669]' : 'text-[#9CA3AF]'}`}>{step.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm max-w-[1000px] mx-auto overflow-hidden flex flex-col min-h-[500px]">
        <div className="p-8 flex-1">
          
          {/* STEP 1: SELECT TEMPLATE */}
          {activeStep === 1 && (
            <div className="animate-in fade-in space-y-6">
              <h2 className="text-xl font-bold text-[#111827] text-center mb-6">Choose a Published Template</h2>
              {templates.length === 0 ? (
                <div className="text-center p-12 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl">
                  <FileText className="mx-auto text-[#9CA3AF] mb-3" size={32}/>
                  <p className="text-[#111827] font-medium">No published templates available.</p>
                  <p className="text-sm text-[#6B7280]">You must publish a template in the Template Manager first.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map(tpl => (
                    <div key={tpl.logical_id} onClick={() => setSelectedTemplate(tpl)} className={`cursor-pointer border rounded-xl p-5 transition-all ${selectedTemplate?.logical_id === tpl.logical_id ? 'border-[#059669] bg-[#ECFDF5]/50 ring-1 ring-[#059669]' : 'border-[#E5E7EB] hover:border-[#9CA3AF] hover:shadow-sm'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-[#111827]">{tpl.name}</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">v{tpl.version}</span>
                      </div>
                      <p className="text-xs text-[#6B7280]"><span className="font-semibold text-[#4B5563]">Variables:</span> {tpl.variables?.join(', ') || 'None'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: UPLOAD CSV & VALIDATE SCHEMA */}
          {activeStep === 2 && (
            <div className="animate-in fade-in space-y-6">
              <h2 className="text-xl font-bold text-[#111827] text-center mb-6">Upload Execution Data</h2>
              {!csvFile ? (
                 <div className="border-2 border-dashed border-[#E5E7EB] rounded-2xl bg-[#F8FAFC] p-16 flex flex-col items-center justify-center hover:border-[#059669] hover:bg-[#059669]/5 transition-colors group relative cursor-pointer max-w-xl mx-auto">
                   <input type="file" accept=".csv" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileUpload} />
                   <UploadCloud className="text-[#059669] mb-4 group-hover:scale-110 transition-transform" size={40} />
                   <h3 className="text-base font-semibold text-[#111827]">Upload CSV Dataset</h3>
                 </div>
              ) : (
                <div className="space-y-6 max-w-3xl mx-auto">
                  <div className="flex items-center justify-between bg-white border border-[#E5E7EB] p-5 rounded-xl shadow-sm">
                    <div>
                      <p className="text-base font-bold text-[#111827] flex items-center gap-2"><FileText className="text-[#059669]" size={18}/> {csvFile.name}</p>
                      <p className="text-sm text-[#6B7280] mt-1">{rowCount} rows detected</p>
                    </div>
                    <button onClick={resetFileState} className="text-sm text-[#6B7280] underline hover:text-[#111827]">Change File</button>
                  </div>

                  {/* Schema Validation Blocker */}
                  {totalMissing.length > 0 ? (
                    <div className="bg-red-50 border border-red-200 p-5 rounded-xl flex items-start gap-3">
                      <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20} />
                      <div>
                        <h4 className="font-bold text-red-800">Schema Validation Failed</h4>
                        <p className="text-sm text-red-700 mt-1 mb-2">Your template requires variables or filters that are not present in this CSV:</p>
                        <ul className="list-disc ml-5 text-sm text-red-700 font-bold">{totalMissing.map(v => <li key={v}>{v}</li>)}</ul>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#ECFDF5] border border-[#A7F3D0] p-4 rounded-xl flex items-center gap-3 text-[#059669]">
                      <CheckCircle size={18} />
                      <span className="text-sm font-medium">Schema validated successfully against template requirements.</span>
                    </div>
                  )}

                  <div className="border border-[#E5E7EB] rounded-lg overflow-x-auto shadow-sm">
                    <div className="bg-[#F8FAFC] border-b border-[#E5E7EB] px-4 py-2 flex items-center gap-2">
                      <Database size={14} className="text-[#6B7280]"/> <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Detected Schema & Preview</span>
                    </div>
                    <table className="w-full text-left text-sm text-[#4B5563] whitespace-nowrap">
                      <thead className="bg-white border-b border-[#E5E7EB]"><tr className="text-[#6B7280]">{schema.slice(0, 5).map(c => <th key={c.name} className="px-4 py-3 font-medium">{c.name} <span className="text-[10px] bg-[#F3F4F6] px-1.5 py-0.5 rounded ml-1 uppercase">{c.type}</span></th>)}</tr></thead>
                      <tbody className="divide-y divide-[#E5E7EB] bg-white">
                        {sampleRows.slice(0,3).map((r, i) => <tr key={i} className="hover:bg-[#F9FAFB]">{schema.slice(0, 5).map(c => <td key={c.name} className="px-4 py-2.5">{r[c.name] ?? r[c.name.toLowerCase()]}</td>)}</tr>)}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: CONFIGURE */}
          {activeStep === 3 && (
            <div className="animate-in fade-in space-y-6 max-w-2xl mx-auto">
              <h2 className="text-xl font-bold text-[#111827] text-center mb-6">Execution Configuration</h2>
              
              <div className="bg-white border border-[#E5E7EB] p-8 rounded-xl shadow-sm space-y-8">
                <div>
                  <label className="block text-sm font-bold text-[#111827] mb-3">1. Delivery Channel</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setChannelType('whatsapp')} className={`p-4 rounded-xl border flex items-center justify-center gap-2 font-medium transition-all ${channelType === 'whatsapp' ? 'border-[#059669] bg-[#ECFDF5] text-[#059669]' : 'border-[#E5E7EB] text-[#6B7280] hover:bg-[#F8FAFC]'}`}><MessageSquare size={18}/> WhatsApp</button>
                    <button onClick={() => setChannelType('email')} className={`p-4 rounded-xl border flex items-center justify-center gap-2 font-medium transition-all ${channelType === 'email' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-[#E5E7EB] text-[#6B7280] hover:bg-[#F8FAFC]'}`}><Mail size={18}/> Email</button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#111827] mb-3">2. Provider Integration</label>
                  {activeIntegrations.length === 0 ? (
                    <div className="p-4 bg-[#FFFBEB] border border-[#FDE68A] text-amber-800 text-sm rounded-lg flex items-center gap-2"><AlertCircle size={16}/> No active {channelType} integrations found.</div>
                  ) : (
                    <select value={selectedIntegrationId} onChange={e => setSelectedIntegrationId(Number(e.target.value))} className="w-full p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg text-sm focus:border-[#059669] outline-none">
                      <option value="" disabled>Select active integration...</option>
                      {activeIntegrations.map(i => <option key={i.id} value={i.id}>{i.provider_name}</option>)}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#111827] mb-1">3. Target Recipient Column</label>
                  <select value={recipientColumn} onChange={e => setRecipientColumn(e.target.value)} className="w-full p-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg text-sm focus:border-[#059669] outline-none">
                    <option value="" disabled>Select recipient column...</option>
                    {schema.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & FILTER TEST */}
          {activeStep === 4 && (
            <div className="animate-in fade-in space-y-6 max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-[#F8FAFC] border border-[#E5E7EB] rounded-full flex items-center justify-center mx-auto mb-4"><Server className="text-[#059669]" size={32} /></div>
                <h2 className="text-2xl font-bold text-[#111827]">Review & Target Audience</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider border-b border-[#E5E7EB] pb-2">Configuration Summary</h3>
                    <div><p className="text-xs text-[#6B7280] uppercase tracking-wider font-semibold">Template</p><p className="font-medium text-[#111827] mt-1">{selectedTemplate?.name} (v{selectedTemplate?.version})</p></div>
                    <div><p className="text-xs text-[#6B7280] uppercase tracking-wider font-semibold">Channel</p><p className="font-medium text-[#111827] mt-1 capitalize">{channelType}</p></div>
                    <div><p className="text-xs text-[#6B7280] uppercase tracking-wider font-semibold">Recipient Column</p><p className="font-medium text-[#111827] mt-1">{recipientColumn}</p></div>
                  </div>
                  
                  <div className="pt-6 mt-6 border-t border-[#E5E7EB]">
                    <p className="text-xs text-[#6B7280] uppercase tracking-wider font-semibold">Target Audience Size</p>
                    <div className="flex items-end gap-2 mt-1">
                      <span className="text-3xl font-bold text-[#059669]">{matchedCount ?? rowCount}</span>
                      <span className="text-sm font-medium text-[#6B7280] mb-1">/ {rowCount} CSV rows</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm flex flex-col h-full">
                   <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider border-b border-[#E5E7EB] pb-2 mb-4 flex items-center gap-2"><Eye size={16} className="text-[#059669]" /> Target Audience Preview</h3>
                   {matchedRows.length > 0 ? (
                     <div className="border border-[#E5E7EB] rounded-lg overflow-x-auto shadow-inner flex-1 bg-[#F8FAFC]">
                        <table className="w-full text-left text-xs text-[#4B5563] whitespace-nowrap">
                           <thead className="bg-white border-b border-[#E5E7EB]"><tr className="text-[#6B7280]">{schema.slice(0, 4).map(c => <th key={c.name} className="px-3 py-2 font-medium">{c.name}</th>)}</tr></thead>
                           <tbody className="divide-y divide-[#E5E7EB] bg-white">
                             {matchedRows.slice(0, 5).map((r, i) => <tr key={i} className="hover:bg-[#F9FAFB]">{schema.slice(0, 4).map(c => <td key={c.name} className="px-3 py-2">{r[c.name] ?? r[c.name.toLowerCase()]}</td>)}</tr>)}
                           </tbody>
                        </table>
                     </div>
                   ) : (
                     <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[#6B7280]">
                        <Users size={32} className="text-[#E5E7EB] mb-3" />
                        <p className="text-sm font-medium text-[#111827]">No Audience Preview</p>
                     </div>
                   )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="px-8 py-5 border-t border-[#E5E7EB] bg-[#F8FAFC] flex items-center justify-between">
          {activeStep > 1 && (
            <button onClick={() => setActiveStep(prev => prev - 1)} className="mr-auto px-5 py-2.5 flex items-center gap-2 text-sm font-bold text-[#4B5563] bg-white border border-[#E5E7EB] rounded-xl hover:bg-[#F9FAFB] shadow-sm">
              <ChevronLeft size={16} /> Back
            </button>
          )}
          
          {activeStep < 4 ? (
            <button onClick={nextStep} disabled={(activeStep === 1 && !canProceedToStep2) || (activeStep === 2 && !canProceedToStep3) || (activeStep === 3 && !canProceedToStep4) || isTestingFilter} className="px-8 py-3 bg-[#111827] text-white text-sm font-bold rounded-xl hover:bg-[#1F2937] shadow-lg flex items-center gap-2 disabled:opacity-50 ml-auto">
              {isTestingFilter ? <RefreshCw className="animate-spin" size={18} /> : 'Continue'} {!isTestingFilter && <ChevronRight size={18} />}
            </button>
          ) : (
             <button onClick={handleStartExecution} disabled={isStarting || matchedCount === 0} className="px-10 py-3.5 bg-[#059669] text-white text-base font-bold rounded-xl hover:bg-[#047857] shadow-xl shadow-[#059669]/20 flex items-center gap-3 disabled:opacity-50 ml-auto">
              {isStarting ? <RefreshCw className="animate-spin" size={20} /> : <PlayCircle size={20} />} {isStarting ? 'Starting Engine...' : 'Run Campaign'} 
            </button>
          )}
        </div>

      </div>
    </div>
  );
}