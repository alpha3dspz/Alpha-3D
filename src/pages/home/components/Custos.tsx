import { useState, useCallback } from 'react';
import type { Custo, TipoCusto } from '@/mocks/custos';
import type { Pedido } from '@/mocks/pedidos';

interface CustosProps {
  custos: Custo[];
  pedidos: Pedido[];
  onChange: (custos: Custo[]) => void;
}

const TIPOS: TipoCusto[] = ['Filamento', 'Impressora', 'Manutenção', 'Ferramenta', 'Outros'];

const TIPO_COLORS: Record<TipoCusto, { bg: string; text: string; icon: string }> = {
  'Filamento': { bg: 'bg-[#c026d3]/20', text: 'text-[#e879f9]', icon: 'ri-stack-line' },
  'Impressora': { bg: 'bg-[#0891b2]/20', text: 'text-[#22d3ee]', icon: 'ri-printer-line' },
  'Manutenção': { bg: 'bg-[#d97706]/20', text: 'text-[#fbbf24]', icon: 'ri-tools-line' },
  'Ferramenta': { bg: 'bg-[#059669]/20', text: 'text-[#34d399]', icon: 'ri-scissors-line' },
  'Outros': { bg: 'bg-[#374151]/40', text: 'text-[#9ca3af]', icon: 'ri-more-line' },
};

function generateId(custos: Custo[]): string {
  const max = custos.reduce((m, c) => {
    const n = parseInt(c.id.replace('CST-', ''), 10);
    return n > m ? n : m;
  }, 0);
  return `CST-${String(max + 1).padStart(3, '0')}`;
}

