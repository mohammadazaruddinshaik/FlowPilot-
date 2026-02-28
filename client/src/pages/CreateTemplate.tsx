// import React, { useState, useRef, useEffect } from 'react';
// import { 
//   UploadCloud, Filter, Send, Plus, Trash2, CheckCircle, 
//   AlertCircle, Play, Eye, FileSpreadsheet, Users, ChevronRight, ChevronLeft,
//   Maximize2, X, RefreshCw, Hash, Type, Info
// } from 'lucide-react';
// import { useNavigate } from 'react-router-dom';
// import axios from 'axios';

// // --- CONFIGURATION & API ---
// const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
// const CACHE_KEY = 'campaign_template_wizard_draft';

// const getAuthHeaders = () => {
//   const token = localStorage.getItem('access_token');
//   return { 'Authorization': `Bearer ${token}` };
// };

// // --- REAL API SERVICES (Using Axios) ---
// const api = {
//   tempUpload: async (file: File) => {
//     const formData = new FormData();
//     formData.append('file', file);
//     const res = await axios.post(`${BASE_URL}/dataset/temp-upload`, formData, {
//       headers: { "Content-Type": "multipart/form-data", ...getAuthHeaders() }
//     });
//     return res.data;
//   },
//   testFilter: async (file: File, filterDef?: any) => {
//     const formData = new FormData();
//     formData.append("file", file);
    
//     if (filterDef && filterDef.conditions && filterDef.conditions.length > 0) {
//       formData.append("filter_definition", JSON.stringify(filterDef));
//     }

//     const res = await axios.post(`${BASE_URL}/campaign-template/test-filter`, formData, {
//       headers: { "Content-Type": "multipart/form-data", ...getAuthHeaders() }
//     });
//     return res.data;
//   },
//   createTemplate: async (payload: any) => {
//     const res = await axios.post(`${BASE_URL}/campaign-template/`, payload, {
//       headers: { "Content-Type": "application/json", ...getAuthHeaders() }
//     });
//     return res.data;
//   }
// };

// // --- TYPES ---
// interface SchemaItem { name: string; type: 'string' | 'number'; }
// interface ConditionUI { id: string; column: string; operator: string; value: string; }

// // --- ENHANCED DATA TABLE WITH MODAL ---
// const DataTable = ({ rows, schema, emptyMessage }: { rows: any[], schema: SchemaItem[], emptyMessage: string }) => {
//   const [isModalOpen, setIsModalOpen] = useState(false);

//   if (!rows || rows.length === 0) return <div className="p-8 text-center bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg text-sm text-[#6B7280]">{emptyMessage}</div>;

//   const TableContent = ({ isExpanded = false }) => (
//     <table className="w-full text-left text-sm text-[#4B5563] whitespace-nowrap">
//       <thead className="bg-[#F8FAFC] text-[#6B7280] font-medium border-b border-[#E5E7EB] sticky top-0 z-10">
//         <tr>{schema?.map(col => <th key={col.name} className="px-4 py-3">{col.name}</th>)}</tr>
//       </thead>
//       <tbody className="bg-white divide-y divide-[#E5E7EB]">
//         {rows.map((row, idx) => (
//           <tr key={idx} className="hover:bg-[#F9FAFB] transition-colors">
//             {schema?.map(col => <td key={col.name} className={`px-4 ${isExpanded ? 'py-3' : 'py-2.5'}`}>{row[col.name] ?? row[col.name.toLowerCase()]}</td>)}
//           </tr>
//         ))}
//       </tbody>
//     </table>
//   );

//   return (
//     <>
//       <div className="relative group border border-[#E5E7EB] rounded-lg shadow-sm bg-white overflow-hidden">
//         <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
//           <button onClick={() => setIsModalOpen(true)} className="p-1.5 bg-white border border-[#E5E7EB] rounded shadow-sm text-[#6B7280] hover:text-[#059669] hover:bg-[#ECFDF5] transition-colors"><Maximize2 size={16} /></button>
//         </div>
//         <div className="max-h-[300px] overflow-auto"><TableContent /></div>
//       </div>

//       {isModalOpen && (
//         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#111827]/50 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-200">
//           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
//             <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] bg-white z-10">
//               <div>
//                 <h3 className="text-lg font-bold text-[#111827] flex items-center gap-2"><FileSpreadsheet className="text-[#059669]" size={20}/> Expanded Data Preview</h3>
//                 <p className="text-sm text-[#6B7280] mt-0.5">Showing {rows.length} rows and {schema?.length || 0} columns.</p>
//               </div>
//               <button onClick={() => setIsModalOpen(false)} className="p-2 text-[#9CA3AF] hover:text-[#111827] bg-[#F3F4F6] hover:bg-[#E5E7EB] rounded-lg transition-colors"><X size={20} /></button>
//             </div>
//             <div className="flex-1 overflow-auto bg-[#F8FAFC] p-6">
//               <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden"><div className="overflow-auto max-h-[70vh]"><TableContent isExpanded={true} /></div></div>
//             </div>
//           </div>
//         </div>
//       )}
//     </>
//   );
// };

// // --- MAIN COMPONENT ---
// export default function TemplateWizard() {
//   const navigate = useNavigate();
  
//   // --- BROWSER CACHE (SESSION STORAGE) INIT ---
//   const loadCache = () => {
//     try {
//       const cached = sessionStorage.getItem(CACHE_KEY);
//       return cached ? JSON.parse(cached) : null;
//     } catch { return null; }
//   };
//   const cachedState = loadCache();

//   const [activeStep, setActiveStep] = useState<number>(cachedState?.activeStep || 1);
//   const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);
  
//   // State: Dataset
//   const [csvFile, setCsvFile] = useState<File | null>(null); 
//   const [tempDatasetId, setTempDatasetId] = useState<string | null>(cachedState?.tempDatasetId || null);
//   const [schema, setSchema] = useState<SchemaItem[]>(cachedState?.schema || []);
//   const [sampleRows, setSampleRows] = useState<any[]>(cachedState?.sampleRows || []);
//   const [datasetMeta, setDatasetMeta] = useState<{name: string, count: number} | null>(cachedState?.datasetMeta || null);
  
//   // State: Filter
//   const [filterLogic, setFilterLogic] = useState<'AND' | 'OR'>(cachedState?.filterLogic || 'AND');
//   const [conditions, setConditions] = useState<ConditionUI[]>(cachedState?.conditions || []);
//   const [filterTested, setFilterTested] = useState(cachedState?.filterTested || false);
//   const [matchedCount, setMatchedCount] = useState<number | null>(cachedState?.matchedCount || null);
//   const [matchedRows, setMatchedRows] = useState<any[]>(cachedState?.matchedRows || []);
  
//   // State: Message (Rich Text)
//   const [templateName, setTemplateName] = useState(cachedState?.templateName || "");
//   const [editorHtml, setEditorHtml] = useState(cachedState?.editorHtml || ""); 
//   const editorRef = useRef<HTMLDivElement>(null);
//   const [isPublishing, setIsPublishing] = useState(false);

//   // --- AUTO-SAVE TO BROWSER MEMORY ---
//   useEffect(() => {
//     const stateToCache = {
//       activeStep, tempDatasetId, schema, sampleRows, datasetMeta,
//       filterLogic, conditions, filterTested, matchedCount, matchedRows,
//       templateName, editorHtml
//     };
//     sessionStorage.setItem(CACHE_KEY, JSON.stringify(stateToCache));
//   }, [activeStep, tempDatasetId, schema, sampleRows, datasetMeta, filterLogic, conditions, filterTested, matchedCount, matchedRows, templateName, editorHtml]);

//   // Restore contentEditable state safely
//   useEffect(() => {
//     if (activeStep === 3 && editorRef.current && editorRef.current.innerHTML !== editorHtml) {
//       editorRef.current.innerHTML = editorHtml;
//     }
//   }, [activeStep]);

//   const STEPS = [
//     { num: 1, title: 'Upload Data' },
//     { num: 2, title: 'Target Audience' },
//     { num: 3, title: 'Compose Message' },
//     { num: 4, title: 'Review & Create' }
//   ];

//   const showToast = (msg: string, type: 'success'|'error') => { 
//     setToast({ message: msg, type }); setTimeout(() => setToast(null), 3000); 
//   };

