import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle2, AlertCircle, Save, Send, Lock, Plus, Trash2, 
  GitFork, History, FileSpreadsheet, Database, MessageSquare, Filter
} from 'lucide-react';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const getAuthHeaders = () => ({ headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` } });

export default function TemplateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [template, setTemplate] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Edit State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const [filterLogic, setFilterLogic] = useState<'AND'|'OR'>('AND');
  const [conditions, setConditions] = useState<any[]>([]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tplRes, verRes] = await Promise.all([
        axios.get(`${BASE_URL}/campaign-template/${id}`, getAuthHeaders()),
        axios.get(`${BASE_URL}/campaign-template/${id}/versions`, getAuthHeaders()).catch(() => ({ data: { versions: [] } }))
      ]);
      
      const t = tplRes.data;
      setTemplate(t);
      setName(t.name || '');
      setDescription(t.description || '');
      setMessage(t.template || '');
      
      if (t.filter_dsl?.conditions) {
        setFilterLogic(t.filter_dsl.logic || 'AND');
        setConditions(t.filter_dsl.conditions.map((c: any) => ({ ...c, id: Math.random() })));
      } else {
        setConditions([]);
      }
      
      setVersions(verRes.data.versions || verRes.data.items || []);
    } catch (error) {
      alert("Failed to load template.");
      navigate('/templates');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [id]);

  const handleUpdate = async () => {
    try {
      const payload: any = { name, description, template: message };
      
      if (conditions.length > 0) {
        payload.filter_dsl = {
          logic: filterLogic,
          conditions: conditions.map(c => ({
            column: c.column, operator: c.operator, 
            value: template.dataset_schema?.find((s:any) => s.name === c.column)?.type === 'number' ? Number(c.value) : c.value 
          }))
        };
      } else {
        payload.filter_dsl = null;
      }

      await axios.put(`${BASE_URL}/campaign-template/${id}`, payload, getAuthHeaders());
      
      if (template.status === 'published') {
        alert("New draft version created. Please publish to activate.");
      } else {
        alert("Draft updated.");
      }
      loadData(); // Reload strictly from server to get new version & status
    } catch (error: any) {
      alert("Update failed: " + (error.response?.data?.detail || error.message));
    }
  };

  const handlePublish = async () => {
    try {
      await axios.post(`${BASE_URL}/campaign-template/${id}/publish`, {}, getAuthHeaders());
      alert("Template published successfully.");
      loadData();
    } catch (error: any) {
      alert("Publish failed: " + (error.response?.data?.detail || error.message));
    }
  };

  if (isLoading || !template) return <div className="p-12 text-center">Loading...</div>;

  const isPublished = template.status === 'published';
  const schema = template.dataset_schema || [];

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-[#111827] pb-12">
      
      {/* NAVBAR */}
      <div className="bg-white border-b border-[#E5E7EB] px-8 py-4 sticky top-0 z-40 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/templates')} className="p-2 text-[#6B7280] bg-[#F8FAFC] hover:bg-[#E5E7EB] rounded-lg transition-colors border border-[#E5E7EB]"><ArrowLeft size={18} /></button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[#111827]">{template.name}</h1>
            <span className="px-2 py-0.5 rounded-md bg-[#F8FAFC] text-[#4B5563] text-xs font-mono font-bold border border-[#E5E7EB]">v{template.version}</span>
            {isPublished ? (
              <span className="px-2.5 py-0.5 rounded-md bg-[#ECFDF5] text-[#059669] text-[11px] font-bold uppercase tracking-wider border border-[#A7F3D0] flex items-center gap-1"><Lock size={12}/> Published</span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-md bg-[#FFFBEB] text-[#D97706] text-[11px] font-bold uppercase tracking-wider border border-[#FDE68A]">Draft</span>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={handleUpdate} className="px-5 py-2.5 bg-white border border-[#E5E7EB] text-[#111827] text-sm font-bold rounded-xl hover:bg-[#F9FAFB] shadow-sm flex items-center gap-2">
            {isPublished ? <GitFork size={16}/> : <Save size={16}/>} 
            {isPublished ? 'Create New Draft Version' : 'Save Draft'}
          </button>
          {!isPublished && (
            <button onClick={handlePublish} className="px-6 py-2.5 bg-[#059669] text-white text-sm font-bold rounded-xl hover:bg-[#047857] shadow-lg flex items-center gap-2">
              Publish Template <Send size={16}/>
            </button>
          )}
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto mt-8 px-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Configuration */}
        <div className="lg:col-span-2 space-y-6">
          
          {isPublished && (
             <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl flex items-center gap-3 text-sm shadow-sm">
                <Lock size={20} className="shrink-0 text-blue-600" />
                <p>This version is locked. Modifying any fields below and saving will automatically branch a <b>new Draft (v{template.version + 1})</b>.</p>
             </div>
          )}

          {/* BASIC INFO */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider border-b border-[#E5E7EB] pb-3 mb-4">Basic Info</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#6B7280] mb-2">Template Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#059669]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#6B7280] mb-2">Description</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#059669]" />
              </div>
            </div>
          </div>

          {/* MESSAGE EDITOR */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-[#F8FAFC] px-6 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
              <MessageSquare size={18} className="text-[#059669]" />
              <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider">Template Message</h3>
            </div>
            <div className="p-6">
               <textarea 
                 value={message} 
                 onChange={e => setMessage(e.target.value)}
                 placeholder="Dear {{rollno}}, your attendance is {{attendance}}%."
                 className="w-full h-32 p-4 bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#059669] font-mono leading-relaxed"
               />
               <div className="mt-3 flex gap-2 flex-wrap">
                 {schema.map((col: any) => (
                    <span key={col.name} className="px-2 py-1 bg-white border border-[#E5E7EB] text-xs font-medium text-[#4B5563] rounded shadow-sm flex items-center gap-1 cursor-pointer hover:border-[#059669]" onClick={() => setMessage(prev => prev + `{{${col.name}}}`)}>
                      <Plus size={10}/> {col.name}
                    </span>
                 ))}
               </div>
            </div>
          </div>

          {/* FILTER BUILDER */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-[#F8FAFC] px-6 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
              <Filter size={18} className="text-[#059669]" />
              <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider">Targeting Filter</h3>
            </div>
            <div className="p-6">
              <select value={filterLogic} onChange={e => setFilterLogic(e.target.value as 'AND'|'OR')} className="mb-4 px-3 py-1.5 bg-[#F8FAFC] border border-[#E5E7EB] rounded-lg text-sm outline-none">
                <option value="AND">Match ALL Conditions (AND)</option>
                <option value="OR">Match ANY Condition (OR)</option>
              </select>

              <div className="space-y-3">
                {conditions.length === 0 && <p className="text-sm text-[#059669] bg-[#ECFDF5] p-3 rounded-lg border border-[#A7F3D0]">Applies to all rows in the dataset.</p>}
                {conditions.map((cond, idx) => {
                  const isNum = schema.find((s:any) => s.name === cond.column)?.type === 'number';
                  return (
                    <div key={cond.id} className="flex gap-2">
                      <select value={cond.column} onChange={e => { const newC = [...conditions]; newC[idx].column = e.target.value; newC[idx].operator = '=='; setConditions(newC); }} className="w-1/3 px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm outline-none">
                        <option value="" disabled>Column</option>
                        {schema.map((c:any) => <option key={c.name} value={c.name}>{c.name}</option>)}
                      </select>
                      <select value={cond.operator} onChange={e => { const newC = [...conditions]; newC[idx].operator = e.target.value; setConditions(newC); }} className="w-1/4 px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm outline-none">
                        <option value="==">==</option>
                        {!isNum && <option value="contains">contains</option>}
                        {isNum && <><option value="<">&lt;</option><option value=">">&gt;</option><option value="<=">&lt;=</option><option value=">=">&gt;=</option></>}
                      </select>
                      <input type={isNum ? "number" : "text"} value={cond.value} onChange={e => { const newC = [...conditions]; newC[idx].value = e.target.value; setConditions(newC); }} className="w-1/3 px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm outline-none" placeholder="Value" />
                      <button onClick={() => setConditions(conditions.filter(c => c.id !== cond.id))} className="px-3 text-red-500 hover:bg-red-50 rounded-lg border border-[#E5E7EB]"><Trash2 size={16}/></button>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => setConditions([...conditions, { id: Math.random(), column: schema[0]?.name || '', operator: '==', value: '' }])} className="mt-4 text-sm font-bold text-[#059669] flex items-center gap-1 hover:underline">
                <Plus size={14}/> Add Condition
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Meta & History */}
        <div className="space-y-6">
          
          {/* DATASET SCHEMA (Read Only) */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-[#F8FAFC] px-5 py-4 border-b border-[#E5E7EB]">
              <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2"><Database size={16} className="text-[#059669]"/> Linked Dataset Schema</h3>
              <p className="text-[10px] text-[#6B7280] mt-1">Dataset ID: {template.dataset_id}</p>
            </div>
            <ul className="divide-y divide-[#E5E7EB] max-h-[300px] overflow-auto">
              {schema.map((col: any) => (
                <li key={col.name} className="px-5 py-3 flex justify-between items-center text-sm">
                  <span className="font-medium text-[#111827]">{col.name}</span>
                  <span className="text-[10px] uppercase font-bold text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded">{col.type}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* VERSION TIMELINE */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-6">
            <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider border-b border-[#E5E7EB] pb-3 mb-4 flex items-center gap-2">
              <History size={16} className="text-[#059669]"/> Version History
            </h3>
            <div className="space-y-4">
               {versions.length === 0 ? <p className="text-sm text-[#6B7280]">No history available.</p> : versions.map((v, i) => (
                 <div key={v.version} className="relative pl-6">
                   <div className={`absolute left-0 top-1.5 w-2 h-2 rounded-full ${v.version === template.version ? 'bg-[#059669] ring-4 ring-[#059669]/20' : 'bg-[#D1D5DB]'}`}></div>
                   {i !== versions.length - 1 && <div className="absolute left-[3px] top-4 w-0.5 h-full bg-[#E5E7EB]"></div>}
                   <p className={`text-sm font-bold ${v.version === template.version ? 'text-[#111827]' : 'text-[#6B7280]'}`}>Version {v.version}</p>
                   <p className="text-[11px] text-[#9CA3AF] mt-0.5">{new Date(v.updated_at).toLocaleString()}</p>
                 </div>
               ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}