import { useMemo, useState } from 'react';
import type { Custo, TipoCusto } from '@/mocks/custos';
import type { Pedido } from '@/mocks/pedidos';

interface CustosProps {
  custos: Custo[];
  pedidos: Pedido[];
  onChange: (custos: Custo[]) => void;
}

type FormCalculationMode = 'unitario' | 'bruto';

interface CustoFormState {
  tipo: TipoCusto;
  descricao: string;
  valor: number;
  valorBruto: number;
  quantidade: number;
  data: string;
  calculationMode: FormCalculationMode;
}

const TIPOS: TipoCusto[] = ['Filamento', 'Impressora', 'Manutenção', 'Ferramenta', 'Acessórios', 'Peças', 'Outros'];

const TIPO_COLORS: Record<TipoCusto, { bg: string; text: string; icon: string }> = {
  'Filamento': { bg: 'bg-[#c026d3]/20', text: 'text-[#e879f9]', icon: 'ri-stack-line' },
  'Impressora': { bg: 'bg-[#0891b2]/20', text: 'text-[#22d3ee]', icon: 'ri-printer-line' },
  'Manutenção': { bg: 'bg-[#d97706]/20', text: 'text-[#fbbf24]', icon: 'ri-tools-line' },
  'Ferramenta': { bg: 'bg-[#059669]/20', text: 'text-[#34d399]', icon: 'ri-scissors-line' },
  'Acessórios': { bg: 'bg-[#2563eb]/20', text: 'text-[#93c5fd]', icon: 'ri-links-line' },
  'Peças': { bg: 'bg-[#7c3aed]/20', text: 'text-[#c4b5fd]', icon: 'ri-puzzle-line' },
  'Outros': { bg: 'bg-[#374151]/40', text: 'text-[#9ca3af]', icon: 'ri-more-line' },
};

function roundCurrency(value: number): number {
  return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
}

function createEmptyCustoForm(): CustoFormState {
  return {
    tipo: 'Filamento',
    descricao: '',
    valor: 0,
    valorBruto: 0,
    quantidade: 1,
    data: new Date().toISOString().split('T')[0],
    calculationMode: 'unitario',
  };
}

function createFormFromCusto(custo: Custo): CustoFormState {
  return {
    tipo: custo.tipo,
    descricao: custo.descricao,
    valor: custo.valor,
    valorBruto: roundCurrency(custo.valor * custo.quantidade),
    quantidade: custo.quantidade,
    data: custo.data,
    calculationMode: 'unitario',
  };
}

function createCustoPayload(form: CustoFormState): Omit<Custo, 'id'> {
  return {
    tipo: form.tipo,
    descricao: form.descricao,
    valor: roundCurrency(form.valor),
    quantidade: Math.max(1, roundCurrency(form.quantidade)),
    data: form.data,
  };
}

function generateId(custos: Custo[]): string {
  const max = custos.reduce((m, c) => {
    const n = parseInt(c.id.replace('CST-', ''), 10);
    return n > m ? n : m;
  }, 0);
  return `CST-${String(max + 1).padStart(3, '0')}`;
}