//   const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     try {
//       const res = await api.tempUpload(file);
//       setCsvFile(file);
//       setTempDatasetId(res.temp_dataset_id);
//       setSchema(res.schema || []);
//       setSampleRows(res.preview_rows || res.sample_rows || []);
//       setMatchedRows(res.preview_rows || res.sample_rows || []); 
//       setMatchedCount(res.row_count || 0);
//       setDatasetMeta({ name: file.name, count: res.row_count || 0 });
//     } catch (error: any) {
//       showToast(error.response?.data?.detail || error.message || "Upload failed.", "error");
//     }
//   };

//   const handleTestFilter = async () => {
//     if (!csvFile) {
//       showToast("Please re-select your CSV file to test the filter.", "error");
//       return;
//     }
//     try {
//       let filterDef = null;
//       if (conditions.length > 0) {
//         filterDef = {
//           logic: filterLogic,
//           conditions: conditions.map(c => {
//             const isNum = schema.find(s => s.name === c.column)?.type === 'number';
//             return { 
//               column: c.column.toLowerCase(),
//               operator: c.operator, 
//               value: isNum ? Number(c.value) : c.value 
//             };
//           })
//         };
//       }

//       const res = await api.testFilter(csvFile, filterDef);
      
//       setMatchedCount(res.matched_count);
//       setMatchedRows(res.matched_rows || res.sample_rows || []);
//       if (res.schema) setSchema(res.schema); 
//       setFilterTested(true);
//     } catch (error: any) {
//       showToast(error.response?.data?.detail || error.message || "Failed to test filter.", "error");
//     }
//   };

//   const clearDraft = () => {
//     sessionStorage.removeItem(CACHE_KEY);
//     window.location.reload(); 
//   }

//   // --- STABILIZED RICH TEXT EDITOR LOGIC ---
//   const insertVariablePill = (varName: string) => {
//     if (!editorRef.current) return;
//     if (document.activeElement !== editorRef.current) {
//       editorRef.current.focus();
//       const range = document.createRange();
//       range.selectNodeContents(editorRef.current);
//       range.collapse(false);
//       const sel = window.getSelection();
//       sel?.removeAllRanges();
//       sel?.addRange(range);
//     }

//     const selection = window.getSelection();
//     if (!selection || selection.rangeCount === 0) return;
//     let range = selection.getRangeAt(0);

//     if (!editorRef.current.contains(range.commonAncestorContainer)) {
//       range = document.createRange();
//       range.selectNodeContents(editorRef.current);
//       range.collapse(false);
//     }

//     const pill = document.createElement('span');
//     pill.className = 'inline-block align-baseline px-2 py-0.5 mx-1 bg-[#059669]/10 text-[#059669] rounded border border-[#059669]/20 font-medium text-[13px] select-none cursor-default shadow-sm';
//     pill.contentEditable = "false";
//     pill.setAttribute('data-variable', varName);
//     pill.innerText = varName;

//     const spaceNode = document.createTextNode('\u00A0');

//     range.deleteContents();
//     range.insertNode(spaceNode);
//     range.insertNode(pill);

//     range.setStartAfter(spaceNode);
//     range.setEndAfter(spaceNode);
//     selection.removeAllRanges();
//     selection.addRange(range);

//     setEditorHtml(editorRef.current.innerHTML);
//   };

//   const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
//     if (e.key === 'Enter') {
//       e.preventDefault();
//       document.execCommand('insertLineBreak');
//     }
//   };

//   const extractBackendPayloadText = (html: string) => {
//     const tempDiv = document.createElement('div');
//     tempDiv.innerHTML = html.replace(/<br\s*[\/]?>/gi, '\n');
//     const pills = tempDiv.querySelectorAll('span[data-variable]');
//     pills.forEach(pill => {
//       const varName = pill.getAttribute('data-variable');
//       pill.replaceWith(`{{${varName}}}`);
//     });
//     return tempDiv.textContent?.replace(/\u00A0/g, ' ').trim() || '';
//   };

//   const getLivePreview = () => {
//     if (!matchedRows || matchedRows.length === 0 || !editorHtml) return "";
//     const sample = matchedRows[0]; 
//     let renderedHtml = editorHtml;
//     schema?.forEach(col => {
//       const regex = new RegExp(`<span[^>]*data-variable="${col.name}"[^>]*>.*?<\/span>`, 'gi');
//       const value = (sample[col.name] !== undefined ? sample[col.name] : sample[col.name.toLowerCase()]) || 'Missing Variable';
//       renderedHtml = renderedHtml.replace(regex, `<span class="inline-block px-1.5 py-0.5 mx-0.5 bg-[#059669]/10 text-[#059669] rounded border border-[#059669]/20 font-medium">${value}</span>`);
//     });
//     return renderedHtml;
//   };

//   // --- FINAL CREATE ACTION ---
//   const handleCreateTemplate = async () => {
//     const rawTemplateText = extractBackendPayloadText(editorHtml);

//     if (!templateName || !rawTemplateText || !tempDatasetId) {
//       showToast("Template Name, Message, and Dataset are required.", "error");
//       return;
//     }

//     const manualVars = rawTemplateText.match(/\{\{([^}]+)\}\}/g) || [];
//     const usedVars = manualVars.map(m => m.replace(/[{}]/g, ''));
//     const missingVariables = usedVars.filter(v => !schema.some(s => s.name.toLowerCase() === v.toLowerCase()));

//     if (missingVariables.length > 0) {
//       showToast(`Invalid variable(s) detected: ${missingVariables.join(', ')}. Please strictly use variables from your dataset schema.`, "error");
//       setActiveStep(3); 
//       return;
//     }

//     setIsPublishing(true);
//     try {
//       const createPayload: any = {
//         name: templateName,
//         description: "Created via Wizard",
//         temp_dataset_id: tempDatasetId,
//         template: rawTemplateText 
//       };

//       if (conditions.length > 0) {
//         createPayload.filter_definition = {
//           logic: filterLogic,
//           conditions: conditions.map(c => {
//             const isNum = schema.find(s => s.name === c.column)?.type === 'number';
//             return { column: c.column.toLowerCase(), operator: c.operator, value: isNum ? Number(c.value) : c.value };
//           })
//         };
//       } else {
//         createPayload.filter_definition = null; // No filter = apply to all
//       }

//       await api.createTemplate(createPayload);
      
//       sessionStorage.removeItem(CACHE_KEY);
//       showToast("Template created successfully!", "success");
//       setTimeout(() => navigate('/templates'), 1500);
//     } catch (error: any) {
//       showToast(error.response?.data?.detail || error.message || "Failed to create template.", "error");
//       setIsPublishing(false);
//     }
//   };

//   const nextStep = () => setActiveStep(prev => Math.min(prev + 1, 4));
//   const prevStep = () => setActiveStep(prev => Math.max(prev - 1, 1));

//   const canProceed = () => {
//     if (activeStep === 1) return tempDatasetId !== null;
//     if (activeStep === 2) return filterTested || conditions.length === 0;
//     if (activeStep === 3) return templateName.trim() !== "" && extractBackendPayloadText(editorHtml).trim() !== "";
//     return true;
//   };

//   return (
//     <div className="min-h-screen bg-[#F8FAFC] font-sans text-[#111827] py-10 px-6">
      
//       {toast && (
//         <div className={`fixed top-6 right-6 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-in slide-in-from-right ${toast.type === 'success' ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-red-50 text-red-700'}`}>
//           <CheckCircle size={18} /> <span className="text-sm font-medium">{toast.message}</span>
//         </div>
//       )}

//       {/* HEADER & TOP STEPPER */}
//       <div className="max-w-[1000px] mx-auto mb-10 flex items-start justify-between">
//         <div>
//           <h1 className="text-2xl font-bold text-[#111827]">Create Template</h1>
//           {cachedState && (
//             <p className="text-xs text-[#059669] mt-2 font-medium bg-[#ECFDF5] px-2 py-1 inline-block rounded-md border border-[#A7F3D0]">Draft recovered from local cache</p>
//           )}
//         </div>
//         {cachedState && (
//           <button onClick={clearDraft} className="flex items-center gap-1.5 text-xs font-bold text-[#6B7280] hover:text-red-600 transition-colors">
//             <RefreshCw size={14}/> Reset Draft
//           </button>
//         )}
//       </div>

