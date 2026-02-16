
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Scale, AlertCircle, CheckCircle2, Bookmark } from 'lucide-react';
import { Account, TransactionLine, JournalEntry } from '../types';

interface ExtendedJournalEntry extends JournalEntry {
  isClosing?: boolean;
}

interface TransactionFormProps {
  accounts: Account[];
  editingEntry?: ExtendedJournalEntry | null;
  onAdd: (description: string, lines: TransactionLine[], isClosing: boolean) => void;
  onUpdate: (id: string, description: string, lines: TransactionLine[], isClosing: boolean) => void;
  onCancel: () => void;
}

const TEMPLATES = [
  { 
    name: 'Venda a Vista', 
    desc: 'Venda de mercadoria com recebimento imediato',
    lines: (accs: Account[]) => [
      { accountId: 'acc-1', type: 'DEBIT' as const, amount: 0 },
      { accountId: 'acc-6', type: 'CREDIT' as const, amount: 0 }
    ]
  },
  { 
    name: 'Pagto Fornecedor', 
    desc: 'Pagamento de dívida com fornecedores',
    lines: (accs: Account[]) => [
      { accountId: 'acc-4', type: 'DEBIT' as const, amount: 0 },
      { accountId: 'acc-1', type: 'CREDIT' as const, amount: 0 }
    ]
  },
  { 
    name: 'Despesa Geral', 
    desc: 'Pagamento de despesa operacional',
    lines: (accs: Account[]) => [
      { accountId: 'acc-7', type: 'DEBIT' as const, amount: 0 },
      { accountId: 'acc-1', type: 'CREDIT' as const, amount: 0 }
    ]
  }
];

