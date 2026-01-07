
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import ChatAssistant from './components/ChatAssistant';
import TransactionList from './components/TransactionList';
import Boxes from './components/Boxes';
import Settings from './components/Settings';
import Navbar from './components/Navbar';
import { storageService } from './services/storage';
import { notificationService } from './services/notifications';
import { Transaction } from './types';

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    setLoading(true);
    const data = await storageService.getTransactions();
    setTransactions(data);
    setLoading(false);
    notificationService.checkDueReminders(data);
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleConfirmAction = async (data: any) => {
    if (data.tipo === 'criar_caixinha') {
      const result = await storageService.saveBox({
        nome: data.boxNome,
        meta: data.meta,
        emoji: data.emoji || '💰',
        banco: data.banco
      });
      if (!result.success) {
        alert(result.error);
        return;
      }
    } else {
      const boxes = await storageService.getBoxes();
      const targetBox = boxes.find(b => b.nome.toLowerCase() === data.boxNome?.toLowerCase());
      
      await storageService.saveTransaction({
        tipo: data.tipo,
        valor: data.valor,
        categoria: targetBox ? 'Investimento' : data.categoria,
        data: data.data || new Date().toISOString().split('T')[0],
        descricao: data.descricao,
        dataVencimento: data.dataVencimento,
        boxId: targetBox?.id
      });
    }
    await fetchTransactions();
  };

  return (
    <HashRouter>
      <div className="min-h-screen flex flex-col bg-slate-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 p-4">
          <div className="max-w-2xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">F</div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">FinAI</h1>
            </div>
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
              {new Date().toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-24 px-4 pt-4 max-w-2xl mx-auto w-full">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : (
            <Routes>
              <Route path="/" element={<Dashboard transactions={transactions} />} />
              <Route path="/chat" element={<ChatAssistant transactions={transactions} onConfirm={handleConfirmAction} />} />
              <Route path="/history" element={<TransactionList transactions={transactions} onDelete={storageService.deleteTransaction} />} />
              <Route path="/boxes" element={<Boxes />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          )}
        </main>

        <Navbar />
      </div>
    </HashRouter>
  );
};

export default App;
