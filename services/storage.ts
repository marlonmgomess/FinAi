
import { Transaction, TransactionType } from '../types';

const STORAGE_KEY = 'finai_transactions';

export const storageService = {
  getTransactions: async (): Promise<Transaction[]> => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveTransaction: async (transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> => {
    const transactions = await storageService.getTransactions();
    const newTransaction: Transaction = {
      ...transaction,
      id: crypto.randomUUID(),
      createdAt: Date.now()
    };
    const updated = [newTransaction, ...transactions];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newTransaction;
  },

  deleteTransaction: async (id: string): Promise<void> => {
    const transactions = await storageService.getTransactions();
    const updated = transactions.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  getStats: async (): Promise<{ income: number; expenses: number; balance: number }> => {
    const transactions = await storageService.getTransactions();
    return transactions.reduce((acc, t) => {
      if (t.tipo === TransactionType.INCOME) {
        acc.income += t.valor;
        acc.balance += t.valor;
      } else {
        acc.expenses += t.valor;
        acc.balance -= t.valor;
      }
      return acc;
    }, { income: 0, expenses: 0, balance: 0 });
  }
};