//       <div className="mt-8 flex items-center justify-between w-full max-w-3xl mx-auto relative mb-12">
//         <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-[#E5E7EB] z-0 rounded-full" />
//         <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[#059669] z-0 rounded-full transition-all duration-300" style={{ width: `${((activeStep - 1) / 3) * 100}%` }} />
        
//         {STEPS.map((step) => {
//           const isCompleted = step.num < activeStep;
//           const isActive = step.num === activeStep;
//           return (
//             <button
//               key={step.num}
//               onClick={() => { if (step.num < activeStep) setActiveStep(step.num); }}
//               className={`relative z-10 flex flex-col items-center gap-2 ${step.num < activeStep ? 'cursor-pointer hover:scale-105 transition-transform' : 'cursor-default'}`}
//             >
//               <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 ${isActive ? 'bg-[#059669] text-white ring-4 ring-[#059669]/20 shadow-md' : isCompleted ? 'bg-[#059669] text-white' : 'bg-white border-2 border-[#E5E7EB] text-[#9CA3AF]'}`}>
//                 {isCompleted ? <CheckCircle size={20} /> : step.num}
//               </div>
//               <span className={`text-xs font-medium absolute -bottom-6 w-max ${isActive ? 'text-[#111827]' : isCompleted ? 'text-[#059669]' : 'text-[#9CA3AF]'}`}>{step.title}</span>
//             </button>
//           );
//         })}
//       </div>

//       {/* MAIN CONTENT CARD */}
//       <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm max-w-[1000px] mx-auto overflow-hidden flex flex-col min-h-[500px]">
//         <div className="p-8 flex-1">
          
//           {/* 1️⃣ STEP 1: UPLOAD & PREVIEW */}
//           {activeStep === 1 && (
//             <div className="animate-in fade-in zoom-in-95 duration-300 space-y-8">
//               <div className="text-center mb-8">
//                 <h2 className="text-xl font-bold text-[#111827]">Upload Dataset</h2>
//                 <p className="text-sm text-[#6B7280] mt-1">Provide a sample CSV to help us understand your variables.</p>
//               </div>

//               {!tempDatasetId ? (
//                 <div className="border-2 border-dashed border-[#E5E7EB] rounded-2xl bg-[#F8FAFC] p-16 flex flex-col items-center justify-center hover:border-[#059669] hover:bg-[#059669]/5 transition-colors group relative cursor-pointer max-w-2xl mx-auto">
//                   <input type="file" accept=".csv" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileUpload} />
//                   <UploadCloud className="text-[#059669] mb-4 group-hover:scale-110 transition-transform" size={40} />
//                   <h3 className="text-base font-semibold text-[#111827]">Drag & Drop CSV here</h3>
//                 </div>
//               ) : (
//                 <div className="space-y-6">
//                   {/* Summary & Replace */}
//                   <div className="flex items-center justify-between bg-[#F8FAFC] border border-[#E5E7EB] p-5 rounded-xl shadow-sm">
//                     <div className="flex items-center gap-4">
//                       <div className="p-3 bg-[#ECFDF5] rounded-lg text-[#059669]"><FileSpreadsheet size={24} /></div>
//                       <div>
//                         <p className="text-base font-bold text-[#111827]">{datasetMeta?.name}</p>
//                         <p className="text-sm font-medium text-[#059669] mt-0.5">{datasetMeta?.count?.toLocaleString() || 0} rows detected</p>
//                       </div>
//                     </div>
//                     <button onClick={() => { setTempDatasetId(null); setSchema([]); setCsvFile(null); }} className="text-sm font-medium text-[#6B7280] hover:text-[#111827] underline">Replace File</button>
//                   </div>

//                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//                     {/* Schema Column */}
//                     <div className="md:col-span-1 bg-white border border-[#E5E7EB] rounded-xl overflow-hidden flex flex-col shadow-sm">
//                       <div className="bg-[#F8FAFC] border-b border-[#E5E7EB] px-4 py-3 flex items-center gap-2">
//                         <Filter size={16} className="text-[#059669]" />
//                         <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider">Detected Schema</h4>
//                       </div>
//                       <div className="p-0 overflow-y-auto max-h-[300px]">
//                         <ul className="divide-y divide-[#E5E7EB]">
//                           {schema.map(col => (
//                             <li key={col.name} className="px-4 py-3 flex justify-between items-center text-sm">
//                               <span className="font-medium text-[#111827]">{col.name}</span>
//                               <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${col.type === 'number' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
//                                 {col.type === 'number' ? <Hash size={10} /> : <Type size={10} />} {col.type}
//                               </span>
//                             </li>
//                           ))}
//                         </ul>
//                       </div>
//                     </div>

//                     {/* Data Preview Column */}
//                     <div className="md:col-span-2 bg-white border border-[#E5E7EB] rounded-xl overflow-hidden flex flex-col shadow-sm">
//                       <div className="bg-[#F8FAFC] border-b border-[#E5E7EB] px-4 py-3 flex items-center gap-2">
//                          <Eye size={16} className="text-[#059669]" />
//                          <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider">Data Preview</h4>
//                       </div>
//                       <div className="p-4 bg-white flex-1">
//                         <DataTable rows={sampleRows} schema={schema} emptyMessage="No data available." />
//                       </div>
//                     </div>
//                   </div>

//                 </div>
//               )}
//             </div>
//           )}

//           {/* 2️⃣ STEP 2: FILTER */}
//           {activeStep === 2 && (
//             <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
//               <div>
//                 <h2 className="text-xl font-bold text-[#111827]">Define Target Audience (Optional)</h2>
//                 <p className="text-sm text-[#6B7280] mt-1">If no filter is set, the template will apply to all {datasetMeta?.count} rows.</p>
//               </div>

//               {/* Filter Examples Banner */}
//               <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-4 flex gap-4 text-sm mb-6">
//                 <Info className="text-[#059669] shrink-0 mt-0.5" size={18} />
//                 <div className="w-full">
//                   <p className="font-semibold text-[#111827] mb-2">Filter Examples</p>
//                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                     <div className="bg-white border border-[#E5E7EB] p-2 rounded text-xs"><span className="text-[#6B7280]">Number:</span> <br/><span className="font-mono text-[#059669] font-bold">attendance &lt; 75</span></div>
//                     <div className="bg-white border border-[#E5E7EB] p-2 rounded text-xs"><span className="text-[#6B7280]">String:</span> <br/><span className="font-mono text-blue-600 font-bold">rollno == 23951</span></div>
//                     <div className="bg-white border border-[#E5E7EB] p-2 rounded text-xs"><span className="text-[#6B7280]">Contains:</span> <br/><span className="font-mono text-blue-600 font-bold">name contains john</span></div>
//                   </div>
//                 </div>
//               </div>

//               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
//                 <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-6 h-max">
//                   <div className="mb-6 bg-[#F8FAFC] border border-[#E5E7EB] p-4 rounded-xl">
//                     <p className="text-sm font-semibold text-[#111827] mb-3">Match Conditions:</p>
//                     <div className="flex gap-6">
//                       <label className="flex items-center gap-2 text-sm text-[#4B5563] cursor-pointer">
//                         <input type="radio" checked={filterLogic === 'AND'} onChange={() => { setFilterLogic('AND'); setFilterTested(false); }} className="accent-[#059669] w-4 h-4" />
//                         ALL conditions (AND)
//                       </label>
//                       <label className="flex items-center gap-2 text-sm text-[#4B5563] cursor-pointer">
//                         <input type="radio" checked={filterLogic === 'OR'} onChange={() => { setFilterLogic('OR'); setFilterTested(false); }} className="accent-[#059669] w-4 h-4" />
//                         ANY condition (OR)
//                       </label>
//                     </div>
//                   </div>

