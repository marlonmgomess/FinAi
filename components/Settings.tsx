
import React, { useState } from 'react';
import { storageService } from '../services/storage';
import { UserProfile } from '../types';
import { User, ShieldCheck, Crown, ChevronRight, LogOut, FileText, CreditCard, Sparkles, Globe } from 'lucide-react';

const Settings: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>(storageService.getUserProfile());

  const handleUpgrade = () => {
    // Simulação de upgrade para a Play Store
    if (confirm('Deseja assinar o FinAI Pro por R$ 9,90/mês para desbloquear caixinhas ilimitadas e exportação?')) {
      storageService.updateUserProfile({ isPremium: true });
      setProfile({ ...profile, isPremium: true });
      alert('Parabéns! Você agora é Pro! 🎉');
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col items-center py-4">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3 shadow-inner">
          <User size={40} />
        </div>
        <h2 className="text-xl font-black text-slate-800">{profile.nome}</h2>
        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full mt-1 ${profile.isPremium ? 'bg-amber-100 text-amber-600 border border-amber-200' : 'bg-slate-100 text-slate-500'}`}>
          {profile.isPremium ? 'Assinante Pro' : 'Plano Gratuito'}
        </span>
      </div>

      {!profile.isPremium && (
        <button 
          onClick={handleUpgrade}
          className="w-full bg-gradient-to-r from-amber-400 to-orange-500 p-4 rounded-2xl text-white shadow-lg flex items-center justify-between group overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 rounded-full -mr-8 -mt-8 blur-2xl"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="bg-white/20 p-2 rounded-xl">
              <Crown className="text-white" size={24} />
            </div>
            <div className="text-left">
              <p className="font-black text-sm">Seja Premium</p>
              <p className="text-[10px] text-white/90">Desbloqueie tudo por R$ 9,90/mês</p>
            </div>
          </div>
          <ChevronRight className="group-hover:translate-x-1 transition-transform" />
        </button>
      )}

      <div className="space-y-2">
        <h3 className="text-xs font-black text-slate-400 uppercase ml-2 mb-2">Preferências</h3>
        
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-100">
            <div className="flex items-center gap-3">
              <Sparkles size={20} className="text-slate-400" />
              <span className="text-sm font-bold text-slate-700">Personalizar Categorias</span>
            </div>
            {!profile.isPremium && <Crown size={14} className="text-amber-500" />}
          </button>
          <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-100">
            <div className="flex items-center gap-3">
              <Globe size={20} className="text-slate-400" />
              <span className="text-sm font-bold text-slate-700">Moeda Principal</span>
            </div>
            <span className="text-xs font-bold text-slate-400">BRL (R$)</span>
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-black text-slate-400 uppercase ml-2 mb-2">Legal e Segurança</h3>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <a href="#" className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-100">
            <div className="flex items-center gap-3">
              <ShieldCheck size={20} className="text-slate-400" />
              <span className="text-sm font-bold text-slate-700">Privacidade dos Dados</span>
            </div>
            <ChevronRight size={16} className="text-slate-300" />
          </a>
          <a href="#" className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <FileText size={20} className="text-slate-400" />
              <span className="text-sm font-bold text-slate-700">Termos de Serviço</span>
            </div>
            <ChevronRight size={16} className="text-slate-300" />
          </a>
        </div>
      </div>

      <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-4">
        FinAI v1.0.4 • Made with AI
      </p>
    </div>
  );
};

export default Settings;