export default function Custos({ custos, pedidos, onChange }: CustosProps) {
  const [filterTipo, setFilterTipo] = useState<TipoCusto | 'Todos'>('Todos');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCusto, setNewCusto] = useState<CustoFormState>(() => createEmptyCustoForm());

  const totalGastos = custos.reduce((s, c) => s + (c.valor * c.quantidade), 0);
  const totalVendas = pedidos.reduce((s, p) => s + p.valorVenda, 0);
  const totalCustoPedidos = pedidos.reduce((s, p) => s + p.custo, 0);
  const totalCustoGeral = totalGastos + totalCustoPedidos;
  const roi = totalCustoGeral > 0 ? ((totalVendas - totalCustoGeral) / totalCustoGeral * 100).toFixed(1) : '0';

  const filtered = custos.filter(c => filterTipo === 'Todos' || c.tipo === filterTipo);

  const totalPreview = useMemo(() => newCusto.valor * newCusto.quantidade, [newCusto.quantidade, newCusto.valor]);

  const openAdd = () => {
    setEditingId(null);
    setNewCusto(createEmptyCustoForm());
    setShowForm(true);
  };

  const openEdit = (custo: Custo) => {
    setEditingId(custo.id);
    setNewCusto(createFormFromCusto(custo));
    setShowForm(true);
  };

  const handleUnitPriceChange = (value: string) => {
    const unitValue = roundCurrency(parseFloat(value) || 0);
    setNewCusto((current) => ({
      ...current,
      valor: unitValue,
      valorBruto: roundCurrency(unitValue * current.quantidade),
      calculationMode: 'unitario',
    }));
  };

  const handleGrossPriceChange = (value: string) => {
    const grossValue = roundCurrency(parseFloat(value) || 0);
    setNewCusto((current) => ({
      ...current,
      valorBruto: grossValue,
      valor: current.quantidade > 0 ? roundCurrency(grossValue / current.quantidade) : 0,
      calculationMode: 'bruto',
    }));
  };

  const handleQuantityChange = (value: string) => {
    const quantity = Math.max(1, roundCurrency(parseFloat(value) || 1));
    setNewCusto((current) => {
      if (current.calculationMode === 'bruto') {
        return {
          ...current,
          quantidade: quantity,
          valor: quantity > 0 ? roundCurrency(current.valorBruto / quantity) : 0,
        };
      }

      return {
        ...current,
        quantidade: quantity,
        valorBruto: roundCurrency(current.valor * quantity),
      };
    });
  };

  const saveCusto = () => {
    if (!newCusto.descricao.trim()) return;
    const payload = createCustoPayload(newCusto);

    if (editingId) {
      onChange(custos.map(c => c.id === editingId ? { ...payload, id: editingId } : c));
    } else {
      onChange([...custos, { ...payload, id: generateId(custos) }]);
    }

    setNewCusto(createEmptyCustoForm());
    setEditingId(null);
    setShowForm(false);
  };

  const deleteCusto = (id: string) => onChange(custos.filter(c => c.id !== id));

  const exportCSV = () => {
    const header = 'ID,Tipo,Descrição,Valor Unitário,Quantidade,Total,Data';
    const rows = custos.map(c => `${c.id},${c.tipo},"${c.descricao}",${c.valor},${c.quantidade},${c.valor * c.quantidade},${c.data}`);
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'custos-alpha.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const porTipo = TIPOS.map(t => ({
    tipo: t,
    total: custos.filter(c => c.tipo === t).reduce((s, c) => s + (c.valor * c.quantidade), 0),
    count: custos.filter(c => c.tipo === t).length,
  }));
  const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  const formatDate = (value: string) => new Date(value + 'T00:00:00').toLocaleDateString('pt-BR');

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Custos e Compras</h1>
          <p className="text-[#6b7280] text-sm mt-1">Controle financeiro de despesas</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button onClick={exportCSV} className="flex items-center justify-center gap-2 px-3 py-2 bg-[#1a1a2e] border border-[#2d2d4e] text-[#9ca3af] hover:text-white rounded-lg text-sm transition-colors cursor-pointer whitespace-nowrap">
            <i className="ri-download-2-line"></i> Exportar CSV
          </button>
          <button onClick={openAdd} className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#c026d3] to-[#7c3aed] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap">
            <i className="ri-add-line"></i> Novo Custo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
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

      {showForm && (
        <div className="bg-[#0f0f1a] border border-[#7c3aed]/50 rounded-xl p-5">
          <h3 className="text-white font-semibold text-sm mb-4">{editingId ? 'Editar Custo' : 'Novo Custo'}</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
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
            <div className="md:col-span-2 xl:col-span-2">
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
              <label className="text-[#6b7280] text-xs mb-1 block">Valor Unitário (R$)</label>
              <input
                type="number"
                value={newCusto.valor || ''}
                onChange={e => handleUnitPriceChange(e.target.value)}
                placeholder="0,00"
                className="w-full bg-[#1a1a2e] border border-[#2d2d4e] text-white text-sm px-3 py-2 rounded-lg outline-none focus:border-[#7c3aed] placeholder-[#4b5563]"
              />
            </div>
            <div>
              <label className="text-[#6b7280] text-xs mb-1 block">Valor Bruto (R$)</label>
              <input
                type="number"
                value={newCusto.valorBruto || ''}
                onChange={e => handleGrossPriceChange(e.target.value)}
                placeholder="0,00"
                className="w-full bg-[#1a1a2e] border border-[#2d2d4e] text-white text-sm px-3 py-2 rounded-lg outline-none focus:border-[#7c3aed] placeholder-[#4b5563]"
              />
            </div>
            <div>
              <label className="text-[#6b7280] text-xs mb-1 block">Quantidade</label>
              <input
                type="number"
                min="1"
                step="1"
                value={newCusto.quantidade || ''}
                onChange={e => handleQuantityChange(e.target.value)}
                placeholder="1"
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
          <p className="mt-3 text-xs text-[#6b7280]">Preencha primeiro o valor unitário ou o valor bruto. Ao informar a quantidade, o outro campo será recalculado automaticamente.</p>
          <div className="mt-4 rounded-xl border border-[#1e1e35] bg-[#121221] p-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#6b7280]">Total do Item</p>
            <p className="mt-1 text-lg font-semibold text-white">{formatCurrency(totalPreview)}</p>
          </div>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row">
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="px-4 py-2 bg-[#1a1a2e] border border-[#2d2d4e] text-[#9ca3af] rounded-lg text-sm cursor-pointer whitespace-nowrap hover:text-white">Cancelar</button>
            <button onClick={saveCusto} className="px-4 py-2 bg-gradient-to-r from-[#c026d3] to-[#7c3aed] text-white rounded-lg text-sm font-medium cursor-pointer whitespace-nowrap hover:opacity-90">{editingId ? 'Salvar Alterações' : 'Salvar'}</button>
          </div>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="space-y-3 md:hidden">
          {filtered.map((c) => (
            <article key={c.id} className="rounded-xl border border-[#1e1e35] bg-[#0f0f1a] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-mono text-[#6b7280]">{c.id}</p>
                  <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${TIPO_COLORS[c.tipo].bg} ${TIPO_COLORS[c.tipo].text}`}>
                    <i className={`${TIPO_COLORS[c.tipo].icon} text-xs`}></i>
                    {c.tipo}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(c)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#2d2d4e] text-[#6b7280] transition-all hover:border-[#7c3aed]/40 hover:text-white">
                    <i className="ri-edit-line text-sm"></i>
                  </button>
                  <button onClick={() => deleteCusto(c.id)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#2d2d4e] text-[#6b7280] transition-all hover:border-[#f87171]/40 hover:text-[#f87171]">
                    <i className="ri-delete-bin-line text-sm"></i>
                  </button>
                </div>
              </div>

              <p className="mt-4 text-sm font-medium text-white">{c.descricao}</p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-[#1e1e35] bg-[#121221] p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#6b7280]">Unitário</p>
                  <p className="mt-1 text-sm font-semibold text-[#f87171]">{formatCurrency(c.valor)}</p>
                </div>
                <div className="rounded-xl border border-[#1e1e35] bg-[#121221] p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#6b7280]">Qtd.</p>
                  <p className="mt-1 text-sm font-semibold text-white">{c.quantidade}</p>
                </div>
                <div className="rounded-xl border border-[#1e1e35] bg-[#121221] p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#6b7280]">Total</p>
                  <p className="mt-1 text-sm font-semibold text-[#fbbf24]">{formatCurrency(c.valor * c.quantidade)}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-[#9ca3af]">Data: <span className="font-medium text-white">{formatDate(c.data)}</span></p>
            </article>
          ))}
        </div>
      )}

      <div className="hidden overflow-hidden rounded-xl border border-[#1e1e35] bg-[#0f0f1a] md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e1e35]">
                <th className="text-left px-4 py-3 text-[#6b7280] font-medium text-xs">ID</th>
                <th className="text-left px-4 py-3 text-[#6b7280] font-medium text-xs">Tipo</th>
                <th className="text-left px-4 py-3 text-[#6b7280] font-medium text-xs">Descrição</th>
                <th className="text-left px-4 py-3 text-[#6b7280] font-medium text-xs">Valor Unitário</th>
                <th className="text-left px-4 py-3 text-[#6b7280] font-medium text-xs">Quantidade</th>
                <th className="text-left px-4 py-3 text-[#6b7280] font-medium text-xs">Total</th>
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
                    <span className="text-[#d1d5db]">{c.descricao}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-[#f87171] font-medium">{formatCurrency(c.valor)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-white">{c.quantidade}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-[#fbbf24] font-medium">{formatCurrency(c.valor * c.quantidade)}</td>
                  <td className="px-4 py-3 text-[#9ca3af] whitespace-nowrap">{formatDate(c.data)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(c)} className="w-7 h-7 flex items-center justify-center rounded-lg text-[#6b7280] hover:text-white hover:bg-[#7c3aed]/10 transition-all cursor-pointer">
                        <i className="ri-edit-line text-sm"></i>
                      </button>
                      <button onClick={() => deleteCusto(c.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-[#6b7280] hover:text-[#f87171] hover:bg-[#f87171]/10 transition-all cursor-pointer">
                        <i className="ri-delete-bin-line text-sm"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-[#1e1e35] px-4 py-12 text-center text-[#4b5563]">
          <i className="ri-shopping-cart-2-line mb-2 block text-3xl"></i>
          <p className="text-sm">Nenhum custo encontrado</p>
        </div>
      )}
      <p className="text-[#4b5563] text-xs">Use o icone de lapis para editar custos e ajustar quantidade.</p>
    </div>
  );
}
