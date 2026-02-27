import React, { useState, useEffect } from 'react';
import { 
  Activity, Zap, LayoutTemplate, Database, CheckCircle, 
  Clock, PlayCircle, RefreshCw, AlertCircle, XCircle, MessageSquare, Mail , List, Slash
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Cell as PieCell, Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';

// --- CONFIGURATION & API ---
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

// --- TYPES ---
interface OverviewData {
  organization_name: string;
  total_templates: number;
  total_datasets: number;
  total_executions: number;
  total_messages: number;
  success_messages: number;
  failed_messages: number;
  success_rate_percent: number;
  average_execution_duration_seconds: number;
}

interface TrendData { date: string; execution_count?: number; total?: number; success?: number; success_rate_percent?: number; }
interface TemplatePerf { template: string; total_messages: number; success_rate_percent: number; }
interface ChannelPerf { channel: string; total_messages: number; success_rate_percent: number; }
interface RunningExec { execution_id: number; processed: number; total: number; progress_percent: number; status?: string; }
interface RecentExec { id: number; channel_type: string; status: string; total: number; success: number; failed: number; created_at: string; }

export default function Dashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data States
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [executionTrend, setExecutionTrend] = useState<TrendData[]>([]);
  const [messageTrend, setMessageTrend] = useState<TrendData[]>([]);
  const [templatePerf, setTemplatePerf] = useState<TemplatePerf[]>([]);
  const [channelPerf, setChannelPerf] = useState<ChannelPerf[]>([]);
  const [runningExecutions, setRunningExecutions] = useState<RunningExec[]>([]);
  const [recentExecutions, setRecentExecutions] = useState<RecentExec[]>([]);

  // Chart Colors
  const COLORS = { primary: '#059669', secondary: '#111827', accent: '#3B82F6', warning: '#EF4444', neutral: '#9CA3AF' };
  const PIE_COLORS = ['#059669', '#3B82F6', '#8B5CF6', '#F59E0B'];

  const fetchDashboardData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const fetchApi = async (path: string) => {
        const res = await fetch(`${BASE_URL}${path}`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error(`Failed to load ${path}`);
        return res.json();
      };

      // Fetch all required dashboard widgets in parallel
      const [ovData, execTrend, msgTrend, tplPerf, chanPerf, running, recent] = await Promise.all([
        fetchApi('/dashboard/overview').catch(() => ({})),
        fetchApi('/dashboard/executions/trend').catch(() => ({ daily_executions: [] })),
        fetchApi('/dashboard/messages/trend').catch(() => ({ daily_messages: [] })),
        fetchApi('/dashboard/templates/performance').catch(() => ({ template_performance: [] })),
        fetchApi('/dashboard/channels/analytics').catch(() => ({ channel_performance: [] })),
        fetchApi('/dashboard/executions/running').catch(() => ({ running_executions: [] })),
        fetchApi('/execution').catch(() => ({ executions: [] })) // standard execution list for recent table
      ]);

      // Safely extract arrays from response wrappers
      setOverview(ovData);
      setExecutionTrend(execTrend.daily_executions || []);
      setMessageTrend(msgTrend.daily_messages || []);
      setTemplatePerf(tplPerf.template_performance || []);
      setChannelPerf(chanPerf.channel_performance || []);
      setRunningExecutions(running.running_executions || []);
      
      // Get top 5 recent executions for the table
      const executions = recent.executions || [];
      setRecentExecutions(executions.slice(0, 5));
      
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial Load & Auto-refresh
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => fetchDashboardData(true), 15000); // Silent refresh every 15s
    return () => clearInterval(interval);
  }, []);

  if (isLoading && !overview) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center text-[#6B7280]">
        <Activity className="animate-spin text-[#059669] mb-4" size={32} />
        <p className="font-medium">Loading Campaign Intelligence...</p>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
        <div className="bg-red-50 border border-red-200 p-6 rounded-xl text-center max-w-md">
          <AlertCircle className="text-red-500 mx-auto mb-3" size={32} />
          <h3 className="text-red-800 font-bold mb-1">Failed to load dashboard</h3>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button onClick={() => fetchDashboardData()} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-[#111827] pb-12 px-6 lg:px-8">
      
      {/* HEADER */}
      <div className="max-w-[1400px] mx-auto py-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827] flex items-center gap-2">
            <Zap className="text-[#059669]" /> {overview?.organization_name || 'Organization'} Analytics
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">Real-time overview of your campaign performance.</p>
        </div>
        <button 
          onClick={() => fetchDashboardData(true)} 
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E7EB] text-[#4B5563] text-sm font-medium rounded-lg shadow-sm hover:bg-[#F9FAFB] transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} /> {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* 🚨 LIVE RUNNING EXECUTIONS BANNER */}
        {runningExecutions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {runningExecutions.map(exec => (
              <div 
                key={exec.execution_id} 
                onClick={() => navigate(`/executions/${exec.execution_id}`)}
                className="bg-white border-2 border-blue-200 rounded-2xl p-5 shadow-sm relative overflow-hidden cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-100">
                  <div className="h-full bg-blue-500 transition-all duration-1000" style={{width: `${exec.progress_percent || 0}%`}}></div>
                </div>
                <div className="flex justify-between items-start mb-4 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                    <span className="font-bold text-[#111827] group-hover:text-blue-700 transition-colors">Execution #{exec.execution_id}</span>
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded tracking-wider uppercase">Running</span>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-wider mb-1">Processed</p>
                    <p className="text-xl font-bold text-[#111827]">{exec.processed || 0} <span className="text-sm text-[#9CA3AF] font-medium">/ {exec.total || 0}</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-blue-600">{(exec.progress_percent || 0).toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 🟦 TOP SECTION: KPI GRID */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard title="Total Templates" value={overview?.total_templates} icon={<LayoutTemplate size={20} />} />
          <KpiCard title="Total Datasets" value={overview?.total_datasets} icon={<Database size={20} />} />
          <KpiCard title="Total Executions" value={overview?.total_executions} icon={<PlayCircle size={20} />} />
          <KpiCard title="Total Messages" value={overview?.total_messages?.toLocaleString()} icon={<MessageSquare size={20} />} />
          
          <div className="bg-gradient-to-br from-[#ECFDF5] to-white border border-[#A7F3D0] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <p className="text-xs font-bold text-[#059669] uppercase tracking-wider">Success Rate</p>
              <CheckCircle className="text-[#059669]" size={20} />
            </div>
            <p className="text-3xl font-black text-[#059669] mt-4">{overview?.success_rate_percent?.toFixed(1) || 0}%</p>
          </div>

          <KpiCard title="Avg Duration" value={`${overview?.average_execution_duration_seconds?.toFixed(1) || 0}s`} icon={<Clock size={20} />} />
        </div>

        {/* 🟩 MIDDLE SECTION: TRENDS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Execution Trend */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-[#111827] mb-6">Execution Trend (Last 7 Days)</h3>
            <div className="h-[300px] w-full">
              {executionTrend.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-[#9CA3AF]">Not enough data to display trend.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={executionTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="date" tick={{fontSize: 12, fill: '#6B7280'}} tickLine={false} axisLine={false} />
                    <YAxis tick={{fontSize: 12, fill: '#6B7280'}} tickLine={false} axisLine={false} allowDecimals={false} />
                    <RechartsTooltip contentStyle={{borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Line type="monotone" dataKey="execution_count" name="Executions" stroke={COLORS.primary} strokeWidth={3} dot={{r: 4, fill: COLORS.primary}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Right: Message Trend */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-[#111827] mb-6">Message Performance Trend</h3>
            <div className="h-[300px] w-full">
              {messageTrend.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-[#9CA3AF]">Not enough data to display trend.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={messageTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="date" tick={{fontSize: 12, fill: '#6B7280'}} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" tick={{fontSize: 12, fill: '#6B7280'}} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{fontSize: 12, fill: '#6B7280'}} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                    <RechartsTooltip contentStyle={{borderRadius: '8px', border: '1px solid #E5E7EB'}} />
                    <Legend iconType="circle" wrapperStyle={{fontSize: '12px'}} />
                    <Line yAxisId="left" type="monotone" dataKey="total" name="Total Messages" stroke={COLORS.secondary} strokeWidth={2} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="success_rate_percent" name="Success Rate %" stroke={COLORS.accent} strokeWidth={2} dot={{r: 3}} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* 🟨 LOWER SECTION: PERFORMANCE & RECENT EXECUTIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left: Template Performance (Bar Chart) */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm lg:col-span-2 flex flex-col">
            <h3 className="text-base font-bold text-[#111827] mb-6">Template Performance Ranking</h3>
            <div className="flex-1 min-h-[300px] w-full">
              {templatePerf.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-[#9CA3AF]">No template data available.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={templatePerf} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                    <XAxis type="number" tick={{fontSize: 12, fill: '#6B7280'}} tickLine={false} axisLine={false} />
                    <YAxis dataKey="template" type="category" tick={{fontSize: 12, fill: '#111827', fontWeight: 500}} tickLine={false} axisLine={false} width={100} />
                    <RechartsTooltip cursor={{fill: '#F8FAFC'}} contentStyle={{borderRadius: '8px', border: '1px solid #E5E7EB'}} />
                    <Bar dataKey="total_messages" name="Messages Sent" radius={[0, 4, 4, 0]} barSize={24}>
                      {templatePerf.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.success_rate_percent > 90 ? COLORS.primary : COLORS.warning} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Right: Channel Analytics (Donut) */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm flex flex-col">
            <h3 className="text-base font-bold text-[#111827] mb-2">Channel Volume</h3>
            <div className="flex-1 flex items-center justify-center min-h-[300px]">
              {channelPerf.length === 0 ? (
                <div className="text-sm text-[#9CA3AF]">No channel data available.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={channelPerf}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="total_messages"
                      nameKey="channel"
                    >
                      {channelPerf.map((entry, index) => (
                        <PieCell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{borderRadius: '8px', border: '1px solid #E5E7EB'}} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(value) => <span className="capitalize text-sm font-medium text-[#4B5563]">{value}</span>}/>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* 🟦 BOTTOM SECTION: RECENT EXECUTIONS TABLE */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-[#E5E7EB] flex justify-between items-center bg-[#F8FAFC]">
            <h3 className="text-base font-bold text-[#111827] flex items-center gap-2">
              <List size={18} className="text-[#059669]" /> Recent Executions
            </h3>
            <button onClick={() => navigate('/executions')} className="text-sm text-[#059669] font-medium hover:text-[#047857] transition-colors">
              View All History &rarr;
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#4B5563] whitespace-nowrap">
              <thead className="bg-white border-b border-[#E5E7EB] text-[11px] uppercase tracking-wider font-semibold text-[#6B7280]">
                <tr>
                  <th className="px-6 py-4">Execution ID</th>
                  <th className="px-6 py-4">Channel</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Success / Total</th>
                  <th className="px-6 py-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] bg-white">
                {recentExecutions.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-[#6B7280]">No recent executions found.</td></tr>
                ) : (
                  recentExecutions.map((exec) => (
                    <tr 
                      key={exec.id} 
                      onClick={() => navigate(`/executions/${exec.id}`)}
                      className="hover:bg-[#F9FAFB] cursor-pointer transition-colors group"
                    >
                      <td className="px-6 py-4 font-mono font-medium text-[#111827] group-hover:text-[#059669]">#{exec.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 capitalize font-medium text-[#111827]">
                          {exec.channel_type === 'whatsapp' ? <MessageSquare size={16} className="text-[#059669]"/> : <Mail size={16} className="text-blue-600"/>}
                          {exec.channel_type}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={exec.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${exec.status === 'failed' ? 'bg-red-500' : 'bg-[#059669]'}`} 
                              style={{ width: `${(exec.success / (exec.total || 1)) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium"><span className="text-[#059669]">{exec.success}</span> / {exec.total}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-[#6B7280] text-right">
                        {new Date(exec.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

// --- HELPER COMPONENTS ---

function KpiCard({ title, value, icon }: { title: string; value: any; icon: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">{title}</p>
        <div className="text-[#9CA3AF] bg-[#F8FAFC] p-1.5 rounded-lg border border-[#E5E7EB]">{icon}</div>
      </div>
      <p className="text-3xl font-bold text-[#111827] mt-4">{value !== undefined ? value : '-'}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    queued: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    running: 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse',
    completed: 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]',
    failed: 'bg-red-50 text-red-700 border-red-200',
    cancelled: 'bg-gray-100 text-gray-600 border-gray-200'
  };
  const icons = {
    queued: <Clock size={12} />,
    running: <Activity size={12} />,
    completed: <CheckCircle size={12} />,
    failed: <XCircle size={12} />,
    cancelled: <Slash size={12} />
  };
  const safeStatus = status.toLowerCase() as keyof typeof styles;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border ${styles[safeStatus] || styles.queued}`}>
      {icons[safeStatus] || icons.queued} {status}
    </span>
  );
}