//                   <div className="space-y-4">
//                     {conditions.length === 0 && (
//                       <p className="text-sm text-[#059669] bg-[#ECFDF5] p-3 rounded-lg border border-[#A7F3D0]">No filter applied. All rows will be targeted.</p>
//                     )}
//                     {conditions.map((cond, idx) => {
//                       const isNum = schema.find(s => s.name === cond.column)?.type === 'number';
//                       return (
//                         <div key={cond.id} className="flex items-center gap-2">
//                           <select value={cond.column} onChange={e => { const newConds = [...conditions]; newConds[idx].column = e.target.value; newConds[idx].operator = '=='; setConditions(newConds); setFilterTested(false); }} className="w-1/3 px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm focus:border-[#059669] outline-none shadow-sm">
//                             <option value="" disabled>Column</option>
//                             {schema?.map(col => <option key={col.name} value={col.name}>{col.name} ({col.type})</option>)}
//                           </select>
//                           <select value={cond.operator} onChange={e => { const newConds = [...conditions]; newConds[idx].operator = e.target.value; setConditions(newConds); setFilterTested(false); }} className="w-1/4 px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm focus:border-[#059669] outline-none shadow-sm">
//                             <option value="==">==</option>
//                             {!isNum && <option value="contains">contains</option>}
//                             {isNum && <><option value="<">&lt;</option><option value=">">&gt;</option><option value="<=">&lt;=</option><option value=">=">&gt;=</option></>}
//                           </select>
//                           <input type={isNum ? "number" : "text"} placeholder="Value" value={cond.value} onChange={e => { const newConds = [...conditions]; newConds[idx].value = e.target.value; setConditions(newConds); setFilterTested(false); }} className="w-1/3 px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm focus:border-[#059669] outline-none shadow-sm" />
//                           <button onClick={() => {
//                             const newConds = conditions.filter(c => c.id !== cond.id);
//                             setConditions(newConds);
//                             if (newConds.length === 0) setFilterTested(true); // Auto-pass if empty
//                           }} className="text-[#9CA3AF] hover:text-red-600 bg-white p-2 rounded-lg border border-[#E5E7EB] hover:border-red-200 transition-colors"><Trash2 size={16} /></button>
//                         </div>
//                       );
//                     })}
//                   </div>
                  
//                   <div className="mt-6 flex items-center justify-between pt-4 border-t border-[#E5E7EB]">
//                     <button onClick={() => setConditions([...conditions, { id: Date.now().toString(), column: schema[0]?.name || '', operator: '==', value: '' }])} className="text-sm font-medium text-[#059669] flex items-center gap-1.5 hover:text-[#047857]"><Plus size={16} /> Add Condition</button>
//                     {conditions.length > 0 && (
//                       <button onClick={handleTestFilter} className="px-4 py-2 bg-white border border-[#E5E7EB] text-[#111827] text-sm font-medium rounded-lg hover:bg-[#F9FAFB] shadow-sm flex items-center gap-2">
//                         <Play size={14} className="text-[#059669]"/> Test Filter
//                       </button>
//                     )}
//                   </div>
//                 </div>

//                 <div className="flex flex-col h-full">
//                   {filterTested && conditions.length > 0 ? (
//                     <div className="flex flex-col h-full animate-in fade-in">
//                       <div className={`p-4 rounded-t-xl border border-b-0 border-[#E5E7EB] flex items-center gap-3 ${matchedCount === 0 ? 'bg-red-50 text-red-700' : 'bg-[#ECFDF5] text-[#047857]'}`}>
//                         <Users size={20} />
//                         <span className="text-sm font-bold">{matchedCount} Records Matched</span>
//                       </div>
//                       <DataTable rows={matchedRows} schema={schema} emptyMessage="⚠ No rows matched your filter." />
//                     </div>
//                   ) : (
//                      <div className="flex-1 border-2 border-dashed border-[#E5E7EB] rounded-xl bg-[#F8FAFC] flex flex-col items-center justify-center p-8 text-center">
//                         <Filter className="text-[#9CA3AF] mb-3" size={32} />
//                         <p className="text-sm font-medium text-[#4B5563]">No active filters</p>
//                         <p className="text-xs text-[#6B7280] mt-1">Apply conditions and click 'Test Filter' to see matched rows here.</p>
//                         {csvFile === null && conditions.length > 0 && <p className="text-xs text-red-500 font-bold mt-2">CSV file lost from cache. Please re-upload on step 1 to test filter.</p>}
//                      </div>
//                   )}
//                 </div>
//               </div>
//             </div>
//           )}

//           {/* 3️⃣ STEP 3: MESSAGE COMPOSER */}
//           {activeStep === 3 && (
//             <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
//                <div>
//                 <h2 className="text-xl font-bold text-[#111827]">Compose Message</h2>
//                 <p className="text-sm text-[#6B7280] mt-1">Draft your template. Click the variables below to insert them into your message.</p>
//               </div>

//               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
//                 <div className="space-y-5">
//                   <div>
//                     <label className="block text-sm font-medium text-[#111827] mb-1.5">Template Name *</label>
//                     <input type="text" placeholder="e.g., Warning Notice" value={templateName} onChange={e => setTemplateName(e.target.value)} className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg text-sm outline-none focus:bg-white focus:border-[#059669] transition-colors" />
//                   </div>
                  
//                   <div>
//                     <div className="flex items-center justify-between mb-2">
//                       <label className="block text-sm font-medium text-[#111827]">Message Body *</label>
//                       <span className="text-xs text-[#6B7280]">Available Fields</span>
//                     </div>
                    
//                     <div className="flex gap-2 flex-wrap bg-[#F8FAFC] p-3 rounded-t-lg border border-[#E5E7EB] border-b-0">
//                       {schema?.map(col => (
//                         <button key={col.name} onMouseDown={(e) => { e.preventDefault(); insertVariablePill(col.name); }} className="px-2.5 py-1 bg-white border border-[#E5E7EB] text-[#111827] rounded text-xs font-medium hover:border-[#059669] hover:text-[#059669] shadow-sm transition-colors flex items-center gap-1">
//                           <Plus size={12}/> {col.name}
//                         </button>
//                       ))}
//                     </div>
                    
//                     <div 
//                       ref={editorRef}
//                       contentEditable
//                       onInput={(e) => setEditorHtml(e.currentTarget.innerHTML)}
//                       onKeyDown={handleEditorKeyDown}
//                       className="w-full h-48 p-4 border border-[#E5E7EB] rounded-b-lg text-sm outline-none focus:border-[#059669] shadow-inner bg-white overflow-y-auto leading-relaxed"
//                       style={{ whiteSpace: 'pre-wrap' }}
//                       suppressContentEditableWarning={true}
//                     />
//                   </div>
//                 </div>

//                 <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-6 flex flex-col">
//                   <h3 className="text-sm font-semibold text-[#111827] flex items-center gap-2 mb-4">
//                     <Eye size={18} className="text-[#6B7280]"/> Live Preview (Row 1 Data)
//                   </h3>
//                   <div 
//                     className="bg-white border border-[#E5E7EB] rounded-xl p-5 flex-1 shadow-sm text-sm text-[#111827] whitespace-pre-wrap leading-relaxed" 
//                     dangerouslySetInnerHTML={{ __html: getLivePreview() || '<span class="text-gray-400 italic">Start typing on the left to see your preview here...</span>' }} 
//                   />
//                 </div>
//               </div>
//             </div>
//           )}

//           {/* 4️⃣ STEP 4: CREATE */}
//           {activeStep === 4 && (
//             <div className="animate-in fade-in zoom-in-95 duration-300 space-y-8">
//               <div className="text-center max-w-lg mx-auto mb-10">
//                 <div className="w-16 h-16 bg-[#ECFDF5] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#A7F3D0]">
//                   <Send className="text-[#059669]" size={32} />
//                 </div>
//                 <h2 className="text-2xl font-bold text-[#111827]">Review & Create</h2>
//                 <p className="text-sm text-[#6B7280] mt-2">Double-check your template settings. Upon creation, this will be saved to your workspace.</p>
//               </div>

