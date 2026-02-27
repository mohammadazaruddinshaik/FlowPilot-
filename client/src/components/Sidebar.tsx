import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, FileText, Database, PlayCircle, 
  Blocks, BarChart2, Settings, Zap, ChevronLeft, ChevronRight
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Campaign Templates', path: '/templates', icon: FileText },
  { name: 'Datasets', path: '/datasets', icon: Database },
  { name: 'Executions', path: '/executions', icon: PlayCircle },
  { name: 'Integrations', path: '/integrations', icon: Blocks },
  { name: 'Analytics', path: '/analytics', icon: BarChart2 },
];

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside 
      className={`relative bg-[#FFFFFF] border-r border-[#E5E7EB] flex flex-col flex-shrink-0 z-20 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-[80px]' : 'w-[240px]'
      }`}
    >
      {/* Floating Edge Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 w-6 h-6 bg-white border border-[#E5E7EB] rounded-full flex items-center justify-center text-[#6B7280] hover:text-[#111827] shadow-sm z-30 transition-transform hover:scale-110 focus:outline-none"
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? <ChevronRight size={14} strokeWidth={2.5} /> : <ChevronLeft size={14} strokeWidth={2.5} />}
      </button>

      {/* Branding */}
      <div className={`h-16 flex items-center border-b border-[#E5E7EB] transition-all duration-300 ${isCollapsed ? 'justify-center px-0' : 'px-6'}`}>
        <div className="w-8 h-8 bg-[#059669] rounded-lg flex items-center justify-center shrink-0 shadow-sm">
          <Zap size={18} className="text-[#FFFFFF]" />
        </div>
        {!isCollapsed && (
          <span className="font-semibold text-[16px] tracking-tight text-[#111827] ml-3 whitespace-nowrap animate-in fade-in duration-300">
            CampaignHQ
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto overflow-x-hidden">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              title={isCollapsed ? item.name : undefined}
              className={({ isActive }) => `
                w-full flex items-center h-[44px] rounded-lg text-sm font-medium transition-colors duration-150 relative
                ${isCollapsed ? 'justify-center px-0' : 'px-3'}
                ${isActive 
                  ? 'bg-[#059669]/[0.08] text-[#059669]' 
                  : 'text-[#6B7280] hover:bg-[#F8FAFC] hover:text-[#111827]'}
              `}
            >
              {({ isActive }) => (
                <>
                  {/* Active Indicator Line */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#059669] rounded-r-md" />
                  )}
                  
                  <Icon size={18} className={`shrink-0 ${isActive ? 'text-[#059669]' : 'text-[#6B7280]'}`} />
                  
                  {!isCollapsed && (
                    <span className="ml-3 whitespace-nowrap animate-in fade-in duration-300">
                      {item.name}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
      
    </aside>
  );
}