import { useState, useCallback } from 'react';
import type { Pedido, StatusPedido } from '@/mocks/pedidos';
import type { Produto } from '@/mocks/produtos';

interface PedidosProps {
  pedidos: Pedido[];
  produtos: Produto[];
  onChange: (pedidos: Pedido[]) => void;
}

const STATUS_COLORS: Record<StatusPedido, { bg: string; text: string; dot: string }> = {
  'Orçamento': { bg: 'bg-[#374151]/40', text: 'text-[#9ca3af]', dot: 'bg-[#6b7280]' },
  'Fechado': { bg: 'bg-[#0891b2]/20', text: 'text-[#22d3ee]', dot: 'bg-[#0891b2]' },
  'Em andamento': { bg: 'bg-[#d97706]/20', text: 'text-[#fbbf24]', dot: 'bg-[#d97706]' },
  'Concluído': { bg: 'bg-[#059669]/20', text: 'text-[#34d399]', dot: 'bg-[#059669]' },
  'Retirado': { bg: 'bg-[#7c3aed]/20', text: 'text-[#a78bfa]', dot: 'bg-[#7c3aed]' },
};

const ALL_STATUS: StatusPedido[] = ['Orçamento', 'Fechado', 'Em andamento', 'Concluído', 'Retirado'];

function generateId(pedidos: Pedido[]): string {
  const max = pedidos.reduce((m, p) => {
    const n = parseInt(p.id.replace('PED-', ''), 10);
    return n > m ? n : m;
  }, 0);
  return `PED-${String(max + 1).padStart(3, '0')}`;
}