//               <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-2xl p-8 max-w-3xl mx-auto shadow-sm">
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 divide-y md:divide-y-0 md:divide-x divide-[#E5E7EB]">
//                   <div className="space-y-6">
//                     <div>
//                       <p className="text-xs text-[#6B7280] uppercase tracking-wider font-semibold mb-1">Template Name</p>
//                       <p className="text-base font-medium text-[#111827]">{templateName}</p>
//                     </div>
//                     <div>
//                       <p className="text-xs text-[#6B7280] uppercase tracking-wider font-semibold mb-1">Dataset Linked</p>
//                       <p className="text-base font-medium text-[#111827] flex items-center gap-2"><FileSpreadsheet size={16} className="text-[#059669]"/> {datasetMeta?.name || 'None'}</p>
//                     </div>
//                   </div>
//                   <div className="pt-6 md:pt-0 md:pl-8 space-y-6">
//                     <div>
//                       <p className="text-xs text-[#6B7280] uppercase tracking-wider font-semibold mb-1">Target Audience Size</p>
//                       <p className="text-2xl font-bold text-[#059669]">{matchedCount ?? datasetMeta?.count ?? 0} <span className="text-base font-medium text-[#6B7280]">Records</span></p>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           )}

//         </div>

//         {/* BOTTOM ACTION BAR */}
//         <div className="px-8 py-5 border-t border-[#E5E7EB] bg-[#F8FAFC] flex items-center justify-between">
//           {activeStep > 1 && (
//             <button onClick={prevStep} className="mr-auto px-5 py-2.5 flex items-center gap-2 text-sm font-medium text-[#4B5563] hover:text-[#111827] transition-colors">
//               <ChevronLeft size={18} /> Back
//             </button>
//           )}
          
//           {activeStep < 4 ? (
//             <button onClick={nextStep} disabled={!canProceed()} className="px-8 py-3 bg-[#111827] text-white text-sm font-bold rounded-xl hover:bg-[#1F2937] shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all ml-auto">
//               Continue <ChevronRight size={18} />
//             </button>
//           ) : (
//              <button onClick={handleCreateTemplate} disabled={isPublishing} className="px-10 py-3.5 bg-[#059669] text-white text-base font-bold rounded-xl hover:bg-[#047857] shadow-xl shadow-[#059669]/20 flex items-center gap-3 transition-all disabled:opacity-50 ml-auto">
//               {isPublishing ? 'Creating...' : 'Create Template'} <Send size={20} />
//             </button>
//           )}
//         </div>

//       </div>
//     </div>
//   );
// }

import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, Filter, Send, Plus, Trash2, CheckCircle, 
  AlertCircle, Play, Eye, FileSpreadsheet, Users, ChevronRight, ChevronLeft,
  Maximize2, X, Hash, Type, Info, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// --- CONFIGURATION & API ---
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const CACHE_KEY = 'campaign_template_wizard_draft';

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return { 'Authorization': `Bearer ${token}` };
};

// --- REAL API SERVICES (Using Axios) ---
const api = {
  tempUpload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await axios.post(`${BASE_URL}/dataset/temp-upload`, formData, {
      headers: { "Content-Type": "multipart/form-data", ...getAuthHeaders() }
    });
    return res.data;
  },
  testFilter: async (file: File, filterDef?: any) => {
    const formData = new FormData();
    formData.append("file", file);
    
    if (filterDef && filterDef.conditions && filterDef.conditions.length > 0) {
      formData.append("filter_definition", JSON.stringify(filterDef));
    }

    const res = await axios.post(`${BASE_URL}/campaign-template/test-filter`, formData, {
      headers: { "Content-Type": "multipart/form-data", ...getAuthHeaders() }
    });
    return res.data;
  },
  createTemplate: async (payload: any) => {
    const res = await axios.post(`${BASE_URL}/campaign-template/`, payload, {
      headers: { "Content-Type": "application/json", ...getAuthHeaders() }
    });
    return res.data;
  }
};

// --- TYPES ---
interface SchemaItem { name: string; type: 'string' | 'number'; }
interface ConditionUI { id: string; column: string; operator: string; value: string; }

