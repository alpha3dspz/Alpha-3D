import { useCallback, useMemo, useState } from 'react';
import {
  calculatePedidoMetrics,
  clampPedidoValorPago,
  getPedidoPagamentoStatus,
  getPedidoValorPendente,
  isPedidoPago,
  normalizePedidoItem,
  type Pedido,
  type PedidoItem,
  type StatusPedido,
} from '@/mocks/pedidos';
import type { Produto } from '@/mocks/produtos';
import type { Custo } from '@/mocks/custos';

interface PedidosProps {
  pedidos: Pedido[];
  produtos: Produto[];
  custos: Custo[];
  onChange: (pedidos: Pedido[]) => void;
}

type EditableField = 'cliente' | 'impressora' | 'data' | 'valorPago';

interface PedidoFormState {
  cliente: string;
  impressora: string;
  terceirizado: boolean;
  status: StatusPedido;
  valorPago: number;
  data: string;
  itens: PedidoItem[];
}

const TERCEIRIZACAO_LABEL = 'Terceirizacao';
const EMPRESA_NOME = 'Alpha Personalizados Sapezal';
const EMPRESA_CONTATO = 'Poliana';
const EMPRESA_TELEFONE = '(65) 99933-2693';

const STATUS_COLORS: Record<StatusPedido, { bg: string; text: string; dot: string }> = {
  'Orçamento': { bg: 'bg-[#374151]/40', text: 'text-[#9ca3af]', dot: 'bg-[#6b7280]' },
  'Fechado': { bg: 'bg-[#0891b2]/20', text: 'text-[#22d3ee]', dot: 'bg-[#0891b2]' },
  'Em andamento': { bg: 'bg-[#d97706]/20', text: 'text-[#fbbf24]', dot: 'bg-[#d97706]' },
  'Concluído': { bg: 'bg-[#059669]/20', text: 'text-[#34d399]', dot: 'bg-[#059669]' },
  'Retirado': { bg: 'bg-[#7c3aed]/20', text: 'text-[#a78bfa]', dot: 'bg-[#7c3aed]' },
};

const ALL_STATUS: StatusPedido[] = ['Orçamento', 'Fechado', 'Em andamento', 'Concluído', 'Retirado'];

const PAGAMENTO_COLORS: Record<'Pago' | 'Parcial' | 'Pendente', { bg: string; text: string }> = {
  Pago: { bg: 'bg-[#059669]/20', text: 'text-[#34d399]' },
  Parcial: { bg: 'bg-[#d97706]/20', text: 'text-[#fbbf24]' },
  Pendente: { bg: 'bg-[#374151]/40', text: 'text-[#9ca3af]' },
};

function isPedidoTerceirizado(impressora: string): boolean {
  return impressora.trim().toLowerCase() === TERCEIRIZACAO_LABEL.toLowerCase();
}

function generateId(pedidos: Pedido[]): string {
  const max = pedidos.reduce((currentMax, pedido) => {
    const numericId = parseInt(pedido.id.replace('PED-', ''), 10);
    return numericId > currentMax ? numericId : currentMax;
  }, 0);

  return `PED-${String(max + 1).padStart(3, '0')}`;
}

function getComparableValue(pedido: Pedido, field: keyof Pedido): string | number {
  const value = pedido[field];

  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  if (typeof value === 'number' || typeof value === 'string') {
    return value;
  }

  return '';
}

function formatWhatsappCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatWhatsappDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR');
}

function buildPedidoWhatsappMessage(pedido: Pedido): string {
  return [
    `*${EMPRESA_NOME}*`,
    '',
    `Olá, *${pedido.cliente}*! 😊`,
    '',
    'Segue seu orçamento atualizado: ✨',
    `🧩 Produto: ${pedido.produto}`,
    `💰 Valor orçado: R$ ${formatWhatsappCurrency(pedido.valorVenda)}`,
    `📅 Data: ${formatWhatsappDate(pedido.data)}`,
    `📌 Status: ${pedido.status}`,
    '',
    'Ficaremos muito felizes em produzir essa peça para você. Conte com a Alpha para novos projetos e personalizações. 🤝',
    'Seu orçamento foi preparado com carinho para garantir qualidade e um atendimento especial. 💜',
    '',
    `Atendimento: ${EMPRESA_CONTATO} 💬`,
    `Telefone: ${EMPRESA_TELEFONE} 📞`,
  ].join('\n');
}

function createFormFromPedido(pedido: Pedido): PedidoFormState {
  const itens = pedido.itens.length > 0
    ? pedido.itens.map((item) => normalizePedidoItem(item))
    : [
        normalizePedidoItem({
          produto: pedido.produto,
          quantidade: pedido.quantidade,
          valorVenda: pedido.valorVenda,
          custo: pedido.custo,
          gramasFilamento: pedido.gramasFilamento,
          horasImpressao: pedido.horasImpressao,
        }),
      ];

  return {
    cliente: pedido.cliente,
    impressora: isPedidoTerceirizado(pedido.impressora) ? '' : pedido.impressora,
    terceirizado: isPedidoTerceirizado(pedido.impressora),
    status: pedido.status,
    valorPago: pedido.valorPago,
    data: pedido.data,
    itens,
  };
}

