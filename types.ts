
export enum TransactionType {
  EXPENSE = 'despesa',
  INCOME = 'receita',
  TRANSFER_TO_BOX = 'transfer_para_caixinha',
  WITHDRAW_FROM_BOX = 'retirada_da_caixinha'
}

export interface Box {
  id: string;
  nome: string;
  meta: number;
  saldo: number;
  emoji: string;
  banco?: string; // Novo campo para identificar o banco
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
  boxId?: string; // ID da caixinha se for uma transferência
}

export interface AIProcessedTransaction {
  tipo: TransactionType | 'criar_caixinha';
  valor: number;
  categoria: string;
  data: string;
  dataVencimento?: string;
  descricao: string;
  boxNome?: string; // Nome da caixinha se a IA detectar intenção de investimento
  meta?: number;    // Meta se for criação de caixinha
  emoji?: string;   // Emoji sugerido
  banco?: string;   // Banco sugerido
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  pendingTransaction?: AIProcessedTransaction;
  pendingBoxAction?: {
    type: 'create' | 'deposit' | 'withdraw';
    boxNome: string;
    valor?: number;
    meta?: number;
  };
}

export interface DashboardStats {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  totalInvested: number;
  categoryDistribution: { name: string; value: number }[];
  monthlyTrend: { name: string; expenses: number; income: number }[];
}
