
export enum TransactionType {
  EXPENSE = 'despesa',
  INCOME = 'receita'
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
}

export interface AIProcessedTransaction {
  tipo: TransactionType;
  valor: number;
  categoria: string;
  data: string;
  dataVencimento?: string;
  descricao: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  pendingTransaction?: AIProcessedTransaction;
}

export interface DashboardStats {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  categoryDistribution: { name: string; value: number }[];
  monthlyTrend: { name: string; expenses: number; income: number }[];
}
