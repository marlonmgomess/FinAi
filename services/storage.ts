
import { Transaction, TransactionType, Box } from '../types';

const STORAGE_KEY = 'finai_transactions';
const BOXES_KEY = 'finai_boxes';

export const storageService = {
  // Transações
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
    
    // Se for operação de caixinha, atualiza o saldo da caixinha
    if (transaction.boxId) {
      const boxes = await storageService.getBoxes();
      const boxIndex = boxes.findIndex(b => b.id === transaction.boxId);
      if (boxIndex > -1) {
        if (transaction.tipo === TransactionType.TRANSFER_TO_BOX) {
          boxes[boxIndex].saldo += transaction.valor;
        } else if (transaction.tipo === TransactionType.WITHDRAW_FROM_BOX) {
          boxes[boxIndex].saldo -= transaction.valor;
        }
        localStorage.setItem(BOXES_KEY, JSON.stringify(boxes));
      }
    }

    return newTransaction;
  },

  deleteTransaction: async (id: string): Promise<void> => {
    const transactions = await storageService.getTransactions();
    const toDelete = transactions.find(t => t.id === id);
    
    // Se deletar uma transferência, estorna o valor da caixinha
    if (toDelete?.boxId) {
      const boxes = await storageService.getBoxes();
      const boxIndex = boxes.findIndex(b => b.id === toDelete.boxId);
      if (boxIndex > -1) {
        if (toDelete.tipo === TransactionType.TRANSFER_TO_BOX) {
          boxes[boxIndex].saldo -= toDelete.valor;
        } else if (toDelete.tipo === TransactionType.WITHDRAW_FROM_BOX) {
          boxes[boxIndex].saldo += toDelete.valor;
        }
        localStorage.setItem(BOXES_KEY, JSON.stringify(boxes));
      }
    }

    const updated = transactions.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  // Caixinhas
  getBoxes: async (): Promise<Box[]> => {
    const data = localStorage.getItem(BOXES_KEY);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveBox: async (box: Omit<Box, 'id' | 'createdAt' | 'saldo'>): Promise<Box> => {
    const boxes = await storageService.getBoxes();
    const newBox: Box = {
      ...box,
      id: crypto.randomUUID(),
      saldo: 0,
      createdAt: Date.now()
    };
    localStorage.setItem(BOXES_KEY, JSON.stringify([...boxes, newBox]));
    return newBox;
  },

  updateBox: async (id: string, updates: Partial<Box>): Promise<void> => {
    const boxes = await storageService.getBoxes();
    const updated = boxes.map(b => b.id === id ? { ...b, ...updates } : b);
    localStorage.setItem(BOXES_KEY, JSON.stringify(updated));
  },

  deleteBox: async (id: string): Promise<void> => {
    const boxes = await storageService.getBoxes();
    localStorage.setItem(BOXES_KEY, JSON.stringify(boxes.filter(b => b.id !== id)));
  },

  getStats: async () => {
    const transactions = await storageService.getTransactions();
    const boxes = await storageService.getBoxes();
    
    const totals = transactions.reduce((acc, t) => {
      if (t.tipo === TransactionType.INCOME) {
        acc.income += t.valor;
        acc.balance += t.valor;
      } else if (t.tipo === TransactionType.EXPENSE) {
        acc.expenses += t.valor;
        acc.balance -= t.valor;
      } else if (t.tipo === TransactionType.TRANSFER_TO_BOX) {
        acc.balance -= t.valor; // Sai do saldo livre
        acc.invested += t.valor;
      } else if (t.tipo === TransactionType.WITHDRAW_FROM_BOX) {
        acc.balance += t.valor; // Volta pro saldo livre
        acc.invested -= t.valor;
      }
      return acc;
    }, { income: 0, expenses: 0, balance: 0, invested: 0 });

    const totalInBoxes = boxes.reduce((sum, b) => sum + b.saldo, 0);
    return { ...totals, totalInBoxes };
  }
};