export default function Pedidos({ pedidos, produtos, onChange }: PedidosProps) {
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<StatusPedido | 'Todos'>('Todos');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<keyof Pedido>('data');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [editingCell, setEditingCell] = useState<{ id: string; field: keyof Pedido } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [form, setForm] = useState({
    cliente: '',
    produto: '',
    custo: 0,
    valorVenda: 0,
    gramasFilamento: 0,
    status: 'Orçamento' as StatusPedido,
    data: new Date().toISOString().split('T')[0],
  });

  const filtered = pedidos
    .filter(p => filterStatus === 'Todos' || p.status === filterStatus)
    .filter(p => p.cliente.toLowerCase().includes(search.toLowerCase()) || p.produto.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (av === bv) return 0;
      const cmp = av < bv ? -1 : 1;
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const handleSort = (field: keyof Pedido) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const startEdit = (id: string, field: keyof Pedido, value: string) => {
    setEditingCell({ id, field });
    setEditValue(value);
  };

  const commitEdit = useCallback(() => {
    if (!editingCell) return;
    const updated = pedidos.map(p => {
      if (p.id !== editingCell.id) return p;
      const next = { ...p };
      const f = editingCell.field;
      if (f === 'valorVenda' || f === 'custo' || f === 'horasImpressao' || f === 'gramasFilamento') {
        (next as Record<string, unknown>)[f] = parseFloat(editValue) || 0;
        next.lucro = next.valorVenda - next.custo;
      } else if (f === 'pago') {
        next.pago = editValue === 'true';
      } else {
        (next as Record<string, unknown>)[f] = editValue;
      }
      return next;
    });
    onChange(updated);
    setEditingCell(null);
  }, [editingCell, editValue, pedidos, onChange]);

  const updateStatus = (id: string, status: StatusPedido) => {
    onChange(pedidos.map(p => p.id === id ? { ...p, status } : p));
    setEditingCell(null);
  };

  const togglePago = (id: string) => {
    onChange(pedidos.map(p => p.id === id ? { ...p, pago: !p.pago } : p));
  };

  const openAddPedido = () => {
    setForm({
      cliente: '',
      produto: produtos[0]?.nome ?? '',
      custo: 0,
      valorVenda: 0,
      gramasFilamento: 0,
      status: 'Orçamento',
      data: new Date().toISOString().split('T')[0],
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
  };

  const addPedido = () => {
    if (!form.cliente.trim() || !form.produto.trim()) {
      return;
    }

    const novo: Pedido = {
      id: generateId(pedidos),
      cliente: form.cliente.trim(),
      produto: form.produto.trim(),
      gramasFilamento: form.gramasFilamento,
      status: form.status,
      pago: false,
      valorVenda: form.valorVenda,
      custo: form.custo,
      horasImpressao: 0,
      lucro: form.valorVenda - form.custo,
      data: form.data,
    };
    onChange([...pedidos, novo]);
    closeForm();
  };

  const deletePedido = (id: string) => {
    onChange(pedidos.filter(p => p.id !== id));
  };

  const exportCSV = () => {
    const header = 'ID,Cliente,Produto,Gramas de Filamento,Status,Pago,Valor Cobrado,Custo,Horas,Lucro,Data';
    const rows = pedidos.map(p =>
      `${p.id},"${p.cliente}","${p.produto}",${p.gramasFilamento},${p.status},${p.pago ? 'Sim' : 'Não'},${p.valorVenda},${p.custo},${p.horasImpressao},${p.lucro},${p.data}`
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pedidos-alpha.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ field }: { field: keyof Pedido }) => (
    <i className={`ml-1 text-xs ${sortField === field ? 'text-[#a855f7]' : 'text-[#374151]'} ${sortField === field && sortDir === 'desc' ? 'ri-arrow-down-s-line' : 'ri-arrow-up-s-line'}`}></i>
  );

  const lucroPreview = form.valorVenda - form.custo;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Pedidos</h1>
          <p className="text-[#6b7280] text-sm mt-1">{pedidos.length} pedidos no total</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 bg-[#1a1a2e] border border-[#2d2d4e] text-[#9ca3af] hover:text-white rounded-lg text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-download-2-line"></i>
            Exportar CSV
          </button>
          <button
            onClick={openAddPedido}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#c026d3] to-[#7c3aed] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
          >
            <i className="ri-add-line"></i>
            Novo Pedido
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-[#2d2d4e] bg-[#0f0f1a] p-6 shadow-2xl shadow-black/40">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-white">Novo Pedido</h3>
                <p className="mt-1 text-sm text-[#6b7280]">Cadastre cliente, produto, custo e valor cobrado com lucro calculado automaticamente.</p>
              </div>
              <button
                onClick={closeForm}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6b7280] transition-colors hover:bg-[#1a1a2e] hover:text-white"
              >
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs text-[#6b7280]">Cliente</label>
                <input
                  type="text"
                  value={form.cliente}
                  onChange={e => setForm(current => ({ ...current, cliente: e.target.value }))}
                  placeholder="Nome do cliente"
                  className="w-full rounded-lg border border-[#2d2d4e] bg-[#1a1a2e] px-3 py-2 text-sm text-white outline-none transition-colors placeholder-[#4b5563] focus:border-[#7c3aed]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-[#6b7280]">Produto</label>
                <input
                  list="produtos-cadastrados"
                  type="text"
                  value={form.produto}
                  onChange={e => setForm(current => ({ ...current, produto: e.target.value }))}
                  placeholder="Selecione ou digite um produto"
                  className="w-full rounded-lg border border-[#2d2d4e] bg-[#1a1a2e] px-3 py-2 text-sm text-white outline-none transition-colors placeholder-[#4b5563] focus:border-[#7c3aed]"
                />
                <datalist id="produtos-cadastrados">
                  {produtos.map(produto => (
                    <option key={produto.id} value={produto.nome} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-[#6b7280]">Preço de Custo (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.custo || ''}
                  onChange={e => setForm(current => ({ ...current, custo: parseFloat(e.target.value) || 0 }))}
                  placeholder="0,00"
                  className="w-full rounded-lg border border-[#2d2d4e] bg-[#1a1a2e] px-3 py-2 text-sm text-white outline-none transition-colors placeholder-[#4b5563] focus:border-[#7c3aed]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-[#34d399]">Valor Cobrado (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.valorVenda || ''}
                  onChange={e => setForm(current => ({ ...current, valorVenda: parseFloat(e.target.value) || 0 }))}
                  placeholder="0,00"
                  className="w-full rounded-lg border border-[#14532d] bg-[#1a1a2e] px-3 py-2 text-sm text-[#34d399] outline-none transition-colors placeholder-[#4b5563] focus:border-[#34d399]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-[#6b7280]">Gramas de Filamento</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.gramasFilamento || ''}
                  onChange={e => setForm(current => ({ ...current, gramasFilamento: parseFloat(e.target.value) || 0 }))}
                  placeholder="0 g"
                  className="w-full rounded-lg border border-[#2d2d4e] bg-[#1a1a2e] px-3 py-2 text-sm text-white outline-none transition-colors placeholder-[#4b5563] focus:border-[#7c3aed]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-[#6b7280]">Status Inicial</label>
                <select
                  value={form.status}
                  onChange={e => setForm(current => ({ ...current, status: e.target.value as StatusPedido }))}
                  className="w-full cursor-pointer rounded-lg border border-[#2d2d4e] bg-[#1a1a2e] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#7c3aed]"
                >
                  {ALL_STATUS.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-[#6b7280]">Data</label>
                <input
                  type="date"
                  value={form.data}
                  onChange={e => setForm(current => ({ ...current, data: e.target.value }))}
                  className="w-full rounded-lg border border-[#2d2d4e] bg-[#1a1a2e] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#7c3aed]"
                />
              </div>

              <div className="rounded-xl border border-[#1e1e35] bg-[#121221] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[#60a5fa]">Lucro Automático</p>
                <p className={`mt-2 text-2xl font-bold ${lucroPreview >= 0 ? 'text-[#60a5fa]' : 'text-[#f87171]'}`}>
                  R$ {lucroPreview.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="mt-1 text-xs text-[#6b7280]">Valor cobrado menos preço de custo.</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={closeForm}
                className="rounded-lg border border-[#2d2d4e] bg-[#1a1a2e] px-4 py-2 text-sm text-[#9ca3af] transition-colors hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={addPedido}
                className="rounded-lg bg-gradient-to-r from-[#c026d3] to-[#7c3aed] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Salvar Pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280] text-sm"></i>
          <input
            type="text"
            placeholder="Buscar por cliente ou produto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#0f0f1a] border border-[#1e1e35] rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-[#4b5563] focus:outline-none focus:border-[#7c3aed] transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(['Todos', ...ALL_STATUS] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                filterStatus === s
                  ? 'bg-gradient-to-r from-[#c026d3] to-[#7c3aed] text-white'
                  : 'bg-[#1a1a2e] border border-[#2d2d4e] text-[#9ca3af] hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e1e35]">
                {[
                  { label: 'ID', field: 'id' as keyof Pedido },
                  { label: 'Cliente', field: 'cliente' as keyof Pedido },
                  { label: 'Produto', field: 'produto' as keyof Pedido },
                  { label: 'Filamento (g)', field: 'gramasFilamento' as keyof Pedido },
                  { label: 'Status', field: 'status' as keyof Pedido },
                  { label: 'Pago', field: 'pago' as keyof Pedido },
                  { label: 'Valor Cobrado (R$)', field: 'valorVenda' as keyof Pedido },
                  { label: 'Custo (R$)', field: 'custo' as keyof Pedido },
                  { label: 'Horas', field: 'horasImpressao' as keyof Pedido },
                  { label: 'Lucro (R$)', field: 'lucro' as keyof Pedido },
                  { label: 'Data', field: 'data' as keyof Pedido },
                ].map(col => (
                  <th
                    key={col.field}
                    onClick={() => handleSort(col.field)}
                    className="text-left px-4 py-3 text-[#6b7280] font-medium text-xs cursor-pointer hover:text-[#9ca3af] whitespace-nowrap select-none"
                  >
                    {col.label}<SortIcon field={col.field} />
                  </th>
                ))}
                <th className="px-4 py-3 text-[#6b7280] font-medium text-xs text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, idx) => (
                <tr
                  key={p.id}
                  className={`border-b border-[#1e1e35] hover:bg-[#1a1a2e] transition-colors ${idx % 2 === 0 ? '' : 'bg-[#0d0d18]'}`}
                >
                  <td className="px-4 py-3 text-[#6b7280] text-xs font-mono whitespace-nowrap">{p.id}</td>

                  {/* Cliente */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {editingCell?.id === p.id && editingCell.field === 'cliente' ? (
                      <input
                        autoFocus
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={e => e.key === 'Enter' && commitEdit()}
                        className="bg-[#1e1e35] text-white text-sm px-2 py-1 rounded border border-[#7c3aed] outline-none w-32"
                      />
                    ) : (
                      <span
                        className="text-white cursor-text hover:text-[#c084fc] transition-colors"
                        onDoubleClick={() => startEdit(p.id, 'cliente', p.cliente)}
                      >{p.cliente}</span>
                    )}
                  </td>

                  {/* Produto */}
                  <td className="px-4 py-3 max-w-[180px]">
                    {editingCell?.id === p.id && editingCell.field === 'produto' ? (
                      <input
                        autoFocus
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={e => e.key === 'Enter' && commitEdit()}
                        className="bg-[#1e1e35] text-white text-sm px-2 py-1 rounded border border-[#7c3aed] outline-none w-40"
                      />
                    ) : (
                      <span
                        className="text-[#d1d5db] cursor-text hover:text-white transition-colors truncate block"
                        onDoubleClick={() => startEdit(p.id, 'produto', p.produto)}
                      >{p.produto}</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {editingCell?.id === p.id && editingCell.field === 'gramasFilamento' ? (
                      <input
                        autoFocus
                        type="number"
                        min="0"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={e => e.key === 'Enter' && commitEdit()}
                        className="w-24 rounded border border-[#7c3aed] bg-[#1e1e35] px-2 py-1 text-sm text-white outline-none"
                      />
                    ) : (
                      <span
                        className="cursor-text text-[#9ca3af] transition-colors hover:text-white"
                        onDoubleClick={() => startEdit(p.id, 'gramasFilamento', String(p.gramasFilamento))}
                      >{p.gramasFilamento}g</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {editingCell?.id === p.id && editingCell.field === 'status' ? (
                      <select
                        autoFocus
                        value={editValue}
                        onChange={e => updateStatus(p.id, e.target.value as StatusPedido)}
                        onBlur={commitEdit}
                        className="bg-[#1e1e35] text-white text-xs px-2 py-1 rounded border border-[#7c3aed] outline-none cursor-pointer"
                      >
                        {ALL_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer ${STATUS_COLORS[p.status].bg} ${STATUS_COLORS[p.status].text}`}
                        onClick={() => startEdit(p.id, 'status', p.status)}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[p.status].dot}`}></span>
                        {p.status}
                      </span>
                    )}
                  </td>

                  {/* Pago */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={() => togglePago(p.id)}
                      className={`w-10 h-5 rounded-full transition-all duration-200 cursor-pointer relative ${p.pago ? 'bg-[#059669]' : 'bg-[#374151]'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200 ${p.pago ? 'left-5' : 'left-0.5'}`}></span>
                    </button>
                  </td>

                  {/* Valor Venda */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {editingCell?.id === p.id && editingCell.field === 'valorVenda' ? (
                      <input
                        autoFocus
                        type="number"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={e => e.key === 'Enter' && commitEdit()}
                        className="bg-[#1e1e35] text-[#34d399] text-sm px-2 py-1 rounded border border-[#34d399] outline-none w-24"
                      />
                    ) : (
                      <span
                        className="text-[#34d399] cursor-text hover:text-[#86efac] transition-colors"
                        onDoubleClick={() => startEdit(p.id, 'valorVenda', String(p.valorVenda))}
                      >R$ {p.valorVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    )}
                  </td>

                  {/* Custo */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {editingCell?.id === p.id && editingCell.field === 'custo' ? (
                      <input
                        autoFocus
                        type="number"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={e => e.key === 'Enter' && commitEdit()}
                        className="bg-[#1e1e35] text-white text-sm px-2 py-1 rounded border border-[#7c3aed] outline-none w-24"
                      />
                    ) : (
                      <span
                        className="text-[#9ca3af] cursor-text hover:text-white transition-colors"
                        onDoubleClick={() => startEdit(p.id, 'custo', String(p.custo))}
                      >R$ {p.custo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    )}
                  </td>

                  {/* Horas */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {editingCell?.id === p.id && editingCell.field === 'horasImpressao' ? (
                      <input
                        autoFocus
                        type="number"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={e => e.key === 'Enter' && commitEdit()}
                        className="bg-[#1e1e35] text-white text-sm px-2 py-1 rounded border border-[#7c3aed] outline-none w-20"
                      />
                    ) : (
                      <span
                        className="text-[#9ca3af] cursor-text hover:text-white transition-colors"
                        onDoubleClick={() => startEdit(p.id, 'horasImpressao', String(p.horasImpressao))}
                      >{p.horasImpressao}h</span>
                    )}
                  </td>

                  {/* Lucro */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`font-semibold ${p.lucro >= 0 ? 'text-[#60a5fa]' : 'text-[#f87171]'}`}>
                      R$ {p.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </td>

                  {/* Data */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {editingCell?.id === p.id && editingCell.field === 'data' ? (
                      <input
                        autoFocus
                        type="date"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={e => e.key === 'Enter' && commitEdit()}
                        className="bg-[#1e1e35] text-white text-sm px-2 py-1 rounded border border-[#7c3aed] outline-none"
                      />
                    ) : (
                      <span
                        className="text-[#9ca3af] cursor-text hover:text-white transition-colors"
                        onDoubleClick={() => startEdit(p.id, 'data', p.data)}
                      >{new Date(p.data + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                    )}
                  </td>

                  {/* Ações */}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => deletePedido(p.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[#6b7280] hover:text-[#f87171] hover:bg-[#f87171]/10 transition-all cursor-pointer ml-auto"
                    >
                      <i className="ri-delete-bin-line text-sm"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-[#4b5563]">
              <i className="ri-file-list-3-line text-3xl mb-2 block"></i>
              <p className="text-sm">Nenhum pedido encontrado</p>
            </div>
          )}
        </div>
      </div>
      <p className="text-[#4b5563] text-xs">Dica: clique duas vezes em qualquer célula para editar</p>
    </div>
  );
}
