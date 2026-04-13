import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { Pedido } from '@/mocks/pedidos';

interface RelatoriosProps {
  pedidos: Pedido[];
}

const COLORS = ['#c026d3', '#7c3aed', '#0891b2', '#059669', '#d97706'];

export default function Relatorios({ pedidos }: RelatoriosProps) {
  const stats = useMemo(() => {
    const totalVendas = pedidos.reduce((s, p) => s + p.valorVenda, 0);
    const totalLucro = pedidos.reduce((s, p) => s + p.lucro, 0);
    const totalCusto = pedidos.reduce((s, p) => s + p.custo, 0);
    const margemMedia = totalVendas > 0 ? (totalLucro / totalVendas * 100).toFixed(1) : '0';
    const horasTotal = pedidos.reduce((s, p) => s + p.horasImpressao, 0);
    const tempoMedio = pedidos.length > 0 ? (horasTotal / pedidos.length).toFixed(1) : '0';

    // Produtos mais vendidos
    const prodMap: Record<string, { count: number; receita: number }> = {};
    pedidos.forEach(p => {
      if (!prodMap[p.produto]) prodMap[p.produto] = { count: 0, receita: 0 };
      prodMap[p.produto].count++;
      prodMap[p.produto].receita += p.valorVenda;
    });
    const topProdutos = Object.entries(prodMap)
      .map(([nome, v]) => ({ nome: nome.length > 25 ? nome.slice(0, 25) + '...' : nome, ...v }))
      .sort((a, b) => b.receita - a.receita)
      .slice(0, 5);

    // Clientes recorrentes
    const clienteMap: Record<string, { count: number; total: number }> = {};
    pedidos.forEach(p => {
      if (!clienteMap[p.cliente]) clienteMap[p.cliente] = { count: 0, total: 0 };
      clienteMap[p.cliente].count++;
      clienteMap[p.cliente].total += p.valorVenda;
    });
    const topClientes = Object.entries(clienteMap)
      .map(([nome, v]) => ({ nome, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Vendas por status
    const statusData = ['Orçamento', 'Fechado', 'Em andamento', 'Concluído', 'Retirado'].map(s => ({
      name: s,
      value: pedidos.filter(p => p.status === s).reduce((sum, p) => sum + p.valorVenda, 0),
      count: pedidos.filter(p => p.status === s).length,
    })).filter(s => s.count > 0);

    // Vendas por dia
    const dayMap: Record<string, number> = {};
    pedidos.forEach(p => { dayMap[p.data] = (dayMap[p.data] || 0) + p.valorVenda; });
    const vendasDia = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([data, total]) => ({
        dia: new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        total,
      }));

    return { totalVendas, totalLucro, totalCusto, margemMedia, tempoMedio, topProdutos, topClientes, statusData, vendasDia };
  }, [pedidos]);

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1a1a2e] border border-[#2d2d4e] rounded-lg p-3">
          <p className="text-[#9ca3af] text-xs mb-1">{label}</p>
          <p className="text-white text-sm font-medium">{fmt(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Relatórios Avançados</h1>
        <p className="text-[#6b7280] text-sm mt-1">Análise completa do desempenho do negócio</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Receita Total', value: fmt(stats.totalVendas), icon: 'ri-money-dollar-circle-line', color: 'text-[#c084fc]' },
          { label: 'Lucro Total', value: fmt(stats.totalLucro), icon: 'ri-line-chart-line', color: 'text-[#34d399]' },
          { label: 'Margem Média', value: `${stats.margemMedia}%`, icon: 'ri-percent-line', color: 'text-[#fbbf24]' },
          { label: 'Tempo Médio', value: `${stats.tempoMedio}h`, icon: 'ri-timer-line', color: 'text-[#22d3ee]' },
        ].map(k => (
          <div key={k.label} className="bg-[#0f0f1a] border border-[#1e1e35] rounded-xl p-5">
            <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#1a1a2e] mb-3">
              <i className={`${k.icon} ${k.color} text-base`}></i>
            </div>
            <p className="text-[#6b7280] text-xs mb-1">{k.label}</p>
            <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-[#0f0f1a] border border-[#1e1e35] rounded-xl p-5">
          <h3 className="text-white font-semibold text-sm mb-4">Vendas por Dia</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.vendasDia}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e35" vertical={false} />
              <XAxis dataKey="dia" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total" fill="url(#barGrad)" radius={[4, 4, 0, 0]} />
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c026d3" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-xl p-5">
          <h3 className="text-white font-semibold text-sm mb-4">Receita por Status</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={stats.statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                {stats.statusData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: '#1a1a2e', border: '1px solid #2d2d4e', borderRadius: '8px', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {stats.statusData.map((s, i) => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                  <span className="text-[#9ca3af]">{s.name}</span>
                </div>
                <span className="text-white font-medium">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Produtos + Clientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-xl p-5">
          <h3 className="text-white font-semibold text-sm mb-4">Produtos Mais Vendidos</h3>
          <div className="space-y-3">
            {stats.topProdutos.map((p, i) => (
              <div key={p.nome}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#d1d5db] flex items-center gap-2">
                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-[#1a1a2e] text-[#a855f7] font-bold text-xs">{i + 1}</span>
                    {p.nome}
                  </span>
                  <span className="text-[#34d399] font-medium whitespace-nowrap ml-2">{fmt(p.receita)}</span>
                </div>
                <div className="h-1.5 bg-[#1e1e35] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#c026d3] to-[#7c3aed] transition-all duration-700"
                    style={{ width: `${(p.receita / (stats.topProdutos[0]?.receita || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-xl p-5">
          <h3 className="text-white font-semibold text-sm mb-4">Clientes Recorrentes</h3>
          <div className="space-y-3">
            {stats.topClientes.map((c, i) => (
              <div key={c.nome} className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-br from-[#c026d3]/30 to-[#7c3aed]/30 flex-shrink-0">
                  <span className="text-[#c084fc] text-xs font-bold">{c.nome.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{c.nome}</p>
                  <p className="text-[#6b7280] text-xs">{c.count} pedido{c.count > 1 ? 's' : ''}</p>
                </div>
                <span className="text-[#34d399] text-xs font-semibold whitespace-nowrap">{fmt(c.total)}</span>
                {i === 0 && <i className="ri-award-line text-[#fbbf24] text-sm flex-shrink-0"></i>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
