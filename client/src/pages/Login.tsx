import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Eye, EyeOff, Loader2, Mail, Lock, 
  ArrowRight, BarChart3, Users, Zap 
} from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          email: email,
          password: password
        })
      });

      const result = await response.json();

      if (response.ok && result.access_token) {
        // DEV MODE: Pass the token and user to your context
        // (Assuming your backend returns { access_token: "...", user: {...} })
        login(result.access_token, result.user || null); 
        
        navigate('/dashboard'); 
      } else {
        setError(result.detail || result.message || "Invalid credentials. Please try again.");
      }

    } catch (err) {
      setError("Network error. Please ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex items-center justify-center p-4 sm:p-8 font-sans">
      <div className="w-full max-w-[1100px] bg-[#FFFFFF] rounded-[12px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#E5E7EB] flex flex-col md:flex-row min-h-[600px] overflow-hidden">
        
        {/* Left Side: Branding & Features */}
        <div className="hidden md:flex md:w-[45%] bg-[#F8FAFC] border-r border-[#E5E7EB] flex-col justify-between p-10 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#E5E7EB_1px,transparent_1px),linear-gradient(to_bottom,#E5E7EB_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-50"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-12">
              <div className="w-8 h-8 bg-[#059669] rounded-lg flex items-center justify-center shadow-sm">
                <Zap size={18} className="text-[#FFFFFF]" />
              </div>
              <span className="font-semibold text-lg tracking-tight text-[#111827]">CampaignHQ</span>
            </div>

            <h1 className="text-3xl font-medium tracking-tight text-[#111827] leading-tight mb-4">
              Campaign Automation Platform
            </h1>
            <p className="text-[#6B7280] text-sm leading-relaxed max-w-[85%]">
              Build, filter and execute intelligent communication campaigns with real-time analytics and seamless channel integrations.
            </p>
          </div>

          <div className="relative z-10 space-y-5">
            <div className="flex items-center gap-3 text-sm text-[#6B7280]">
              <div className="w-8 h-8 rounded-full bg-[#FFFFFF] border border-[#E5E7EB] shadow-sm flex items-center justify-center shrink-0">
                <Users size={14} className="text-[#111827]" />
              </div>
              <span>Multi-tenant architecture</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-[#6B7280]">
              <div className="w-8 h-8 rounded-full bg-[#FFFFFF] border border-[#E5E7EB] shadow-sm flex items-center justify-center shrink-0">
                <BarChart3 size={14} className="text-[#111827]" />
              </div>
              <span>Advanced performance analytics</span>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full md:w-[55%] bg-[#FFFFFF] p-8 sm:p-12 md:p-16 flex flex-col justify-center relative">
          <div className="max-w-[400px] w-full mx-auto">
            <div className="mb-10">
              <h2 className="text-2xl font-semibold tracking-tight text-[#111827]">Welcome back</h2>
              <p className="text-[#6B7280] text-sm mt-2">Sign in to manage your campaigns and monitor performance.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              
              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#111827] block">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={16} className="text-[#6B7280]" />
                  </div>
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg text-sm text-[#111827] placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] transition-all duration-200"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-[#111827] block">Password</label>
                  <a href="#" className="text-xs font-medium text-[#059669] hover:text-[#047857] transition-colors">
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={16} className="text-[#6B7280]" />
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-[#FFFFFF] border border-[#E5E7EB] rounded-lg text-sm text-[#111827] placeholder-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669] transition-all duration-200"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#6B7280] hover:text-[#111827] transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm flex items-center gap-2">
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-[#059669] hover:bg-[#047857] text-[#FFFFFF] rounded-lg font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <>Sign In <ArrowRight size={16} /></>
                  )}
                </button>
              </div>

            </form>
            
            <p className="mt-8 text-center text-xs text-[#6B7280]">
              By signing in, you agree to our <a href="#" className="underline hover:text-[#111827] transition-colors">Terms of Service</a> and <a href="#" className="underline hover:text-[#111827] transition-colors">Privacy Policy</a>.
            </p>

          </div>
        </div>
      </div>
    </div>
  );
}