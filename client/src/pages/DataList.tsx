import React, { useState, useEffect } from 'react';
import { 
  Database, FileSpreadsheet, Calendar, Hash, 
  AlertCircle, CheckCircle, Search, UploadCloud,
  Activity, ArrowLeft, Type, BarChart2, PieChart, Layers
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

const api = {
  getDatasets: async () => {
    const res = await fetch(`${BASE_URL}/dataset/`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load datasets.');
    return res.json();
  }
};

// --- TYPES ---
interface SchemaItem {
  name: string;
  type: 'string' | 'number' | 'boolean' | string;
}

interface Dataset {
  id: number;
  original_filename: string;
  row_count: number;
  column_count?: number;
  numeric_columns?: number;
  string_columns?: number;
  schema?: SchemaItem[];
  execution_count?: number;
  total_messages_sent?: number;
  success_rate_percent?: number;
  file_size_kb?: number;
  created_at: string;
}

// --- MAIN COMPONENT ---
export default function DatasetsManager() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // View State Management
  const [activeDataset, setActiveDataset] = useState<Dataset | null>(null);

  const showToast = (msg: string, type: 'success'|'error') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchDatasets = async () => {
    setIsLoading(true);
    try {
      const res = await api.getDatasets();
      // Ensure we handle both standard wrappers
      const data = res.datasets || res.items || res || [];
      setDatasets(data);
    } catch (error: any) {
      showToast(error.message || "Could not connect to the server.", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const filteredDatasets = datasets.filter(d => 
    d.original_filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatSize = (kb?: number) => {
    if (!kb) return '--';
    if (kb < 1024) return `${kb} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  // ==========================================
  // RENDER 2: DATASET DETAIL VIEW
  // ==========================================
  if (activeDataset) {
    const successRate = activeDataset.success_rate_percent || 0;
    
    return (
      <div className="min-h-screen w-full bg-[#F8FAFC] font-sans text-[#111827] pb-12">
        {/* Top Navbar */}
        <div className="bg-white border-b border-[#E5E7EB] px-8 py-4 sticky top-0 z-10 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setActiveDataset(null)} className="p-2 text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="text-[#059669]" size={20} />
                <h1 className="text-xl font-bold text-[#111827]">{activeDataset.original_filename}</h1>
                <span className="px-2.5 py-0.5 rounded-md bg-[#F3F4F6] text-[#4B5563] text-xs font-mono border border-[#E5E7EB]">
                  ID: {activeDataset.id}
                </span>
              </div>
              <p className="text-xs text-[#6B7280] mt-1 flex items-center gap-2">
                <Calendar size={12}/> Uploaded on {new Date(activeDataset.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-[1200px] mx-auto mt-8 px-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: Structure & Schema */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-[#E5E7EB] bg-[#F8FAFC] flex items-center justify-between">
                <h3 className="text-base font-bold text-[#111827] flex items-center gap-2">
                  <Database size={18} className="text-[#059669]" /> Data Structure
                </h3>
                <div className="flex gap-4 text-sm font-medium text-[#4B5563]">
                  <span className="flex items-center gap-1.5"><Layers size={16} className="text-[#9CA3AF]"/> {activeDataset.row_count.toLocaleString()} Rows</span>
                  <span className="flex items-center gap-1.5"><PieChart size={16} className="text-[#9CA3AF]"/> {activeDataset.column_count || (activeDataset.schema?.length || 0)} Columns</span>
                </div>
              </div>
              
              <div className="p-0">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white border-b border-[#E5E7EB] text-[11px] uppercase tracking-wider font-semibold text-[#6B7280]">
                    <tr>
                      <th className="px-6 py-4">Column Name</th>
                      <th className="px-6 py-4 text-right">Data Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {activeDataset.schema && activeDataset.schema.length > 0 ? (
                      activeDataset.schema.map((col, idx) => (
                        <tr key={idx} className="hover:bg-[#F8FAFC]/50 transition-colors">
                          <td className="px-6 py-3.5 font-medium text-[#111827] flex items-center gap-2">
                            {col.type === 'number' ? <Hash size={14} className="text-emerald-500" /> : <Type size={14} className="text-blue-500" />}
                            {col.name}
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${col.type === 'number' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                              {col.type}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={2} className="px-6 py-8 text-center text-[#6B7280]">Schema details not available.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* RIGHT: Usage Analytics */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-6">
              <h3 className="text-base font-bold text-[#111827] flex items-center gap-2 mb-6">
                <Activity size={18} className="text-[#059669]" /> Usage Analytics
              </h3>
              
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#F8FAFC] border border-[#E5E7EB] p-4 rounded-xl">
                    <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Total Executions</p>
                    <p className="text-2xl font-bold text-[#111827]">{activeDataset.execution_count || 0}</p>
                  </div>
                  <div className="bg-[#F8FAFC] border border-[#E5E7EB] p-4 rounded-xl">
                    <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">Messages Sent</p>
                    <p className="text-2xl font-bold text-[#111827]">{activeDataset.total_messages_sent?.toLocaleString() || 0}</p>
                  </div>
                </div>

                <div className="bg-[#ECFDF5] border border-[#A7F3D0] p-5 rounded-xl">
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-[11px] font-bold text-[#059669] uppercase tracking-wider">Overall Success Rate</p>
                    <p className="text-xl font-bold text-[#059669]">{successRate.toFixed(1)}%</p>
                  </div>
                  <div className="w-full bg-white/60 rounded-full h-2.5 overflow-hidden border border-[#A7F3D0]/50">
                    <div className="bg-[#059669] h-2.5 rounded-full" style={{ width: `${successRate}%` }}></div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E5E7EB]">
                  <p className="text-xs text-[#6B7280] flex justify-between">
                    <span>File Size:</span> <span className="font-medium text-[#111827]">{formatSize(activeDataset.file_size_kb)}</span>
                  </p>
                </div>
              </div>
            </div>
            
            {/* Informational Card */}
            <div className="bg-[#111827] rounded-2xl p-6 shadow-lg text-white">
              <h4 className="font-bold flex items-center gap-2 mb-2"><BarChart2 size={18} className="text-yellow-400"/> Campaign Ready</h4>
              <p className="text-sm text-gray-400 leading-relaxed">
                This dataset is fully structured and cached. You can select it directly during the Execution Phase to power dynamic templates without re-uploading.
              </p>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER 1: GRID VIEW (ASSET CENTER)
  // ==========================================
  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] font-sans text-[#111827] p-8">
      
      {toast && (
        <div className={`fixed top-6 right-6 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-in slide-in-from-right ${toast.type === 'success' ? 'bg-[#ECFDF5] border border-[#059669]/20 text-[#047857]' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      <div className="max-w-[1200px] mx-auto">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#111827] flex items-center gap-2">
              <Database className="text-[#059669]" size={24} /> Data Asset Center
            </h1>
            <p className="text-sm text-[#6B7280] mt-1">Manage and analyze your structured campaign datasets.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={16} />
              <input 
                type="text" 
                placeholder="Search datasets..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm focus:border-[#059669] focus:ring-1 focus:ring-[#059669]/20 outline-none w-64 shadow-sm transition-shadow"
              />
            </div>
            <button 
              className="px-4 py-2.5 text-sm font-medium text-white bg-[#059669] hover:bg-[#047857] rounded-lg transition-colors flex items-center gap-2 shadow-sm"
              onClick={() => showToast("Datasets are currently uploaded during the New Execution workflow.", "success")}
            >
              <UploadCloud size={16} /> Upload New
            </button>
          </div>
        </div>

        {/* DATASETS GRID */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 text-[#6B7280]">
            <div className="w-8 h-8 border-2 border-[#059669] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-medium">Loading data assets...</p>
          </div>
        ) : datasets.length === 0 ? (
          <div className="bg-white border border-[#E5E7EB] rounded-2xl flex flex-col items-center justify-center p-16 text-center shadow-sm">
            <div className="w-16 h-16 bg-[#F8FAFC] rounded-full flex items-center justify-center mb-4 border border-[#E5E7EB]">
              <Database className="text-[#9CA3AF]" size={32} />
            </div>
            <h3 className="text-base font-semibold text-[#111827]">No datasets stored yet</h3>
            <p className="text-sm text-[#6B7280] mt-1 max-w-sm">
              Datasets are permanently structured and saved here when you run your first campaign.
            </p>
          </div>
        ) : filteredDatasets.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <Search className="text-[#9CA3AF] mb-3" size={32} />
            <h3 className="text-base font-semibold text-[#111827]">No matching assets</h3>
            <p className="text-sm text-[#6B7280] mt-1">We couldn't find any datasets matching "{searchQuery}".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredDatasets.map((dataset) => {
              const successRate = dataset.success_rate_percent || 0;
              const hasSchema = dataset.schema && dataset.schema.length > 0;

              return (
                <div 
                  key={dataset.id} 
                  onClick={() => setActiveDataset(dataset)}
                  className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-[#059669]/30 transition-all cursor-pointer group flex flex-col"
                >
                  {/* Card Header */}
                  <div className="flex justify-between items-start mb-5">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2.5 bg-[#ECFDF5] rounded-xl text-[#059669] shrink-0">
                        <FileSpreadsheet size={20} />
                      </div>
                      <div className="truncate">
                        <h3 className="font-bold text-[#111827] truncate group-hover:text-[#059669] transition-colors">{dataset.original_filename}</h3>
                        <p className="text-xs text-[#6B7280] mt-0.5 flex items-center gap-1.5">
                          <Calendar size={12}/> {new Date(dataset.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Structure Preview */}
                  <div className="mb-6 flex-1">
                    <div className="flex gap-4 mb-3 text-sm font-medium text-[#4B5563]">
                      <span className="bg-[#F8FAFC] border border-[#E5E7EB] px-2 py-1 rounded-md">{dataset.row_count.toLocaleString()} rows</span>
                      <span className="bg-[#F8FAFC] border border-[#E5E7EB] px-2 py-1 rounded-md">{dataset.column_count || (dataset.schema?.length || 0)} cols</span>
                    </div>
                    
                    {hasSchema && (
                      <div className="space-y-1.5 mt-4">
                        <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">Schema Preview</p>
                        {dataset.schema?.slice(0, 3).map((col, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="text-[#4B5563] truncate pr-2 flex items-center gap-1.5">
                              {col.type === 'number' ? <Hash size={12} className="text-emerald-500" /> : <Type size={12} className="text-blue-500" />}
                              {col.name}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${col.type === 'number' ? 'text-emerald-700 bg-emerald-50' : 'text-blue-700 bg-blue-50'}`}>
                              {col.type}
                            </span>
                          </div>
                        ))}
                        {dataset.schema!.length > 3 && (
                          <div className="text-[10px] text-[#9CA3AF] font-medium pt-1 italic">+ {dataset.schema!.length - 3} more columns</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Usage & Performance Footer */}
                  <div className="pt-4 border-t border-[#E5E7EB] mt-auto">
                    <div className="flex justify-between items-end mb-2">
                      <div>
                        <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Usage</p>
                        <p className="text-xs font-medium text-[#111827] mt-0.5">{dataset.execution_count || 0} executions</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-[#059669] uppercase tracking-wider">Success</p>
                        <p className="text-xs font-bold text-[#059669] mt-0.5">{successRate.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="w-full bg-[#F3F4F6] rounded-full h-1.5 overflow-hidden">
                      <div className="bg-[#059669] h-1.5 rounded-full" style={{ width: `${successRate}%` }}></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}