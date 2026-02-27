import React, { useState, useEffect } from 'react';
import { 
  Blocks, Plus, Edit, Trash2, Power, CheckCircle, 
  AlertCircle, MessageSquare, Mail, Activity, X
} from 'lucide-react';

// --- CONFIGURATION & API ---
const BASE_URL = 'http://localhost:8000';

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

// --- REAL API SERVICES ---
const api = {
  getIntegrations: async () => {
    const res = await fetch(`${BASE_URL}/integrations`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load integrations.');
    return res.json();
  },
  createIntegration: async (payload: any) => {
    const res = await fetch(`${BASE_URL}/integrations`, { 
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload) 
    });
    if (!res.ok) throw new Error('Failed to create integration.');
    return res.json();
  },
  updateIntegration: async (id: number, payload: any) => {
    const res = await fetch(`${BASE_URL}/integrations/${id}`, { 
      method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(payload) 
    });
    if (!res.ok) throw new Error('Failed to update integration.');
    return res.json();
  },
  toggleIntegration: async (id: number) => {
    const res = await fetch(`${BASE_URL}/integrations/${id}/toggle`, { 
      method: 'PATCH', headers: getAuthHeaders() 
    });
    if (!res.ok) throw new Error('Failed to toggle integration status.');
    return res.json();
  },
  deleteIntegration: async (id: number) => {
    const res = await fetch(`${BASE_URL}/integrations/${id}`, { 
      method: 'DELETE', headers: getAuthHeaders() 
    });
    if (!res.ok) throw new Error('Failed to delete integration.');
    return res.json();
  }
};

// --- TYPES ---
interface Integration {
  id: number;
  channel_type: 'whatsapp' | 'email';
  provider_name: string;
  sender_identifier: string;
  rate_limit_per_minute: number;
  is_active: boolean;
  created_at: string;
}

