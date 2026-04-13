import { useState, useMemo } from 'react';

interface Calculo {
  nome: string;
  gramas: number;
  valorKg: number;
  custoAdicional: number;
  margem: number;
}

const PRESETS = [
  { label: 'PLA Premium', valorKg: 89.90 },
  { label: 'PETG', valorKg: 105.00 },
  { label: 'ABS', valorKg: 95.00 },
  { label: 'TPU Flex', valorKg: 157.00 },
  { label: 'Resina', valorKg: 220.00 },
];

export default function Precificacao() {
  const [calc, setCalc] = useState<Calculo>({
    nome: '',
    gramas: 50,
    valorKg: 89.90,
    custoAdicional: 5,
    margem: 150,
  });
  const [historico, setHistorico] = useState<(Calculo & { custoTotal: number; precoSugerido: number; lucroEstimado: number })[]>([]);

  const resultado = useMemo(() => {
    const custoMaterial = (calc.gramas / 1000) * calc.valorKg;
    const custoTotal = custoMaterial + calc.custoAdicional;
    const precoSugerido = custoTotal * (1 + calc.margem / 100);
    const lucroEstimado = precoSugerido - custoTotal;
    return { custoMaterial, custoTotal, precoSugerido, lucroEstimado };
  }, [calc]);

  const salvarCalculo = () => {
    if (!calc.nome.trim()) return;
    setHistorico(h => [{ ...calc, ...resultado }, ...h.slice(0, 9)]);
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Precificação Automática</h1>
        <p className="text-[#6b7280] text-sm mt-1">Calculadora inteligente para impressão 3D</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calculator */}
        <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-xl p-6 space-y-5">
          <h3 className="text-white font-semibold">Dados do Produto</h3>

          <div>
            <label className="text-[#6b7280] text-xs mb-1.5 block">Nome do Produto</label>
            <input
              type="text"
              value={calc.nome}
              onChange={e => setCalc(c => ({ ...c, nome: e.target.value }))}
              placeholder="Ex: Suporte para celular"
              className="w-full bg-[#1a1a2e] border border-[#2d2d4e] text-white text-sm px-3 py-2.5 rounded-lg outline-none focus:border-[#7c3aed] placeholder-[#4b5563] transition-colors"
            />
          </div>

          <div>
            <label className="text-[#6b7280] text-xs mb-1.5 block">Gramas Utilizadas (g)</label>
            <div className="relative">
              <input
                type="number"
                value={calc.gramas}
                onChange={e => setCalc(c => ({ ...c, gramas: parseFloat(e.target.value) || 0 }))}
                min={0}
                className="w-full bg-[#1a1a2e] border border-[#2d2d4e] text-white text-sm px-3 py-2.5 rounded-lg outline-none focus:border-[#7c3aed] transition-colors"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] text-xs">g</span>
            </div>
            <input
              type="range"
              min={1}
              max={1000}
              value={calc.gramas}
              onChange={e => setCalc(c => ({ ...c, gramas: parseInt(e.target.value) }))}
              className="w-full mt-2 accent-[#a855f7] cursor-pointer"
            />
            <div className="flex justify-between text-[#4b5563] text-xs mt-1">
              <span>1g</span><span>500g</span><span>1000g</span>
            </div>
          </div>

          <div>
            <label className="text-[#6b7280] text-xs mb-1.5 block">Valor do Filamento (R$/kg)</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => setCalc(c => ({ ...c, valorKg: p.valorKg }))}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap ${
                    calc.valorKg === p.valorKg
                      ? 'bg-[#7c3aed]/30 border border-[#7c3aed] text-[#c084fc]'
                      : 'bg-[#1a1a2e] border border-[#2d2d4e] text-[#9ca3af] hover:text-white'
                  }`}
                >
                  {p.label} — R${p.valorKg}
                </button>
              ))}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280] text-xs">R$</span>
              <input
                type="number"
                value={calc.valorKg}
                onChange={e => setCalc(c => ({ ...c, valorKg: parseFloat(e.target.value) || 0 }))}
                step={0.01}
                className="w-full bg-[#1a1a2e] border border-[#2d2d4e] text-white text-sm pl-8 pr-3 py-2.5 rounded-lg outline-none focus:border-[#7c3aed] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-[#6b7280] text-xs mb-1.5 block">Custo Adicional (energia, tempo, desgaste)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7280] text-xs">R$</span>
              <input
                type="number"
                value={calc.custoAdicional}
                onChange={e => setCalc(c => ({ ...c, custoAdicional: parseFloat(e.target.value) || 0 }))}
                step={0.5}
                className="w-full bg-[#1a1a2e] border border-[#2d2d4e] text-white text-sm pl-8 pr-3 py-2.5 rounded-lg outline-none focus:border-[#7c3aed] transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[#6b7280] text-xs">Margem de Lucro</label>
              <span className="text-[#a855f7] font-bold text-sm">{calc.margem}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={1000}
              step={5}
              value={calc.margem}
              onChange={e => setCalc(c => ({ ...c, margem: parseInt(e.target.value) }))}
              className="w-full accent-[#a855f7] cursor-pointer"
            />
            <div className="flex justify-between text-[#4b5563] text-xs mt-1">
              <span>10%</span><span>500%</span><span>1000%</span>
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {[50, 100, 150, 200, 300].map(m => (
                <button
                  key={m}
                  onClick={() => setCalc(c => ({ ...c, margem: m }))}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap ${
                    calc.margem === m
                      ? 'bg-[#7c3aed]/30 border border-[#7c3aed] text-[#c084fc]'
                      : 'bg-[#1a1a2e] border border-[#2d2d4e] text-[#9ca3af] hover:text-white'
                  }`}
                >{m}%</button>
              ))}
            </div>
          </div>

          <button
            onClick={salvarCalculo}
            disabled={!calc.nome.trim()}
            className="w-full py-2.5 bg-gradient-to-r from-[#c026d3] to-[#7c3aed] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <i className="ri-save-line mr-2"></i>Salvar no Histórico
          </button>
        </div>

        {/* Result */}
        <div className="space-y-4">
          <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-xl p-6">
            <h3 className="text-white font-semibold mb-5">Resultado</h3>
            <div className="space-y-4">
              <ResultRow label="Custo do Material" value={`R$ ${fmt(resultado.custoMaterial)}`} color="text-[#9ca3af]" icon="ri-stack-line" />
              <ResultRow label="Custo Adicional" value={`R$ ${fmt(calc.custoAdicional)}`} color="text-[#9ca3af]" icon="ri-add-circle-line" />
              <div className="border-t border-[#1e1e35] pt-4">
                <ResultRow label="Custo Total" value={`R$ ${fmt(resultado.custoTotal)}`} color="text-[#fbbf24]" icon="ri-money-dollar-circle-line" large />
              </div>
              <div className="bg-gradient-to-r from-[#c026d3]/10 to-[#7c3aed]/10 border border-[#7c3aed]/30 rounded-xl p-4">
                <p className="text-[#9ca3af] text-xs mb-1">Preço Sugerido de Venda</p>
                <p className="text-white text-3xl font-bold">R$ {fmt(resultado.precoSugerido)}</p>
                <p className="text-[#a855f7] text-xs mt-1">Margem de {calc.margem}% aplicada</p>
              </div>
              <div className="bg-[#059669]/10 border border-[#059669]/30 rounded-xl p-4">
                <p className="text-[#9ca3af] text-xs mb-1">Lucro Estimado</p>
                <p className="text-[#34d399] text-2xl font-bold">R$ {fmt(resultado.lucroEstimado)}</p>
              </div>
            </div>
          </div>

          {/* Breakdown visual */}
          <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-xl p-5">
            <h4 className="text-white font-medium text-sm mb-4">Composição do Preço</h4>
            {resultado.precoSugerido > 0 && (
              <div className="space-y-2">
                {[
                  { label: 'Material', value: resultado.custoMaterial, color: 'bg-[#7c3aed]' },
                  { label: 'Extras', value: calc.custoAdicional, color: 'bg-[#0891b2]' },
                  { label: 'Lucro', value: resultado.lucroEstimado, color: 'bg-[#059669]' },
                ].map(item => {
                  const pct = (item.value / resultado.precoSugerido) * 100;
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#9ca3af]">{item.label}</span>
                        <span className="text-white">{pct.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-[#1e1e35] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${item.color} transition-all duration-500`} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Histórico */}
      {historico.length > 0 && (
        <div className="bg-[#0f0f1a] border border-[#1e1e35] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1e1e35]">
            <h3 className="text-white font-semibold text-sm">Histórico de Cálculos</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1e1e35]">
                  {['Produto', 'Gramas', 'Filamento/kg', 'Custo Total', 'Margem', 'Preço Sugerido', 'Lucro'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[#6b7280] font-medium text-xs whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historico.map((h, i) => (
                  <tr key={i} className="border-b border-[#1e1e35] hover:bg-[#1a1a2e] transition-colors">
                    <td className="px-4 py-3 text-white whitespace-nowrap">{h.nome}</td>
                    <td className="px-4 py-3 text-[#9ca3af] whitespace-nowrap">{h.gramas}g</td>
                    <td className="px-4 py-3 text-[#9ca3af] whitespace-nowrap">R$ {fmt(h.valorKg)}</td>
                    <td className="px-4 py-3 text-[#fbbf24] whitespace-nowrap">R$ {fmt(h.custoTotal)}</td>
                    <td className="px-4 py-3 text-[#a855f7] whitespace-nowrap">{h.margem}%</td>
                    <td className="px-4 py-3 text-white font-semibold whitespace-nowrap">R$ {fmt(h.precoSugerido)}</td>
                    <td className="px-4 py-3 text-[#34d399] whitespace-nowrap">R$ {fmt(h.lucroEstimado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultRow({ label, value, color, icon, large }: { label: string; value: string; color: string; icon: string; large?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#1a1a2e]">
          <i className={`${icon} text-[#6b7280] text-xs`}></i>
        </div>
        <span className="text-[#9ca3af] text-sm">{label}</span>
      </div>
      <span className={`font-semibold ${color} ${large ? 'text-lg' : 'text-sm'}`}>{value}</span>
    </div>
  );
}
