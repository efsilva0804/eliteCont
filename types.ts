
export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE'
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  lines: TransactionLine[];
  idempotencyKey: string;
}

export interface TransactionLine {
  accountId: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
}

export interface DashboardStats {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  totalIncome: number;
  totalExpenses: number;
}
