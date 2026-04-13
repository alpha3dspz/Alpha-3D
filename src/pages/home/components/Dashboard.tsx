import { useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Pedido } from '@/mocks/pedidos';
import type { Custo } from '@/mocks/custos';

interface DashboardProps {
  pedidos: Pedido[];
  custos: Custo[];
}

const salesData = [
  { dia: '06/04', vendas: 320, custo: 95, lucro: 225 },
  { dia: '07/04', vendas: 180, custo: 45, lucro: 135 },
  { dia: '08/04', vendas: 450, custo: 110, lucro: 340 },
  { dia: '09/04', vendas: 260, custo: 70, lucro: 190 },
  { dia: '10/04', vendas: 750, custo: 200, lucro: 550 },
  { dia: '11/04', vendas: 95, custo: 25, lucro: 70 },
  { dia: '12/04', vendas: 1200, custo: 320, lucro: 880 },
];

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
    const totalLucro = pedidos.reduce((s, p) => s + p.lucro, 0);
    const roi = totalCusto > 0 ? ((totalLucro / totalCusto) * 100).toFixed(1) : '0';
    const emAndamento = pedidos.filter(p => p.status === 'Em andamento').length;
    const concluidos = pedidos.filter(p => p.status === 'Concluído' || p.status === 'Retirado').length;
    const totalGastos = custos.reduce((s, c) => s + c.valor, 0);
    return { totalVendas, totalCusto, totalLucro, roi, emAndamento, concluidos, totalGastos };
  }, [pedidos, custos]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    pedidos.forEach(p => { counts[p.status] = (counts[p.status] || 0) + 1; });
    return counts;
  }, [pedidos]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-[#6b7280] text-sm mt-1">Visão geral do negócio — Alpha Personalizados</p>
        </div>
        <div className="flex items-center gap-2 bg-[#1a1a2e] border border-[#2d2d4e] rounded-lg px-3 py-2">
          <i className="ri-calendar-line text-[#a855f7] text-sm"></i>
          <span className="text-[#d1d5db] text-sm">Abril 2026</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon="ri-money-dollar-circle-line"
          label="Faturamento Total"
          value={`R$ ${stats.totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          sub="+12% este mês"
          subPositive
          gradient="from-[#c026d3] to-[#7c3aed]"
        />
        <KpiCard
          icon="ri-line-chart-line"
          label="Lucro Total"
          value={`R$ ${stats.totalLucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          sub="Margem média 72%"
          subPositive
          gradient="from-[#059669] to-[#10b981]"
        />
        <KpiCard
          icon="ri-percent-line"
          label="ROI"
          value={`${stats.roi}%`}
          sub="Retorno sobre investimento"
          subPositive
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales Line Chart */}
        <div className="lg:col-span-2 bg-[#0f0f1a] border border-[#1e1e35] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-sm">Vendas dos Últimos 7 Dias</h3>
            <span className="text-[#a855f7] text-xs bg-[#a855f7]/10 px-2 py-1 rounded-full">Semana atual</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e35" />
              <XAxis dataKey="dia" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
              <Line type="monotone" dataKey="vendas" name="Vendas" stroke="#c026d3" strokeWidth={2} dot={{ fill: '#c026d3', r: 3 }} />
              <Line type="monotone" dataKey="lucro" name="Lucro" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Status Donut */}
        <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-xl p-5">
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

      {/* Lucro vs Custo Bar Chart */}
      <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-sm">Lucro vs Custo por Dia</h3>
          <div className="flex items-center gap-4 text-xs text-[#9ca3af]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#7c3aed] inline-block"></span>Custo</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#10b981] inline-block"></span>Lucro</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={salesData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e35" vertical={false} />
            <XAxis dataKey="dia" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="custo" name="Custo" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            <Bar dataKey="lucro" name="Lucro" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#c026d3]/10">
              <i className="ri-shopping-bag-line text-[#c026d3]"></i>
            </div>
            <p className="text-[#9ca3af] text-sm">Total Gastos (Custos)</p>
          </div>
          <p className="text-white text-2xl font-bold">R$ {stats.totalGastos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-[#6b7280] text-xs mt-1">Filamentos, manutenção e outros</p>
        </div>
        <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#10b981]/10">
              <i className="ri-check-double-line text-[#10b981]"></i>
            </div>
            <p className="text-[#9ca3af] text-sm">Pedidos Concluídos</p>
          </div>
          <p className="text-white text-2xl font-bold">{stats.concluidos}</p>
          <p className="text-[#6b7280] text-xs mt-1">Concluídos + Retirados</p>
        </div>
        <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-xl p-5">
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
    <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-xl p-5 hover:border-[#3d3d6e] transition-colors duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 flex items-center justify-center rounded-lg bg-gradient-to-br ${gradient} bg-opacity-20`}>
          <i className={`${icon} text-white text-base`}></i>
        </div>
        <i className="ri-arrow-up-line text-[#10b981] text-sm"></i>
      </div>
      <p className="text-[#6b7280] text-xs mb-1">{label}</p>
      <p className="text-white text-xl font-bold">{value}</p>
      <p className={`text-xs mt-1 ${subPositive ? 'text-[#10b981]' : 'text-[#9ca3af]'}`}>{sub}</p>
    </div>
  );
}
