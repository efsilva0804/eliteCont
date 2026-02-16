
import React, { useState, useMemo, useCallback } from 'react';
import { 
  LayoutDashboard, 
  History, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  Sparkles,
  ArrowRightLeft,
  Pencil,
  Trash2,
  AlertTriangle,
  BookOpen,
  ClipboardList,
  Scale,
  Calculator,
  PieChart,
  CheckCircle2,
  RefreshCw,
  Info,
  LockOpen
} from 'lucide-react';
import { AccountingEngine, ExtendedJournalEntry } from './services/accountingEngine';
import { INITIAL_ACCOUNTS, CATEGORY_ICONS } from './constants';
import { Account, JournalEntry, TransactionLine, AccountType } from './types';
import { getAIInsights } from './services/geminiService';
import TransactionForm from './components/TransactionForm';
import FinancialCharts from './components/FinancialCharts';

type ViewType = 'diario' | 'razao' | 'balancete' | 'are' | 'dre' | 'balanco' | 'ia';

const App: React.FC = () => {
  const [engine] = useState(() => new AccountingEngine(INITIAL_ACCOUNTS));
  const [accounts, setAccounts] = useState<Account[]>(INITIAL_ACCOUNTS);
  const [ledger, setLedger] = useState<ExtendedJournalEntry[]>([]);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ExtendedJournalEntry | null>(null);
  const [activeView, setActiveView] = useState<ViewType>('diario');
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

  const stats = useMemo(() => engine.getStats(), [accounts]);

  const refreshState = useCallback(() => {
    setAccounts(engine.getAccounts());
    setLedger(engine.getLedger());
  }, [engine]);

  const handleAddTransaction = useCallback((description: string, lines: TransactionLine[], isClosing: boolean = false) => {
    const result = engine.postTransaction({
      date: new Date().toISOString(),
      description,
      lines,
      idempotencyKey: crypto.randomUUID(),
      isClosing
    });
    if (result.success) refreshState();
    else alert(result.error);
  }, [engine, refreshState]);

  const handleUpdateTransaction = useCallback((id: string, description: string, lines: TransactionLine[], isClosing: boolean = false) => {
    const result = engine.updateTransaction(id, {
      date: new Date().toISOString(),
      description,
      lines,
      idempotencyKey: crypto.randomUUID(),
      isClosing
    });
    if (result.success) { setEditingEntry(null); refreshState(); }
    else alert(result.error);
  }, [engine, refreshState]);

  const confirmDelete = useCallback(() => {
    if (entryToDelete) {
      const result = engine.deleteTransaction(entryToDelete);
      if (result.success) refreshState();
      else alert(result.error);
    }
    setShowDeleteConfirm(false);
    setEntryToDelete(null);
  }, [engine, entryToDelete, refreshState]);

  const handlePerformARE = useCallback(() => {
    const revenues = accounts.filter(a => a.type === AccountType.REVENUE && a.balance !== 0);
    const expenses = accounts.filter(a => a.type === AccountType.EXPENSE && a.balance !== 0);
    
    if (revenues.length === 0 && expenses.length === 0) {
      return alert("Não existem saldos em contas de resultado para encerrar.");
    }

    const totalRev = revenues.reduce((s, a) => s + a.balance, 0);
    const totalExp = expenses.reduce((s, a) => s + a.balance, 0);
    const netResult = totalRev - totalExp;

    const lines: TransactionLine[] = [];

    revenues.forEach(r => {
      lines.push({ accountId: r.id, type: 'DEBIT', amount: r.balance });
    });

    expenses.forEach(e => {
      lines.push({ accountId: e.id, type: 'CREDIT', amount: e.balance });
    });

    if (netResult > 0) {
      lines.push({ accountId: 'acc-10', type: 'CREDIT', amount: netResult });
    } else if (netResult < 0) {
      lines.push({ accountId: 'acc-10', type: 'DEBIT', amount: Math.abs(netResult) });
    }

    const result = engine.postTransaction({
      date: new Date().toISOString(),
      description: `Encerramento Automático do Exercício (A.R.E.)`,
      lines,
      idempotencyKey: `are-${Date.now()}`,
      isClosing: true
    });

    if (result.success) {
      refreshState();
      alert("Encerramento realizado com sucesso!");
    } else {
      alert("Erro ao realizar ARE: " + result.error);
    }
  }, [accounts, engine, refreshState]);

  const handleReopenExercise = useCallback(() => {
    const closingEntry = [...ledger].reverse().find(e => e.isClosing);
    if (!closingEntry) {
      return alert("Não foi encontrado nenhum lançamento de encerramento para estornar.");
    }

    if (window.confirm("Deseja realmente reabrir o exercício? O lançamento de encerramento será estornado e os saldos restaurados.")) {
      const result = engine.deleteTransaction(closingEntry.id);
      if (result.success) {
        refreshState();
        alert("Exercício reaberto com sucesso!");
      } else {
        alert("Erro ao reabrir exercício: " + result.error);
      }
    }
  }, [ledger, engine, refreshState]);

  const generateInsights = async () => {
    setLoadingAI(true);
    setActiveView('ia');
    const text = await getAIInsights(accounts, ledger);
    setAiInsight(text || "Sem insights no momento.");
    setLoadingAI(false);
  };

  const getIconForEntry = (entry: ExtendedJournalEntry) => {
    if (entry.isClosing) return '🏁';
    for (const line of entry.lines) {
      const account = accounts.find(a => a.id === line.accountId);
      if (account && CATEGORY_ICONS[account.name]) return CATEGORY_ICONS[account.name];
    }
    return '📄';
  };

  const renderContent = () => {
    switch (activeView) {
      case 'diario':
        return (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-in fade-in duration-300">
            <div className="xl:col-span-8 space-y-8">
              <FinancialCharts accounts={accounts} />
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><History size={18} /> Livro Diário</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Data</th>
                        <th className="px-6 py-4">Histórico / Lançamento</th>
                        <th className="px-6 py-4 text-right">Débitos</th>
                        <th className="px-6 py-4 text-right">Créditos</th>
                        <th className="px-6 py-4 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ledger.length === 0 ? (
                        <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic text-sm">Nenhum lançamento registrado.</td></tr>
                      ) : (
                        [...ledger].reverse().map(entry => (
                          <tr key={entry.id} className={`hover:bg-slate-50 transition-colors ${entry.isClosing ? 'bg-indigo-50/20' : ''}`}>
                            <td className="px-6 py-4 text-xs text-slate-400 font-mono">{new Date(entry.date).toLocaleDateString('pt-BR')}</td>
                            <td className="px-6 py-4 text-sm">
                              <div className="flex items-center gap-3">
                                <span className="text-lg w-10 h-10 flex items-center justify-center bg-white shadow-sm border border-slate-100 rounded-xl">{getIconForEntry(entry)}</span>
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-800">{entry.description}</span>
                                  {entry.isClosing && <span className="text-[9px] text-indigo-500 font-black uppercase tracking-widest mt-0.5">Operação de Encerramento</span>}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              {entry.lines.filter(l => l.type === 'DEBIT').map(l => (
                                <div key={l.accountId} className="text-emerald-600 font-mono text-xs font-bold">R$ {l.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                              ))}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {entry.lines.filter(l => l.type === 'CREDIT').map(l => (
                                <div key={l.accountId} className="text-slate-400 font-mono text-xs">R$ {l.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                              ))}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex justify-center gap-1">
                                {!entry.isClosing && (
                                  <button onClick={() => { setEditingEntry(entry); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-2 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Pencil size={14} /></button>
                                )}
                                <button onClick={() => { setEntryToDelete(entry.id); setShowDeleteConfirm(true); }} className="p-2 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="xl:col-span-4 space-y-8">
              <TransactionForm accounts={accounts} editingEntry={editingEntry} onAdd={handleAddTransaction} onUpdate={handleUpdateTransaction} onCancel={() => setEditingEntry(null)} />
              <AccountBalanceSummary accounts={accounts} />
            </div>
          </div>
        );
      case 'razao': return <ViewRazao accounts={accounts} ledger={ledger} />;
      case 'balancete': return <ViewBalancete accounts={accounts} ledger={ledger} />;
      case 'are': return <ViewARE accounts={accounts} ledger={ledger} onClosing={handlePerformARE} onReopen={handleReopenExercise} />;
      case 'dre': return <ViewDRE accounts={accounts} stats={stats} />;
      case 'balanco': return <ViewBalanco accounts={accounts} stats={stats} />;
      case 'ia': return <ViewIA insight={aiInsight} loading={loadingAI} onGenerate={generateInsights} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-32 relative text-slate-900">
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center animate-in zoom-in-95">
            <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="text-red-600" size={32} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tighter uppercase">Confirmar Exclusão?</h3>
            <p className="text-slate-500 mb-8 text-sm leading-relaxed">Deseja realmente excluir este lançamento? Esta ação reverterá permanentemente os saldos das contas no Livro Razão.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-3 border-2 border-slate-100 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all">Cancelar</button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-3 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-100">Excluir</button>
            </div>
          </div>
        </div>
      )}

      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-sm px-4">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-2 rounded-xl text-white shadow-xl rotate-3 group-hover:rotate-0 transition-transform"><ArrowRightLeft size={20} /></div>
            <h1 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Elite <span className="text-indigo-600">Ledger</span></h1>
          </div>
          <div className="flex items-center gap-2">
             <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">
                <CheckCircle2 size={12} /> Equilibrado
             </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 mt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Ativo Total" value={stats.totalAssets} icon={<Wallet className="text-emerald-500" />} color="emerald" />
          <StatCard title="Passivo" value={stats.totalLiabilities} icon={<TrendingDown className="text-red-500" />} color="red" />
          <StatCard title="Receitas" value={stats.totalIncome} icon={<TrendingUp className="text-indigo-500" />} color="indigo" />
          <StatCard title="Despesas" value={stats.totalExpenses} icon={<TrendingDown className="text-amber-500" />} color="amber" />
        </div>

        {renderContent()}
      </main>

      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-2xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 z-40 px-3 py-3 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
        <div className="flex items-center justify-between gap-1">
          <NavItem active={activeView === 'diario'} onClick={() => setActiveView('diario')} icon={<BookOpen size={18} />} label="Diário" />
          <NavItem active={activeView === 'razao'} onClick={() => setActiveView('razao')} icon={<ClipboardList size={18} />} label="Razão" />
          <NavItem active={activeView === 'balancete'} onClick={() => setActiveView('balancete')} icon={<Scale size={18} />} label="Verif." />
          <NavItem active={activeView === 'are'} onClick={() => setActiveView('are')} icon={<Calculator size={18} />} label="ARE" />
          <NavItem active={activeView === 'dre'} onClick={() => setActiveView('dre')} icon={<TrendingUp size={18} />} label="DRE" />
          <NavItem active={activeView === 'balanco'} onClick={() => setActiveView('balanco')} icon={<PieChart size={18} />} label="Balanço" />
          <NavItem active={activeView === 'ia'} onClick={generateInsights} icon={<Sparkles size={18} />} label="IA" highlight />
        </div>
      </footer>
    </div>
  );
};

// --- Sub-Visões ---

const ViewRazao: React.FC<{ accounts: Account[]; ledger: ExtendedJournalEntry[] }> = ({ accounts, ledger }) => (
  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 animate-in slide-in-from-bottom-4">
    <h3 className="text-xl font-black mb-8 flex items-center gap-2 text-slate-800 uppercase tracking-tighter">Livro Razão Analítico</h3>
    <div className="space-y-6">
      {accounts.map(acc => {
        const accEntries = ledger.filter(e => e.lines.some(l => l.accountId === acc.id));
        if (accEntries.length === 0) return null;
        return (
          <div key={acc.id} className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-slate-50 px-5 py-4 font-black text-slate-700 flex justify-between items-center text-xs uppercase tracking-widest border-b border-slate-100">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-lg shadow-indigo-100"></span>
                {acc.name}
              </span>
              <span className={`font-mono px-3 py-1 rounded-full ${acc.balance >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                R$ {acc.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-white text-slate-400 uppercase tracking-widest">
                <tr>
                  <th className="px-5 py-3 text-left">Data</th>
                  <th className="px-5 py-3 text-left">Histórico</th>
                  <th className="px-5 py-3 text-right">Débito</th>
                  <th className="px-5 py-3 text-right">Crédito</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {accEntries.map(e => {
                  const line = e.lines.find(l => l.accountId === acc.id)!;
                  return (
                    <tr key={e.id} className={`${e.isClosing ? 'bg-indigo-50/20 italic' : ''} hover:bg-slate-50/50 transition-colors`}>
                      <td className="px-5 py-3 text-slate-400 font-mono">{new Date(e.date).toLocaleDateString('pt-BR')}</td>
                      <td className="px-5 py-3 text-slate-800 font-bold">{e.description}</td>
                      <td className="px-5 py-3 text-right font-mono text-emerald-600 font-semibold">{line.type === 'DEBIT' ? `R$ ${line.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</td>
                      <td className="px-5 py-3 text-right font-mono text-slate-400">{line.type === 'CREDIT' ? `R$ ${line.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  </div>
);

const ViewBalancete: React.FC<{ accounts: Account[]; ledger: ExtendedJournalEntry[] }> = ({ accounts, ledger }) => {
  const movements = accounts.map(acc => {
    let debits = 0;
    let credits = 0;
    ledger.forEach(entry => {
      entry.lines.filter(l => l.accountId === acc.id).forEach(l => {
        if (l.type === 'DEBIT') debits += l.amount;
        else credits += l.amount;
      });
    });
    return { ...acc, debits, credits };
  });

  const totalD = movements.reduce((s, a) => s + a.debits, 0);
  const totalC = movements.reduce((s, a) => s + a.credits, 0);

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 animate-in zoom-in-95">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h3 className="text-xl font-black flex items-center gap-2 text-slate-800 uppercase tracking-tighter"><Scale /> Balancete de 4 Colunas</h3>
        {Math.abs(totalD - totalC) < 0.01 && totalD > 0 && (
            <div className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase border border-emerald-100">Integridade de Partidas OK</div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
            <thead>
            <tr className="text-slate-400 text-[10px] uppercase border-b border-slate-100 tracking-widest">
                <th className="text-left py-4">Título da Conta</th>
                <th className="text-right py-4">Débitos Totais</th>
                <th className="text-right py-4">Créditos Totais</th>
                <th className="text-right py-4">Saldo Atual</th>
            </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
            {movements.map(acc => (
                <tr key={acc.id} className="text-xs group hover:bg-slate-50/50 transition-colors">
                <td className="py-4 text-slate-800 font-bold group-hover:translate-x-1 transition-transform">{acc.name}</td>
                <td className="py-4 text-right text-slate-400 font-mono">R$ {acc.debits.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="py-4 text-right text-slate-400 font-mono">R$ {acc.credits.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className={`py-4 text-right font-mono font-black ${acc.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    R$ {acc.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                </tr>
            ))}
            <tr className="bg-slate-900 text-white font-black uppercase text-xs">
                <td className="py-6 px-4 rounded-l-2xl tracking-widest">Somas de Controle</td>
                <td className="py-6 text-right pr-2 font-mono">R$ {totalD.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="py-6 text-right pr-2 font-mono">R$ {totalC.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="py-6 text-right pr-4 font-mono rounded-r-2xl italic opacity-50 tracking-tighter">EQUILIBRADO</td>
            </tr>
            </tbody>
        </table>
      </div>
    </div>
  );
};

const ViewARE: React.FC<{ accounts: Account[]; ledger: ExtendedJournalEntry[]; onClosing: () => void; onReopen: () => void }> = ({ accounts, ledger, onClosing, onReopen }) => {
  const revenues = accounts.filter(a => a.type === AccountType.REVENUE);
  const expenses = accounts.filter(a => a.type === AccountType.EXPENSE);
  const totalRev = revenues.reduce((s, a) => s + a.balance, 0);
  const totalExp = expenses.reduce((s, a) => s + a.balance, 0);
  const result = totalRev - totalExp;

  const hasClosingEntry = ledger.some(e => e.isClosing);
  const isCurrentlyBalanced = totalRev === 0 && totalExp === 0;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 animate-in slide-in-from-right-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
        <div className="flex flex-col">
          <h3 className="text-xl font-black flex items-center gap-2 text-slate-800 uppercase tracking-tighter"><Calculator /> Apuração do Resultado</h3>
          <p className="text-xs text-slate-400 font-bold mt-1">Confronto de Receitas e Despesas</p>
        </div>
        <div className="flex gap-2">
          {hasClosingEntry && (
            <button 
              onClick={onReopen}
              className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 border-slate-100 shadow-sm"
            >
              <LockOpen size={14} /> Reabrir Exercício
            </button>
          )}
          {!isCurrentlyBalanced && (
            <button 
              onClick={onClosing}
              className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-slate-200"
            >
              <RefreshCw size={14} /> Encerrar Exercício
            </button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-emerald-50/40 p-6 rounded-3xl border border-emerald-100/50">
          <div className="flex justify-between items-center mb-6">
             <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Receitas Líquidas (+)</h4>
             <TrendingUp size={16} className="text-emerald-500" />
          </div>
          <div className="space-y-3">
            {revenues.map(r => (
              <div key={r.id} className="flex justify-between text-xs py-2 border-b border-emerald-100/20 last:border-0">
                <span className="text-slate-600 font-bold">{r.name}</span>
                <span className="font-mono text-emerald-600 font-black">R$ {r.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t-2 border-emerald-100 flex justify-between font-black text-emerald-700 text-sm">
             <span className="italic uppercase">TOTAL RECEITAS</span>
             <span className="font-mono">R$ {totalRev.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
        <div className="bg-red-50/40 p-6 rounded-3xl border border-red-100/50">
          <div className="flex justify-between items-center mb-6">
             <h4 className="text-[10px] font-black text-red-800 uppercase tracking-widest">Despesas Totais (-)</h4>
             <TrendingDown size={16} className="text-red-500" />
          </div>
          <div className="space-y-3">
            {expenses.map(e => (
              <div key={e.id} className="flex justify-between text-xs py-2 border-b border-red-100/20 last:border-0">
                <span className="text-slate-600 font-bold">{e.name}</span>
                <span className="font-mono text-red-500 font-black">R$ {e.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t-2 border-red-100 flex justify-between font-black text-red-700 text-sm">
             <span className="italic uppercase">TOTAL DESPESAS</span>
             <span className="font-mono">R$ {totalExp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      <div className={`mt-10 p-10 rounded-3xl flex flex-col sm:flex-row justify-between items-center shadow-2xl transition-all duration-700 ${result >= 0 ? 'bg-indigo-600 shadow-indigo-200' : 'bg-red-600 shadow-red-200'} text-white relative overflow-hidden`}>
        <div className="absolute -right-10 -bottom-10 opacity-10 rotate-12"><Calculator size={200} /></div>
        <div className="z-10 text-center sm:text-left mb-6 sm:mb-0">
           <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-3">Saldo Líquido Final</p>
           <h4 className="font-black text-2xl uppercase italic tracking-tighter">Lucro / Prejuízo Acumulado</h4>
           {hasClosingEntry && isCurrentlyBalanced && (
             <p className="text-[10px] bg-white/10 px-3 py-1 rounded-full inline-block mt-3 font-bold uppercase tracking-widest">Status: Integrado ao PL</p>
           )}
        </div>
        <div className="z-10 text-center sm:text-right">
          <span className="text-5xl sm:text-6xl font-mono font-black tracking-tighter drop-shadow-lg">
            R$ {result.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
};

const ViewDRE: React.FC<{ accounts: Account[]; stats: any }> = ({ accounts, stats }) => {
  const currentResult = stats.totalIncome - stats.totalExpenses;
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-12 max-w-2xl mx-auto animate-in slide-in-from-top-4 text-slate-800">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-black uppercase tracking-tighter">Demonstrativo de Resultado</h2>
        <div className="h-1 w-20 bg-indigo-600 mx-auto mt-4 rounded-full"></div>
      </div>
      <div className="space-y-6">
        <div className="flex justify-between font-black border-b-2 border-slate-900 pb-4 uppercase text-sm tracking-widest">
          <span>RECEITA OPERACIONAL BRUTA</span>
          <span className="font-mono">R$ {stats.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between font-bold border-b border-slate-100 mt-10 pb-2 uppercase text-xs tracking-widest text-red-600">
          <span>(-) CUSTOS E DESPESAS OPERACIONAIS</span>
          <span className="font-mono">(R$ {stats.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</span>
        </div>
        <div className={`mt-16 p-10 rounded-[2.5rem] flex justify-between items-center font-black text-3xl shadow-2xl transition-all duration-1000 ${currentResult >= 0 ? 'bg-indigo-50 text-indigo-700 shadow-indigo-100/50' : 'bg-red-50 text-red-700 shadow-red-100/50'}`}>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.4em] opacity-50 mb-2">Resultado Final</span>
            <span className="uppercase italic tracking-tighter">Líquido</span>
          </div>
          <span className="font-mono tracking-tighter">R$ {currentResult.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    </div>
  );
};

const ViewBalanco: React.FC<{ accounts: Account[]; stats: any }> = ({ accounts, stats }) => {
  const resultadoExercicio = stats.totalIncome - stats.totalExpenses;
  const totalPLReal = accounts.filter(a => a.type === AccountType.EQUITY).reduce((s,a) => s + a.balance, 0) + (resultadoExercicio !== 0 ? resultadoExercicio : 0);
  const totalPassivoEPL = stats.totalLiabilities + totalPLReal;
  const diferenca = Math.abs(stats.totalAssets - totalPassivoEPL);

  return (
    <div className="space-y-6">
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 p-10 animate-in zoom-in-95 duration-500">
            <h3 className="text-2xl font-black mb-12 text-center uppercase tracking-[0.4em] text-slate-900 border-b border-slate-100 pb-8 italic">Balanço Patrimonial</h3>
            <div className="grid md:grid-cols-2 gap-10">
            <div className="space-y-8">
                <h4 className="font-black text-emerald-600 border-b-2 border-emerald-50 pb-3 flex justify-between items-center text-[10px] uppercase tracking-[0.2em]">
                    <span>ATIVO (Aplicações)</span>
                    <Wallet size={16} />
                </h4>
                <div className="space-y-3">
                  {accounts.filter(a => a.type === AccountType.ASSET).map(a => (
                    <div key={a.id} className="flex justify-between text-xs py-2 px-1 hover:bg-slate-50 transition-all rounded-lg">
                        <span className="text-slate-500 font-bold">{a.name}</span>
                        <span className="font-mono font-black text-slate-800">R$ {a.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-10 pt-6 border-t-4 border-slate-900 flex justify-between font-black text-slate-900 text-xl tracking-tighter italic">
                    <span>TOTAL ATIVO</span>
                    <span className="font-mono">R$ {stats.totalAssets.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
            </div>
            <div className="space-y-8">
                <h4 className="font-black text-red-600 border-b-2 border-red-50 pb-3 flex justify-between items-center text-[10px] uppercase tracking-[0.2em]">
                    <span>PASSIVO + PL (Origens)</span>
                    <Scale size={16} />
                </h4>
                <div className="space-y-6">
                  <div>
                    <p className="text-[9px] font-black text-slate-300 uppercase mb-4 tracking-[0.2em]">Obrigações Exigíveis</p>
                    {accounts.filter(a => a.type === AccountType.LIABILITY).map(a => (
                        <div key={a.id} className="flex justify-between text-xs py-2 px-1 hover:bg-slate-50 transition-all rounded-lg">
                        <span className="text-slate-500 font-bold">{a.name}</span>
                        <span className="font-mono font-black text-slate-800">R$ {Math.abs(a.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-300 uppercase mb-4 tracking-[0.2em]">Patrimônio do Titular</p>
                    {accounts.filter(a => a.type === AccountType.EQUITY).map(a => (
                        <div key={a.id} className="flex justify-between text-xs py-2 px-1 hover:bg-slate-50 transition-all rounded-lg italic">
                        <span className="text-slate-500 font-bold">{a.name}</span>
                        <span className="font-mono font-black text-slate-800">R$ {a.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                    ))}
                    {resultadoExercicio !== 0 && (
                      <div className="flex justify-between text-xs py-3 px-3 bg-indigo-600 text-white rounded-2xl font-black mt-4 shadow-lg shadow-indigo-100 border border-indigo-400">
                          <span className="flex items-center gap-2 uppercase tracking-tighter">Resultado Líquido <RefreshCw size={10} className="animate-spin-slow"/></span>
                          <span className="font-mono">R$ {resultadoExercicio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-10 pt-6 border-t-4 border-slate-900 flex justify-between font-black text-slate-900 text-xl tracking-tighter italic">
                    <span>PASSIVO + PL</span>
                    <span className="font-mono">R$ {totalPassivoEPL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
            </div>
            </div>
        </div>

        {diferenca > 0.01 && (
            <div className="bg-red-600 text-white p-8 rounded-3xl flex items-center gap-6 animate-pulse shadow-2xl shadow-red-200">
                <AlertTriangle size={32} />
                <div className="flex-1">
                    <h4 className="font-black text-lg uppercase tracking-widest italic">Diferença no Balanço Detectada!</h4>
                    <p className="text-sm font-bold opacity-80 mt-1">O Ativo deve ser rigorosamente igual ao Passivo + PL. Diferença atual: R$ {diferenca.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.</p>
                </div>
            </div>
        )}

        {diferenca <= 0.01 && stats.totalAssets > 0 && (
            <div className="bg-slate-900 text-white p-6 rounded-3xl flex items-center justify-center gap-4 font-black uppercase tracking-[0.3em] text-xs shadow-2xl shadow-slate-300 border border-slate-800">
                <CheckCircle2 size={20} className="text-emerald-400" />
                Equação Fundamental Equilibrada
            </div>
        )}
    </div>
  );
};

const NavItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; highlight?: boolean }> = ({ active, onClick, icon, label, highlight }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-2xl transition-all duration-500 ${
      active 
        ? 'text-white bg-indigo-600 shadow-lg scale-110 -translate-y-1' 
        : highlight ? 'text-indigo-400 hover:text-white' : 'text-slate-500 hover:text-slate-300'
    }`}
  >
    <div className="mb-1 transition-transform">{icon}</div>
    <span className={`text-[8px] font-black uppercase tracking-widest ${active ? 'opacity-100' : 'opacity-40'}`}>{label}</span>
  </button>
);

const ViewIA: React.FC<{ insight: string | null; loading: boolean; onGenerate: () => void }> = ({ insight, loading, onGenerate }) => (
  <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-100/30 border border-slate-200 p-16 text-center animate-in fade-in duration-700 max-w-3xl mx-auto">
    <div className="max-w-xl mx-auto">
      <div className="bg-gradient-to-tr from-indigo-600 to-violet-700 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-indigo-200 rotate-12">
        <Sparkles className="text-white" size={48} />
      </div>
      <h3 className="text-3xl font-black text-slate-900 mb-6 italic tracking-tighter">Relatórios IA Elite</h3>
      <p className="text-slate-500 mb-12 leading-relaxed font-bold uppercase text-[10px] tracking-[0.2em]">Análise profunda de tendências contábeis e liquidez patrimonial.</p>
      
      {loading ? (
        <div className="space-y-6 max-w-md mx-auto">
          <div className="h-3 bg-slate-100 rounded-full animate-pulse w-full"></div>
          <div className="h-3 bg-slate-100 rounded-full animate-pulse w-4/5 mx-auto"></div>
          <div className="h-3 bg-slate-100 rounded-full animate-pulse w-2/3 mx-auto"></div>
        </div>
      ) : insight ? (
        <div className="text-left bg-slate-900 text-slate-300 p-10 rounded-[2rem] border border-slate-800 shadow-2xl whitespace-pre-line leading-relaxed text-sm italic font-medium">
          <div className="mb-6 text-indigo-400 font-black uppercase text-[10px] tracking-[0.4em] flex items-center gap-2">
            <Info size={14}/> Parecer Técnico Gerado
          </div>
          {insight}
        </div>
      ) : (
        <button 
          onClick={onGenerate} 
          className="bg-slate-900 text-white px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-black transition-all shadow-2xl active:scale-95 border-b-4 border-indigo-600"
        >
          Gerar Insights Estratégicos
        </button>
      )}
    </div>
  </div>
);

const AccountBalanceSummary: React.FC<{ accounts: Account[] }> = ({ accounts }) => (
  <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
    <h3 className="text-[10px] font-black mb-6 text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2"><LayoutDashboard size={14} /> Panorama Contábil</h3>
    <div className="space-y-1">
      {accounts.map(acc => (
        <div key={acc.id} className="flex justify-between items-center py-2.5 px-3 rounded-xl hover:bg-slate-50 transition-all cursor-default">
          <span className="text-[11px] text-slate-600 font-bold uppercase tracking-tighter">{acc.name}</span>
          <span className={`text-xs font-black font-mono ${acc.balance > 0 ? 'text-emerald-600' : acc.balance < 0 ? 'text-red-500' : 'text-slate-300'}`}>
            R$ {acc.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      ))}
    </div>
  </div>
);

const StatCard: React.FC<{ title: string; value: number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 group hover:shadow-2xl transition-all duration-500 border-b-4 hover:border-indigo-500 overflow-hidden relative">
    <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">{icon}</div>
    <div className="flex justify-between items-center mb-5 relative z-10">
      <span className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em]">{title}</span>
      <div className={`p-2.5 rounded-xl bg-slate-50 group-hover:bg-indigo-50 transition-colors`}>{icon}</div>
    </div>
    <p className="text-2xl font-mono font-black text-slate-900 tracking-tighter relative z-10">
      R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
    </p>
  </div>
);

export default App;
