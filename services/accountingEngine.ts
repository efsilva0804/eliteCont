
import { Account, AccountType, JournalEntry, TransactionLine } from '../types';

export interface ExtendedJournalEntry extends JournalEntry {
  isClosing?: boolean;
}

export class AccountingEngine {
  private accounts: Account[];
  private ledger: ExtendedJournalEntry[];
  private processedKeys: Set<string>;

  constructor(initialAccounts: Account[]) {
    this.accounts = [...initialAccounts];
    this.ledger = [];
    this.processedKeys = new Set();
  }

  public postTransaction(entry: Omit<ExtendedJournalEntry, 'id'>): { success: boolean; error?: string } {
    if (this.processedKeys.has(entry.idempotencyKey)) {
      return { success: false, error: "Esta transação já foi processada." };
    }

    const debits = entry.lines.filter(l => l.type === 'DEBIT').reduce((sum, l) => sum + l.amount, 0);
    const credits = entry.lines.filter(l => l.type === 'CREDIT').reduce((sum, l) => sum + l.amount, 0);

    // Ajuste para precisão de ponto flutuante
    if (Math.abs(debits - credits) > 0.001) {
      return { success: false, error: `Lançamento desbalanceado: Débitos (${debits.toFixed(2)}) != Créditos (${credits.toFixed(2)})` };
    }

    const newEntry: ExtendedJournalEntry = {
      ...entry,
      id: crypto.randomUUID()
    };

    try {
      entry.lines.forEach(line => this.updateAccountBalance(line));
      this.ledger.push(newEntry);
      this.processedKeys.add(entry.idempotencyKey);
      return { success: true };
    } catch (err) {
      return { success: false, error: "Falha no motor contábil durante a atualização." };
    }
  }

  public deleteTransaction(id: string): { success: boolean; error?: string } {
    const index = this.ledger.findIndex(e => e.id === id);
    if (index === -1) return { success: false, error: "Transação não encontrada." };

    const entry = this.ledger[index];

    try {
      entry.lines.forEach(line => {
        this.updateAccountBalance({
          ...line,
          type: line.type === 'DEBIT' ? 'CREDIT' : 'DEBIT'
        });
      });

      this.ledger.splice(index, 1);
      this.processedKeys.delete(entry.idempotencyKey);
      return { success: true };
    } catch (err) {
      return { success: false, error: "Erro ao tentar reverter saldos." };
    }
  }

  public updateTransaction(id: string, updated: Omit<ExtendedJournalEntry, 'id'>): { success: boolean; error?: string } {
    const oldIndex = this.ledger.findIndex(e => e.id === id);
    if (oldIndex === -1) return { success: false, error: "Transação original não encontrada." };
    const delResult = this.deleteTransaction(id);
    if (!delResult.success) return delResult;
    return this.postTransaction(updated);
  }

  private updateAccountBalance(line: TransactionLine) {
    const account = this.accounts.find(a => a.id === line.accountId);
    if (!account) throw new Error("Conta não encontrada");

    const isNaturalDebit = account.type === AccountType.ASSET || account.type === AccountType.EXPENSE;
    const factor = line.type === 'DEBIT' ? (isNaturalDebit ? 1 : -1) : (isNaturalDebit ? -1 : 1);
    
    account.balance += (line.amount * factor);
  }

  public getAccounts(): Account[] {
    return this.accounts.map(a => ({ ...a }));
  }

  public getLedger(): ExtendedJournalEntry[] {
    return [...this.ledger];
  }

  public getStats() {
    return {
      totalAssets: this.accounts.filter(a => a.type === AccountType.ASSET).reduce((s, a) => s + a.balance, 0),
      totalLiabilities: Math.abs(this.accounts.filter(a => a.type === AccountType.LIABILITY).reduce((s, a) => s + a.balance, 0)),
      totalIncome: this.accounts.filter(a => a.type === AccountType.REVENUE).reduce((s, a) => s + a.balance, 0),
      totalExpenses: this.accounts.filter(a => a.type === AccountType.EXPENSE).reduce((s, a) => s + a.balance, 0),
    };
  }
}
