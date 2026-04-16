import { useMemo } from 'react';
import { getPedidoValorPendente, type Pedido } from '@/mocks/pedidos';
import type { Custo } from '@/mocks/custos';

interface FinanceiroProps {
  pedidos: Pedido[];
  custos: Custo[];
}

type ClienteResumo = {
  cliente: string;
  pedidos: number;
  faturamento: number;
  recebido: number;
  pendente: number;
  custo: number;
  lucro: number;
};

function isPedidoTerceirizado(impressora: string): boolean {
  return impressora.trim().toLowerCase() === 'terceirizacao';
}

function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function Financeiro({ pedidos, custos }: FinanceiroProps) {
  const stats = useMemo(() => {
    const faturamentoTotal = pedidos.reduce((sum, pedido) => sum + pedido.valorVenda, 0);
    const recebidoTotal = pedidos.reduce((sum, pedido) => sum + pedido.valorPago, 0);
    const pendenteTotal = pedidos.reduce((sum, pedido) => sum + getPedidoValorPendente(pedido), 0);
    const custoPedidos = pedidos.reduce((sum, pedido) => sum + pedido.custo, 0);
    const custosOperacionais = custos.reduce((sum, custo) => sum + (custo.valor * custo.quantidade), 0);
    const lucroBruto = faturamentoTotal - custoPedidos;
    const lucroLiquido = lucroBruto - custosOperacionais;
    const ticketMedio = pedidos.length > 0 ? faturamentoTotal / pedidos.length : 0;
    const pedidosTerceirizados = pedidos.filter((pedido) => isPedidoTerceirizado(pedido.impressora));
    const pedidosInternos = pedidos.filter((pedido) => !isPedidoTerceirizado(pedido.impressora));
    const faturamentoTerceirizado = pedidosTerceirizados.reduce((sum, pedido) => sum + pedido.valorVenda, 0);
    const faturamentoInterno = pedidosInternos.reduce((sum, pedido) => sum + pedido.valorVenda, 0);
    const pendenteTerceirizado = pedidosTerceirizados.reduce((sum, pedido) => sum + getPedidoValorPendente(pedido), 0);

    const clientesMap = pedidos.reduce<Record<string, ClienteResumo>>((accumulator, pedido) => {
      const cliente = pedido.cliente.trim() || 'Cliente não informado';
      const vendasDoPedido = pedido.itens.length > 0
        ? pedido.itens.filter((item) => item.produto.trim()).length
        : 1;

      if (!accumulator[cliente]) {
        accumulator[cliente] = {
          cliente,
          pedidos: 0,
          faturamento: 0,
          recebido: 0,
          pendente: 0,
          custo: 0,
          lucro: 0,
        };
      }

      accumulator[cliente].pedidos += vendasDoPedido;
      accumulator[cliente].faturamento += pedido.valorVenda;
      accumulator[cliente].custo += pedido.custo;
      accumulator[cliente].lucro += pedido.lucro;

      accumulator[cliente].recebido += pedido.valorPago;
      accumulator[cliente].pendente += getPedidoValorPendente(pedido);

      return accumulator;
    }, {});

    const clientes = Object.values(clientesMap)
      .sort((left, right) => right.faturamento - left.faturamento);

    const topClientes = clientes.slice(0, 5);
    const clientesPendentes = clientes
      .filter((cliente) => cliente.pendente > 0)
      .sort((left, right) => right.pendente - left.pendente)
      .slice(0, 6);

    return {
      faturamentoTotal,
      recebidoTotal,
      pendenteTotal,
      custoPedidos,
      custosOperacionais,
      lucroBruto,
      lucroLiquido,
      ticketMedio,
      pedidosTerceirizados: pedidosTerceirizados.length,
      faturamentoTerceirizado,
      faturamentoInterno,
      pendenteTerceirizado,
      clientes,
      topClientes,
      clientesPendentes,
    };
  }, [custos, pedidos]);

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Financeiro</h1>
          <p className="mt-1 text-sm text-[#6b7280]">Resumo rápido de faturamento, recebimentos, clientes e custos.</p>
        </div>
        <div className="rounded-xl border border-[#1e1e35] bg-[#0f0f1a] px-4 py-3 text-sm text-[#9ca3af]">
          {stats.clientes.length} cliente{stats.clientes.length === 1 ? '' : 's'} com venda registrada
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-7">
        <MetricCard label="Faturamento" value={formatCurrency(stats.faturamentoTotal)} accent="text-[#c084fc]" sub="Total vendido" />
        <MetricCard label="Recebido" value={formatCurrency(stats.recebidoTotal)} accent="text-[#34d399]" sub="Entradas totais, incluindo parciais" />
        <MetricCard label="Falta Receber" value={formatCurrency(stats.pendenteTotal)} accent="text-[#fbbf24]" sub="Saldo restante em aberto" />
        <MetricCard label="Custos dos Pedidos" value={formatCurrency(stats.custoPedidos)} accent="text-[#f87171]" sub="Soma do campo custo em cada pedido" />
        <MetricCard label="Faturamento Terceirizado" value={formatCurrency(stats.faturamentoTerceirizado)} accent="text-[#67e8f9]" sub="Pedidos com impressora = Terceirizacao" />
        <MetricCard label="Lucro Bruto" value={formatCurrency(stats.lucroBruto)} accent={stats.lucroBruto >= 0 ? 'text-[#22c55e]' : 'text-[#f87171]'} sub="Faturamento menos custo dos pedidos" />
        <MetricCard label="Lucro Líquido" value={formatCurrency(stats.lucroLiquido)} accent={stats.lucroLiquido >= 0 ? 'text-[#60a5fa]' : 'text-[#f87171]'} sub={`Lucro bruto menos operacionais | Ticket médio ${formatCurrency(stats.ticketMedio)}`} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section className="rounded-xl border border-[#1e1e35] bg-[#0f0f1a] p-4 sm:p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Faturamento por Cliente</h2>
              <p className="mt-1 text-xs text-[#6b7280]">Total vendido, recebido e pendente por cliente.</p>
            </div>
          </div>

          {stats.clientes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1e1e35]">
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#6b7280]">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#6b7280]">Vendas</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#6b7280]">Faturamento</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#6b7280]">Recebido</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#6b7280]">Pendente</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#6b7280]">Lucro</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.clientes.map((cliente, index) => (
                    <tr key={cliente.cliente} className={`border-b border-[#1e1e35] ${index % 2 === 0 ? '' : 'bg-[#0d0d18]'}`}>
                      <td className="px-4 py-3 text-white">{cliente.cliente}</td>
                      <td className="px-4 py-3 text-[#d1d5db]">{cliente.pedidos}</td>
                      <td className="px-4 py-3 text-[#c084fc]">{formatCurrency(cliente.faturamento)}</td>
                      <td className="px-4 py-3 text-[#34d399]">{formatCurrency(cliente.recebido)}</td>
                      <td className="px-4 py-3 text-[#fbbf24]">{formatCurrency(cliente.pendente)}</td>
                      <td className={`px-4 py-3 ${cliente.lucro >= 0 ? 'text-[#60a5fa]' : 'text-[#f87171]'}`}>{formatCurrency(cliente.lucro)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState text="Nenhum pedido lançado para compor o financeiro." />
          )}
        </section>

        <section className="space-y-4">
          <div className="rounded-xl border border-[#1e1e35] bg-[#0f0f1a] p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-white">Resumo Bem Resumido</h2>
            <div className="mt-4 space-y-3">
              <SummaryRow label="Faturamento bruto" value={formatCurrency(stats.faturamentoTotal)} valueClassName="text-[#c084fc]" />
              <SummaryRow label="Já entrou no caixa" value={formatCurrency(stats.recebidoTotal)} valueClassName="text-[#34d399]" />
              <SummaryRow label="Ainda falta receber" value={formatCurrency(stats.pendenteTotal)} valueClassName="text-[#fbbf24]" />
              <SummaryRow label="Custos operacionais" value={formatCurrency(stats.custosOperacionais)} valueClassName="text-[#f87171]" />
              <SummaryRow label="Custos dos pedidos" value={formatCurrency(stats.custoPedidos)} valueClassName="text-[#f87171]" />
              <SummaryRow label="Lucro bruto" value={formatCurrency(stats.lucroBruto)} valueClassName={stats.lucroBruto >= 0 ? 'text-[#22c55e]' : 'text-[#f87171]'} />
              <SummaryRow label="Lucro líquido" value={formatCurrency(stats.lucroLiquido)} valueClassName={stats.lucroLiquido >= 0 ? 'text-[#60a5fa]' : 'text-[#f87171]'} />
              <SummaryRow label="Faturamento terceirizado" value={formatCurrency(stats.faturamentoTerceirizado)} valueClassName="text-[#67e8f9]" />
              <SummaryRow label="Faturamento interno" value={formatCurrency(stats.faturamentoInterno)} valueClassName="text-[#c084fc]" />
            </div>
          </div>

          <div className="rounded-xl border border-[#1e1e35] bg-[#0f0f1a] p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-white">Falta Pagar / Receber</h2>
            <div className="mt-4 space-y-3">
              {stats.clientesPendentes.length > 0 ? stats.clientesPendentes.map((cliente) => (
                <div key={cliente.cliente} className="rounded-xl border border-[#1e1e35] bg-[#121221] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{cliente.cliente}</p>
                      <p className="mt-1 text-xs text-[#6b7280]">{cliente.pedidos} venda{cliente.pedidos === 1 ? '' : 's'} registradas por produto</p>
                    </div>
                    <span className="rounded-full bg-[#f59e0b]/15 px-2.5 py-1 text-xs font-medium text-[#fbbf24]">
                      {formatCurrency(cliente.pendente)}
                    </span>
                  </div>
                </div>
              )) : (
                <EmptyState text="Nenhum cliente com valor pendente no momento." compact />
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-[#1e1e35] bg-[#0f0f1a] p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-white">Top Clientes por Faturamento</h2>
          <div className="mt-4 space-y-3">
            {stats.topClientes.length > 0 ? stats.topClientes.map((cliente) => (
              <div key={cliente.cliente} className="rounded-xl border border-[#1e1e35] bg-[#121221] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{cliente.cliente}</p>
                    <p className="mt-1 text-xs text-[#6b7280]">{cliente.pedidos} venda{cliente.pedidos === 1 ? '' : 's'} | recebido {formatCurrency(cliente.recebido)}</p>
                  </div>
                  <span className="text-sm font-semibold text-[#c084fc]">{formatCurrency(cliente.faturamento)}</span>
                </div>
              </div>
            )) : (
              <EmptyState text="Sem clientes para ranquear ainda." compact />
            )}
          </div>
        </section>

        <section className="rounded-xl border border-[#1e1e35] bg-[#0f0f1a] p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-white">Custos Consolidados</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MiniCard label="Custos operacionais" value={formatCurrency(stats.custosOperacionais)} accent="text-[#f87171]" />
            <MiniCard label="Custos de produção" value={formatCurrency(stats.custoPedidos)} accent="text-[#f87171]" />
            <MiniCard label="Lucro bruto" value={formatCurrency(stats.lucroBruto)} accent={stats.lucroBruto >= 0 ? 'text-[#22c55e]' : 'text-[#f87171]'} />
            <MiniCard label="Total já recebido" value={formatCurrency(stats.recebidoTotal)} accent="text-[#34d399]" />
            <MiniCard label="Saldo líquido" value={formatCurrency(stats.lucroLiquido)} accent={stats.lucroLiquido >= 0 ? 'text-[#60a5fa]' : 'text-[#f87171]'} />
            <MiniCard label="Pedidos terceirizados" value={String(stats.pedidosTerceirizados)} accent="text-[#67e8f9]" />
            <MiniCard label="Pendente terceirizado" value={formatCurrency(stats.pendenteTerceirizado)} accent="text-[#fbbf24]" />
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ label, value, accent, sub }: { label: string; value: string; accent: string; sub: string }) {
  return (
    <div className="rounded-xl border border-[#1e1e35] bg-[#0f0f1a] p-4">
      <p className="text-xs text-[#6b7280]">{label}</p>
      <p className={`mt-2 text-xl font-bold ${accent}`}>{value}</p>
      <p className="mt-1 text-xs text-[#4b5563]">{sub}</p>
    </div>
  );
}

function SummaryRow({ label, value, valueClassName }: { label: string; value: string; valueClassName: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#1e1e35] bg-[#121221] px-3 py-3">
      <span className="text-sm text-[#9ca3af]">{label}</span>
      <span className={`text-sm font-semibold ${valueClassName}`}>{value}</span>
    </div>
  );
}

function MiniCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl border border-[#1e1e35] bg-[#121221] p-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[#6b7280]">{label}</p>
      <p className={`mt-2 text-lg font-semibold ${accent}`}>{value}</p>
    </div>
  );
}

function EmptyState({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div className={`rounded-xl border border-dashed border-[#1e1e35] text-center text-[#6b7280] ${compact ? 'px-4 py-6' : 'px-4 py-12'}`}>
      <i className="ri-wallet-3-line mb-2 block text-2xl"></i>
      <p className="text-sm">{text}</p>
    </div>
  );
}