
import { Transaction, TransactionType, Box, UserProfile } from '../types';

const STORAGE_KEY = 'finai_transactions';
const BOXES_KEY = 'finai_boxes';
const USER_KEY = 'finai_user_profile';

export const storageService = {
  // Perfil e Monetização
  getUserProfile: (): UserProfile => {
    const data = localStorage.getItem(USER_KEY);
    if (!data) return { nome: 'Usuário', isPremium: false, moeda: 'BRL', limiteCaixinhasGratis: 2 };
    return JSON.parse(data);
  },

  updateUserProfile: (profile: Partial<UserProfile>) => {
    const current = storageService.getUserProfile();
    localStorage.setItem(USER_KEY, JSON.stringify({ ...current, ...profile }));
  },

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify([newTransaction, ...transactions]));
    
    if (transaction.boxId) {
      const boxes = await storageService.getBoxes();
      const boxIndex = boxes.findIndex(b => b.id === transaction.boxId);
      if (boxIndex > -1) {
        if (transaction.tipo === TransactionType.TRANSFER_TO_BOX) boxes[boxIndex].saldo += transaction.valor;
        else if (transaction.tipo === TransactionType.WITHDRAW_FROM_BOX) boxes[boxIndex].saldo -= transaction.valor;
        localStorage.setItem(BOXES_KEY, JSON.stringify(boxes));
      }
    }
    return newTransaction;
  },

  deleteTransaction: async (id: string): Promise<void> => {
    const transactions = await storageService.getTransactions();
    const toDelete = transactions.find(t => t.id === id);
    if (toDelete?.boxId) {
      const boxes = await storageService.getBoxes();
      const boxIndex = boxes.findIndex(b => b.id === toDelete.boxId);
      if (boxIndex > -1) {
        if (toDelete.tipo === TransactionType.TRANSFER_TO_BOX) boxes[boxIndex].saldo -= toDelete.valor;
        else if (toDelete.tipo === TransactionType.WITHDRAW_FROM_BOX) boxes[boxIndex].saldo += toDelete.valor;
        localStorage.setItem(BOXES_KEY, JSON.stringify(boxes));
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions.filter(t => t.id !== id)));
  },

  // Caixinhas com validação de limite
  getBoxes: async (): Promise<Box[]> => {
    const data = localStorage.getItem(BOXES_KEY);
    if (!data) return [];
    return JSON.parse(data);
  },

  saveBox: async (box: Omit<Box, 'id' | 'createdAt' | 'saldo'>): Promise<{ success: boolean; error?: string; box?: Box }> => {
    const boxes = await storageService.getBoxes();
    const profile = storageService.getUserProfile();

    if (!profile.isPremium && boxes.length >= profile.limiteCaixinhasGratis) {
      return { success: false, error: 'Limite de caixinhas atingido no plano grátis.' };
    }

    const newBox: Box = { ...box, id: crypto.randomUUID(), saldo: 0, createdAt: Date.now() };
    localStorage.setItem(BOXES_KEY, JSON.stringify([...boxes, newBox]));
    return { success: true, box: newBox };
  },

  updateBox: async (id: string, updates: Partial<Box>): Promise<void> => {
    const boxes = await storageService.getBoxes();
    localStorage.setItem(BOXES_KEY, JSON.stringify(boxes.map(b => b.id === id ? { ...b, ...updates } : b)));
  },

  deleteBox: async (id: string): Promise<void> => {
    const boxes = await storageService.getBoxes();
    localStorage.setItem(BOXES_KEY, JSON.stringify(boxes.filter(b => b.id !== id)));
  }
};
