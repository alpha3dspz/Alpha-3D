import { useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Pedido } from '@/mocks/pedidos';
import type { Custo } from '@/mocks/custos';

interface DashboardProps {
  pedidos: Pedido[];
  custos: Custo[];
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatSignedPercent(value: number): string {
  const signal = value > 0 ? '+' : '';
  return `${signal}${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { color: string; name: string; value: number }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-lg p-3">
        <p className="text-[#9ca3af] text-xs mb-2">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-xs font-medium" style={{ color: entry.color }}>
            {entry.name}: R$ {entry.value.toLocaleString('pt-BR')}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard({ pedidos, custos }: DashboardProps) {
  const stats = useMemo(() => {
    const totalVendas = pedidos.reduce((s, p) => s + p.valorVenda, 0);
    const totalCusto = pedidos.reduce((s, p) => s + p.custo, 0);
    const faturamentoLiquido = totalVendas - totalCusto;
    const emAndamento = pedidos.filter(p => p.status === 'Em andamento').length;
    const concluidos = pedidos.filter(p => p.status === 'Concluído' || p.status === 'Retirado').length;
    const totalGastos = custos.reduce((s, c) => s + (c.valor * c.quantidade), 0);

    const margemMedia = totalVendas > 0 ? (faturamentoLiquido / totalVendas) * 100 : 0;
    const roi = totalGastos > 0
      ? (faturamentoLiquido / totalGastos) * 100
      : faturamentoLiquido > 0 ? 100 : 0;
    const saldoBreakEven = faturamentoLiquido - totalGastos;

    const currentDate = new Date();
    const currentMonthKey = getMonthKey(currentDate);
    const previousMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const previousMonthKey = getMonthKey(previousMonthDate);

    const faturamentoPorMes = pedidos.reduce<Record<string, number>>((accumulator, pedido) => {
      const pedidoDate = new Date(`${pedido.data}T00:00:00`);
      const monthKey = getMonthKey(pedidoDate);
      accumulator[monthKey] = (accumulator[monthKey] || 0) + pedido.valorVenda;
      return accumulator;
    }, {});

    const faturamentoMesAtual = faturamentoPorMes[currentMonthKey] || 0;
    const faturamentoMesAnterior = faturamentoPorMes[previousMonthKey] || 0;
    const variacaoMensalFaturamento = faturamentoMesAnterior > 0
      ? ((faturamentoMesAtual - faturamentoMesAnterior) / faturamentoMesAnterior) * 100
      : faturamentoMesAtual > 0 ? 100 : 0;

    return {
      totalVendas,
      totalCusto,
      faturamentoLiquido,
      margemMedia,
      roi,
      saldoBreakEven,
      emAndamento,
      concluidos,
      totalGastos,
      faturamentoMesAtual,
      faturamentoMesAnterior,
      variacaoMensalFaturamento,
      currentDate,
    };
  }, [pedidos, custos]);

  const faturamentoMensalLabel = useMemo(() => {
    if (stats.faturamentoMesAtual === 0 && stats.faturamentoMesAnterior === 0) {
      return 'Sem faturamento neste mês';
    }

    if (stats.faturamentoMesAnterior === 0 && stats.faturamentoMesAtual > 0) {
      return 'Primeiro faturamento do mês';
    }

    return `${formatSignedPercent(stats.variacaoMensalFaturamento)} vs mês anterior`;
  }, [stats.faturamentoMesAnterior, stats.faturamentoMesAtual, stats.variacaoMensalFaturamento]);

  const roiLabel = useMemo(() => {
    if (stats.totalGastos === 0) {
      return 'Sem investimento lançado';
    }

    if (stats.saldoBreakEven >= 0) {
      return `Break-even atingido: +${formatCurrency(stats.saldoBreakEven)}`;
    }

    return `Faltam ${formatCurrency(Math.abs(stats.saldoBreakEven))} para break-even`;
  }, [stats.saldoBreakEven, stats.totalGastos]);

  const currentMonthLabel = useMemo(
    () => stats.currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    [stats.currentDate]
  );

  const salesData = useMemo(() => {
    const dayMap: Record<string, { vendas: number; custo: number; lucro: number }> = {};

    pedidos.forEach((pedido) => {
      const key = pedido.data;
      if (!dayMap[key]) {
        dayMap[key] = { vendas: 0, custo: 0, lucro: 0 };
      }

      dayMap[key].vendas += pedido.valorVenda;
      dayMap[key].custo += pedido.custo;
      dayMap[key].lucro += pedido.lucro;
    });

    return Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([dia, valores]) => ({
        dia: new Date(`${dia}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        ...valores,
      }));
  }, [pedidos]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    pedidos.forEach(p => { counts[p.status] = (counts[p.status] || 0) + 1; });
    return counts;
  }, [pedidos]);

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-[#6b7280] text-sm mt-1">Visão geral do negócio — Alpha Personalizados</p>
        </div>
        <div className="flex w-full items-center gap-2 rounded-lg border border-[#2d2d4e] bg-[#1a1a2e] px-3 py-2 sm:w-auto">
          <i className="ri-calendar-line text-[#a855f7] text-sm"></i>
          <span className="text-[#d1d5db] text-sm capitalize">{currentMonthLabel}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon="ri-money-dollar-circle-line"
          label="Faturamento Total"
          value={formatCurrency(stats.totalVendas)}
          sub={faturamentoMensalLabel}
          subPositive={stats.variacaoMensalFaturamento >= 0}
          gradient="from-[#c026d3] to-[#7c3aed]"
        />
        <KpiCard
          icon="ri-line-chart-line"
          label="Faturado Líquido"
          value={formatCurrency(stats.faturamentoLiquido)}
          sub={`Margem média ${stats.margemMedia.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`}
          subPositive={stats.margemMedia >= 0}
          gradient="from-[#059669] to-[#10b981]"
        />
        <KpiCard
          icon="ri-percent-line"
          label="ROI"
          value={`${stats.roi.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`}
          sub={roiLabel}
          subPositive={stats.saldoBreakEven >= 0}
          gradient="from-[#d97706] to-[#f59e0b]"
        />
        <KpiCard
          icon="ri-time-line"
          label="Em Andamento"
          value={String(stats.emAndamento)}
          sub={`${stats.concluidos} concluídos`}
          subPositive={false}
          gradient="from-[#0891b2] to-[#06b6d4]"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-[#1e1e35] bg-[#0f0f1a] p-4 sm:p-5 xl:col-span-2">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-white font-semibold text-sm">Vendas dos Últimos 7 Dias</h3>
            <span className="w-fit rounded-full bg-[#a855f7]/10 px-2 py-1 text-xs text-[#a855f7]">Semana atual</span>
          </div>
          {salesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e35" />
                <XAxis dataKey="dia" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
                <Line type="monotone" dataKey="vendas" name="Vendas" stroke="#c026d3" strokeWidth={2} dot={{ fill: '#c026d3', r: 3 }} />
                <Line type="monotone" dataKey="lucro" name="Faturado Liquido" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-[#1e1e35] text-sm text-[#6b7280]">
              Nenhum pedido registrado nos ultimos dias.
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[#1e1e35] bg-[#0f0f1a] p-4 sm:p-5">
          <h3 className="text-white font-semibold text-sm mb-4">Status dos Pedidos</h3>
          <div className="space-y-3">
            {[
              { label: 'Orçamento', color: '#6b7280', key: 'Orçamento' },
              { label: 'Fechado', color: '#0891b2', key: 'Fechado' },
              { label: 'Em andamento', color: '#d97706', key: 'Em andamento' },
              { label: 'Concluído', color: '#059669', key: 'Concluído' },
              { label: 'Retirado', color: '#7c3aed', key: 'Retirado' },
            ].map(s => {
              const count = statusCounts[s.key] || 0;
              const pct = pedidos.length > 0 ? (count / pedidos.length) * 100 : 0;
              return (
                <div key={s.key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#9ca3af]">{s.label}</span>
                    <span className="text-white font-medium">{count}</span>
                  </div>
                  <div className="h-1.5 bg-[#1e1e35] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: s.color }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-[#1e1e35]">
            <p className="text-[#6b7280] text-xs">Total de pedidos</p>
            <p className="text-white text-2xl font-bold">{pedidos.length}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#1e1e35] bg-[#0f0f1a] p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-white font-semibold text-sm">Lucro vs Custo por Dia</h3>
          <div className="flex flex-wrap items-center gap-4 text-xs text-[#9ca3af]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#7c3aed] inline-block"></span>Custo</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#10b981] inline-block"></span>Faturado Líquido</span>
          </div>
        </div>
        {salesData.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={salesData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e35" vertical={false} />
              <XAxis dataKey="dia" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="custo" name="Custo" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              <Bar dataKey="lucro" name="Faturado Liquido" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[180px] items-center justify-center rounded-xl border border-dashed border-[#1e1e35] text-sm text-[#6b7280]">
            Nenhum dado de lucro e custo disponivel.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-[#1e1e35] bg-[#0f0f1a] p-4 sm:p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#c026d3]/10">
              <i className="ri-shopping-bag-line text-[#c026d3]"></i>
            </div>
            <p className="text-[#9ca3af] text-sm">Total Gastos (Custos)</p>
          </div>
          <p className="text-white text-2xl font-bold">R$ {stats.totalGastos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-[#6b7280] text-xs mt-1">Filamentos, manutenção e outros</p>
        </div>
        <div className="rounded-xl border border-[#1e1e35] bg-[#0f0f1a] p-4 sm:p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#10b981]/10">
              <i className="ri-check-double-line text-[#10b981]"></i>
            </div>
            <p className="text-[#9ca3af] text-sm">Pedidos Concluídos</p>
          </div>
          <p className="text-white text-2xl font-bold">{stats.concluidos}</p>
          <p className="text-[#6b7280] text-xs mt-1">Concluídos + Retirados</p>
        </div>
        <div className="rounded-xl border border-[#1e1e35] bg-[#0f0f1a] p-4 sm:p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#d97706]/10">
              <i className="ri-timer-line text-[#d97706]"></i>
            </div>
            <p className="text-[#9ca3af] text-sm">Horas de Impressão</p>
          </div>
          <p className="text-white text-2xl font-bold">
            {pedidos.reduce((s, p) => s + p.horasImpressao, 0).toFixed(1)}h
          </p>
          <p className="text-[#6b7280] text-xs mt-1">Total acumulado</p>
        </div>
      </div>
    </div>
  );
}

interface KpiCardProps {
  icon: string;
  label: string;
  value: string;
  sub: string;
  subPositive: boolean;
  gradient: string;
}

function KpiCard({ icon, label, value, sub, subPositive, gradient }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-[#1e1e35] bg-[#0f0f1a] p-4 transition-colors duration-200 hover:border-[#3d3d6e] sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 flex items-center justify-center rounded-lg bg-gradient-to-br ${gradient} bg-opacity-20`}>
          <i className={`${icon} text-white text-base`}></i>
        </div>
        <i className={`${subPositive ? 'ri-arrow-up-line text-[#10b981]' : 'ri-arrow-down-line text-[#f87171]'} text-sm`}></i>
      </div>
      <p className="text-[#6b7280] text-xs mb-1">{label}</p>
      <p className="text-white text-xl font-bold">{value}</p>
      <p className={`text-xs mt-1 ${subPositive ? 'text-[#10b981]' : 'text-[#9ca3af]'}`}>{sub}</p>
    </div>
  );
}