const TransactionForm: React.FC<TransactionFormProps> = ({ 
  accounts, 
  editingEntry, 
  onAdd, 
  onUpdate, 
  onCancel 
}) => {
  const [description, setDescription] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [lines, setLines] = useState<TransactionLine[]>([
    { accountId: accounts[0]?.id || '', type: 'DEBIT', amount: 0 },
    { accountId: accounts[2]?.id || '', type: 'CREDIT', amount: 0 }
  ]);

  useEffect(() => {
    if (editingEntry) {
      setDescription(editingEntry.description);
      setLines(editingEntry.lines.map(l => ({ ...l })));
      setIsClosing(!!editingEntry.isClosing);
    } else {
      resetForm();
    }
  }, [editingEntry, accounts]);

  const resetForm = () => {
    setDescription('');
    setIsClosing(false);
    setLines([
      { accountId: accounts[0]?.id || '', type: 'DEBIT', amount: 0 },
      { accountId: accounts[2]?.id || '', type: 'CREDIT', amount: 0 }
    ]);
  };

  const applyTemplate = (template: typeof TEMPLATES[0]) => {
    setDescription(template.name);
    setLines(template.lines(accounts));
  };

  const addLine = (type: 'DEBIT' | 'CREDIT') => {
    setLines([...lines, { accountId: accounts[0]?.id || '', type, amount: 0 }]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) return;
    const newLines = [...lines];
    newLines.splice(index, 1);
    setLines(newLines);
  };

  const updateLine = (index: number, field: keyof TransactionLine, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const totalDebits = lines.filter(l => l.type === 'DEBIT').reduce((sum, l) => sum + (l.amount || 0), 0);
  const totalCredits = lines.filter(l => l.type === 'CREDIT').reduce((sum, l) => sum + (l.amount || 0), 0);
  const difference = Math.abs(totalDebits - totalCredits);
  const isBalanced = difference < 0.001 && totalDebits > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) return;
    if (description.trim() === '') return alert("Informe uma descrição para o lançamento.");

    if (editingEntry) {
      onUpdate(editingEntry.id, description, lines, isClosing);
    } else {
      onAdd(description, lines, isClosing);
    }
    resetForm();
  };

  return (
    <form onSubmit={handleSubmit} className={`bg-white p-6 rounded-2xl shadow-xl border-t-4 transition-all duration-300 ${editingEntry ? 'border-amber-500 ring-4 ring-amber-50' : 'border-indigo-600 shadow-slate-200/50'}`}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-black text-slate-800 tracking-tight">
          {editingEntry ? 'Editar Lançamento' : 'Novo Lançamento'}
        </h3>
        {editingEntry && (
          <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest">Modo Edição</span>
        )}
      </div>

      <div className="mb-6">
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Modelos Rápidos</label>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map(t => (
            <button
              key={t.name}
              type="button"
              onClick={() => applyTemplate(t)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all flex items-center gap-1.5"
            >
              <Bookmark size={12} />
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-[3]">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Descrição do Fato Contábil</label>
            <input 
              type="text" 
              required 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-medium text-slate-700"
              placeholder="Ex: Pagamento de Duplicatas"
            />
          </div>
          <div className="flex-1 flex flex-col justify-end">
            <label className="flex items-center gap-2 cursor-pointer group mb-2">
              <input 
                type="checkbox" 
                checked={isClosing} 
                onChange={(e) => setIsClosing(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">A.R.E. (Encerramento)</span>
            </label>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Partidas (Linhas de Lançamento)</label>
          
          <div className="space-y-2">
            {lines.map((line, index) => (
              <div key={index} className={`flex flex-col sm:flex-row gap-2 p-3 rounded-xl border transition-all ${line.type === 'DEBIT' ? 'bg-emerald-50/30 border-emerald-100' : 'bg-slate-50/50 border-slate-100'}`}>
                <div className="flex-[2]">
                  <select 
                    value={line.accountId}
                    onChange={(e) => updateLine(index, 'accountId', e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex-1">
                  <select 
                    value={line.type}
                    onChange={(e) => updateLine(index, 'type', e.target.value)}
                    className={`w-full h-10 px-3 border rounded-lg text-[10px] font-black uppercase outline-none focus:ring-2 transition-colors ${line.type === 'DEBIT' ? 'border-emerald-200 text-emerald-600 focus:ring-emerald-500' : 'border-slate-300 text-slate-500 focus:ring-slate-500'}`}
                  >
                    <option value="DEBIT">DÉBITO</option>
                    <option value="CREDIT">CRÉDITO</option>
                  </select>
                </div>

                <div className="flex-1">
                  <div className="relative h-10">
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      value={line.amount === 0 ? '' : line.amount}
                      onChange={(e) => updateLine(index, 'amount', parseFloat(e.target.value) || 0)}
                      className="w-full h-full px-3 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-right"
                      placeholder="0,00"
                    />
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={() => removeLine(index)}
                  className="h-10 w-10 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button 
              type="button" 
              onClick={() => addLine('DEBIT')}
              className="flex-1 flex items-center justify-center gap-2 py-2 border-2 border-dashed border-emerald-200 text-emerald-600 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-50 transition-all"
            >
              <Plus size={14} /> DÉBITO
            </button>
            <button 
              type="button" 
              onClick={() => addLine('CREDIT')}
              className="flex-1 flex items-center justify-center gap-2 py-2 border-2 border-dashed border-slate-200 text-slate-500 rounded-xl text-[10px] font-black uppercase hover:bg-slate-50 transition-all"
            >
              <Plus size={14} /> CRÉDITO
            </button>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border-2 transition-all ${isBalanced ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg' : 'bg-slate-900 text-slate-400 border-slate-800'}`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Scale size={16} className={isBalanced ? 'animate-bounce' : ''} />
              <span className="text-[10px] font-black uppercase tracking-widest">Diferença Patrimonial</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`font-mono font-black text-lg ${isBalanced ? 'text-white' : 'text-red-400'}`}>
                R$ {difference.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              {isBalanced ? <CheckCircle2 size={18} /> : <AlertCircle size={18} className="text-red-400 animate-pulse" />}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-8">
        <button 
          type="submit" 
          disabled={!isBalanced}
          className={`flex-[2] py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${editingEntry ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-slate-900 text-white hover:bg-black'}`}
        >
          {editingEntry ? 'Atualizar Lançamento' : 'Efetivar Lançamento'}
        </button>
        {editingEntry && (
          <button 
            type="button"
            onClick={onCancel}
            className="flex-1 py-4 border-2 border-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
          >
            Descartar
          </button>
        )}
      </div>
    </form>
  );
};

export default TransactionForm;
