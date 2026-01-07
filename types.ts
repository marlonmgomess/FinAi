
export enum TransactionType {
  EXPENSE = 'despesa',
  INCOME = 'receita',
  TRANSFER_TO_BOX = 'transfer_para_caixinha',
  WITHDRAW_FROM_BOX = 'retirada_da_caixinha'
}

export interface UserProfile {
  nome: string;
  isPremium: boolean;
  moeda: string;
  limiteCaixinhasGratis: number;
}

export interface Box {
  id: string;
  nome: string;
  meta: number;
  saldo: number;
  emoji: string;
  banco?: string;
  createdAt: number;
}

export interface Transaction {
  id: string;
  tipo: TransactionType;
  valor: number;
  categoria: string;
  data: string;
  dataVencimento?: string;
  descricao: string;
  createdAt: number;
  boxId?: string;
}

export interface AIProcessedTransaction {
  tipo: TransactionType | 'criar_caixinha';
  valor: number;
  categoria: string;
  data: string;
  dataVencimento?: string;
  descricao: string;
  boxNome?: string;
  meta?: number;
  emoji?: string;
  banco?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  pendingTransaction?: AIProcessedTransaction;
}