export default function Custos({ custos, pedidos, onChange }: CustosProps) {
  const [filterTipo, setFilterTipo] = useState<TipoCusto | 'Todos'>('Todos');
  const [editingCell, setEditingCell] = useState<{ id: string; field: keyof Custo } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [newCusto, setNewCusto] = useState<Omit<Custo, 'id'>>({
    tipo: 'Filamento',
    descricao: '',
    valor: 0,
    data: new Date().toISOString().split('T')[0],
  });

  const totalGastos = custos.reduce((s, c) => s + c.valor, 0);
  const totalVendas = pedidos.reduce((s, p) => s + p.valorVenda, 0);
  const totalCustoPedidos = pedidos.reduce((s, p) => s + p.custo, 0);
  const totalCustoGeral = totalGastos + totalCustoPedidos;
  const roi = totalCustoGeral > 0 ? ((totalVendas - totalCustoGeral) / totalCustoGeral * 100).toFixed(1) : '0';

  const filtered = custos.filter(c => filterTipo === 'Todos' || c.tipo === filterTipo);

  const startEdit = (id: string, field: keyof Custo, value: string) => {
    setEditingCell({ id, field });
    setEditValue(value);
  };

  const commitEdit = useCallback(() => {
    if (!editingCell) return;
    onChange(custos.map(c => {
      if (c.id !== editingCell.id) return c;
      const next = { ...c };
      if (editingCell.field === 'valor') {
        next.valor = parseFloat(editValue) || 0;
      } else {
        (next as Record<string, unknown>)[editingCell.field] = editValue;
      }
      return next;
    }));
    setEditingCell(null);
  }, [editingCell, editValue, custos, onChange]);

  const addCusto = () => {
    if (!newCusto.descricao.trim()) return;
    onChange([...custos, { ...newCusto, id: generateId(custos) }]);
    setNewCusto({ tipo: 'Filamento', descricao: '', valor: 0, data: new Date().toISOString().split('T')[0] });
    setShowForm(false);
  };

  const deleteCusto = (id: string) => onChange(custos.filter(c => c.id !== id));

  const exportCSV = () => {
    const header = 'ID,Tipo,Descrição,Valor,Data';
    const rows = custos.map(c => `${c.id},${c.tipo},"${c.descricao}",${c.valor},${c.data}`);
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'custos-alpha.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const porTipo = TIPOS.map(t => ({
    tipo: t,
    total: custos.filter(c => c.tipo === t).reduce((s, c) => s + c.valor, 0),
    count: custos.filter(c => c.tipo === t).length,
  }));

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Custos e Compras</h1>
          <p className="text-[#6b7280] text-sm mt-1">Controle financeiro de despesas</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 bg-[#1a1a2e] border border-[#2d2d4e] text-[#9ca3af] hover:text-white rounded-lg text-sm transition-colors cursor-pointer whitespace-nowrap">
            <i className="ri-download-2-line"></i> Exportar CSV
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#c026d3] to-[#7c3aed] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap">
            <i className="ri-add-line"></i> Novo Custo
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-xl p-4">
          <p className="text-[#6b7280] text-xs mb-1">Total Gastos</p>
          <p className="text-white text-xl font-bold">R$ {totalGastos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-xl p-4">
          <p className="text-[#6b7280] text-xs mb-1">Total Vendido</p>
          <p className="text-[#34d399] text-xl font-bold">R$ {totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-xl p-4">
          <p className="text-[#6b7280] text-xs mb-1">Saldo</p>
          <p className={`text-xl font-bold ${totalVendas - totalCustoGeral >= 0 ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
            R$ {(totalVendas - totalCustoGeral).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-xl p-4">
          <p className="text-[#6b7280] text-xs mb-1">ROI Geral</p>
          <p className={`text-xl font-bold ${parseFloat(roi) >= 0 ? 'text-[#fbbf24]' : 'text-[#f87171]'}`}>{roi}%</p>
        </div>
      </div>

      {/* Por Tipo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {porTipo.map(t => (
          <div key={t.tipo} className="bg-[#0f0f1a] border border-[#1e1e35] rounded-xl p-4">
            <div className={`w-8 h-8 flex items-center justify-center rounded-lg mb-2 ${TIPO_COLORS[t.tipo].bg}`}>
              <i className={`${TIPO_COLORS[t.tipo].icon} ${TIPO_COLORS[t.tipo].text} text-sm`}></i>
            </div>
            <p className="text-[#9ca3af] text-xs">{t.tipo}</p>
            <p className="text-white font-semibold text-sm">R$ {t.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p className="text-[#4b5563] text-xs">{t.count} itens</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['Todos', ...TIPOS] as const).map(t => (
          <button
            key={t}
            onClick={() => setFilterTipo(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              filterTipo === t
                ? 'bg-gradient-to-r from-[#c026d3] to-[#7c3aed] text-white'
                : 'bg-[#1a1a2e] border border-[#2d2d4e] text-[#9ca3af] hover:text-white'
            }`}
          >{t}</button>
        ))}
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-[#0f0f1a] border border-[#7c3aed]/50 rounded-xl p-5">
          <h3 className="text-white font-semibold text-sm mb-4">Novo Custo</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-[#6b7280] text-xs mb-1 block">Tipo</label>
              <select
                value={newCusto.tipo}
                onChange={e => setNewCusto(n => ({ ...n, tipo: e.target.value as TipoCusto }))}
                className="w-full bg-[#1a1a2e] border border-[#2d2d4e] text-white text-sm px-3 py-2 rounded-lg outline-none focus:border-[#7c3aed] cursor-pointer"
              >
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="lg:col-span-2">
              <label className="text-[#6b7280] text-xs mb-1 block">Descrição</label>
              <input
                type="text"
                value={newCusto.descricao}
                onChange={e => setNewCusto(n => ({ ...n, descricao: e.target.value }))}
                placeholder="Ex: PLA Premium 1kg"
                className="w-full bg-[#1a1a2e] border border-[#2d2d4e] text-white text-sm px-3 py-2 rounded-lg outline-none focus:border-[#7c3aed] placeholder-[#4b5563]"
              />
            </div>
            <div>
              <label className="text-[#6b7280] text-xs mb-1 block">Valor (R$)</label>
              <input
                type="number"
                value={newCusto.valor || ''}
                onChange={e => setNewCusto(n => ({ ...n, valor: parseFloat(e.target.value) || 0 }))}
                placeholder="0,00"
                className="w-full bg-[#1a1a2e] border border-[#2d2d4e] text-white text-sm px-3 py-2 rounded-lg outline-none focus:border-[#7c3aed] placeholder-[#4b5563]"
              />
            </div>
            <div>
              <label className="text-[#6b7280] text-xs mb-1 block">Data</label>
              <input
                type="date"
                value={newCusto.data}
                onChange={e => setNewCusto(n => ({ ...n, data: e.target.value }))}
                className="w-full bg-[#1a1a2e] border border-[#2d2d4e] text-white text-sm px-3 py-2 rounded-lg outline-none focus:border-[#7c3aed]"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={addCusto} className="px-4 py-2 bg-gradient-to-r from-[#c026d3] to-[#7c3aed] text-white rounded-lg text-sm font-medium cursor-pointer whitespace-nowrap hover:opacity-90">Salvar</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-[#1a1a2e] border border-[#2d2d4e] text-[#9ca3af] rounded-lg text-sm cursor-pointer whitespace-nowrap hover:text-white">Cancelar</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e1e35]">
                <th className="text-left px-4 py-3 text-[#6b7280] font-medium text-xs">ID</th>
                <th className="text-left px-4 py-3 text-[#6b7280] font-medium text-xs">Tipo</th>
                <th className="text-left px-4 py-3 text-[#6b7280] font-medium text-xs">Descrição</th>
                <th className="text-left px-4 py-3 text-[#6b7280] font-medium text-xs">Valor</th>
                <th className="text-left px-4 py-3 text-[#6b7280] font-medium text-xs">Data</th>
                <th className="text-right px-4 py-3 text-[#6b7280] font-medium text-xs">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, idx) => (
                <tr key={c.id} className={`border-b border-[#1e1e35] hover:bg-[#1a1a2e] transition-colors ${idx % 2 === 0 ? '' : 'bg-[#0d0d18]'}`}>
                  <td className="px-4 py-3 text-[#6b7280] text-xs font-mono whitespace-nowrap">{c.id}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${TIPO_COLORS[c.tipo].bg} ${TIPO_COLORS[c.tipo].text}`}>
                      <i className={`${TIPO_COLORS[c.tipo].icon} text-xs`}></i>
                      {c.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {editingCell?.id === c.id && editingCell.field === 'descricao' ? (
                      <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={commitEdit} onKeyDown={e => e.key === 'Enter' && commitEdit()} className="bg-[#1e1e35] text-white text-sm px-2 py-1 rounded border border-[#7c3aed] outline-none w-48" />
                    ) : (
                      <span className="text-[#d1d5db] cursor-text hover:text-white transition-colors" onDoubleClick={() => startEdit(c.id, 'descricao', c.descricao)}>{c.descricao}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {editingCell?.id === c.id && editingCell.field === 'valor' ? (
                      <input autoFocus type="number" value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={commitEdit} onKeyDown={e => e.key === 'Enter' && commitEdit()} className="bg-[#1e1e35] text-white text-sm px-2 py-1 rounded border border-[#7c3aed] outline-none w-24" />
                    ) : (
                      <span className="text-[#f87171] font-medium cursor-text hover:text-white transition-colors" onDoubleClick={() => startEdit(c.id, 'valor', String(c.valor))}>
                        R$ {c.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#9ca3af] whitespace-nowrap">{new Date(c.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => deleteCusto(c.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-[#6b7280] hover:text-[#f87171] hover:bg-[#f87171]/10 transition-all cursor-pointer ml-auto">
                      <i className="ri-delete-bin-line text-sm"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-[#4b5563]">
              <i className="ri-shopping-cart-2-line text-3xl mb-2 block"></i>
              <p className="text-sm">Nenhum custo encontrado</p>
            </div>
          )}
        </div>
      </div>
      <p className="text-[#4b5563] text-xs">Dica: clique duas vezes em qualquer célula para editar</p>
    </div>
  );
}
