
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import ChatAssistant from './components/ChatAssistant';
import TransactionList from './components/TransactionList';
import Navbar from './components/Navbar';
import { storageService } from './services/storage';
import { Transaction } from './types';

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    setLoading(true);
    const data = await storageService.getTransactions();
    setTransactions(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleAddTransaction = async (t: Omit<Transaction, 'id' | 'createdAt'>) => {
    await storageService.saveTransaction(t);
    await fetchTransactions();
  };

  const handleDeleteTransaction = async (id: string) => {
    await storageService.deleteTransaction(id);
    await fetchTransactions();
  };

  return (
    <HashRouter>
      <div className="min-h-screen flex flex-col bg-slate-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10 p-4">
          <div className="max-w-2xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold">F</div>
              <h1 className="text-xl font-bold text-slate-800">FinAI</h1>
            </div>
            <div className="text-sm font-medium text-slate-500">
              {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-24 px-4 pt-4 max-w-2xl mx-auto w-full">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : (
            <Routes>
              <Route path="/" element={<Dashboard transactions={transactions} />} />
              <Route path="/chat" element={<ChatAssistant transactions={transactions} onConfirm={handleAddTransaction} />} />
              <Route path="/history" element={<TransactionList transactions={transactions} onDelete={handleDeleteTransaction} />} />
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
