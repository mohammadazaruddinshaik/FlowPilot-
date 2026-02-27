import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle2, AlertCircle, Save, Send, 
  Lock, Plus, Trash2, GitFork, RefreshCw, FileSpreadsheet,
  Settings, MessageSquare, Filter
} from 'lucide-react';

// --- CONFIGURATION & API ---
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

// --- API SERVICES ---
const api = {
  getTemplate: async (logical_id: string) => {
    // Note: ensure no trailing slash here if your backend doesn't expect it
    const res = await fetch(`${BASE_URL}/campaign-template/${logical_id}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load template details.');
    return res.json();
  },
  updateTemplate: async (logical_id: string, payload: any) => {
    const res = await fetch(`${BASE_URL}/campaign-template/${logical_id}`, { 
      method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(payload) 
    });
    if (!res.ok) throw new Error('Failed to save template updates.');
    return res.json();
  },
  publishTemplate: async (logical_id: string) => {
    const res = await fetch(`${BASE_URL}/campaign-template/${logical_id}/publish`, { 
      method: 'POST', headers: getAuthHeaders() 
    });
    if (!res.ok) throw new Error('Failed to publish template.');
    return res.json();
  }
};

// --- TYPES ---
interface SchemaItem { name: string; type: 'string' | 'number' | string; }
interface ConditionUI { id: string; column: string; operator: string; value: string; }
interface Template {
  logical_id: string;
  version: number;
  name: string;
  description: string;
  status: 'published' | 'draft';
  template: string;
  variables: string[];
  filter_dsl: any;
  dataset_schema?: SchemaItem[];
  schema?: SchemaItem[]; // Fallback depending on backend naming
  updated_at: string;
}

export default function EditTemplate() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [template, setTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editorHtml, setEditorHtml] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  
  // Filter State
  const [filterLogic, setFilterLogic] = useState<'AND' | 'OR'>('AND');
  const [conditions, setConditions] = useState<ConditionUI[]>([]);

  const showToast = (msg: string, type: 'success'|'error') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadTemplate = async () => {
    setIsLoading(true);
    try {
      if (!id) throw new Error("No template ID provided.");
      const data = await api.getTemplate(id);
      
      setTemplate(data);
      setName(data.name || '');
      setDescription(data.description || '');
      
      // Reconstruct HTML for editor (Convert {{Var}} back into UI pills)
      let html = data.template || '';
      if (data.variables && Array.isArray(data.variables)) {
        data.variables.forEach((v: string) => {
          const regex = new RegExp(`\\{\\{${v}\\}\\}`, 'g');
          html = html.replace(regex, `<span class="inline-block px-1.5 py-0.5 mx-0.5 bg-[#059669]/10 text-[#059669] rounded border border-[#059669]/20 font-medium select-none" contenteditable="false" data-variable="${v}">${v}</span>`);
        });
      }
      setEditorHtml(html);
      if (editorRef.current) editorRef.current.innerHTML = html;

      // Reconstruct filter UI
      if (data.filter_dsl && data.filter_dsl.conditions) {
        setFilterLogic(data.filter_dsl.logic || 'AND');
        setConditions(data.filter_dsl.conditions.map((c: any) => ({
          id: Math.random().toString(),
          column: c.column,
          operator: c.operator,
          value: c.value.toString()
        })));
      } else {
        setConditions([]);
      }
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplate();
  }, [id]);

  // Derive schema safely
  const schema = template?.dataset_schema || template?.schema || [];
  const isPublished = template?.status === 'published';

  // --- STABILIZED EDITOR LOGIC ---
  const insertVariablePill = (varName: string) => {
    if (isPublished || !editorRef.current) return;
    
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
    pill.className = 'inline-block align-baseline px-2 py-0.5 mx-1 bg-[#059669]/10 text-[#059669] rounded border border-[#059669]/20 font-medium text-[13px] select-none cursor-default shadow-sm';
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
    if (isPublished) {
      e.preventDefault();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      document.execCommand('insertLineBreak');
    }
  };

  const extractBackendPayloadText = (html: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html.replace(/<br\s*[\/]?>/gi, '\n');
    const pills = tempDiv.querySelectorAll('span[data-variable]');
    pills.forEach(pill => {
      const varName = pill.getAttribute('data-variable');
      pill.replaceWith(`{{${varName}}}`);
    });
    return tempDiv.textContent?.replace(/\u00A0/g, ' ').trim() || '';
  };

  // --- ACTIONS ---
  const handleSaveUpdate = async (action: 'save' | 'publish' | 'new_version') => {
    if (!template || !id) return;
    
    const rawTemplateText = extractBackendPayloadText(editorHtml);
    if (!name || !rawTemplateText) {
      showToast("Template Name and Message Body are required.", "error");
      return;
    }

    if (action === 'publish') setIsPublishing(true);
    else setIsSaving(true);

    try {
      const payload: any = {
        name,
        description,
        template: rawTemplateText
      };

      if (conditions.length > 0) {
        payload.filter_dsl = {
          logic: filterLogic,
          conditions: conditions.map(c => {
            const isNum = schema.find(s => s.name === c.column)?.type === 'number';
            return { column: c.column, operator: c.operator, value: isNum ? Number(c.value) : c.value };
          })
        };
      } else {
        payload.filter_dsl = null;
      }

      // 1. Always issue the PUT request to update (or branch a new version)
      await api.updateTemplate(id, payload);
      
      // 2. Handle specific action paths
      if (action === 'publish') {
        await api.publishTemplate(id);
        showToast("Template published successfully!", "success");
      } else if (action === 'new_version') {
        showToast("New draft version branched successfully.", "success");
      } else {
        showToast("Draft saved successfully.", "success");
      }
      
      // 3. Reload state from backend to reflect new version/status
      loadTemplate();
    } catch (error: any) {
      showToast(error.message || "An error occurred while saving.", "error");
    } finally {
      setIsSaving(false);
      setIsPublishing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center text-[#6B7280]">
        <RefreshCw className="animate-spin text-[#059669] mb-4" size={32} />
        <p className="font-medium text-sm">Loading template...</p>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
         <AlertCircle className="text-red-500 mb-4" size={40} />
         <h2 className="text-xl font-bold text-[#111827]">Template Not Found</h2>
         <p className="text-sm text-[#6B7280] mt-2 mb-6">The template you are trying to view does not exist or was deleted.</p>
         <button onClick={() => navigate('/templates')} className="px-4 py-2 bg-[#111827] text-white rounded-lg font-medium hover:bg-[#1F2937]">Return to Templates</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-[#111827] pb-20">
      
      {/* TOAST */}
      {toast && (
        <div className={`fixed top-6 right-6 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-in slide-in-from-right ${toast.type === 'success' ? 'bg-[#ECFDF5] border border-[#059669]/20 text-[#047857]' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* TOP NAVBAR */}
      <div className="bg-white border-b border-[#E5E7EB] px-8 py-4 sticky top-0 z-40 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/templates')} className="p-2 text-[#6B7280] hover:text-[#111827] bg-[#F8FAFC] hover:bg-[#F3F4F6] border border-[#E5E7EB] rounded-lg transition-colors shadow-sm">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-[#111827]">{template.name}</h1>
              <span className="px-2 py-0.5 rounded-md bg-[#F8FAFC] text-[#4B5563] text-xs font-mono font-bold border border-[#E5E7EB] shadow-sm">
                v{template.version}
              </span>
              {isPublished ? (
                <span className="px-2.5 py-0.5 rounded-md bg-[#ECFDF5] text-[#059669] text-[11px] font-bold uppercase tracking-wider border border-[#A7F3D0] flex items-center gap-1 shadow-sm">
                  <Lock size={12}/> Published
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-md bg-yellow-50 text-yellow-700 text-[11px] font-bold uppercase tracking-wider border border-yellow-200 shadow-sm">
                  Draft
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex items-center gap-3">
          {isPublished ? (
            <button 
              onClick={() => handleSaveUpdate('new_version')} 
              disabled={isSaving}
              className="px-5 py-2.5 bg-white border border-[#E5E7EB] text-[#111827] text-sm font-bold rounded-xl hover:bg-[#F9FAFB] shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <GitFork size={16} className="text-[#059669]" />} Create New Draft Version
            </button>
          ) : (
            <>
              <button 
                onClick={() => handleSaveUpdate('save')} 
                disabled={isSaving || isPublishing}
                className="px-5 py-2.5 bg-white border border-[#E5E7EB] text-[#4B5563] text-sm font-bold rounded-xl hover:text-[#111827] hover:bg-[#F9FAFB] shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />} Save Draft
              </button>
              <button 
                onClick={() => handleSaveUpdate('publish')} 
                disabled={isSaving || isPublishing}
                className="px-6 py-2.5 bg-[#059669] text-white text-sm font-bold rounded-xl hover:bg-[#047857] shadow-lg shadow-[#059669]/20 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {isPublishing ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />} Publish Updates
              </button>
            </>
          )}
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto mt-8 px-6 space-y-8">
        
        {/* PUBLISHED WARNING BANNER */}
        {isPublished && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 p-5 rounded-2xl flex items-start gap-3 text-sm shadow-sm animate-in fade-in">
            <Lock size={20} className="shrink-0 text-blue-600 mt-0.5" />
            <div>
              <p className="font-bold text-blue-900 mb-1">This template is currently published and locked.</p>
              <p>It cannot be modified to prevent accidental disruptions to active campaigns. If you need to make changes, click <b>"Create New Draft Version"</b> in the top right to safely fork a new editable draft.</p>
            </div>
          </div>
        )}

        {/* BASIC DETAILS CARD */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-[#F8FAFC] px-6 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
            <Settings size={18} className="text-[#059669]" />
            <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider">Template Configuration</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Name</label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                disabled={isPublished}
                className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-[#059669] disabled:opacity-70 disabled:bg-[#F3F4F6] transition-colors" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">Description</label>
              <input 
                type="text" 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                disabled={isPublished}
                className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl text-sm outline-none focus:bg-white focus:border-[#059669] disabled:opacity-70 disabled:bg-[#F3F4F6] transition-colors" 
              />
            </div>
            <div className="col-span-1 md:col-span-2 pt-4 border-t border-[#E5E7EB]">
              <p className="text-xs text-[#6B7280] flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-[#9CA3AF]"/> 
                Template bound to schema containing <span className="font-bold text-[#111827] bg-[#F8FAFC] px-2 py-0.5 rounded border border-[#E5E7EB]">{schema.length} columns</span>
              </p>
            </div>
          </div>
        </div>

        {/* MESSAGE COMPOSER */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-[#F8FAFC] px-6 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
            <MessageSquare size={18} className="text-[#059669]" />
            <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider">Message Composition</h3>
          </div>
          
          <div className="p-6">
            <div className="flex gap-2 flex-wrap bg-[#F8FAFC] p-4 rounded-t-xl border border-[#E5E7EB] border-b-0">
              <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider w-full mb-1">Available Schema Variables</span>
              {schema.map(col => (
                <button 
                  key={col.name} 
                  onMouseDown={(e) => { e.preventDefault(); insertVariablePill(col.name); }} 
                  disabled={isPublished}
                  className="px-3 py-1.5 bg-white border border-[#E5E7EB] text-[#111827] rounded-lg text-xs font-bold hover:border-[#059669] hover:text-[#059669] shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={14}/> {col.name}
                </button>
              ))}
              {schema.length === 0 && <span className="text-sm text-[#9CA3AF] italic">No variables available.</span>}
            </div>
            
            <div 
              ref={editorRef}
              contentEditable={!isPublished}
              onInput={(e) => setEditorHtml(e.currentTarget.innerHTML)}
              onKeyDown={handleEditorKeyDown}
              className={`w-full min-h-[200px] p-5 border border-[#E5E7EB] rounded-b-xl text-sm outline-none focus:border-[#059669] leading-relaxed text-[#111827] ${isPublished ? 'bg-[#F9FAFB] cursor-not-allowed opacity-80' : 'bg-white shadow-inner'}`}
              style={{ whiteSpace: 'pre-wrap' }}
              suppressContentEditableWarning={true}
            />
          </div>
        </div>

        {/* FILTER DSL BUILDER */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-[#F8FAFC] px-6 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
            <Filter size={18} className="text-[#059669]" />
            <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider">Targeting Rules</h3>
          </div>
          
          <div className="p-6">
            <div className="mb-6 bg-[#F8FAFC] border border-[#E5E7EB] p-4 rounded-xl">
              <p className="text-sm font-semibold text-[#111827] mb-3">Match Logic:</p>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm font-medium text-[#4B5563] cursor-pointer">
                  <input type="radio" checked={filterLogic === 'AND'} disabled={isPublished} onChange={() => setFilterLogic('AND')} className="accent-[#059669] w-4 h-4 disabled:opacity-50" />
                  ALL conditions (AND)
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-[#4B5563] cursor-pointer">
                  <input type="radio" checked={filterLogic === 'OR'} disabled={isPublished} onChange={() => setFilterLogic('OR')} className="accent-[#059669] w-4 h-4 disabled:opacity-50" />
                  ANY condition (OR)
                </label>
              </div>
            </div>

            <div className="space-y-4">
              {conditions.length === 0 && (
                <p className="text-sm text-[#059669] bg-[#ECFDF5] p-4 rounded-xl border border-[#A7F3D0] flex items-center gap-2">
                  <CheckCircle2 size={16} /> No filters defined. This template will target all rows in the dataset by default.
                </p>
              )}
              {conditions.map((cond, idx) => {
                const isNum = schema.find(s => s.name === cond.column)?.type === 'number';
                return (
                  <div key={cond.id} className="flex items-center gap-3 bg-[#F8FAFC] p-2 rounded-xl border border-[#E5E7EB]">
                    <select value={cond.column} disabled={isPublished} onChange={e => { const newConds = [...conditions]; newConds[idx].column = e.target.value; newConds[idx].operator = '=='; setConditions(newConds); }} className="w-1/3 px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm focus:border-[#059669] outline-none shadow-sm disabled:opacity-70">
                      <option value="" disabled>Select Column...</option>
                      {schema.map(col => <option key={col.name} value={col.name}>{col.name}</option>)}
                    </select>
                    <select value={cond.operator} disabled={isPublished} onChange={e => { const newConds = [...conditions]; newConds[idx].operator = e.target.value; setConditions(newConds); }} className="w-1/4 px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm focus:border-[#059669] outline-none shadow-sm disabled:opacity-70">
                      <option value="==">==</option>
                      {isNum && <><option value="<">&lt;</option><option value=">">&gt;</option><option value="<=">&lt;=</option><option value=">=">&gt;=</option></>}
                    </select>
                    <input type={isNum ? "number" : "text"} disabled={isPublished} placeholder="Value" value={cond.value} onChange={e => { const newConds = [...conditions]; newConds[idx].value = e.target.value; setConditions(newConds); }} className="w-1/3 px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm focus:border-[#059669] outline-none shadow-sm disabled:opacity-70" />
                    {!isPublished && (
                      <button onClick={() => setConditions(conditions.filter(c => c.id !== cond.id))} className="text-[#9CA3AF] hover:text-red-600 bg-white p-2 rounded-lg border border-[#E5E7EB] hover:border-red-200 transition-colors shadow-sm" title="Remove Condition">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            
            {!isPublished && (
              <div className="mt-6 pt-5 border-t border-[#E5E7EB]">
                <button onClick={() => setConditions([...conditions, { id: Date.now().toString(), column: '', operator: '==', value: '' }])} className="text-sm font-bold text-[#111827] bg-white border border-[#E5E7EB] px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 hover:bg-[#F9FAFB] transition-colors">
                  <Plus size={16} /> Add Filter Condition
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}