// --- ENHANCED DATA TABLE WITH MODAL ---
const DataTable = ({ rows, schema, emptyMessage }: { rows: any[], schema: SchemaItem[], emptyMessage: string }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!rows || rows.length === 0) return <div className="p-8 text-center bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg text-sm text-[#6B7280]">{emptyMessage}</div>;

  const TableContent = ({ isExpanded = false }) => (
    <table className="w-full text-left text-sm text-[#4B5563] whitespace-nowrap">
      <thead className="bg-[#F8FAFC] text-[#6B7280] font-medium border-b border-[#E5E7EB] sticky top-0 z-10">
        <tr>{schema?.map(col => <th key={col.name} className="px-4 py-3">{col.name}</th>)}</tr>
      </thead>
      <tbody className="bg-white divide-y divide-[#E5E7EB]">
        {rows.map((row, idx) => (
          <tr key={idx} className="hover:bg-[#F9FAFB] transition-colors">
            {schema?.map(col => <td key={col.name} className={`px-4 ${isExpanded ? 'py-3' : 'py-2.5'}`}>{row[col.name] ?? row[col.name.toLowerCase()]}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex justify-end">
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="flex items-center gap-1.5 text-xs font-bold text-[#059669] bg-[#ECFDF5] border border-[#A7F3D0] hover:bg-[#D1FAE5] px-3 py-1.5 rounded-md transition-colors shadow-sm"
          >
            <Maximize2 size={12} /> Expand Data
          </button>
        </div>
        <div className="border border-[#E5E7EB] rounded-lg shadow-sm bg-white overflow-hidden">
          <div className="max-h-[300px] overflow-auto"><TableContent /></div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#111827]/60 backdrop-blur-sm p-4 md:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] bg-white z-10">
              <div>
                <h3 className="text-lg font-bold text-[#111827] flex items-center gap-2"><FileSpreadsheet className="text-[#059669]" size={20}/> Expanded Data Preview</h3>
                <p className="text-sm text-[#6B7280] mt-0.5">Showing {rows.length} preview rows and {schema?.length || 0} columns.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-[#9CA3AF] hover:text-[#111827] bg-[#F3F4F6] hover:bg-[#E5E7EB] rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-auto bg-[#F8FAFC] p-6">
              <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-sm overflow-hidden"><div className="overflow-auto max-h-[75vh]"><TableContent isExpanded={true} /></div></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// --- MAIN COMPONENT ---
export default function TemplateWizard() {
  const navigate = useNavigate();
  
  const loadCache = () => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  };
  const cachedState = loadCache();

  const [activeStep, setActiveStep] = useState<number>(cachedState?.activeStep || 1);
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);
  
  // State: Dataset
  const [csvFile, setCsvFile] = useState<File | null>(null); 
  const [tempDatasetId, setTempDatasetId] = useState<string | null>(cachedState?.tempDatasetId || null);
  const [schema, setSchema] = useState<SchemaItem[]>(cachedState?.schema || []);
  const [sampleRows, setSampleRows] = useState<any[]>(cachedState?.sampleRows || []);
  const [datasetMeta, setDatasetMeta] = useState<{name: string, count: number} | null>(cachedState?.datasetMeta || null);
  
  // State: Filter
  const [filterLogic, setFilterLogic] = useState<'AND' | 'OR'>(cachedState?.filterLogic || 'AND');
  const [conditions, setConditions] = useState<ConditionUI[]>(cachedState?.conditions || []);
  const [filterTested, setFilterTested] = useState(cachedState?.filterTested || false);
  const [matchedCount, setMatchedCount] = useState<number | null>(cachedState?.matchedCount || null);
  const [matchedRows, setMatchedRows] = useState<any[]>(cachedState?.matchedRows || []);
  
  // State: Message (Rich Text)
  const [templateName, setTemplateName] = useState(cachedState?.templateName || "");
  const [description, setDescription] = useState(cachedState?.description || "");
  const [editorHtml, setEditorHtml] = useState(cachedState?.editorHtml || ""); 
  const editorRef = useRef<HTMLDivElement>(null);
  const [isCreating, setIsCreating] = useState(false);

  // --- AUTO-SAVE TO BROWSER MEMORY ---
  useEffect(() => {
    const stateToCache = {
      activeStep, tempDatasetId, schema, sampleRows, datasetMeta,
      filterLogic, conditions, filterTested, matchedCount, matchedRows,
      templateName, description, editorHtml
    };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(stateToCache));
  }, [activeStep, tempDatasetId, schema, sampleRows, datasetMeta, filterLogic, conditions, filterTested, matchedCount, matchedRows, templateName, description, editorHtml]);

  // Restore contentEditable state safely
  useEffect(() => {
    if (activeStep === 3 && editorRef.current && editorRef.current.innerHTML !== editorHtml) {
      editorRef.current.innerHTML = editorHtml;
    }
  }, [activeStep]);

  const STEPS = [
    { num: 1, title: 'Upload Data' },
    { num: 2, title: 'Target Audience' },
    { num: 3, title: 'Compose Message' },
    { num: 4, title: 'Review & Create' }
  ];

  const showToast = (msg: string, type: 'success'|'error') => { 
    setToast({ message: msg, type }); setTimeout(() => setToast(null), 3000); 
  };

  const clearDraft = () => {
    sessionStorage.removeItem(CACHE_KEY);
    window.location.reload(); 
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await api.tempUpload(file);
      setCsvFile(file);
      setTempDatasetId(res.temp_dataset_id);
      setSchema(res.schema || []);
      setSampleRows(res.sample_rows || res.preview_rows || []);
      setMatchedRows(res.sample_rows || res.preview_rows || []); 
      setMatchedCount(res.row_count || 0);
      setDatasetMeta({ name: file.name, count: res.row_count || 0 });
      setConditions([]); 
      setFilterTested(false);
    } catch (error: any) {
      showToast(error.response?.data?.detail || error.message || "Upload failed.", "error");
    }
  };

  const handleTestFilter = async () => {
    if (!csvFile) {
      showToast("Please re-select your CSV file to test the filter.", "error");
      return;
    }
    try {
      let filterDef = null;
      if (conditions.length > 0) {
        filterDef = {
          logic: filterLogic,
          conditions: conditions.map(c => {
            const isNum = schema.find(s => s.name === c.column)?.type === 'number';
            return { 
              column: c.column.toLowerCase(), 
              operator: c.operator, 
              value: isNum ? Number(c.value) : c.value 
            };
          })
        };
      }

      const res = await api.testFilter(csvFile, filterDef);
      
      setMatchedCount(res.matched_count);
      setMatchedRows(res.matched_rows || res.sample_rows || []);
      setFilterTested(true);
    } catch (error: any) {
      showToast(error.response?.data?.detail || error.message || "Failed to test filter.", "error");
    }
  };

  const getOperatorsForType = (type?: string) => {
    if (type === 'number') return ['==', '<', '>', '<=', '>='];
    return ['==', 'contains'];
  };

  const insertVariablePill = (varName: string) => {
    if (!editorRef.current) return;
    if (document.activeElement !== editorRef.current) {
      editorRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    let range = selection.getRangeAt(0);

    if (!editorRef.current.contains(range.commonAncestorContainer)) {
      range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
    }

    const pill = document.createElement('span');
    pill.className = 'inline-block align-baseline px-2 py-0.5 mx-1 bg-[#059669]/10 text-[#059669] rounded border border-[#059669]/20 font-bold text-[13px] select-none cursor-default shadow-sm';
    pill.contentEditable = "false";
    pill.setAttribute('data-variable', varName);
    pill.innerText = varName;

    const spaceNode = document.createTextNode('\u00A0');
    range.deleteContents();
    range.insertNode(spaceNode);
    range.insertNode(pill);
    range.setStartAfter(spaceNode);
    range.setEndAfter(spaceNode);
    selection.removeAllRanges();
    selection.addRange(range);

    setEditorHtml(editorRef.current.innerHTML);
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.execCommand('insertLineBreak');
    }
  };

  // 🔥 HIGHLY ROBUST TEXT EXTRACTION (Preserves Newlines & Spaces Perfectly)
  const extractBackendPayloadText = (html: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    const pills = tempDiv.querySelectorAll('span[data-variable]');
    pills.forEach(pill => {
      const varName = pill.getAttribute('data-variable');
      pill.replaceWith(`{{${varName}}}`);
    });

    let rawHtml = tempDiv.innerHTML;
    
    rawHtml = rawHtml.replace(/<br\s*[\/]?>/gi, '\n');
    rawHtml = rawHtml.replace(/<\/p>/gi, '\n');
    rawHtml = rawHtml.replace(/<\/div>/gi, '\n');
    rawHtml = rawHtml.replace(/<p[^>]*>/gi, ''); 
    rawHtml = rawHtml.replace(/<div[^>]*>/gi, ''); 

    const decodeDiv = document.createElement('div');
    decodeDiv.innerHTML = rawHtml;
    
    let finalText = decodeDiv.textContent || '';
    return finalText.replace(/\u00A0/g, ' ').trim();
  };

  const getLivePreview = () => {
    if (!matchedRows || matchedRows.length === 0 || !editorHtml) return "";
    const sample = matchedRows[0]; 
    let renderedHtml = editorHtml;
    schema?.forEach(col => {
      const regex = new RegExp(`<span[^>]*data-variable="${col.name}"[^>]*>.*?<\/span>`, 'gi');
      const value = (sample[col.name] !== undefined ? sample[col.name] : sample[col.name.toLowerCase()]) || 'Missing Variable';
      renderedHtml = renderedHtml.replace(regex, `<span class="inline-block px-1.5 py-0.5 mx-0.5 bg-[#059669]/10 text-[#059669] rounded border border-[#059669]/20 font-bold">${value}</span>`);
    });
    return renderedHtml;
  };

  const handleCreateTemplate = async () => {
    const rawTemplateText = extractBackendPayloadText(editorHtml);

    if (!templateName || !rawTemplateText || !tempDatasetId) {
      showToast("Template Name, Message, and Dataset are required.", "error");
      return;
    }

    const manualVars = rawTemplateText.match(/\{\{([^}]+)\}\}/g) || [];
    const usedVars = manualVars.map(m => m.replace(/[{}]/g, ''));
    const missingVariables = usedVars.filter(v => !schema.some(s => s.name.toLowerCase() === v.toLowerCase()));

    if (missingVariables.length > 0) {
      showToast(`Invalid variable(s): ${missingVariables.join(', ')}. Use variables strictly from the schema.`, "error");
      setActiveStep(3); 
      return;
    }

    setIsCreating(true);
    try {
      const createPayload: any = {
        name: templateName,
        description: description || "Created via Wizard",
        temp_dataset_id: tempDatasetId,
        template: rawTemplateText 
      };

      if (conditions.length > 0) {
        createPayload.filter_definition = {
          logic: filterLogic,
          conditions: conditions.map(c => {
            const isNum = schema.find(s => s.name === c.column)?.type === 'number';
            return { column: c.column.toLowerCase(), operator: c.operator, value: isNum ? Number(c.value) : c.value };
          })
        };
      } else {
        createPayload.filter_definition = null;
      }

      await api.createTemplate(createPayload);
      
      sessionStorage.removeItem(CACHE_KEY);
      showToast("Template created successfully!", "success");
      setTimeout(() => navigate('/templates'), 1500);
    } catch (error: any) {
      showToast(error.response?.data?.detail || error.message || "Failed to create template.", "error");
      setIsCreating(false);
    }
  };

  const nextStep = () => setActiveStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setActiveStep(prev => Math.max(prev - 1, 1));

  const canProceed = () => {
    if (activeStep === 1) return tempDatasetId !== null;
    if (activeStep === 2) return filterTested || conditions.length === 0;
    if (activeStep === 3) return templateName.trim() !== "" && extractBackendPayloadText(editorHtml).trim() !== "";
    return true;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-[#111827] py-8 px-4 md:px-6">
      
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className={`fixed top-6 right-6 px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 z-50 animate-in slide-in-from-right ${toast.type === 'success' ? 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}

      {/* HEADER & TOP STEPPER (Safe max-w: 1000px) */}
      <div className="max-w-[1000px] mx-auto mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Create Template</h1>
          <p className="text-sm text-[#6B7280] mt-1">Upload a dataset, build rules, and create your messaging workflow.</p>
          {cachedState && (
            <p className="text-xs text-[#059669] mt-2 font-bold bg-[#ECFDF5] px-2 py-1 inline-block rounded border border-[#A7F3D0]">Draft recovered from local cache</p>
          )}
        </div>
        {cachedState && (
          <button onClick={clearDraft} className="flex items-center gap-1.5 text-xs font-bold text-[#6B7280] hover:text-red-600 transition-colors bg-white px-3 py-1.5 rounded-lg shadow-sm border border-[#E5E7EB]">
            <RefreshCw size={14}/> Reset Flow
          </button>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between w-full max-w-3xl mx-auto relative mb-10">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-[#E5E7EB] z-0 rounded-full" />
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[#059669] z-0 rounded-full transition-all duration-300" style={{ width: `${((activeStep - 1) / 3) * 100}%` }} />
        
        {STEPS.map((step) => {
          const isCompleted = step.num < activeStep;
          const isActive = step.num === activeStep;
          return (
            <div key={step.num} className="relative z-10 flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${isActive ? 'bg-[#059669] text-white ring-4 ring-[#059669]/20 shadow-md' : isCompleted ? 'bg-[#059669] text-white' : 'bg-white border-[2px] border-[#E5E7EB] text-[#9CA3AF]'}`}>
                {isCompleted ? <CheckCircle size={20} strokeWidth={2.5} /> : step.num}
              </div>
              <span className={`text-xs font-bold absolute -bottom-6 w-max ${isActive ? 'text-[#111827]' : isCompleted ? 'text-[#059669]' : 'text-[#9CA3AF]'}`}>{step.title}</span>
            </div>
          );
        })}
      </div>

      {/* MAIN CONTENT CARD (Safe max-w: 1000px) */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm max-w-[1000px] mx-auto overflow-hidden flex flex-col min-h-[500px]">
        <div className="p-6 md:p-8 flex-1">
          
          {/* 1️⃣ STEP 1: UPLOAD & PREVIEW */}
          {activeStep === 1 && (
            <div className="animate-in fade-in zoom-in-95 duration-300 space-y-8">
              {!tempDatasetId ? (
                <div className="border-2 border-dashed border-[#E5E7EB] rounded-2xl bg-[#F8FAFC] p-16 flex flex-col items-center justify-center hover:border-[#059669] hover:bg-[#059669]/5 transition-colors group relative cursor-pointer max-w-xl mx-auto mt-6">
                  <input type="file" accept=".csv" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileUpload} />
                  <UploadCloud className="text-[#059669] mb-4 group-hover:scale-110 transition-transform duration-300" size={40} />
                  <h3 className="text-lg font-bold text-[#111827]">Drag & Drop CSV here</h3>
                  <p className="text-xs text-[#6B7280] mt-1">This temporary dataset will be linked to your new template.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary & Replace */}
                  <div className="flex items-center justify-between bg-white border border-[#E5E7EB] p-4 rounded-xl shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-[#ECFDF5] rounded-lg text-[#059669]"><FileSpreadsheet size={20} /></div>
                      <div>
                        <p className="text-base font-bold text-[#111827]">{datasetMeta?.name}</p>
                        <p className="text-sm font-bold text-[#059669]">{datasetMeta?.count?.toLocaleString() || 0} rows detected</p>
                      </div>
                    </div>
                    <button onClick={() => { setTempDatasetId(null); setSchema([]); setCsvFile(null); }} className="text-xs font-bold text-[#6B7280] hover:text-[#111827] underline">Replace File</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Schema Column */}
                    <div className="md:col-span-1 bg-white border border-[#E5E7EB] rounded-xl overflow-hidden flex flex-col shadow-sm">
                      <div className="bg-[#F8FAFC] border-b border-[#E5E7EB] px-4 py-3 flex items-center gap-2">
                        <Filter size={16} className="text-[#059669]" />
                        <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider">Detected Schema</h4>
                      </div>
                      <div className="p-0 overflow-y-auto max-h-[350px]">
                        <ul className="divide-y divide-[#E5E7EB]">
                          {schema.map(col => (
                            <li key={col.name} className="px-4 py-3 flex justify-between items-center text-xs gap-2">
                              <span className="font-bold text-[#111827] break-all truncate" title={col.name}>{col.name}</span>
                              <span className={`flex-shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded ${col.type === 'number' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                                {col.type === 'number' ? <Hash size={10} /> : <Type size={10} />} {col.type}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Data Preview Column */}
                    <div className="md:col-span-2 bg-white border border-[#E5E7EB] rounded-xl overflow-hidden flex flex-col shadow-sm">
                      <div className="bg-[#F8FAFC] border-b border-[#E5E7EB] px-4 py-3 flex items-center gap-2">
                         <Eye size={16} className="text-[#059669]" />
                         <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider">Data Preview (Sample)</h4>
                      </div>
                      <div className="p-4 bg-white flex-1">
                        <DataTable rows={sampleRows} schema={schema} emptyMessage="No data available." />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2️⃣ STEP 2: BUILD FILTER */}
          {activeStep === 2 && (
            <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-[#111827]">Define Target Audience (Optional)</h2>
                <p className="text-sm text-[#6B7280] mt-1">If no filter is set, the template will apply to all <strong className="text-[#111827]">{datasetMeta?.count}</strong> rows.</p>
              </div>

              {/* Strict Filter Examples Banner */}
              <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-4 flex gap-4 text-sm mb-6 shadow-sm items-center">
                <Info className="text-[#059669] shrink-0" size={20} />
                <div className="w-full">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white border border-[#E5E7EB] p-2.5 rounded-lg shadow-sm"><span className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider block mb-0.5">Number Example</span> <span className="font-mono text-[#059669] font-bold text-sm">attendance &lt; 75</span></div>
                    <div className="bg-white border border-[#E5E7EB] p-2.5 rounded-lg shadow-sm"><span className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider block mb-0.5">String Example</span> <span className="font-mono text-blue-600 font-bold text-sm">rollno == 23951A</span></div>
                    <div className="bg-white border border-[#E5E7EB] p-2.5 rounded-lg shadow-sm"><span className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider block mb-0.5">Contains Example</span> <span className="font-mono text-blue-600 font-bold text-sm">name contains john</span></div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* BUILDER (Left side - Exact 50/50 split) */}
                <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-6 h-max">
                  <div className="mb-6 bg-[#F8FAFC] border border-[#E5E7EB] p-4 rounded-xl">
                    <p className="text-sm font-bold text-[#111827] mb-2">Match Conditions:</p>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-1.5 text-xs font-bold text-[#4B5563] cursor-pointer">
                        <input type="radio" checked={filterLogic === 'AND'} onChange={() => { setFilterLogic('AND'); setFilterTested(false); }} className="accent-[#059669] w-4 h-4" />
                        ALL conditions (AND)
                      </label>
                      <label className="flex items-center gap-1.5 text-xs font-bold text-[#4B5563] cursor-pointer">
                        <input type="radio" checked={filterLogic === 'OR'} onChange={() => { setFilterLogic('OR'); setFilterTested(false); }} className="accent-[#059669] w-4 h-4" />
                        ANY condition (OR)
                      </label>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {conditions.length === 0 && (
                      <p className="text-sm font-medium text-[#059669] bg-[#ECFDF5] p-4 rounded-xl border border-[#A7F3D0] flex items-center gap-2">
                        <CheckCircle size={18}/> No filter applied.
                      </p>
                    )}
                    {conditions.map((cond, idx) => {
                      const selectedCol = schema.find(s => s.name === cond.column);
                      const isNum = selectedCol?.type === 'number';
                      const validOperators = getOperatorsForType(selectedCol?.type);

                      return (
                        <div key={cond.id} className="flex items-center gap-2 bg-[#F8FAFC] p-2 rounded-xl border border-[#E5E7EB]">
                          <select value={cond.column} onChange={e => { const newConds = [...conditions]; newConds[idx].column = e.target.value; newConds[idx].operator = '=='; setConditions(newConds); setFilterTested(false); }} className="w-[45%] px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs font-bold text-[#111827] focus:border-[#059669] outline-none shadow-sm">
                            <option value="" disabled>Select Column</option>
                            {schema?.map(col => <option key={col.name} value={col.name}>{col.name} ({col.type})</option>)}
                          </select>
                          <select value={cond.operator} onChange={e => { const newConds = [...conditions]; newConds[idx].operator = e.target.value; setConditions(newConds); setFilterTested(false); }} className="w-[20%] px-2 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm font-black text-[#059669] focus:border-[#059669] outline-none shadow-sm text-center">
                            {validOperators.map(op => <option key={op} value={op}>{op}</option>)}
                          </select>
                          <input type={isNum ? "number" : "text"} placeholder="Value" value={cond.value} onChange={e => { const newConds = [...conditions]; newConds[idx].value = e.target.value; setConditions(newConds); setFilterTested(false); }} className="w-[35%] px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs font-bold focus:border-[#059669] outline-none shadow-sm" />
                          
                          <button onClick={() => {
                            const newConds = conditions.filter(c => c.id !== cond.id);
                            setConditions(newConds);
                            if (newConds.length === 0) setFilterTested(true); 
                          }} className="text-[#9CA3AF] hover:text-red-600 bg-white p-2 rounded-lg border border-[#E5E7EB] hover:border-red-200 transition-colors shadow-sm shrink-0"><Trash2 size={16} /></button>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="mt-6 flex items-center justify-between pt-4 border-t border-[#E5E7EB]">
                    <button onClick={() => setConditions([...conditions, { id: Date.now().toString(), column: schema[0]?.name || '', operator: '==', value: '' }])} className="text-xs font-bold text-[#111827] bg-white border border-[#E5E7EB] px-4 py-2 rounded-lg shadow-sm flex items-center gap-1.5 hover:bg-[#F9FAFB] transition-colors"><Plus size={14} /> Add Condition</button>
                    {conditions.length > 0 && (
                      <button onClick={handleTestFilter} className="px-5 py-2 bg-[#111827] text-white text-sm font-bold rounded-lg hover:bg-[#1F2937] shadow-sm flex items-center gap-2">
                        <Play size={14} className="text-white"/> Test Filter
                      </button>
                    )}
                  </div>
                </div>

                {/* TEST RESULTS (Right side) */}
                <div className="flex flex-col h-full">
                  {filterTested && conditions.length > 0 ? (
                    <div className="flex flex-col h-full animate-in fade-in bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
                      <div className={`p-4 rounded-xl border flex items-center gap-3 mb-4 ${matchedCount === 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'}`}>
                        <Users size={20} />
                        <span className="text-sm font-bold">{matchedCount} Records Matched</span>
                      </div>
                      <DataTable rows={matchedRows} schema={schema} emptyMessage="⚠ No rows matched your filter." />
                    </div>
                  ) : (
                     <div className="flex-1 border-2 border-dashed border-[#E5E7EB] rounded-2xl bg-[#F8FAFC] flex flex-col items-center justify-center p-8 text-center">
                        <Filter className="text-[#9CA3AF] mb-4" size={40} />
                        <p className="text-base font-bold text-[#4B5563]">No active filters tested</p>
                        <p className="text-sm text-[#6B7280] mt-1">Apply conditions and click 'Test Filter' to see matched rows here.</p>
                        {csvFile === null && conditions.length > 0 && <p className="text-xs text-red-600 font-bold mt-3">CSV file lost from cache. Please re-upload on step 1 to test filter.</p>}
                     </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 3️⃣ STEP 3: MESSAGE COMPOSER */}
          {activeStep === 3 && (
            <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
               <div>
                <h2 className="text-xl font-bold text-[#111827]">Compose Message</h2>
                <p className="text-sm text-[#6B7280] mt-1">Draft your template. Click the variables below to safely insert them.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-5">
                  <div className="bg-white border border-[#E5E7EB] p-6 rounded-2xl shadow-sm">
                    <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Template Name *</label>
                    <input type="text" placeholder="e.g., Low Attendance Alert" value={templateName} onChange={e => setTemplateName(e.target.value)} className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg text-sm font-bold outline-none focus:bg-white focus:border-[#059669] transition-colors mb-4" />
                    
                    <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Description (Optional)</label>
                    <input type="text" placeholder="e.g., Warning below 75%" value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg text-sm outline-none focus:bg-white focus:border-[#059669] transition-colors" />
                  </div>
                  
                  <div>
                    <div className="flex gap-2 flex-wrap bg-[#F8FAFC] p-4 rounded-t-2xl border border-[#E5E7EB] border-b-0 shadow-sm">
                      <span className="block w-full text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-1">Insert Schema Variables</span>
                      {schema?.map(col => (
                        <button key={col.name} onMouseDown={(e) => { e.preventDefault(); insertVariablePill(col.name); }} className="px-3 py-1.5 bg-white border border-[#E5E7EB] text-[#111827] rounded-lg text-xs font-bold hover:border-[#059669] hover:text-[#059669] shadow-sm transition-colors flex items-center gap-1.5">
                          <Plus size={14}/> {col.name}
                        </button>
                      ))}
                    </div>
                    
                    <div 
                      ref={editorRef}
                      contentEditable
                      onInput={(e) => setEditorHtml(e.currentTarget.innerHTML)}
                      onKeyDown={handleEditorKeyDown}
                      className="w-full h-56 p-5 border border-[#E5E7EB] rounded-b-2xl text-sm outline-none focus:border-[#059669] shadow-inner bg-white overflow-y-auto leading-relaxed text-[#111827] font-mono"
                      style={{ whiteSpace: 'pre-wrap' }}
                      suppressContentEditableWarning={true}
                    />
                  </div>
                </div>

                <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-2xl p-6 flex flex-col shadow-sm h-full">
                  <h3 className="text-sm font-bold text-[#111827] flex items-center gap-2 mb-4 uppercase tracking-wider border-b border-[#E5E7EB] pb-3">
                    <Eye size={18} className="text-[#059669]"/> Live Rendering Preview
                  </h3>
                  <div 
                    className="bg-white border border-[#E5E7EB] rounded-xl p-5 flex-1 shadow-sm text-sm text-[#111827] whitespace-pre-wrap leading-relaxed font-mono" 
                    dangerouslySetInnerHTML={{ __html: getLivePreview() || '<span class="text-gray-400 italic">Start typing on the left to see your preview here...</span>' }} 
                  />
                  <p className="text-[10px] text-[#9CA3AF] mt-3 uppercase font-bold tracking-wider text-center">Using Row 1 Data</p>
                </div>
              </div>
            </div>
          )}

          {/* 4️⃣ STEP 4: CREATE */}
          {activeStep === 4 && (
            <div className="animate-in fade-in zoom-in-95 duration-300 space-y-8">
              <div className="text-center max-w-lg mx-auto mb-8 mt-4">
                <div className="w-16 h-16 bg-[#ECFDF5] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#A7F3D0] shadow-sm">
                  <Send className="text-[#059669]" size={32} />
                </div>
                <h2 className="text-2xl font-bold text-[#111827]">Review & Create Template</h2>
                <p className="text-sm text-[#6B7280] mt-2">Verify your configuration. Creating this template will make it available for campaigns instantly.</p>
              </div>

              <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-2xl p-8 max-w-3xl mx-auto shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 divide-y md:divide-y-0 md:divide-x divide-[#E5E7EB]">
                  <div className="space-y-6">
                    <div>
                      <p className="text-xs text-[#6B7280] uppercase tracking-wider font-bold mb-1">Template Name</p>
                      <p className="text-base font-bold text-[#111827]">{templateName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#6B7280] uppercase tracking-wider font-bold mb-1">Dataset Linked</p>
                      <p className="text-sm font-medium text-[#111827] flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-[#E5E7EB] w-max"><FileSpreadsheet size={16} className="text-[#059669]"/> {datasetMeta?.name || 'None'}</p>
                    </div>
                  </div>
                  <div className="pt-6 md:pt-0 md:pl-8 space-y-6 flex flex-col justify-center">
                    <div>
                      <p className="text-xs text-[#6B7280] uppercase tracking-wider font-bold mb-1">Target Audience Size</p>
                      <p className="text-3xl font-black text-[#059669] flex items-baseline gap-2">
                        {matchedCount ?? datasetMeta?.count ?? 0} <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Records</span>
                      </p>
                    </div>
                    {conditions.length === 0 && (
                      <div className="bg-blue-50 text-blue-800 text-xs px-3 py-2 rounded-lg font-bold border border-blue-200 inline-block w-max">
                        No filter applied (All Rows)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="px-8 py-5 border-t border-[#E5E7EB] bg-[#F8FAFC] flex items-center justify-between">
          {activeStep > 1 && (
            <button onClick={prevStep} className="mr-auto px-5 py-2.5 flex items-center gap-2 text-sm font-bold text-[#4B5563] bg-white border border-[#E5E7EB] rounded-lg hover:text-[#111827] hover:bg-[#F9FAFB] shadow-sm transition-colors">
              <ChevronLeft size={16} /> Back
            </button>
          )}
          
          {activeStep < 4 ? (
            <button onClick={nextStep} disabled={!canProceed()} className="px-8 py-3 bg-[#111827] text-white text-sm font-bold rounded-xl hover:bg-[#1F2937] shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all ml-auto">
              Continue <ChevronRight size={16} />
            </button>
          ) : (
             <button onClick={handleCreateTemplate} disabled={isCreating} className="px-8 py-3 bg-[#059669] text-white text-sm font-bold rounded-xl hover:bg-[#047857] shadow-md shadow-[#059669]/20 flex items-center gap-2 transition-all disabled:opacity-50 ml-auto">
              {isCreating ? 'Creating Template...' : 'Create Template'} <Send size={16} />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}