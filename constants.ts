
import { Account, AccountType } from './types';

export const INITIAL_ACCOUNTS: Account[] = [
  { id: 'acc-1', name: 'Caixa / Banco', type: AccountType.ASSET, balance: 0 },
  { id: 'acc-2', name: 'Contas a Receber', type: AccountType.ASSET, balance: 0 },
  { id: 'acc-3', name: 'Estoques', type: AccountType.ASSET, balance: 0 },
  { id: 'acc-4', name: 'Fornecedores', type: AccountType.LIABILITY, balance: 0 },
  { id: 'acc-5', name: 'Empréstimos', type: AccountType.LIABILITY, balance: 0 },
  { id: 'acc-6', name: 'Receita de Vendas', type: AccountType.REVENUE, balance: 0 },
  { id: 'acc-7', name: 'Despesas Operacionais', type: AccountType.EXPENSE, balance: 0 },
  { id: 'acc-8', name: 'Despesas de Salários', type: AccountType.EXPENSE, balance: 0 },
  { id: 'acc-9', name: 'Capital Social', type: AccountType.EQUITY, balance: 0 },
  { id: 'acc-10', name: 'Lucros/Prejuízos Acumulados', type: AccountType.EQUITY, balance: 0 }
];

export const CATEGORY_ICONS: Record<string, string> = {
  'Receita de Vendas': '💰',
  'Despesas Operacionais': '🏢',
  'Despesas de Salários': '👥',
  'Caixa / Banco': '🏦',
  'Estoque': '📦',
  'Fornecedores': '🤝',
  'Capital Social': '🏗️'
};