export default function Pedidos({ pedidos, produtos, custos, onChange }: PedidosProps) {
  const createEmptyItem = useCallback(
    (produtoInicial = produtos[0]?.nome ?? ''): PedidoItem => normalizePedidoItem({ produto: produtoInicial, quantidade: 1 }),
    [produtos]
  );

  const [showForm, setShowForm] = useState(false);
  const [editingPedidoId, setEditingPedidoId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<StatusPedido | 'Todos'>('Todos');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<keyof Pedido>('data');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [editingCell, setEditingCell] = useState<{ id: string; field: EditableField } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [form, setForm] = useState<PedidoFormState>({
    cliente: '',
    impressora: '',
    terceirizado: false,
    status: 'Orçamento',
    valorPago: 0,
    data: new Date().toISOString().split('T')[0],
    itens: [createEmptyItem()],
  });

  const impressorasDisponiveis = useMemo(
    () => Array.from(
      new Set(
        custos
          .filter((custo) => custo.tipo === 'Impressora')
          .map((custo) => custo.descricao.trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [custos]
  );

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return [...pedidos]
      .filter((pedido) => filterStatus === 'Todos' || pedido.status === filterStatus)
      .filter((pedido) => {
        if (!normalizedSearch) {
          return true;
        }

        return (
          pedido.cliente.toLowerCase().includes(normalizedSearch) ||
          pedido.produto.toLowerCase().includes(normalizedSearch) ||
          pedido.itens.some((item) => item.produto.toLowerCase().includes(normalizedSearch))
        );
      })
      .sort((a, b) => {
        const left = getComparableValue(a, sortField);
        const right = getComparableValue(b, sortField);

        if (left === right) {
          return 0;
        }

        const comparison = left < right ? -1 : 1;
        return sortDir === 'asc' ? comparison : -comparison;
      });
  }, [filterStatus, pedidos, search, sortDir, sortField]);

  const formMetrics = useMemo(() => calculatePedidoMetrics(form.itens), [form.itens]);
  const formValorPendente = getPedidoValorPendente({ valorVenda: formMetrics.valorVenda, valorPago: form.valorPago });
  const formPagamentoStatus = getPedidoPagamentoStatus({ valorVenda: formMetrics.valorVenda, valorPago: form.valorPago });

  const handleSort = (field: keyof Pedido) => {
    if (sortField === field) {
      setSortDir((current) => current === 'asc' ? 'desc' : 'asc');
      return;
    }

    setSortField(field);
    setSortDir('asc');
  };

  const startEdit = (id: string, field: EditableField, value: string) => {
    setEditingCell({ id, field });
    setEditValue(value);
  };

  const commitEdit = useCallback(() => {
    if (!editingCell) {
      return;
    }

    const updated = pedidos.map((pedido) => {
      if (pedido.id !== editingCell.id) {
        return pedido;
      }

      if (editingCell.field === 'cliente') {
        return { ...pedido, cliente: editValue.trim() };
      }

      if (editingCell.field === 'impressora') {
        return { ...pedido, impressora: editValue.trim() };
      }

      if (editingCell.field === 'valorPago') {
        const valorPago = clampPedidoValorPago(Number(editValue) || 0, pedido.valorVenda);
        return { ...pedido, valorPago, pago: isPedidoPago({ valorVenda: pedido.valorVenda, valorPago }) };
      }

      return { ...pedido, data: editValue };
    });

    onChange(updated);
    setEditingCell(null);
  }, [editValue, editingCell, onChange, pedidos]);

  const updateStatus = (id: string, status: StatusPedido) => {
    onChange(pedidos.map((pedido) => pedido.id === id ? { ...pedido, status } : pedido));
  };

  const updateValorPago = (id: string, valorPagoInput: number) => {
    onChange(
      pedidos.map((pedido) => {
        if (pedido.id !== id) {
          return pedido;
        }

        const valorPago = clampPedidoValorPago(valorPagoInput, pedido.valorVenda);
        return {
          ...pedido,
          valorPago,
          pago: isPedidoPago({ valorVenda: pedido.valorVenda, valorPago }),
        };
      })
    );
  };

  const togglePago = (id: string) => {
    onChange(
      pedidos.map((pedido) => {
        if (pedido.id !== id) {
          return pedido;
        }

        const valorPago = pedido.pago ? 0 : pedido.valorVenda;
        return {
          ...pedido,
          valorPago,
          pago: isPedidoPago({ valorVenda: pedido.valorVenda, valorPago }),
        };
      })
    );
  };

  const resetForm = useCallback(() => {
    setForm({
      cliente: '',
      impressora: impressorasDisponiveis[0] ?? '',
      terceirizado: false,
      status: 'Orçamento',
      valorPago: 0,
      data: new Date().toISOString().split('T')[0],
      itens: [createEmptyItem()],
    });
  }, [createEmptyItem, impressorasDisponiveis]);

  const openAddPedido = () => {
    setEditingPedidoId(null);
    resetForm();
    setShowForm(true);
  };

  const openEditPedido = (pedido: Pedido) => {
    setEditingPedidoId(pedido.id);
    setForm(createFormFromPedido(pedido));
    setShowForm(true);
  };

  const closeForm = () => {
    setEditingPedidoId(null);
    setShowForm(false);
  };

  const updateFormItem = (index: number, patch: Partial<PedidoItem>) => {
    setForm((current) => ({
      ...current,
      itens: current.itens.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        const normalizedItem = normalizePedidoItem({ ...item, ...patch });
        return {
          ...normalizedItem,
          produto: typeof patch.produto === 'string' ? patch.produto : normalizedItem.produto,
        };
      }),
    }));
  };

  const addFormItem = () => {
    setForm((current) => ({
      ...current,
      itens: [...current.itens, createEmptyItem()],
    }));
  };

  const removeFormItem = (index: number) => {
    setForm((current) => {
      if (current.itens.length === 1) {
        return current;
      }

      return {
        ...current,
        itens: current.itens.filter((_, itemIndex) => itemIndex !== index),
      };
    });
  };

  const savePedido = () => {
    const cliente = form.cliente.trim();
    const itens = form.itens.map((item) => normalizePedidoItem(item)).filter((item) => item.produto);

    if (!cliente || itens.length === 0) {
      return;
    }

    const metrics = calculatePedidoMetrics(itens);
    const valorPago = clampPedidoValorPago(form.valorPago, metrics.valorVenda);

    const pedidoAtualizado: Pedido = {
      id: editingPedidoId ?? generateId(pedidos),
      cliente,
      produto: metrics.produto,
      quantidade: metrics.quantidade,
      impressora: form.terceirizado ? TERCEIRIZACAO_LABEL : form.impressora.trim(),
      gramasFilamento: metrics.gramasFilamento,
      status: form.status,
      pago: isPedidoPago({ valorVenda: metrics.valorVenda, valorPago }),
      valorPago,
      valorVenda: metrics.valorVenda,
      custo: metrics.custo,
      horasImpressao: metrics.horasImpressao,
      lucro: metrics.lucro,
      data: form.data,
      itens: metrics.itens,
    };

    if (editingPedidoId) {
      onChange(pedidos.map((pedido) => pedido.id === editingPedidoId ? pedidoAtualizado : pedido));
    } else {
      onChange([...pedidos, pedidoAtualizado]);
    }

    closeForm();
    resetForm();
  };

  const deletePedido = (id: string) => {
    onChange(pedidos.filter((pedido) => pedido.id !== id));
  };

  const exportCSV = () => {
    const header = 'ID,Cliente,Itens,Quantidade Total,Impressora,Status,Pagamento,Valor Recebido,Saldo Devedor,Valor Cobrado,Custo,Horas,Lucro,Data';
    const rows = pedidos.map((pedido) => (
      `${pedido.id},"${pedido.cliente}","${pedido.produto}",${pedido.quantidade},"${pedido.impressora}",${pedido.status},${getPedidoPagamentoStatus(pedido)},${pedido.valorPago},${getPedidoValorPendente(pedido)},${pedido.valorVenda},${pedido.custo},${pedido.horasImpressao},${pedido.lucro},${pedido.data}`
    ));
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'pedidos-alpha.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const openPedidoWhatsapp = (pedido: Pedido) => {
    const message = buildPedidoWhatsappMessage(pedido);
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  const SortIcon = ({ field }: { field: keyof Pedido }) => (
    <i className={`ml-1 text-xs ${sortField === field ? 'text-[#a855f7]' : 'text-[#374151]'} ${sortField === field && sortDir === 'desc' ? 'ri-arrow-down-s-line' : 'ri-arrow-up-s-line'}`}></i>
  );

  const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  const formatDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR');

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Pedidos</h1>
          <p className="mt-1 text-sm text-[#6b7280]">{pedidos.length} pedidos no total</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button
            onClick={exportCSV}
            className="flex items-center justify-center gap-2 rounded-lg border border-[#2d2d4e] bg-[#1a1a2e] px-3 py-2 text-sm text-[#9ca3af] transition-colors hover:text-white"
          >
            <i className="ri-download-2-line"></i>
            Exportar CSV
          </button>
          <button
            onClick={openAddPedido}
            className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#c026d3] to-[#7c3aed] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <i className="ri-add-line"></i>
            Novo Pedido
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-[#2d2d4e] bg-[#0f0f1a] p-5 shadow-2xl shadow-black/40 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-white">{editingPedidoId ? 'Editar Pedido' : 'Novo Pedido'}</h3>
                <p className="mt-1 text-sm text-[#6b7280]">{editingPedidoId ? 'Atualize cliente, itens, pagamento e status do pedido selecionado.' : 'Cadastre um cliente com um ou mais produtos, definindo quantidade e totais por item.'}</p>
              </div>
              <button
                onClick={closeForm}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6b7280] transition-colors hover:bg-[#1a1a2e] hover:text-white"
              >
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-xs text-[#6b7280]">Cliente</label>
                <input
                  type="text"
                  value={form.cliente}
                  onChange={(event) => setForm((current) => ({ ...current, cliente: event.target.value }))}
                  placeholder="Nome do cliente"
                  className="w-full rounded-lg border border-[#2d2d4e] bg-[#1a1a2e] px-3 py-2 text-sm text-white outline-none transition-colors placeholder-[#4b5563] focus:border-[#7c3aed]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-[#6b7280]">Impressora</label>
                <select
                  value={form.impressora}
                  onChange={(event) => setForm((current) => ({ ...current, impressora: event.target.value }))}
                  disabled={form.terceirizado || impressorasDisponiveis.length === 0}
                  className="w-full cursor-pointer rounded-lg border border-[#2d2d4e] bg-[#1a1a2e] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#7c3aed] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {form.terceirizado ? (
                    <option value={TERCEIRIZACAO_LABEL}>Servico terceirizado</option>
                  ) : impressorasDisponiveis.length === 0 ? (
                    <option value="">Cadastre uma impressora em Compras</option>
                  ) : (
                    impressorasDisponiveis.map((impressora) => (
                      <option key={impressora} value={impressora}>{impressora}</option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-[#6b7280]">Status Inicial</label>
                <select
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as StatusPedido }))}
                  className="w-full cursor-pointer rounded-lg border border-[#2d2d4e] bg-[#1a1a2e] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#7c3aed]"
                >
                  {ALL_STATUS.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-[#6b7280]">Data</label>
                <input
                  type="date"
                  value={form.data}
                  onChange={(event) => setForm((current) => ({ ...current, data: event.target.value }))}
                  className="w-full rounded-lg border border-[#2d2d4e] bg-[#1a1a2e] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#7c3aed]"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-[#1e1e35] bg-[#121221] px-4 py-3">
              <div>
                <p className="text-sm font-medium text-white">Terceirizacao</p>
                <p className="mt-1 text-xs text-[#6b7280]">Marque quando o servico nao usar impressora propria e for terceirizado.</p>
              </div>
              <button
                type="button"
                aria-pressed={form.terceirizado}
                onClick={() => setForm((current) => ({
                  ...current,
                  terceirizado: !current.terceirizado,
                  impressora: !current.terceirizado ? TERCEIRIZACAO_LABEL : (impressorasDisponiveis[0] ?? ''),
                }))}
                className={`relative h-7 w-14 rounded-full transition-all duration-200 ${form.terceirizado ? 'bg-[#0891b2]' : 'bg-[#374151]'}`}
              >
                <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all duration-200 ${form.terceirizado ? 'left-7' : 'left-0.5'}`}></span>
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-[#1e1e35] bg-[#121221] px-4 py-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Pagamento do cliente</p>
                  <p className="mt-1 text-xs text-[#6b7280]">Lance quanto ele pagou agora. Se pagar só uma parte, o restante fica como saldo devedor.</p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-[520px]">
                  <div>
                    <label className="mb-1.5 block text-xs text-[#6b7280]">Valor pago agora</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.valorPago || ''}
                      onChange={(event) => setForm((current) => ({ ...current, valorPago: Math.max(0, Number(event.target.value) || 0) }))}
                      placeholder="0,00"
                      className="w-full rounded-lg border border-[#2d2d4e] bg-[#1a1a2e] px-3 py-2 text-sm text-white outline-none transition-colors placeholder-[#4b5563] focus:border-[#7c3aed]"
                    />
                  </div>
                  <SummaryCard label="Pagamento" value={formPagamentoStatus} accent={formPagamentoStatus === 'Pago' ? 'text-[#34d399]' : formPagamentoStatus === 'Parcial' ? 'text-[#fbbf24]' : 'text-[#9ca3af]'} />
                  <SummaryCard label="Saldo Devedor" value={formatCurrency(formValorPendente)} accent={formValorPendente > 0 ? 'text-[#fbbf24]' : 'text-[#34d399]'} />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, valorPago: 0 }))}
                  className="rounded-lg border border-[#2d2d4e] bg-[#1a1a2e] px-3 py-2 text-xs text-[#9ca3af] transition-colors hover:text-white"
                >
                  Nada pago
                </button>
                <button
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, valorPago: formMetrics.valorVenda }))}
                  className="rounded-lg border border-[#14532d] bg-[#14532d]/20 px-3 py-2 text-xs text-[#34d399] transition-colors hover:bg-[#14532d]/30"
                >
                  Pago total
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-white">Itens do Pedido</h4>
                  <p className="mt-1 text-xs text-[#6b7280]">Informe quantidade, valor, custo e consumo de cada produto do mesmo cliente.</p>
                </div>
                <button
                  onClick={addFormItem}
                  className="rounded-lg border border-[#7c3aed]/40 bg-[#7c3aed]/10 px-3 py-2 text-xs font-medium text-[#c084fc] transition-colors hover:bg-[#7c3aed]/20"
                >
                  <i className="ri-add-line mr-1"></i>
                  Adicionar item
                </button>
              </div>

              {form.itens.map((item, index) => (
                <div key={index} className="rounded-2xl border border-[#1e1e35] bg-[#121221] p-4">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-[#60a5fa]">Item {index + 1}</p>
                      <p className="mt-1 text-xs text-[#6b7280]">Os valores deste bloco entram no total do pedido.</p>
                    </div>
                    <button
                      onClick={() => removeFormItem(index)}
                      disabled={form.itens.length === 1}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2d2d4e] text-[#6b7280] transition-all hover:border-[#f87171]/40 hover:text-[#f87171] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <i className="ri-delete-bin-line"></i>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
                    <div className="xl:col-span-2">
                      <label className="mb-1.5 block text-xs text-[#6b7280]">Produto</label>
                      <input
                        list={`produtos-cadastrados-${index}`}
                        type="text"
                        value={item.produto}
                        onChange={(event) => updateFormItem(index, { produto: event.target.value })}
                        placeholder="Selecione ou digite um produto"
                        className="w-full rounded-lg border border-[#2d2d4e] bg-[#1a1a2e] px-3 py-2 text-sm text-white outline-none transition-colors placeholder-[#4b5563] focus:border-[#7c3aed]"
                      />
                      <datalist id={`produtos-cadastrados-${index}`}>
                        {produtos.map((produto) => (
                          <option key={produto.id} value={produto.nome} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs text-[#6b7280]">Quantidade</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantidade}
                        onChange={(event) => updateFormItem(index, { quantidade: Number(event.target.value) || 1 })}
                        className="w-full rounded-lg border border-[#2d2d4e] bg-[#1a1a2e] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#7c3aed]"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs text-[#34d399]">Valor Cobrado (R$)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.valorVenda || ''}
                        onChange={(event) => updateFormItem(index, { valorVenda: Number(event.target.value) || 0 })}
                        placeholder="0,00"
                        className="w-full rounded-lg border border-[#14532d] bg-[#1a1a2e] px-3 py-2 text-sm text-[#34d399] outline-none transition-colors placeholder-[#4b5563] focus:border-[#34d399]"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs text-[#6b7280]">Custo (R$)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.custo || ''}
                        onChange={(event) => updateFormItem(index, { custo: Number(event.target.value) || 0 })}
                        placeholder="0,00"
                        className="w-full rounded-lg border border-[#2d2d4e] bg-[#1a1a2e] px-3 py-2 text-sm text-white outline-none transition-colors placeholder-[#4b5563] focus:border-[#7c3aed]"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs text-[#6b7280]">Filamento (g)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.gramasFilamento || ''}
                        onChange={(event) => updateFormItem(index, { gramasFilamento: Number(event.target.value) || 0 })}
                        placeholder="0"
                        className="w-full rounded-lg border border-[#2d2d4e] bg-[#1a1a2e] px-3 py-2 text-sm text-white outline-none transition-colors placeholder-[#4b5563] focus:border-[#7c3aed]"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs text-[#6b7280]">Horas</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={item.horasImpressao || ''}
                        onChange={(event) => updateFormItem(index, { horasImpressao: Number(event.target.value) || 0 })}
                        placeholder="0,0"
                        className="w-full rounded-lg border border-[#2d2d4e] bg-[#1a1a2e] px-3 py-2 text-sm text-white outline-none transition-colors placeholder-[#4b5563] focus:border-[#7c3aed]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              <SummaryCard label="Itens" value={String(formMetrics.itens.length)} accent="text-[#67e8f9]" />
              <SummaryCard label="Quantidade Total" value={String(formMetrics.quantidade)} accent="text-white" />
              <SummaryCard label="Valor Total" value={formatCurrency(formMetrics.valorVenda)} accent="text-[#34d399]" />
              <SummaryCard label="Custo Total" value={formatCurrency(formMetrics.custo)} accent="text-white" />
              <SummaryCard label="Lucro" value={formatCurrency(formMetrics.lucro)} accent={formMetrics.lucro >= 0 ? 'text-[#60a5fa]' : 'text-[#f87171]'} />
            </div>

            <div className="mt-6 flex flex-col-reverse justify-end gap-2 sm:flex-row">
              <button
                onClick={closeForm}
                className="rounded-lg border border-[#2d2d4e] bg-[#1a1a2e] px-4 py-2 text-sm text-[#9ca3af] transition-colors hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={savePedido}
                className="rounded-lg bg-gradient-to-r from-[#c026d3] to-[#7c3aed] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                {editingPedidoId ? 'Salvar Alterações' : 'Salvar Pedido'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#6b7280]"></i>
          <input
            type="text"
            placeholder="Buscar por cliente ou produto..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-[#1e1e35] bg-[#0f0f1a] py-2 pl-9 pr-4 text-sm text-white placeholder-[#4b5563] transition-colors focus:border-[#7c3aed] focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['Todos', ...ALL_STATUS] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                filterStatus === status
                  ? 'bg-gradient-to-r from-[#c026d3] to-[#7c3aed] text-white'
                  : 'border border-[#2d2d4e] bg-[#1a1a2e] text-[#9ca3af] hover:text-white'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {filtered.length > 0 && (
        <div className="space-y-3 md:hidden">
          {filtered.map((pedido) => {
            const pagamentoStatus = getPedidoPagamentoStatus(pedido);
            const saldo = getPedidoValorPendente(pedido);

            return (
              <article key={pedido.id} className={`rounded-xl border p-4 ${isPedidoTerceirizado(pedido.impressora) ? 'border-[#0891b2]/50 bg-[#0c1420]' : 'border-[#1e1e35] bg-[#0f0f1a]'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-mono text-[#6b7280]">{pedido.id}</p>
                    <h3 className="mt-1 text-base font-semibold text-white">{pedido.cliente}</h3>
                    <p className="mt-1 text-sm text-[#9ca3af]">{pedido.produto}</p>
                    {isPedidoTerceirizado(pedido.impressora) && (
                      <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#0891b2]/15 px-2.5 py-1 text-[11px] font-medium text-[#67e8f9]">
                        <i className="ri-hand-coin-line"></i>
                        Terceirizado
                      </span>
                    )}
                  </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditPedido(pedido)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#7c3aed]/30 bg-[#7c3aed]/10 text-[#c084fc] transition-all hover:bg-[#7c3aed]/20 hover:text-white"
                        aria-label={`Editar pedido de ${pedido.cliente}`}
                        title="Editar pedido"
                      >
                        <i className="ri-edit-line text-sm"></i>
                      </button>
                      <button
                        onClick={() => openPedidoWhatsapp(pedido)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#14532d]/40 bg-[#14532d]/10 text-[#34d399] transition-all hover:bg-[#14532d]/20 hover:text-white"
                        aria-label={`Enviar orçamento de ${pedido.cliente} pelo WhatsApp`}
                        title="Abrir orçamento no WhatsApp"
                      >
                        <i className="ri-whatsapp-line text-sm"></i>
                      </button>
                      <button
                        onClick={() => deletePedido(pedido.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#2d2d4e] text-[#6b7280] transition-all hover:border-[#f87171]/40 hover:text-[#f87171]"
                      >
                        <i className="ri-delete-bin-line text-sm"></i>
                      </button>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <MobileMetric label="Itens" value={String(pedido.itens.length)} />
                  <MobileMetric label="Quantidade" value={String(pedido.quantidade)} />
                  <MobileMetric label="Valor" value={formatCurrency(pedido.valorVenda)} valueClassName="text-[#34d399]" />
                  <MobileMetric label="Lucro" value={formatCurrency(pedido.lucro)} valueClassName={pedido.lucro >= 0 ? 'text-[#60a5fa]' : 'text-[#f87171]'} />
                  <MobileMetric label="Recebido" value={formatCurrency(pedido.valorPago)} valueClassName="text-[#34d399]" />
                  <MobileMetric label="Saldo" value={formatCurrency(saldo)} valueClassName={saldo > 0 ? 'text-[#fbbf24]' : 'text-[#34d399]'} />
                </div>

                <div className="mt-4 rounded-xl border border-[#1e1e35] bg-[#121221] p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#6b7280]">Itens do pedido</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {pedido.itens.map((item, index) => (
                      <span key={`${pedido.id}-${item.produto}-${index}`} className="rounded-full bg-[#1a1a2e] px-2.5 py-1 text-xs text-[#d1d5db]">
                        {item.quantidade}x {item.produto}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-[#6b7280]">Status</label>
                    <select
                      value={pedido.status}
                      onChange={(event) => updateStatus(pedido.id, event.target.value as StatusPedido)}
                      className="w-full rounded-xl border border-[#2d2d4e] bg-[#1a1a2e] px-3 py-2 text-sm text-white outline-none focus:border-[#7c3aed]"
                    >
                      {ALL_STATUS.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                  <MobileMetric label="Data" value={formatDate(pedido.data)} />
                </div>

                <div className="mt-4 space-y-3 rounded-xl border border-[#1e1e35] bg-[#121221] px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#6b7280]">Pagamento</p>
                      <p className={`mt-1 text-sm font-semibold ${PAGAMENTO_COLORS[pagamentoStatus].text}`}>{pagamentoStatus}</p>
                    </div>
                    <button
                      onClick={() => togglePago(pedido.id)}
                      className={`relative h-6 w-12 rounded-full transition-all duration-200 ${pedido.pago ? 'bg-[#059669]' : 'bg-[#374151]'}`}
                    >
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all duration-200 ${pedido.pago ? 'left-6' : 'left-0.5'}`}></span>
                    </button>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] uppercase tracking-[0.18em] text-[#6b7280]">Valor recebido</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={pedido.valorPago}
                      onChange={(event) => updateValorPago(pedido.id, Number(event.target.value) || 0)}
                      className="w-full rounded-lg border border-[#2d2d4e] bg-[#1a1a2e] px-3 py-2 text-sm text-white outline-none focus:border-[#7c3aed]"
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="hidden overflow-hidden rounded-xl border border-[#1e1e35] bg-[#0f0f1a] md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e1e35]">
                {[
                  { label: 'ID', field: 'id' as keyof Pedido },
                  { label: 'Cliente', field: 'cliente' as keyof Pedido },
                  { label: 'Itens', field: 'produto' as keyof Pedido },
                  { label: 'Qtd.', field: 'quantidade' as keyof Pedido },
                  { label: 'Impressora', field: 'impressora' as keyof Pedido },
                  { label: 'Status', field: 'status' as keyof Pedido },
                  { label: 'Recebido', field: 'valorPago' as keyof Pedido },
                  { label: 'Valor (R$)', field: 'valorVenda' as keyof Pedido },
                  { label: 'Saldo (R$)', field: 'pago' as keyof Pedido },
                  { label: 'Custo (R$)', field: 'custo' as keyof Pedido },
                  { label: 'Horas', field: 'horasImpressao' as keyof Pedido },
                  { label: 'Lucro (R$)', field: 'lucro' as keyof Pedido },
                  { label: 'Data', field: 'data' as keyof Pedido },
                ].map((column) => (
                  <th
                    key={column.field}
                    onClick={() => handleSort(column.field)}
                    className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left text-xs font-medium text-[#6b7280] hover:text-[#9ca3af]"
                  >
                    {column.label}<SortIcon field={column.field} />
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-medium text-[#6b7280]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((pedido, index) => {
                const pagamentoStatus = getPedidoPagamentoStatus(pedido);
                const saldo = getPedidoValorPendente(pedido);

                return (
                  <tr
                    key={pedido.id}
                    className={`border-b transition-colors hover:bg-[#1a1a2e] ${isPedidoTerceirizado(pedido.impressora) ? 'border-[#0891b2]/20 bg-[#0b1624]' : 'border-[#1e1e35]'} ${index % 2 === 0 || isPedidoTerceirizado(pedido.impressora) ? '' : 'bg-[#0d0d18]'}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-[#6b7280]">{pedido.id}</td>

                    <td className="whitespace-nowrap px-4 py-3">
                      {editingCell?.id === pedido.id && editingCell.field === 'cliente' ? (
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(event) => setEditValue(event.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(event) => event.key === 'Enter' && commitEdit()}
                          className="w-32 rounded border border-[#7c3aed] bg-[#1e1e35] px-2 py-1 text-sm text-white outline-none"
                        />
                      ) : (
                        <span
                          className="cursor-text text-white transition-colors hover:text-[#c084fc]"
                          onDoubleClick={() => startEdit(pedido.id, 'cliente', pedido.cliente)}
                        >{pedido.cliente}</span>
                      )}
                    </td>

                    <td className="max-w-[280px] px-4 py-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="block truncate text-[#d1d5db]">{pedido.produto}</span>
                          {isPedidoTerceirizado(pedido.impressora) && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#0891b2]/15 px-2 py-0.5 text-[10px] font-medium text-[#67e8f9]">
                              <i className="ri-hand-coin-line"></i>
                              Terceirizado
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {pedido.itens.map((item, itemIndex) => (
                            <span key={`${pedido.id}-${item.produto}-${itemIndex}`} className="rounded-full bg-[#1a1a2e] px-2 py-0.5 text-[11px] text-[#9ca3af]">
                              {item.quantidade}x {item.produto}
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-[#9ca3af]">{pedido.quantidade}</td>

                    <td className="whitespace-nowrap px-4 py-3">
                      {editingCell?.id === pedido.id && editingCell.field === 'impressora' ? (
                        <select
                          autoFocus
                          value={editValue}
                          onChange={(event) => setEditValue(event.target.value)}
                          onBlur={commitEdit}
                          className="rounded border border-[#7c3aed] bg-[#1e1e35] px-2 py-1 text-sm text-white outline-none"
                        >
                          {[...new Set([pedido.impressora, ...impressorasDisponiveis].filter(Boolean))].map((impressora) => (
                            <option key={impressora} value={impressora}>{impressora}</option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className="cursor-text text-[#67e8f9] transition-colors hover:text-white"
                          onDoubleClick={() => startEdit(pedido.id, 'impressora', pedido.impressora)}
                        >{pedido.impressora || 'Sem impressora'}</span>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[pedido.status].bg} ${STATUS_COLORS[pedido.status].text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_COLORS[pedido.status].dot}`}></span>
                        <select
                          value={pedido.status}
                          onChange={(event) => updateStatus(pedido.id, event.target.value as StatusPedido)}
                          className="bg-transparent text-xs outline-none"
                        >
                          {ALL_STATUS.map((status) => (
                            <option key={status} value={status} className="bg-[#1e1e35] text-white">{status}</option>
                          ))}
                        </select>
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      {editingCell?.id === pedido.id && editingCell.field === 'valorPago' ? (
                        <input
                          autoFocus
                          type="number"
                          min="0"
                          step="0.01"
                          value={editValue}
                          onChange={(event) => setEditValue(event.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(event) => event.key === 'Enter' && commitEdit()}
                          className="w-24 rounded border border-[#7c3aed] bg-[#1e1e35] px-2 py-1 text-sm text-white outline-none"
                        />
                      ) : (
                        <div className="space-y-1">
                          <span
                            className="cursor-text text-[#34d399] transition-colors hover:text-white"
                            onDoubleClick={() => startEdit(pedido.id, 'valorPago', String(pedido.valorPago))}
                          >
                            {formatCurrency(pedido.valorPago)}
                          </span>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${PAGAMENTO_COLORS[pagamentoStatus].bg} ${PAGAMENTO_COLORS[pagamentoStatus].text}`}>
                            {pagamentoStatus}
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-[#34d399]">{formatCurrency(pedido.valorVenda)}</td>
                    <td className={`whitespace-nowrap px-4 py-3 ${saldo > 0 ? 'text-[#fbbf24]' : 'text-[#34d399]'}`}>{formatCurrency(saldo)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-[#9ca3af]">{formatCurrency(pedido.custo)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-[#9ca3af]">{pedido.horasImpressao}h</td>
                    <td className={`whitespace-nowrap px-4 py-3 font-semibold ${pedido.lucro >= 0 ? 'text-[#60a5fa]' : 'text-[#f87171]'}`}>{formatCurrency(pedido.lucro)}</td>

                    <td className="whitespace-nowrap px-4 py-3">
                      {editingCell?.id === pedido.id && editingCell.field === 'data' ? (
                        <input
                          autoFocus
                          type="date"
                          value={editValue}
                          onChange={(event) => setEditValue(event.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(event) => event.key === 'Enter' && commitEdit()}
                          className="rounded border border-[#7c3aed] bg-[#1e1e35] px-2 py-1 text-sm text-white outline-none"
                        />
                      ) : (
                        <span
                          className="cursor-text text-[#9ca3af] transition-colors hover:text-white"
                          onDoubleClick={() => startEdit(pedido.id, 'data', pedido.data)}
                        >{formatDate(pedido.data)}</span>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="ml-auto flex justify-end gap-2">
                        <button
                          onClick={() => openEditPedido(pedido)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#c084fc] transition-all hover:bg-[#7c3aed]/10 hover:text-white"
                          aria-label={`Editar pedido de ${pedido.cliente}`}
                          title="Editar pedido"
                        >
                          <i className="ri-edit-line text-sm"></i>
                        </button>
                        <button
                          onClick={() => openPedidoWhatsapp(pedido)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#34d399] transition-all hover:bg-[#14532d]/20 hover:text-white"
                          aria-label={`Enviar orçamento de ${pedido.cliente} pelo WhatsApp`}
                          title="Abrir orçamento no WhatsApp"
                        >
                          <i className="ri-whatsapp-line text-sm"></i>
                        </button>
                        <button
                          onClick={() => deletePedido(pedido.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#6b7280] transition-all hover:bg-[#f87171]/10 hover:text-[#f87171]"
                        >
                          <i className="ri-delete-bin-line text-sm"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-[#1e1e35] px-4 py-12 text-center text-[#4b5563]">
          <i className="ri-file-list-3-line mb-2 block text-3xl"></i>
          <p className="text-sm">Nenhum pedido encontrado</p>
        </div>
      )}

      <p className="text-xs text-[#4b5563]">Use o lapis para abrir o modal completo ou clique duas vezes em cliente, impressora, valor recebido ou data para editar rapidamente.</p>
    </div>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl border border-[#1e1e35] bg-[#121221] p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-[#6b7280]">{label}</p>
      <p className={`mt-2 text-lg font-bold ${accent}`}>{value}</p>
    </div>
  );
}

function MobileMetric({ label, value, valueClassName = 'text-white' }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="rounded-xl border border-[#1e1e35] bg-[#121221] p-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[#6b7280]">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${valueClassName}`}>{value}</p>
    </div>
  );
}
