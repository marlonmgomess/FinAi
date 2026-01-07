
import React, { useMemo } from 'react';
import { Transaction, TransactionType } from '../types';
import { TrendingUp, TrendingDown, Wallet, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface DashboardProps {
  transactions: Transaction[];
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const Dashboard: React.FC<DashboardProps> = ({ transactions }) => {
  const stats = useMemo(() => {
    const income = transactions.filter(t => t.tipo === TransactionType.INCOME).reduce((acc, t) => acc + t.valor, 0);
    const expenses = transactions.filter(t => t.tipo === TransactionType.EXPENSE).reduce((acc, t) => acc + t.valor, 0);
    const balance = income - expenses;

    // Category distribution
    const catMap: Record<string, number> = {};
    transactions.filter(t => t.tipo === TransactionType.EXPENSE).forEach(t => {
      catMap[t.categoria] = (catMap[t.categoria] || 0) + t.valor;
    });
    const categoryData = Object.entries(catMap).map(([name, value]) => ({ name, value }));

    return { income, expenses, balance, categoryData };
  }, [transactions]);

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="relative z-10">
          <p className="text-slate-400 text-sm font-medium mb-1">Saldo Total</p>
          <h2 className="text-3xl font-bold mb-6">{formatCurrency(stats.balance)}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <TrendingUp size={16} />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold">Receitas</p>
                <p className="text-sm font-bold text-emerald-400">{formatCurrency(stats.income)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400">
                <TrendingDown size={16} />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold">Despesas</p>
                <p className="text-sm font-bold text-rose-400">{formatCurrency(stats.expenses)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="text-slate-400" size={20} />
            <h3 className="font-bold text-slate-800">Gastos por Categoria</h3>
          </div>
          <div className="h-64">
            {stats.categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
                <p>Nenhum dado para exibir.</p>
                <p className="text-xs">Registre uma despesa para começar.</p>
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
             {stats.categoryData.slice(0, 4).map((cat, i) => (
               <div key={cat.name} className="flex items-center gap-1 px-2 py-1 rounded bg-slate-50 border border-slate-100">
                 <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                 <span className="text-[10px] font-medium text-slate-600">{cat.name}</span>
               </div>
             ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="text-slate-400" size={20} />
            <h3 className="font-bold text-slate-800">Relatório Rápido</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-sm text-slate-600">Eficiência de Poupança</span>
              <span className="font-bold text-emerald-600">
                {stats.income > 0 ? Math.max(0, ((stats.income - stats.expenses) / stats.income * 100)).toFixed(1) : 0}%
              </span>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
              <p className="text-xs text-blue-600 font-semibold mb-1 uppercase">Dica do Assistente</p>
              <p className="text-xs text-blue-800 leading-relaxed">
                {stats.expenses > stats.income 
                  ? "Suas despesas superaram suas receitas este mês. Tente reduzir gastos variáveis." 
                  : stats.income === 0 
                  ? "Adicione seu primeiro ganho ou gasto falando com o FinAI!"
                  : "Parabéns! Você está economizando parte da sua renda. Continue assim!"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
