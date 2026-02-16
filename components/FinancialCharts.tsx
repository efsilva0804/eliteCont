
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Account, AccountType } from '../types';

interface ChartsProps {
  accounts: Account[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const FinancialCharts: React.FC<ChartsProps> = ({ accounts }) => {
  const assetData = accounts
    .filter(a => a.type === AccountType.ASSET && a.balance > 0)
    .map(a => ({ name: a.name, value: a.balance }));

  const expenseData = accounts
    .filter(a => a.type === AccountType.EXPENSE && a.balance > 0)
    .map(a => ({ name: a.name, value: a.balance }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold mb-4 text-slate-800">Distribuição de Ativos</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={assetData}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {assetData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold mb-4 text-slate-800">Maiores Despesas</h3>
        <div className="h-64">
          {expenseData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expenseData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              Nenhuma despesa registrada ainda.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancialCharts;
