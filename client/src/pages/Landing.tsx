import React, { useState, useEffect } from 'react';
import { 
  Zap, LayoutTemplate, Activity, ChevronRight, XCircle, 
  CheckCircle, PlayCircle, ShieldCheck, GitMerge, 
  Database, Server, SlidersHorizontal, MessageSquare, Mail, 
  ArrowRight, BarChart2, RefreshCw, Users
} from 'lucide-react';

export default function LandingPage() {
  // Animation States for Hero & Showcase
  const [heroProgress, setHeroProgress] = useState(0);
  const [heroProcessed, setHeroProcessed] = useState(0);
  
  const [logs, setLogs] = useState<{name: string, status: string}[]>([]);

  // Simulate Execution Progress in Hero
  useEffect(() => {
    const interval = setInterval(() => {
      setHeroProgress(prev => {
        if (prev >= 100) {
          setHeroProcessed(0);
          return 0;
        }
        const newProgress = prev + 1.5;
        setHeroProcessed(Math.floor((newProgress / 100) * 85));
        return newProgress;
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Simulate Live Logs in Showcase
  useEffect(() => {
    const mockNames = ["Rahul", "Sneha", "Arjun", "Priya", "Vikram", "Anjali"];
    const interval = setInterval(() => {
      setLogs(prev => {
        const newLog = {
          name: mockNames[Math.floor(Math.random() * mockNames.length)],
          status: Math.random() > 0.15 ? 'Delivered' : 'Failed'
        };
        const nextLogs = [newLog, ...prev].slice(0, 5);
        return nextLogs;
      });
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-[#111827] overflow-x-hidden">
      
      {/* NAVBAR */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-[#E5E7EB]">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#059669] rounded-lg flex items-center justify-center shadow-sm">
              <Zap size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">CampaignHQ</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#4B5563]">
            <a href="#features" className="hover:text-[#111827] transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-[#111827] transition-colors">How it Works</a>
            <a href="#integrations" className="hover:text-[#111827] transition-colors">Integrations</a>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-sm font-medium text-[#4B5563] hover:text-[#111827] transition-colors">Login</button>
            <button className="px-4 py-2 bg-[#111827] text-white text-sm font-medium rounded-lg hover:bg-[#1F2937] transition-colors shadow-sm">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* 1️⃣ HERO SECTION */}
      <section className="pt-32 pb-20 px-6 max-w-[1200px] mx-auto grid lg:grid-cols-2 gap-12 items-center min-h-[85vh]">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669] text-xs font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse"></span>
            Execution Engine v2.0 Live
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1]">
            Run Smart Campaigns.<br />
            At Scale.<br />
            <span className="text-[#059669]">With Precision.</span>
          </h1>
          <p className="text-lg text-[#4B5563] leading-relaxed max-w-lg">
            Upload data. Apply intelligent filters. Deliver personalized messages. Monitor everything live. A deterministic execution engine built for modern operations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <button className="px-8 py-3.5 bg-[#059669] text-white text-base font-semibold rounded-xl shadow-lg shadow-[#059669]/20 hover:bg-[#047857] transition-all flex items-center justify-center gap-2">
              Start Executing <ArrowRight size={18} />
            </button>
            <button className="px-8 py-3.5 bg-white border border-[#E5E7EB] text-[#111827] text-base font-semibold rounded-xl hover:bg-[#F8FAFC] transition-colors flex items-center justify-center gap-2">
              View Documentation
            </button>
          </div>
        </div>

        {/* Hero UI Mockup */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#059669]/20 to-transparent blur-3xl -z-10 rounded-[3rem]"></div>
          <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-[#111827] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="text-[#059669]" size={20} />
                <span className="text-white font-semibold">Live Execution</span>
              </div>
              <span className="text-xs font-mono text-[#059669] bg-[#059669]/20 px-2 py-1 rounded">RUNNING</span>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <div className="flex justify-between text-sm font-medium mb-2">
                  <span className="text-[#111827]">Low Attendance Alert</span>
                  <span className="text-[#059669]">{heroProgress.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-[#F3F4F6] rounded-full h-3 overflow-hidden">
                  <div className="bg-[#059669] h-3 transition-all duration-100 ease-linear" style={{ width: `${heroProgress}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E5E7EB] text-center">
                  <p className="text-[10px] text-[#6B7280] font-bold uppercase">Processed</p>
                  <p className="text-lg font-bold text-[#111827] mt-0.5">{heroProcessed}/85</p>
                </div>
                <div className="bg-[#ECFDF5] p-3 rounded-lg border border-[#A7F3D0] text-center">
                  <p className="text-[10px] text-[#059669] font-bold uppercase">Success</p>
                  <p className="text-lg font-bold text-[#059669] mt-0.5">{Math.max(0, heroProcessed - 2)}</p>
                </div>
                <div className="bg-red-50 p-3 rounded-lg border border-red-200 text-center">
                  <p className="text-[10px] text-red-600 font-bold uppercase">Failed</p>
                  <p className="text-lg font-bold text-red-600 mt-0.5">{heroProcessed > 20 ? 2 : 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2️⃣ PROBLEM SECTION */}
      <section className="bg-[#F8FAFC] py-20 border-y border-[#E5E7EB]">
        <div className="max-w-[1000px] mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-10">Manual Messaging Doesn't Scale.</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              "No filtering logic", 
              "No delivery tracking", 
              "No rate limit control", 
              "No automatic retries"
            ].map((problem, i) => (
              <div key={i} className="flex flex-col items-center gap-3 p-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <XCircle size={20} />
                </div>
                <p className="text-sm font-semibold text-[#4B5563]">{problem}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3️⃣ SOLUTION OVERVIEW */}
      <section className="py-24 max-w-[1200px] mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold">A Complete Campaign Execution Engine</h2>
          <p className="text-[#6B7280] mt-4 max-w-2xl mx-auto">Deterministic architecture designed to handle thousands of personalized messages with absolute reliability.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-[#ECFDF5] rounded-xl flex items-center justify-center text-[#059669] mb-6">
              <LayoutTemplate size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">Template Builder</h3>
            <p className="text-[#6B7280] text-sm leading-relaxed">Create reusable, version-controlled templates with dynamic variables and strict targeting filters.</p>
          </div>
          <div className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-[#ECFDF5] rounded-xl flex items-center justify-center text-[#059669] mb-6">
              <Zap size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">Smart Execution</h3>
            <p className="text-[#6B7280] text-sm leading-relaxed">Upload datasets, validate schema against templates, select active channels, and run parallelized tasks.</p>
          </div>
          <div className="bg-white p-8 rounded-2xl border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-[#ECFDF5] rounded-xl flex items-center justify-center text-[#059669] mb-6">
              <Activity size={24} />
            </div>
            <h3 className="text-xl font-bold mb-3">Live Monitoring</h3>
            <p className="text-[#6B7280] text-sm leading-relaxed">Track precise delivery statuses, error reasons, and processing throughput via secure WebSockets.</p>
          </div>
        </div>
      </section>

      {/* 4️⃣ HOW IT WORKS */}
      <section id="how-it-works" className="bg-[#111827] py-24 text-white">
        <div className="max-w-[1200px] mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Workflow Engineered for Safety</h2>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0 relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-[1px] bg-gray-800 -z-0"></div>
            
            {[
              { step: 1, title: 'Select Template', desc: 'Choose a published version.' },
              { step: 2, title: 'Upload CSV', desc: 'Schema validated instantly.' },
              { step: 3, title: 'Configure', desc: 'Set channel & integration.' },
              { step: 4, title: 'Run & Monitor', desc: 'Execute with live feedback.' }
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center relative z-10 w-full md:w-1/4">
                <div className="w-14 h-14 bg-[#059669] rounded-full flex items-center justify-center text-xl font-bold border-4 border-[#111827] shadow-lg mb-4">
                  {item.step}
                </div>
                <h4 className="font-semibold text-lg">{item.title}</h4>
                <p className="text-gray-400 text-sm mt-1 text-center">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5️⃣ & 6️⃣ FEATURE HIGHLIGHTS & LIVE SHOWCASE */}
      <section id="features" className="py-24 max-w-[1200px] mx-auto px-6 space-y-32">
        
        {/* Feature 1: Filtering */}
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-4">Advanced Targeting Logic.</h2>
            <p className="text-[#6B7280] text-lg mb-6 leading-relaxed">
              Stop guessing who receives your messages. Build deterministic rules using our Filter DSL. Combine AND/OR logic to target precisely the right audience.
            </p>
            <ul className="space-y-3">
              {['Numeric & string comparisons', 'Test filters before execution', 'Preview matched datasets'].map((text, i) => (
                <li key={i} className="flex items-center gap-3 font-medium text-[#111827]">
                  <CheckCircle className="text-[#059669]" size={20} /> {text}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-2xl p-8 shadow-inner font-mono text-sm">
            <div className="text-[#059669] mb-2">{`// Target Audience Filter DSL`}</div>
            <div className="bg-white border border-[#E5E7EB] p-4 rounded-lg shadow-sm">
              <span className="text-purple-600">"logic"</span>: <span className="text-blue-600">"AND"</span>,<br/>
              <span className="text-purple-600">"conditions"</span>: {'['}
              <div className="ml-4">
                {'{'} <span className="text-purple-600">"column"</span>: <span className="text-blue-600">"Attendance"</span>, <span className="text-purple-600">"operator"</span>: <span className="text-blue-600">"&lt;"</span>, <span className="text-purple-600">"value"</span>: <span className="text-orange-500">75</span> {'}'},<br/>
                {'{'} <span className="text-purple-600">"column"</span>: <span className="text-blue-600">"Semester"</span>, <span className="text-purple-600">"operator"</span>: <span className="text-blue-600">"=="</span>, <span className="text-purple-600">"value"</span>: <span className="text-orange-500">6</span> {'}'}
              </div>
              {']'}
            </div>
            <div className="mt-4 flex items-center justify-between text-xs font-sans font-bold text-[#4B5563] bg-[#E5E7EB]/50 p-2 rounded">
              <span>Test Result:</span>
              <span className="text-[#059669]">42 Rows Matched</span>
            </div>
          </div>
        </div>

        {/* Feature 2: Live Engine Showcase */}
        <div className="grid lg:grid-cols-2 gap-16 items-center flex-col-reverse lg:flex-row-reverse">
          <div className="order-1 lg:order-2">
            <h2 className="text-3xl font-bold mb-4">Live Execution Streaming.</h2>
            <p className="text-[#6B7280] text-lg mb-6 leading-relaxed">
              Never wonder if your campaign is actually sending. Connect directly to the engine via WebSockets for millisecond-accurate throughput metrics and delivery logs.
            </p>
            <ul className="space-y-3">
              {['Real-time success/failure metrics', 'Parallel task processing', 'Immediate cancellation support'].map((text, i) => (
                <li key={i} className="flex items-center gap-3 font-medium text-[#111827]">
                  <CheckCircle className="text-[#059669]" size={20} /> {text}
                </li>
              ))}
            </ul>
          </div>
          <div className="order-2 lg:order-1 bg-[#111827] rounded-2xl overflow-hidden shadow-2xl">
             <div className="px-4 py-3 bg-gray-900 border-b border-gray-800 flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-red-500"></div>
               <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
               <div className="w-3 h-3 rounded-full bg-green-500"></div>
               <span className="ml-4 text-xs font-mono text-gray-500">execution-logs-ws</span>
             </div>
             <div className="p-6 font-mono text-xs text-gray-300 h-[280px] overflow-hidden flex flex-col justify-end relative">
               {/* Fade out top */}
               <div className="absolute top-0 left-0 w-full h-12 bg-gradient-to-b from-[#111827] to-transparent"></div>
               
               <div className="space-y-2">
                 {logs.map((log, idx) => (
                   <div key={idx} className="flex gap-4 animate-in slide-in-from-bottom-2 fade-in">
                     <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span>
                     <span className="text-blue-400">Worker-0{Math.floor(Math.random()*4)}</span>
                     <span>Processing recipient: {log.name}...</span>
                     {log.status === 'Delivered' 
                       ? <span className="text-green-400 font-bold ml-auto">[SUCCESS]</span>
                       : <span className="text-red-400 font-bold ml-auto">[FAILED: Rate Limit]</span>
                     }
                   </div>
                 ))}
               </div>
             </div>
          </div>
        </div>
      </section>

      {/* 7️⃣ INTEGRATIONS SECTION */}
      <section id="integrations" className="bg-[#F8FAFC] py-24 border-y border-[#E5E7EB]">
        <div className="max-w-[1000px] mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Multi-Channel Capabilities</h2>
          <p className="text-[#6B7280] mb-12">Plug in your existing providers securely. No credentials stored locally.</p>
          
          <div className="flex flex-wrap justify-center gap-6">
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 w-48 flex flex-col items-center shadow-sm">
              <MessageSquare size={36} className="text-[#059669] mb-4" />
              <h4 className="font-bold text-[#111827]">WhatsApp</h4>
              <p className="text-xs text-[#6B7280] mt-1">Twilio & Meta API</p>
            </div>
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 w-48 flex flex-col items-center shadow-sm">
              <Mail size={36} className="text-blue-600 mb-4" />
              <h4 className="font-bold text-[#111827]">Email</h4>
              <p className="text-xs text-[#6B7280] mt-1">Secure SMTP</p>
            </div>
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 w-48 flex flex-col items-center shadow-sm">
              <SlidersHorizontal size={36} className="text-purple-600 mb-4" />
              <h4 className="font-bold text-[#111827]">Extensible</h4>
              <p className="text-xs text-[#6B7280] mt-1">Provider Agnostic</p>
            </div>
          </div>
        </div>
      </section>

      {/* 8️⃣ WHY IT'S DIFFERENT */}
      <section className="py-24 max-w-[1200px] mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-16">Built For Precision. Designed For Scale.</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: GitMerge, title: "Version-Controlled", desc: "Templates are immutable once published. Updates create safe new drafts." },
            { icon: Database, title: "Schema Validation", desc: "Engine blocks execution if CSV data doesn't perfectly match template variables." },
            { icon: RefreshCw, title: "Retry Logic Built-in", desc: "Automatic exponential backoff for provider timeouts and rate limits." },
            { icon: ShieldCheck, title: "Multi-Tenant Safe", desc: "Data isolation enforced at the database level for enterprise security." },
            { icon: Server, title: "Parallel Processing", desc: "Asynchronous task queue handles heavy payloads without UI blocking." },
            { icon: BarChart2, title: "Persistent Logs", desc: "Every single message attempt is logged, tracked, and queryable." }
          ].map((item, i) => (
            <div key={i} className="flex gap-4 p-6 bg-white border border-[#E5E7EB] rounded-xl shadow-sm">
              <div className="shrink-0 mt-1 text-[#059669]"><item.icon size={24} /></div>
              <div>
                <h4 className="font-bold text-[#111827] mb-1">{item.title}</h4>
                <p className="text-sm text-[#6B7280] leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 9️⃣ FINAL CTA */}
      <section className="px-6 py-20">
        <div className="max-w-[1000px] mx-auto bg-gradient-to-br from-[#059669] to-[#047857] rounded-3xl p-12 md:p-16 text-center text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
            <Zap size={300} />
          </div>
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">Ready to Run Your First Campaign?</h2>
            <p className="text-emerald-100 text-lg mb-10 max-w-2xl mx-auto">
              Join operations teams using CampaignHQ to automate their critical outreach with confidence.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button className="px-8 py-3.5 bg-white text-[#059669] text-base font-bold rounded-xl shadow-lg hover:bg-gray-50 transition-colors">
                Start Executing Now
              </button>
              <button className="px-8 py-3.5 bg-transparent border border-white/30 text-white text-base font-bold rounded-xl hover:bg-white/10 transition-colors">
                Explore Features
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 🔟 FOOTER */}
      <footer className="bg-white border-t border-[#E5E7EB] py-12 text-sm text-[#6B7280]">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
             <Zap size={16} className="text-[#059669]" />
             <span className="font-bold text-[#111827]">CampaignHQ</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-[#111827] transition-colors">About</a>
            <a href="#" className="hover:text-[#111827] transition-colors">Documentation</a>
            <a href="#" className="hover:text-[#111827] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[#111827] transition-colors">Terms</a>
          </div>
          <div>
            &copy; {new Date().getFullYear()} CampaignHQ. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
}