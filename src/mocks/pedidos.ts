export type StatusPedido = 'Orçamento' | 'Fechado' | 'Em andamento' | 'Concluído' | 'Retirado';

export interface PedidoItem {
  produto: string;
  quantidade: number;
  valorVenda: number;
  custo: number;
  gramasFilamento: number;
  horasImpressao: number;
}

export interface Pedido {
  id: string;
  cliente: string;
  produto: string;
  quantidade: number;
  impressora: string;
  gramasFilamento: number;
  status: StatusPedido;
  pago: boolean;
  valorPago: number;
  valorVenda: number;
  custo: number;
  horasImpressao: number;
  lucro: number;
  data: string;
  itens: PedidoItem[];
}

export function clampPedidoValorPago(valorPago: number, valorVenda: number): number {
  const recebido = Number(valorPago) || 0;
  const totalVenda = Number(valorVenda) || 0;
  return Math.min(Math.max(recebido, 0), Math.max(totalVenda, 0));
}

export function getPedidoValorPendente(pedido: Pick<Pedido, 'valorVenda' | 'valorPago'>): number {
  return Math.max(0, pedido.valorVenda - pedido.valorPago);
}

export function isPedidoPago(pedido: Pick<Pedido, 'valorVenda' | 'valorPago'>): boolean {
  return getPedidoValorPendente(pedido) <= 0;
}

export function getPedidoPagamentoStatus(pedido: Pick<Pedido, 'valorVenda' | 'valorPago'>): 'Pago' | 'Parcial' | 'Pendente' {
  if (isPedidoPago(pedido)) {
    return 'Pago';
  }

  if (pedido.valorPago > 0) {
    return 'Parcial';
  }

  return 'Pendente';
}

export function normalizePedidoItem(item: Partial<PedidoItem>): PedidoItem {
  return {
    produto: item.produto?.trim() ?? '',
    quantidade: Math.max(1, Math.floor(Number(item.quantidade) || 1)),
    valorVenda: Number(item.valorVenda) || 0,
    custo: Number(item.custo) || 0,
    gramasFilamento: Number(item.gramasFilamento) || 0,
    horasImpressao: Number(item.horasImpressao) || 0,
  };
}

export function summarizePedidoItens(itens: PedidoItem[]): string {
  return itens
    .filter((item) => item.produto)
    .map((item) => `${item.quantidade}x ${item.produto}`)
    .join(', ');
}

export function calculatePedidoMetrics(itens: Partial<PedidoItem>[]) {
  const normalizedItems = itens
    .map((item) => normalizePedidoItem(item))
    .filter((item) => item.produto);

  const totals = normalizedItems.reduce(
    (accumulator, item) => ({
      quantidade: accumulator.quantidade + item.quantidade,
      valorVenda: accumulator.valorVenda + item.valorVenda,
      custo: accumulator.custo + item.custo,
      gramasFilamento: accumulator.gramasFilamento + item.gramasFilamento,
      horasImpressao: accumulator.horasImpressao + item.horasImpressao,
    }),
    {
      quantidade: 0,
      valorVenda: 0,
      custo: 0,
      gramasFilamento: 0,
      horasImpressao: 0,
    }
  );

  return {
    itens: normalizedItems,
    produto: summarizePedidoItens(normalizedItems),
    quantidade: totals.quantidade,
    valorVenda: totals.valorVenda,
    custo: totals.custo,
    gramasFilamento: totals.gramasFilamento,
    horasImpressao: totals.horasImpressao,
    lucro: totals.valorVenda - totals.custo,
  };
}
