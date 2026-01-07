
import React, { useState } from 'react';
import { Transaction, TransactionType } from '../types';
import { Trash2, Search, Filter, ArrowUpCircle, ArrowDownCircle, Calendar } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');

  const filtered = transactions.filter(t => {
    const matchesSearch = t.descricao.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.categoria.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || t.tipo === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sticky top-16 bg-slate-50 py-2 z-10">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Buscar por descrição ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setTypeFilter('all')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${typeFilter === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}
          >
            Todos
          </button>
          <button 
            onClick={() => setTypeFilter(TransactionType.INCOME)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${typeFilter === TransactionType.INCOME ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-600 border-slate-200'}`}
          >
            Ganhos
          </button>
          <button 
            onClick={() => setTypeFilter(TransactionType.EXPENSE)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${typeFilter === TransactionType.EXPENSE ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-rose-600 border-slate-200'}`}
          >
            Gastos
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map((t) => (
            <div key={t.id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between group shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${t.tipo === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  {t.tipo === TransactionType.INCOME ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{t.descricao}</h4>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{t.categoria}</span>
                      <span className="text-[10px] text-slate-300">•</span>
                      <span className="text-[10px] text-slate-400">{new Date(t.data).toLocaleDateString('pt-BR')}</span>
                    </div>
                    {t.dataVencimento && (
                      <div className="flex items-center gap-1 text-[10px] text-rose-500 font-medium">
                        <Calendar size={10} />
                        <span>Vence: {new Date(t.dataVencimento).toLocaleDateString('pt-BR')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className={`text-right ${t.tipo === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>
                  <p className="font-bold text-sm">
                    {t.tipo === TransactionType.INCOME ? '+' : '-'} {t.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <button 
                  onClick={() => onDelete(t.id)}
                  className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Filter size={32} />
            </div>
            <h3 className="text-slate-600 font-medium">Nenhum registro encontrado</h3>
            <p className="text-sm text-slate-400">Tente ajustar seus filtros ou fale com o FinAI.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionList;
