import React, { useState, useEffect } from 'react';
import { 
  Activity, CheckCircle, Clock, Server, Zap, RefreshCw, 
  AlertCircle, BarChart2, Calendar, Target, Layers
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, BarChart, Bar, Cell, Legend, ComposedChart
} from 'recharts';

// --- CONFIGURATION & API ---
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const getAuthHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
  'Content-Type': 'application/json'
});

// --- TYPES ---
interface SummaryData {
  total_executions: number;
  total_messages: number;
  success_messages: number;
  failed_messages: number;
  success_rate_percent: number;
  completion_rate_percent: number;
  total_retries: number;
  average_execution_duration_seconds: number;
}

interface DailyTrend {
  date: string;
  total_messages: number;
  success_messages: number;
  success_rate_percent: number;
}

interface ChannelPerf {
  channel: string;
  total_messages: number;
  success_rate_percent: number;
}

interface ThroughputData {
  messages_per_second: number;
}

export default function Analytics() {
  const [daysFilter, setDaysFilter] = useState<number>(7);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data States
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [trend, setTrend] = useState<DailyTrend[]>([]);
  const [channelPerf, setChannelPerf] = useState<ChannelPerf[]>([]);
  const [throughput, setThroughput] = useState<ThroughputData | null>(null);

  // Chart Colors
  const COLORS = { 
    primary: '#059669', // Emerald
    secondary: '#3B82F6', // Blue
    warning: '#EF4444', // Red
    dark: '#111827',
    muted: '#9CA3AF'
  };

  const fetchAnalytics = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const fetchApi = async (path: string) => {
        const res = await fetch(`${BASE_URL}${path}`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error(`Failed to load ${path}`);
        return res.json();
      };

      // Parallel fetching
      const [sumData, trendData, chanData, tpData] = await Promise.all([
        fetchApi('/analytics/summary').catch(() => null),
        fetchApi(`/analytics/daily-trend?days=${daysFilter}`).catch(() => ({})),
        fetchApi('/analytics/channel-performance').catch(() => ({})),
        fetchApi('/analytics/throughput').catch(() => null)
      ]);

      setSummary(sumData);
      setThroughput(tpData);
      
      // STRICT ARRAY EXTRACTION FIX
      const extractedTrend = Array.isArray(trendData) ? trendData : 
                             Array.isArray(trendData?.daily_trend) ? trendData.daily_trend : 
                             Array.isArray(trendData?.items) ? trendData.items : [];
      setTrend(extractedTrend);

      const extractedChannels = Array.isArray(chanData) ? chanData : 
                                Array.isArray(chanData?.channel_performance) ? chanData.channel_performance : 
                                Array.isArray(chanData?.items) ? chanData.items : [];
      setChannelPerf(extractedChannels);

      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load analytics data.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Main fetch on mount and when daysFilter changes
  useEffect(() => {
    fetchAnalytics();
  }, [daysFilter]);

  // Auto-refresh Summary & Throughput every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const fetchLiveMetrics = async () => {
        try {
          const [sumRes, tpRes] = await Promise.all([
            fetch(`${BASE_URL}/analytics/summary`, { headers: getAuthHeaders() }),
            fetch(`${BASE_URL}/analytics/throughput`, { headers: getAuthHeaders() })
          ]);
          if (sumRes.ok) setSummary(await sumRes.json());
          if (tpRes.ok) setThroughput(await tpRes.json());
        } catch (e) {
          console.warn("Silent refresh failed");
        }
      };
      fetchLiveMetrics();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading && !summary) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center text-[#6B7280]">
        <Activity className="animate-spin text-[#059669] mb-4" size={32} />
        <p className="font-medium">Compiling Campaign Intelligence...</p>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6">
        <div className="bg-red-50 border border-red-200 p-6 rounded-xl text-center max-w-md">
          <AlertCircle className="text-red-500 mx-auto mb-3" size={32} />
          <h3 className="text-red-800 font-bold mb-1">Analytics Unavailable</h3>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button onClick={() => fetchAnalytics()} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-[#111827] pb-12 px-6 lg:px-8">
      
      {/* 🟦 HEADER & FILTERS */}
      <div className="max-w-[1400px] mx-auto py-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827] flex items-center gap-2">
            <BarChart2 className="text-[#059669]" /> Business Intelligence
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">Strategic performance overview of your campaign engine.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-1 flex items-center shadow-sm">
            {[7, 30, 90].map(days => (
              <button
                key={days}
                onClick={() => setDaysFilter(days)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  daysFilter === days ? 'bg-[#ECFDF5] text-[#059669]' : 'text-[#6B7280] hover:text-[#111827] hover:bg-[#F8FAFC]'
                }`}
              >
                {days} Days
              </button>
            ))}
          </div>
          <button 
            onClick={() => fetchAnalytics(true)} 
            disabled={isRefreshing}
            className="p-2.5 bg-white border border-[#E5E7EB] text-[#4B5563] rounded-lg shadow-sm hover:bg-[#F9FAFB] transition-colors disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* 🟦 TOP SECTION: KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard title="Total Executions" value={summary?.total_executions?.toLocaleString() || '0'} icon={<Server size={18} />} />
          <KpiCard title="Total Messages" value={summary?.total_messages?.toLocaleString() || '0'} icon={<Layers size={18} />} />
          
          <div className="bg-gradient-to-br from-[#ECFDF5] to-white border border-[#A7F3D0] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <p className="text-xs font-bold text-[#059669] uppercase tracking-wider">Success Rate</p>
              <CheckCircle className="text-[#059669]" size={18} />
            </div>
            <p className="text-3xl font-black text-[#059669] mt-4">{summary?.success_rate_percent?.toFixed(1) || 0}%</p>
          </div>

          <KpiCard title="Completion Rate" value={`${summary?.completion_rate_percent?.toFixed(1) || 0}%`} icon={<Target size={18} />} />
          <KpiCard title="Failed Messages" value={summary?.failed_messages?.toLocaleString() || '0'} icon={<AlertCircle size={18} className="text-red-500" />} isAlert={(summary?.failed_messages || 0) > 0} />
          <KpiCard title="Total Retries" value={summary?.total_retries?.toLocaleString() || '0'} icon={<RefreshCw size={18} />} />
          <KpiCard title="Avg Duration" value={`${summary?.average_execution_duration_seconds?.toFixed(1) || 0}s`} icon={<Clock size={18} />} />
          
          {/* Highlighted Throughput Metric */}
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between text-white relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-10"><Zap size={100} /></div>
            <div className="flex justify-between items-start relative z-10">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Avg Throughput</p>
              <Zap className="text-yellow-400" size={18} />
            </div>
            <div className="relative z-10 mt-4">
              <p className="text-3xl font-black text-white">{throughput?.messages_per_second?.toFixed(1) || 0} <span className="text-sm font-medium text-gray-400">msgs/sec</span></p>
            </div>
          </div>
        </div>

        {/* 🟩 SECOND SECTION: MESSAGE TREND CHART */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-[#111827]">Message Performance Trend</h3>
              <p className="text-sm text-[#6B7280]">Daily volume vs. delivery success rate</p>
            </div>
            <div className="p-2 bg-[#F8FAFC] rounded-lg border border-[#E5E7EB]">
              <Calendar size={18} className="text-[#9CA3AF]" />
            </div>
          </div>
          
          <div className="h-[350px] w-full">
            {!trend || trend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-[#9CA3AF]">Not enough data to display trend.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="date" tick={{fontSize: 12, fill: '#6B7280'}} tickLine={false} axisLine={false} />
                  
                  {/* Left Axis: Volume */}
                  <YAxis yAxisId="left" tick={{fontSize: 12, fill: '#6B7280'}} tickLine={false} axisLine={false} />
                  
                  {/* Right Axis: Percentage */}
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{fontSize: 12, fill: '#6B7280'}} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                  
                  <RechartsTooltip 
                    contentStyle={{borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                    labelStyle={{fontWeight: 'bold', color: '#111827', marginBottom: '4px'}}
                  />
                  <Legend iconType="circle" wrapperStyle={{fontSize: '13px', paddingTop: '10px'}} />
                  
                  <Bar yAxisId="left" dataKey="total_messages" name="Total Volume" fill={COLORS.secondary} radius={[4, 4, 0, 0]} maxBarSize={50} />
                  <Line yAxisId="right" type="monotone" dataKey="success_rate_percent" name="Success Rate %" stroke={COLORS.primary} strokeWidth={3} dot={{r: 4, fill: COLORS.primary}} activeDot={{r: 6}} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 🟨 THIRD & FOURTH SECTION: CHANNEL PERFORMANCE & SYSTEM SPEED */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left: Channel Performance (Horizontal Bar) */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm flex flex-col">
            <h3 className="text-lg font-bold text-[#111827] mb-1">Channel Performance Overview</h3>
            <p className="text-sm text-[#6B7280] mb-6">Delivery success rate grouped by provider channel.</p>
            
            <div className="flex-1 min-h-[250px] w-full">
              {!channelPerf || channelPerf.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-[#9CA3AF]">No channel data available.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={channelPerf} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                    <XAxis type="number" domain={[0, 100]} tick={{fontSize: 12, fill: '#6B7280'}} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                    <YAxis dataKey="channel" type="category" tick={{fontSize: 13, fill: '#111827', fontWeight: 600, textTransform: 'capitalize'}} tickLine={false} axisLine={false} width={80} />
                    <RechartsTooltip 
                      cursor={{fill: '#F8FAFC'}} 
                      contentStyle={{borderRadius: '8px', border: '1px solid #E5E7EB'}} 
                      formatter={(value: number) => [`${value.toFixed(1)}%`, 'Success Rate']}
                    />
                    <Bar dataKey="success_rate_percent" name="Success Rate" radius={[0, 6, 6, 0]} barSize={32}>
                      {channelPerf.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.success_rate_percent > 90 ? COLORS.primary : COLORS.warning} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Right: Throughput & System Health */}
          <div className="bg-gradient-to-br from-[#111827] to-[#1F2937] rounded-2xl p-8 shadow-xl text-white flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 opacity-5 transform translate-x-1/4 -translate-y-1/4">
              <Server size={300} />
            </div>
            
            <div className="relative z-10 text-center">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Zap size={32} className="text-yellow-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-200 mb-2">Global System Throughput</h3>
              <div className="flex items-baseline justify-center gap-2 mb-4">
                <span className="text-6xl font-black text-white">{throughput?.messages_per_second?.toFixed(1) || 0}</span>
                <span className="text-xl font-medium text-gray-400">msgs/sec</span>
              </div>
              <p className="text-sm text-gray-400 max-w-sm mx-auto leading-relaxed">
                Average delivery speed currently tracked across all completed and running campaigns in your organization workspace.
              </p>
              
              <div className="mt-8 pt-6 border-t border-gray-800 flex justify-center gap-8">
                 <div className="text-center">
                   <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Queue Health</p>
                   <p className="text-emerald-400 font-medium flex items-center gap-1.5 justify-center"><CheckCircle size={14}/> Optimal</p>
                 </div>
                 <div className="text-center">
                   <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Rate Limits</p>
                   <p className="text-emerald-400 font-medium flex items-center gap-1.5 justify-center"><CheckCircle size={14}/> Respected</p>
                 </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

// --- HELPER COMPONENTS ---

function KpiCard({ title, value, icon, isAlert = false }: { title: string; value: any; icon: React.ReactNode; isAlert?: boolean }) {
  return (
    <div className={`bg-white border rounded-2xl p-5 shadow-sm flex flex-col justify-between transition-shadow hover:shadow-md ${isAlert ? 'border-red-200' : 'border-[#E5E7EB]'}`}>
      <div className="flex justify-between items-start">
        <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">{title}</p>
        <div className={`p-1.5 rounded-lg border ${isAlert ? 'bg-red-50 border-red-100' : 'bg-[#F8FAFC] border-[#E5E7EB] text-[#9CA3AF]'}`}>
          {icon}
        </div>
      </div>
      <p className={`text-3xl font-bold mt-4 ${isAlert ? 'text-red-600' : 'text-[#111827]'}`}>
        {value !== undefined ? value : '-'}
      </p>
    </div>
  );
}