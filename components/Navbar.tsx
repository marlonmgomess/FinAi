
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MessageCircle, History, Landmark } from 'lucide-react';

const Navbar: React.FC = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe z-20">
      <div className="max-w-2xl mx-auto flex justify-around items-center h-16">
        <NavLink 
          to="/" 
          className={({ isActive }) => `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}
        >
          <LayoutDashboard size={20} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Início</span>
        </NavLink>

        <NavLink 
          to="/boxes" 
          className={({ isActive }) => `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}
        >
          <Landmark size={20} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Cofre</span>
        </NavLink>
        
        <NavLink 
          to="/chat" 
          className={({ isActive }) => `flex flex-col items-center gap-1 -mt-8 relative transition-transform ${isActive ? 'scale-110' : ''}`}
        >
          <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors ${window.location.hash.includes('chat') ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-600 border-2 border-emerald-600'}`}>
            <MessageCircle size={28} />
          </div>
          <span className="text-[10px] font-black mt-1 text-slate-600">FinAI</span>
        </NavLink>

        <NavLink 
          to="/history" 
          className={({ isActive }) => `flex flex-col items-center gap-1 transition-colors ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}
        >
          <History size={20} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">Extrato</span>
        </NavLink>
      </div>
    </nav>
  );
};

export default Navbar;