// --- MAIN COMPONENT ---
export default function IntegrationsList() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    channel_type: 'whatsapp',
    provider_name: '',
    sender_identifier: '',
    rate_limit_per_minute: 60,
    credentials: {} as any
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (msg: string, type: 'success'|'error') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchIntegrations = async () => {
    setIsLoading(true);
    try {
      const res = await api.getIntegrations();
      setIntegrations(res.integrations || []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchIntegrations(); }, []);

  // --- HANDLERS ---
  const handleToggle = async (integration: Integration) => {
    // Optimistic UI update
    setIntegrations(prev => prev.map(i => i.id === integration.id ? { ...i, is_active: !i.is_active } : i));
    try {
      await api.toggleIntegration(integration.id);
      showToast(`Integration ${!integration.is_active ? 'activated' : 'deactivated'}.`, "success");
    } catch (error: any) {
      // Revert on failure
      setIntegrations(prev => prev.map(i => i.id === integration.id ? { ...i, is_active: integration.is_active } : i));
      showToast(error.message, 'error');
    }
  };

  const openAddModal = () => {
    setSelectedIntegration(null);
    setFormData({
      channel_type: 'whatsapp', provider_name: '', sender_identifier: '', rate_limit_per_minute: 60, credentials: {}
    });
    setIsFormModalOpen(true);
  };

  const openEditModal = (integration: Integration) => {
    setSelectedIntegration(integration);
    setFormData({
      channel_type: integration.channel_type,
      provider_name: integration.provider_name,
      sender_identifier: integration.sender_identifier,
      rate_limit_per_minute: integration.rate_limit_per_minute || 60,
      credentials: {} // Never pre-fill credentials for security
    });
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const payload: any = {
        provider_name: formData.provider_name,
        rate_limit_per_minute: Number(formData.rate_limit_per_minute)
      };

      if (!selectedIntegration) {
        // CREATE requires all fields
        payload.channel_type = formData.channel_type;
        payload.sender_identifier = formData.sender_identifier;
        payload.credentials = formData.credentials;
        await api.createIntegration(payload);
        showToast("Integration added successfully.", "success");
      } else {
        // UPDATE can be partial
        if (Object.keys(formData.credentials).length > 0 && Object.values(formData.credentials).some(v => v !== '')) {
          payload.credentials = formData.credentials; // Only send if user typed something new
        }
        await api.updateIntegration(selectedIntegration.id, payload);
        showToast("Integration updated successfully.", "success");
      }

      setIsFormModalOpen(false);
      fetchIntegrations();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeDelete = async () => {
    if (!selectedIntegration) return;
    try {
      await api.deleteIntegration(selectedIntegration.id);
      showToast("Integration deleted.", "success");
      setIntegrations(prev => prev.filter(i => i.id !== selectedIntegration.id));
      setIsDeleteModalOpen(false);
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  // --- UI HELPERS ---
  const getChannelIcon = (type: string) => {
    if (type === 'whatsapp') return <MessageSquare size={16} className="text-[#059669]" />;
    if (type === 'email') return <Mail size={16} className="text-blue-600" />;
    return <Blocks size={16} className="text-gray-500" />;
  };

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] font-sans text-[#111827] p-8">
      
      {/* TOAST */}
      {toast && (
        <div className={`fixed top-6 right-6 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-in slide-in-from-right ${toast.type === 'success' ? 'bg-[#ECFDF5] border border-[#059669]/20 text-[#047857]' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* HEADER */}
      <div className="max-w-[1100px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#111827] flex items-center gap-2">
              <Blocks className="text-[#059669]" size={24} /> Channel Integrations
            </h1>
            <p className="text-sm text-[#6B7280] mt-1">Connect and manage your communication providers.</p>
          </div>
          <button 
            onClick={openAddModal}
            className="px-4 py-2 text-sm font-medium text-white bg-[#059669] hover:bg-[#047857] rounded-lg transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus size={16} /> Add Integration
          </button>
        </div>

        {/* INTEGRATIONS LIST */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden min-h-[400px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-16 text-[#6B7280]">
              <div className="w-8 h-8 border-2 border-[#059669] border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-sm font-medium">Loading integrations...</p>
            </div>
          ) : integrations.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <div className="w-16 h-16 bg-[#F3F4F6] rounded-full flex items-center justify-center mb-4">
                <Blocks className="text-[#9CA3AF]" size={32} />
              </div>
              <h3 className="text-base font-semibold text-[#111827]">No Integrations configured</h3>
              <p className="text-sm text-[#6B7280] mt-1 mb-6">Add an email or WhatsApp provider to start executing campaigns.</p>
              <button onClick={openAddModal} className="px-4 py-2 text-sm font-medium text-[#059669] bg-[#ECFDF5] hover:bg-[#D1FAE5] rounded-lg transition-colors">
                Configure your first provider
              </button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="px-6 py-4 text-[11px] uppercase tracking-wider font-semibold text-[#6B7280] bg-[#F8FAFC] border-b border-[#E5E7EB]">Channel</th>
                  <th className="px-6 py-4 text-[11px] uppercase tracking-wider font-semibold text-[#6B7280] bg-[#F8FAFC] border-b border-[#E5E7EB]">Provider</th>
                  <th className="px-6 py-4 text-[11px] uppercase tracking-wider font-semibold text-[#6B7280] bg-[#F8FAFC] border-b border-[#E5E7EB]">Sender / Identifier</th>
                  <th className="px-6 py-4 text-[11px] uppercase tracking-wider font-semibold text-[#6B7280] bg-[#F8FAFC] border-b border-[#E5E7EB]">Rate Limit</th>
                  <th className="px-6 py-4 text-[11px] uppercase tracking-wider font-semibold text-[#6B7280] bg-[#F8FAFC] border-b border-[#E5E7EB]">Status</th>
                  <th className="px-6 py-4 text-[11px] uppercase tracking-wider font-semibold text-[#6B7280] bg-[#F8FAFC] border-b border-[#E5E7EB] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {integrations.map((item) => (
                  <tr key={item.id} className={`hover:bg-[#F8FAFC]/50 transition-colors group ${!item.is_active ? 'opacity-60 grayscale' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-[#111827] capitalize">
                        {getChannelIcon(item.channel_type)} {item.channel_type}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-[#111827]">{item.provider_name}</td>
                    <td className="px-6 py-4 text-sm text-[#4B5563]">{item.sender_identifier}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-xs font-mono text-[#6B7280] bg-[#F3F4F6] px-2 py-1 rounded border border-[#E5E7EB]">
                        <Activity size={12}/> {item.rate_limit_per_minute}/min
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#ECFDF5] text-[#059669] text-xs font-medium border border-[#A7F3D0]">
                          <CheckCircle size={14} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F3F4F6] text-[#6B7280] text-xs font-medium border border-[#E5E7EB]">
                          <Power size={14} /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleToggle(item)}
                          className="p-1.5 text-[#6B7280] hover:text-[#059669] hover:bg-[#ECFDF5] rounded-md transition-colors"
                          title={item.is_active ? "Deactivate" : "Activate"}
                        >
                          <Power size={16} />
                        </button>
                        <button 
                          onClick={() => openEditModal(item)}
                          className="p-1.5 text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] rounded-md transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => { setSelectedIntegration(item); setIsDeleteModalOpen(true); }}
                          className="p-1.5 text-[#6B7280] hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* --- ADD / EDIT MODAL --- */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#111827]/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-[#E5E7EB] overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] bg-[#F8FAFC]">
              <h3 className="text-lg font-bold text-[#111827] flex items-center gap-2">
                <Blocks className="text-[#059669]" size={20}/> 
                {selectedIntegration ? 'Edit Integration' : 'Add Integration'}
              </h3>
              <button onClick={() => setIsFormModalOpen(false)} className="p-1 text-[#9CA3AF] hover:text-[#111827] rounded-md hover:bg-[#E5E7EB] transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="integrationForm" onSubmit={handleFormSubmit} className="space-y-5">
                
                {/* Channel Type (Only visible on Create) */}
                {!selectedIntegration && (
                  <div>
                    <label className="block text-sm font-medium text-[#111827] mb-1.5">Channel Type</label>
                    <select 
                      value={formData.channel_type} 
                      onChange={e => setFormData({...formData, channel_type: e.target.value as any, credentials: {}})} 
                      className="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#059669] shadow-sm"
                    >
                      <option value="whatsapp">WhatsApp (Twilio / Meta API)</option>
                      <option value="email">Email (SMTP)</option>
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-[#111827] mb-1.5">Provider Name *</label>
                    <input type="text" required placeholder="e.g., Twilio Production" value={formData.provider_name} onChange={e => setFormData({...formData, provider_name: e.target.value})} className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#059669] shadow-sm" />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-[#111827] mb-1.5">Sender Identifier *</label>
                    <input type="text" required disabled={!!selectedIntegration} placeholder={formData.channel_type === 'whatsapp' ? '+1415...' : 'no-reply@company.com'} value={formData.sender_identifier} onChange={e => setFormData({...formData, sender_identifier: e.target.value})} className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#059669] shadow-sm disabled:bg-[#F3F4F6] disabled:text-[#6B7280]" />
                    {selectedIntegration && <p className="text-[11px] text-[#6B7280] mt-1">Identifier cannot be changed after creation.</p>}
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-[#111827] mb-1.5">Rate Limit (per minute) *</label>
                    <input type="number" required min="1" value={formData.rate_limit_per_minute} onChange={e => setFormData({...formData, rate_limit_per_minute: Number(e.target.value)})} className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#059669] shadow-sm" />
                  </div>
                </div>

                <div className="border-t border-[#E5E7EB] pt-5 mt-2">
                  <h4 className="text-sm font-semibold text-[#111827] mb-4">Credentials</h4>
                  {selectedIntegration && (
                    <div className="mb-4 p-3 bg-[#FFFBEB] border border-[#FDE68A] text-amber-800 text-xs rounded-lg flex gap-2">
                      <AlertCircle size={16} className="shrink-0" />
                      <p>Credentials are hidden for security. Leave these fields blank unless you wish to update them.</p>
                    </div>
                  )}

                  {/* WHATSAPP FIELDS */}
                  {formData.channel_type === 'whatsapp' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-[#6B7280] mb-1">Account SID {!selectedIntegration && '*'}</label>
                        <input type="text" required={!selectedIntegration} value={formData.credentials.account_sid || ''} onChange={e => setFormData({...formData, credentials: {...formData.credentials, account_sid: e.target.value}})} className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#059669] shadow-sm" placeholder="ACxxxxxxxxxxxxxxxxx" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#6B7280] mb-1">Auth Token {!selectedIntegration && '*'}</label>
                        <input type="password" required={!selectedIntegration} value={formData.credentials.auth_token || ''} onChange={e => setFormData({...formData, credentials: {...formData.credentials, auth_token: e.target.value}})} className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#059669] shadow-sm" placeholder="••••••••••••••••" />
                      </div>
                    </div>
                  )}

                  {/* EMAIL FIELDS */}
                  {formData.channel_type === 'email' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 md:col-span-1">
                        <label className="block text-xs font-medium text-[#6B7280] mb-1">SMTP Host {!selectedIntegration && '*'}</label>
                        <input type="text" required={!selectedIntegration} value={formData.credentials.smtp_host || ''} onChange={e => setFormData({...formData, credentials: {...formData.credentials, smtp_host: e.target.value}})} className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#059669] shadow-sm" placeholder="smtp.gmail.com" />
                      </div>
                      <div className="col-span-2 md:col-span-1">
                        <label className="block text-xs font-medium text-[#6B7280] mb-1">SMTP Port {!selectedIntegration && '*'}</label>
                        <input type="number" required={!selectedIntegration} value={formData.credentials.smtp_port || ''} onChange={e => setFormData({...formData, credentials: {...formData.credentials, smtp_port: Number(e.target.value)}})} className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#059669] shadow-sm" placeholder="587" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-[#6B7280] mb-1">SMTP Username {!selectedIntegration && '*'}</label>
                        <input type="text" required={!selectedIntegration} value={formData.credentials.smtp_user || ''} onChange={e => setFormData({...formData, credentials: {...formData.credentials, smtp_user: e.target.value}})} className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#059669] shadow-sm" placeholder="user@company.com" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-[#6B7280] mb-1">SMTP Password / App Password {!selectedIntegration && '*'}</label>
                        <input type="password" required={!selectedIntegration} value={formData.credentials.smtp_pass || ''} onChange={e => setFormData({...formData, credentials: {...formData.credentials, smtp_pass: e.target.value}})} className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg text-sm outline-none focus:border-[#059669] shadow-sm" placeholder="••••••••••••••••" />
                      </div>
                    </div>
                  )}

                </div>
              </form>
            </div>
            
            <div className="bg-[#F8FAFC] px-6 py-4 border-t border-[#E5E7EB] flex justify-end gap-3">
              <button type="button" onClick={() => setIsFormModalOpen(false)} className="px-4 py-2 text-sm font-medium text-[#4B5563] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors">
                Cancel
              </button>
              <button type="submit" form="integrationForm" disabled={isSubmitting} className="px-6 py-2 text-sm font-medium text-white bg-[#059669] rounded-lg hover:bg-[#047857] shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2">
                {isSubmitting ? 'Saving...' : 'Save Integration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {isDeleteModalOpen && selectedIntegration && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#111827]/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-[#E5E7EB] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <Trash2 className="text-red-600" size={24} />
              </div>
              <h3 className="text-lg font-bold text-[#111827]">Remove Integration?</h3>
              <p className="text-sm text-[#6B7280] mt-2 leading-relaxed">
                Are you sure you want to delete <strong>{selectedIntegration.provider_name}</strong>? Any campaigns currently using this integration will fail to execute.
              </p>
            </div>
            <div className="bg-[#F8FAFC] px-6 py-4 border-t border-[#E5E7EB] flex justify-end gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 text-sm font-medium text-[#4B5563] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors">
                Cancel
              </button>
              <button onClick={executeDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-sm transition-colors">
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}