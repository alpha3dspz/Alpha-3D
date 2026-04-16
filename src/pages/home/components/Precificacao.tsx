import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Custo } from '@/mocks/custos';
import type { Pedido } from '@/mocks/pedidos';

interface Calculo {
  nome: string;
  gramasFilamento: number;
  horasImpressao: number;
  impressora: string;
  valorFilamentoKg: number;
  custoEmbalagem: number;
  energiaHora: number;
  outrosCustos: number;
  margemLucro: number;
  precoVendaManual: number;
  modoPrecificacao: 'margem' | 'preco';
  taxaMercadoLivre: number;
  taxaFixaML: number;
  taxaShopee: number;
  taxaFixaShopee: number;
}

interface MarketplaceResultado {
  taxaPercentual: number;
  custoPlataforma: number;
  custoUnidade: number;
  lucro: number;
  margemPercentual: number;
  precoMinimo: number;
  precoSugerido: number;
}

interface HistoricoItem extends Calculo {
  gramasConsideradas: number;
  dataOrcamento: string;
  gramasEstimadas: number;
  custoFilamento: number;
  custoEnergia: number;
  custoEmbalagem: number;
  outrosCustos: number;
  cmvTotal: number;
  lucroDesejado: number;
  vendaDireta: MarketplaceResultado;
  mercadoLivre: MarketplaceResultado;
  shopee: MarketplaceResultado;
  mensagemWhatsapp: string;
}

interface PrecificacaoProps {
  custos: Custo[];
  pedidos: Pedido[];
}

const EMPRESA_NOME = 'Alpha Personalizados Sapezal';
const EMPRESA_TELEFONE = '(65) 99933-2693';
const EMPRESA_CONTATO = 'Poliany';
const MARGEM_MAXIMA = 10000;

function clampMargem(value: number): number {
  return Math.max(0, Math.min(value, MARGEM_MAXIMA));
}

function calcularMargemPorPreco(precoVenda: number, cmvTotal: number): number {
  if (cmvTotal <= 0 || precoVenda <= 0) {
    return 0;
  }

  return clampMargem(((precoVenda - cmvTotal) / cmvTotal) * 100);
}

function calcularPrecoDireto(cmvTotal: number, margemLucro: number): number {
  if (cmvTotal <= 0) {
    return 0;
  }

  return cmvTotal * (1 + margemLucro / 100);
}

function calcularCanal(cmvTotal: number, lucroDesejado: number, taxaPercentual: number, taxaFixa: number): MarketplaceResultado {
  const divisor = 1 - taxaPercentual;
  const precoSugerido = divisor > 0 ? (cmvTotal + lucroDesejado + taxaFixa) / divisor : 0;
  const custoPlataforma = precoSugerido * taxaPercentual + taxaFixa;
  const custoUnidade = cmvTotal + custoPlataforma;
  const lucro = precoSugerido - custoUnidade;
  const margemPercentual = cmvTotal > 0 ? (lucro / cmvTotal) * 100 : 0;
  const precoMinimo = divisor > 0 ? (cmvTotal + taxaFixa) / divisor : 0;

  return {
    taxaPercentual,
    custoPlataforma,
    custoUnidade,
    lucro,
    margemPercentual,
    precoMinimo,
    precoSugerido,
  };
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR');
}

function buildWhatsappMessage(item: HistoricoItem): string {
  return [
    `*${EMPRESA_NOME}*`,
    `📅 Data: ${item.dataOrcamento}`,
    '',
    'Olá! 😊',
    '',
    'Segue seu orçamento atualizado:',
    `🧩 Produto: ${item.nome}`,
    `💰 Valor do produto: R$ ${formatCurrency(item.vendaDireta.precoSugerido)}`,
    '',
    'Esse valor foi preparado com carinho para garantir qualidade, acabamento e segurança da sua peça. ✨',
    'Se quiser ajustar algum detalhe, posso personalizar o orçamento para você. 🤝',
    '',
    `Atendimento: ${EMPRESA_CONTATO} 💬`,
    `Telefone: ${EMPRESA_TELEFONE} 📞`,
  ].join('\n');
}

export default function Precificacao({ custos, pedidos }: PrecificacaoProps) {
  const [calc, setCalc] = useState<Calculo>({
    nome: '',
    gramasFilamento: 0,
    horasImpressao: 4.6,
    impressora: '',
    valorFilamentoKg: 120,
    custoEmbalagem: 4,
    energiaHora: 0.6,
    outrosCustos: 0,
    margemLucro: 150,
    precoVendaManual: 0,
    modoPrecificacao: 'margem',
    taxaMercadoLivre: 0.16,
    taxaFixaML: 6,
    taxaShopee: 0.14,
    taxaFixaShopee: 2,
  });
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [mensagemOrcamento, setMensagemOrcamento] = useState<string>('');

  const impressorasCadastradas = useMemo(() => {
    return Array.from(
      new Set(
        custos
          .filter((custo) => custo.tipo === 'Impressora')
          .map((custo) => custo.descricao.trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [custos]);

  const mediaGramasPorHora = useMemo(() => {
    const mediaPorImpressora = new Map<string, number>();
    const pedidosValidos = pedidos.filter((pedido) => pedido.horasImpressao > 0 && pedido.gramasFilamento > 0);

    impressorasCadastradas.forEach((impressora) => {
      const pedidosDaImpressora = pedidosValidos.filter((pedido) => pedido.impressora.trim() === impressora);
      if (pedidosDaImpressora.length === 0) {
        return;
      }

      const totalGramas = pedidosDaImpressora.reduce((sum, pedido) => sum + pedido.gramasFilamento, 0);
      const totalHoras = pedidosDaImpressora.reduce((sum, pedido) => sum + pedido.horasImpressao, 0);
      if (totalHoras > 0) {
        mediaPorImpressora.set(impressora, totalGramas / totalHoras);
      }
    });

    const totalGramasGlobal = pedidosValidos.reduce((sum, pedido) => sum + pedido.gramasFilamento, 0);
    const totalHorasGlobal = pedidosValidos.reduce((sum, pedido) => sum + pedido.horasImpressao, 0);
    const mediaGlobal = totalHorasGlobal > 0 ? totalGramasGlobal / totalHorasGlobal : 12;

    return { mediaPorImpressora, mediaGlobal };
  }, [impressorasCadastradas, pedidos]);

  const resultado = useMemo(() => {
    const gramasHora = calc.impressora
      ? mediaGramasPorHora.mediaPorImpressora.get(calc.impressora) ?? mediaGramasPorHora.mediaGlobal
      : mediaGramasPorHora.mediaGlobal;
    const gramasEstimadas = calc.horasImpressao * gramasHora;
    const gramasConsideradas = calc.gramasFilamento > 0 ? calc.gramasFilamento : gramasEstimadas;
    const custoFilamento = (gramasConsideradas / 1000) * calc.valorFilamentoKg;
    const custoEnergia = calc.horasImpressao * calc.energiaHora;
    const cmvTotal = custoFilamento + custoEnergia + calc.custoEmbalagem + calc.outrosCustos;
    const margemAplicada = calc.modoPrecificacao === 'preco'
      ? calcularMargemPorPreco(calc.precoVendaManual, cmvTotal)
      : clampMargem(calc.margemLucro);
    const precoDireto = calc.modoPrecificacao === 'preco'
      ? Math.max(calc.precoVendaManual, 0)
      : calcularPrecoDireto(cmvTotal, margemAplicada);
    const lucroDesejado = Math.max(precoDireto - cmvTotal, 0);
    const vendaDireta = calcularCanal(cmvTotal, lucroDesejado, 0, 0);
    const mercadoLivre = calcularCanal(cmvTotal, lucroDesejado, calc.taxaMercadoLivre, calc.taxaFixaML);
    const shopee = calcularCanal(cmvTotal, lucroDesejado, calc.taxaShopee, calc.taxaFixaShopee);

    return {
      gramasConsideradas,
      gramasEstimadas,
      custoFilamento,
      custoEnergia,
      custoEmbalagem: calc.custoEmbalagem,
      outrosCustos: calc.outrosCustos,
      cmvTotal,
      margemAplicada,
      precoDireto,
      lucroDesejado,
      vendaDireta,
      mercadoLivre,
      shopee,
    };
  }, [calc, mediaGramasPorHora]);

  const composicao = useMemo(() => {
    const items = [
      { label: 'Filamento', value: resultado.custoFilamento, color: '#2563eb' },
      { label: 'Energia', value: resultado.custoEnergia, color: '#f59e0b' },
      { label: 'Embalagem', value: resultado.custoEmbalagem, color: '#10b981' },
      { label: 'Outros', value: resultado.outrosCustos, color: '#8b5cf6' },
    ];

    return items
      .filter((item) => item.value > 0)
      .map((item) => ({
        ...item,
        percentage: resultado.cmvTotal > 0 ? (item.value / resultado.cmvTotal) * 100 : 0,
      }));
  }, [resultado]);

  const donutStyle = useMemo(() => {
    let accumulated = 0;
    const segments = composicao.map((item) => {
      const start = accumulated;
      accumulated += item.percentage;
      return `${item.color} ${start}% ${accumulated}%`;
    });

    return {
      background: segments.length > 0 ? `conic-gradient(${segments.join(', ')})` : '#1f2937',
    };
  }, [composicao]);

  const saveItem = (): HistoricoItem => {
    const item: HistoricoItem = {
      ...calc,
      dataOrcamento: formatDate(new Date()),
      ...resultado,
      mensagemWhatsapp: '',
    };

    return {
      ...item,
      mensagemWhatsapp: buildWhatsappMessage(item),
    };
  };

  const salvarCalculo = () => {
    if (!calc.nome.trim()) return;
    const item = saveItem();
    setHistorico((items) => [item, ...items.slice(0, 9)]);
    setMensagemOrcamento(item.mensagemWhatsapp);
  };

  const editarCalculo = (index: number) => {
    const item = historico[index];
    setCalc({
      nome: item.nome,
      gramasFilamento: item.gramasFilamento,
      horasImpressao: item.horasImpressao,
      impressora: item.impressora,
      valorFilamentoKg: item.valorFilamentoKg,
      custoEmbalagem: item.custoEmbalagem,
      energiaHora: item.energiaHora,
      outrosCustos: item.outrosCustos,
      margemLucro: item.margemLucro,
      precoVendaManual: item.precoVendaManual,
      modoPrecificacao: item.modoPrecificacao,
      taxaMercadoLivre: item.taxaMercadoLivre,
      taxaFixaML: item.taxaFixaML,
      taxaShopee: item.taxaShopee,
      taxaFixaShopee: item.taxaFixaShopee,
    });
    setEditingIndex(index);
    setMensagemOrcamento(item.mensagemWhatsapp);
  };

  const salvarEdicao = () => {
    if (editingIndex === null || !calc.nome.trim()) return;
    const item = saveItem();
    setHistorico((items) => items.map((current, index) => index === editingIndex ? item : current));
    setEditingIndex(null);
    setMensagemOrcamento(item.mensagemWhatsapp);
  };

  const excluirCalculo = (index: number) => {
    setHistorico((items) => items.filter((_, itemIndex) => itemIndex !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  const copiarMensagem = async () => {
    if (!mensagemOrcamento) return;
    await navigator.clipboard.writeText(mensagemOrcamento);
  };

  const abrirWhatsapp = () => {
    if (!mensagemOrcamento) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(mensagemOrcamento)}`, '_blank', 'noopener,noreferrer');
  };

  const fmt = formatCurrency;
  const pct = (value: number) => `${value.toFixed(1)}%`;
  const logoShopee = `${import.meta.env.BASE_URL}shopee-badge.svg`;
  const logoMercadoLivre = `${import.meta.env.BASE_URL}mercado-livre-badge.svg`;

  return (
    <div className="space-y-3 p-3 sm:p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-white sm:text-xl">Precificação Avançada</h1>
          <p className="mt-0.5 text-[11px] text-[#6b7280] sm:text-xs">Simule custo, taxas e lucro por canal com visão compacta para desktop e celular.</p>
        </div>
        <div className="hidden rounded-full border border-[#1f2a44] bg-[#141a28] px-3 py-1 text-[11px] text-[#9ca3af] lg:block">
          CMV R$ {fmt(resultado.cmvTotal)} | Margem {resultado.margemAplicada.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <section className="rounded-2xl border border-[#1e1e35] bg-[#10131d] p-3 shadow-[0_20px_48px_rgba(3,7,18,0.28)] xl:col-span-7">
          <h2 className="text-sm font-semibold text-white">Dados e Material</h2>
          <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-6">
            <Field label="Nome da peça" className="sm:col-span-2 xl:col-span-2">
              <input
                type="text"
                value={calc.nome}
                onChange={(e) => setCalc((current) => ({ ...current, nome: e.target.value }))}
                placeholder="Ex: Scorpions"
                className="w-full rounded-xl border border-[#23283b] bg-[#171b28] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-[#4b5563] focus:border-[#3b82f6]"
              />
            </Field>
            <Field label="Gramas de filamento usada">
              <InputWithSuffix suffix="g" value={calc.gramasFilamento} onChange={(value) => setCalc((current) => ({ ...current, gramasFilamento: Math.max(0, value) }))} preserveZero min={0} step="1" />
            </Field>
            <Field label="Tempo de impressão">
              <InputWithSuffix suffix="h" value={calc.horasImpressao} onChange={(value) => setCalc((current) => ({ ...current, horasImpressao: value }))} />
            </Field>
            <Field label="Impressora utilizada" className="sm:col-span-2 xl:col-span-2">
              <select
                value={calc.impressora}
                onChange={(e) => setCalc((current) => ({ ...current, impressora: e.target.value }))}
                className="w-full rounded-xl border border-[#23283b] bg-[#171b28] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#3b82f6]"
              >
                <option value="">Selecione uma impressora</option>
                {impressorasCadastradas.map((impressora) => (
                  <option key={impressora} value={impressora}>{impressora}</option>
                ))}
              </select>
            </Field>
            <Field label="Valor do filamento (kg)">
              <InputWithSuffix prefix="R$" value={calc.valorFilamentoKg} onChange={(value) => setCalc((current) => ({ ...current, valorFilamentoKg: value }))} />
            </Field>
            <div className="rounded-xl border border-[#23283b] bg-[#131827] px-3 py-2.5 sm:col-span-2 xl:col-span-6">
              <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                <QuoteMetric label="Gramas cobradas" value={`${fmt(resultado.gramasConsideradas)}g`} accent="text-[#60a5fa]" />
                <QuoteMetric label="Custo do filamento" value={`R$ ${fmt(resultado.custoFilamento)}`} accent="text-[#60a5fa]" />
                <QuoteMetric label="Media por hora" value={`${fmt(calc.horasImpressao > 0 ? resultado.gramasEstimadas / calc.horasImpressao : 0)}g/h`} accent="text-[#fbbf24]" />
                <QuoteMetric label="Base usada" value={calc.gramasFilamento > 0 ? 'Digitada manualmente' : calc.impressora ? calc.impressora : 'Media geral'} accent="text-white" />
              </div>
              <p className="mt-2 text-[11px] leading-5 text-[#6b7280]">Se informar as gramas manualmente, esse valor tem prioridade. Se deixar em branco, o sistema usa a média histórica da impressora.</p>
            </div>

            <Field label="Custo embalagem">
              <InputWithSuffix prefix="R$" value={calc.custoEmbalagem} onChange={(value) => setCalc((current) => ({ ...current, custoEmbalagem: value }))} />
            </Field>
            <Field label="Energia por hora">
              <InputWithSuffix suffix="R$/h" value={calc.energiaHora} onChange={(value) => setCalc((current) => ({ ...current, energiaHora: value }))} />
            </Field>
            <Field label="Outros custos">
              <InputWithSuffix prefix="R$" value={calc.outrosCustos} onChange={(value) => setCalc((current) => ({ ...current, outrosCustos: value }))} />
            </Field>
            <div className="rounded-xl border border-[#23283b] bg-[#131827] px-3 py-2.5 sm:col-span-2 xl:col-span-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#6b7280]">Custos auxiliares</p>
              <p className="mt-1 text-sm font-semibold text-white">R$ {fmt(resultado.custoEnergia + calc.custoEmbalagem + calc.outrosCustos)}</p>
              <p className="mt-1 text-[11px] leading-5 text-[#9ca3af]">Energia, embalagem e adicionais somados no mesmo card.</p>
            </div>
            <div className="hidden xl:block xl:col-span-3"></div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#1e1e35] bg-[#10131d] p-3 shadow-[0_20px_48px_rgba(3,7,18,0.28)] xl:col-span-5">
          <h2 className="text-sm font-semibold text-white">CMV e Margem de Lucro</h2>
          <div className="mt-2 space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-[#1f2a44] bg-[#141a28] px-3 py-2.5 text-center">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#6b7280]">CMV Total</p>
                <p className="mt-1 text-2xl font-bold text-[#60a5fa]">R$ {fmt(resultado.cmvTotal)}</p>
                <p className="mt-1 text-[11px] text-[#9ca3af]">Lucro desejado: <span className="font-semibold text-white">R$ {fmt(resultado.lucroDesejado)}</span></p>
              </div>
              <div className="rounded-xl border border-[#1f2a44] bg-[#141a28] px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={donutStyle}>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#111827] text-center text-[9px] font-medium text-[#9ca3af]">
                      CMV
                    </div>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {composicao.slice(0, 3).map((item) => (
                      <div key={item.label} className="flex items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                          <span className="text-[#d1d5db]">{item.label}</span>
                        </div>
                        <span className="text-white">R$ {fmt(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#23283b] bg-[#131827] px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#6b7280]">Margem de lucro</p>
                  <p className="mt-1 text-[11px] text-[#9ca3af]">Defina o lucro desejado entre 0% e 10.000% ou informe o preço manual.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-[#2563eb]/30 bg-[#2563eb]/10 px-2.5 py-1 text-xs font-semibold text-[#60a5fa]">
                    {resultado.margemAplicada.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
                  </span>
                  <div className="w-24 sm:w-28">
                    <InputWithSuffix suffix="%" value={calc.margemLucro} onChange={(value) => setCalc((current) => ({ ...current, margemLucro: clampMargem(value), modoPrecificacao: 'margem' }))} preserveZero min={0} max={MARGEM_MAXIMA} step="1" />
                  </div>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-[11px] text-[#6b7280]">Preço a ser cobrado</p>
                  <InputWithSuffix prefix="R$" value={calc.precoVendaManual} onChange={(value) => setCalc((current) => ({ ...current, precoVendaManual: Math.max(0, value), margemLucro: calcularMargemPorPreco(Math.max(0, value), resultado.cmvTotal), modoPrecificacao: 'preco' }))} preserveZero min={0} />
                </div>
                <div className="rounded-xl border border-[#1f2a44] bg-[#141a28] px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#6b7280]">Modo ativo</p>
                  <p className="mt-1 text-sm font-semibold text-white">{calc.modoPrecificacao === 'preco' ? 'Preço manual' : 'Margem percentual'}</p>
                  <p className="mt-1 text-[11px] text-[#9ca3af]">Preço direto atual: <span className="font-semibold text-white">R$ {fmt(resultado.precoDireto)}</span></p>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="10000"
                step="1"
                value={calc.margemLucro}
                onInput={(e) => setCalc((current) => ({ ...current, margemLucro: clampMargem(Number((e.target as HTMLInputElement).value)), modoPrecificacao: 'margem' }))}
                onChange={(e) => setCalc((current) => ({ ...current, margemLucro: clampMargem(Number(e.target.value)), modoPrecificacao: 'margem' }))}
                aria-valuemin={0}
                aria-valuemax={10000}
                aria-valuenow={resultado.margemAplicada}
                className="mt-2 w-full accent-[#3b82f6]"
              />
              <div className="mt-1 flex justify-between text-[11px] text-[#4b5563]">
                <span>0%</span>
                <span>5.000%</span>
                <span>10.000%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Taxa Mercado Livre">
              <InputWithSuffix suffix="%" value={calc.taxaMercadoLivre * 100} onChange={(value) => setCalc((current) => ({ ...current, taxaMercadoLivre: value / 100 }))} />
              </Field>
              <Field label="Taxa fixa ML">
              <InputWithSuffix prefix="R$" value={calc.taxaFixaML} onChange={(value) => setCalc((current) => ({ ...current, taxaFixaML: value }))} />
              </Field>
              <Field label="Taxa Shopee">
              <InputWithSuffix suffix="%" value={calc.taxaShopee * 100} onChange={(value) => setCalc((current) => ({ ...current, taxaShopee: value / 100 }))} />
              </Field>
              <Field label="Taxa fixa Shopee">
              <InputWithSuffix prefix="R$" value={calc.taxaFixaShopee} onChange={(value) => setCalc((current) => ({ ...current, taxaFixaShopee: value }))} />
              </Field>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#1d2640] bg-[#111827] p-3 shadow-[0_20px_48px_rgba(3,7,18,0.28)] xl:col-span-12">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2563eb]/15 text-[#60a5fa]">
              <i className="ri-pie-chart-2-line text-sm"></i>
            </span>
            <h2 className="text-sm font-semibold text-white">Canais de Venda</h2>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3 xl:grid-cols-12">
            <MarketplaceCard
          title="Venda Direta"
          iconName="ri-store-3-line"
          platformColor="from-[#102418] to-[#0f172a]"
          borderColor="border-[#166534]"
          accentColor="text-[#86efac]"
          result={resultado.vendaDireta}
          margemAlvo={calc.margemLucro}
          fixedLabel="Taxa fixa"
          className="xl:col-span-4"
            />

            <MarketplaceCard
          title="Mercado Livre"
          logoPath={logoMercadoLivre}
          platformColor="from-[#0f172a] to-[#101b36]"
          borderColor="border-[#284b9b]"
          accentColor="text-[#fde047]"
          result={resultado.mercadoLivre}
          margemAlvo={calc.margemLucro}
          fixedLabel="Taxa fixa ML"
          className="xl:col-span-4"
            />

            <MarketplaceCard
          title="Shopee"
          logoPath={logoShopee}
          platformColor="from-[#2a120d] to-[#121826]"
          borderColor="border-[#c2410c]"
          accentColor="text-[#34d399]"
          result={resultado.shopee}
          margemAlvo={calc.margemLucro}
          fixedLabel="Taxa fixa Shopee"
          className="xl:col-span-4"
            />
          </div>
        </section>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={editingIndex === null ? salvarCalculo : salvarEdicao}
          disabled={!calc.nome.trim()}
          className="flex-1 rounded-xl bg-gradient-to-r from-[#2563eb] to-[#10b981] px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <i className="ri-save-line mr-2"></i>{editingIndex === null ? 'Salvar no Histórico' : 'Salvar Alterações'}
        </button>
        {editingIndex !== null && (
          <button
            onClick={() => setEditingIndex(null)}
            className="rounded-xl border border-[#23283b] bg-[#171b28] px-4 py-3 text-sm font-medium text-[#9ca3af] transition-colors hover:text-white"
          >
            Cancelar Edição
          </button>
        )}
      </div>

      {mensagemOrcamento && (
        <details className="overflow-hidden rounded-2xl border border-[#1e1e35] bg-[#0f0f1a]">
          <div className="border-b border-[#1e1e35] px-4 py-3">
            <summary className="cursor-pointer list-none text-sm font-semibold text-white">Mensagem de Orçamento para WhatsApp</summary>
          </div>
          <div className="space-y-3 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-[#6b7280]">Pronta para enviar ao cliente com empresa, data, telefone e mensagem de fidelização.</p>
              <div className="flex gap-2">
                <button onClick={() => void copiarMensagem()} className="rounded-xl border border-[#23283b] bg-[#171b28] px-3 py-2 text-xs text-[#d1d5db] transition-colors hover:text-white">Copiar</button>
                <button onClick={abrirWhatsapp} className="rounded-xl bg-[#16a34a] px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90">Abrir WhatsApp</button>
              </div>
            </div>
            <pre className="whitespace-pre-wrap rounded-xl border border-[#1f2a44] bg-[#141a28] p-3 text-xs leading-5 text-[#d1d5db]">{mensagemOrcamento}</pre>
          </div>
        </details>
      )}

      {historico.length > 0 && (
        <details className="overflow-hidden rounded-2xl border border-[#1e1e35] bg-[#0f0f1a]">
          <div className="border-b border-[#1e1e35] px-5 py-4">
            <summary className="cursor-pointer list-none text-sm font-semibold text-white">Histórico de Cálculos</summary>
          </div>
          <div className="space-y-3 p-4 md:hidden">
            {historico.map((item, index) => (
              <article key={index} className="rounded-xl border border-[#1e1e35] bg-[#121221] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{item.nome}</p>
                    <p className="mt-1 text-xs text-[#6b7280]">Impressora: {item.impressora || 'Nao informada'} | CMV R$ {fmt(item.cmvTotal)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => editarCalculo(index)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2d2d4e] text-[#6b7280] transition-all hover:border-[#2563eb]/40 hover:text-white">
                      <i className="ri-edit-line text-sm"></i>
                    </button>
                    <button onClick={() => excluirCalculo(index)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2d2d4e] text-[#6b7280] transition-all hover:border-[#f87171]/40 hover:text-[#f87171]">
                      <i className="ri-delete-bin-line text-sm"></i>
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <HistoryMetric label="ML Lucro" value={`R$ ${fmt(item.mercadoLivre.lucro)}`} valueClassName="text-[#34d399]" />
                  <HistoryMetric label="Shopee Lucro" value={`R$ ${fmt(item.shopee.lucro)}`} valueClassName="text-[#34d399]" />
                  <HistoryMetric label="Horas" value={`${fmt(item.horasImpressao)}h`} />
                  <HistoryMetric label="Margem alvo" value={`${fmt(item.margemLucro)}%`} />
                </div>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1e1e35]">
                  {['Produto', 'Preco ML', 'Preco Shopee', 'CMV', 'Lucro ML', 'Lucro Shopee', 'Horas', 'Ações'].map((header) => (
                    <th key={header} className="px-4 py-3 text-left text-xs font-medium whitespace-nowrap text-[#6b7280]">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historico.map((item, index) => (
                  <tr key={index} className="border-b border-[#1e1e35] transition-colors hover:bg-[#1a1a2e]">
                    <td className="px-4 py-3 text-white whitespace-nowrap">{item.nome}</td>
                    <td className="px-4 py-3 text-[#d1d5db] whitespace-nowrap">R$ {fmt(item.mercadoLivre.precoSugerido)}</td>
                    <td className="px-4 py-3 text-[#d1d5db] whitespace-nowrap">R$ {fmt(item.shopee.precoSugerido)}</td>
                    <td className="px-4 py-3 text-[#60a5fa] whitespace-nowrap">R$ {fmt(item.cmvTotal)}</td>
                    <td className="px-4 py-3 text-[#34d399] whitespace-nowrap">R$ {fmt(item.mercadoLivre.lucro)}</td>
                    <td className="px-4 py-3 text-[#34d399] whitespace-nowrap">R$ {fmt(item.shopee.lucro)}</td>
                    <td className="px-4 py-3 text-[#9ca3af] whitespace-nowrap">{fmt(item.horasImpressao)}h</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button onClick={() => editarCalculo(index)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2d2d4e] text-[#6b7280] transition-all hover:border-[#2563eb]/40 hover:text-white">
                          <i className="ri-edit-line text-sm"></i>
                        </button>
                        <button onClick={() => excluirCalculo(index)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2d2d4e] text-[#6b7280] transition-all hover:border-[#f87171]/40 hover:text-[#f87171]">
                          <i className="ri-delete-bin-line text-sm"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs text-[#6b7280]">{label}</label>
      {children}
    </div>
  );
}

function InputWithSuffix({
  value,
  onChange,
  prefix,
  suffix,
  preserveZero,
  min,
  max,
  step,
}: {
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  preserveZero?: boolean;
  min?: number;
  max?: number;
  step?: string;
}) {
  return (
    <div className="relative">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#6b7280]">{prefix}</span>}
      <input
        type="number"
        value={value === 0 && !preserveZero ? '' : value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        max={max}
        step={step ?? '0.01'}
        className={`w-full rounded-xl border border-[#23283b] bg-[#171b28] py-2.5 text-sm text-white outline-none transition-colors placeholder:text-[#4b5563] focus:border-[#3b82f6] ${prefix ? 'pl-10' : 'pl-4'} ${suffix ? 'pr-12' : 'pr-4'}`}
      />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6b7280]">{suffix}</span>}
    </div>
  );
}

function MarketplaceCard({
  title,
  logoPath,
  iconName,
  platformColor,
  borderColor,
  accentColor,
  result,
  margemAlvo,
  fixedLabel,
  className,
}: {
  title: string;
  logoPath?: string;
  iconName?: string;
  platformColor: string;
  borderColor: string;
  accentColor: string;
  result: MarketplaceResultado;
  margemAlvo: number;
  fixedLabel: string;
  className?: string;
}) {
  const progressoMargem = Math.max(0, Math.min((result.margemPercentual / MARGEM_MAXIMA) * 100, 100));

  return (
    <section className={`${className ?? ''} rounded-2xl border ${borderColor} bg-gradient-to-br ${platformColor} p-4 shadow-[0_24px_64px_rgba(3,7,18,0.35)]`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {logoPath ? (
            <img src={logoPath} alt={title} className="h-9 w-9 rounded-xl bg-white/90 object-cover p-0.5" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white">
              <i className={`${iconName ?? 'ri-store-3-line'} text-base`}></i>
            </span>
          )}
          <div>
            <h2 className="text-sm font-semibold text-white">{title}</h2>
            <p className="text-[11px] text-[#8b92b0]">Canal de venda</p>
          </div>
        </div>
        <span className="rounded-full border border-[#1f6f57] bg-[#14532d]/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#34d399]">
          Lucro
        </span>
      </div>

      <div className="mt-4 text-center">
        <p className={`text-3xl font-bold ${accentColor}`}>R$ {result.precoSugerido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        <p className="mt-1 text-xs text-[#6b7280]">Preço sugerido</p>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs text-[#8b92b0]">
          <span>Margem aplicada</span>
          <span>{result.margemPercentual.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% de {margemAlvo.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-[#111827]">
          <div className="h-full rounded-full bg-gradient-to-r from-[#10b981] to-[#34d399]" style={{ width: `${progressoMargem}%` }}></div>
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-[#4b5563]">
          <span>0%</span>
          <span>5.000%</span>
          <span>10.000%</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <MetricCard label="Custo plataforma" value={`R$ ${result.custoPlataforma.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
        <MetricCard label="Lucro por peça" value={`R$ ${result.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} valueClassName="text-[#60a5fa] font-bold" />
      </div>

      <div className="mt-3 rounded-xl border border-[#1f2a44] bg-[#141a28] px-4 py-2.5 text-center">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#6b7280]">Preço mínimo para não ter prejuízo</p>
        <p className="mt-1 text-xl font-semibold text-[#60a5fa]">R$ {result.precoMinimo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5 text-xs text-[#8b92b0]">
        <div className="rounded-xl border border-[#1f2a44] bg-[#141a28] px-3 py-2">
          <p>Taxa percentual</p>
          <p className="mt-1 font-semibold text-white">{(result.taxaPercentual * 100).toFixed(1)}%</p>
        </div>
        <div className="rounded-xl border border-[#1f2a44] bg-[#141a28] px-3 py-2">
          <p>{fixedLabel}</p>
          <p className="mt-1 font-semibold text-white">R$ {(result.custoPlataforma - result.precoSugerido * result.taxaPercentual).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="rounded-xl border border-[#1f2a44] bg-[#141a28] px-3 py-2 col-span-2">
          <p>Custo total da unidade</p>
          <p className="mt-1 font-semibold text-white">R$ {result.custoUnidade.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      </div>
    </section>
  );
}

function QuoteMetric({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl border border-[#1f2a44] bg-[#141a28] px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[#6b7280]">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${accent}`}>{value}</p>
    </div>
  );
}

function MetricCard({ label, value, valueClassName = 'text-white font-semibold' }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="rounded-xl border border-[#1f2a44] bg-[#141a28] px-3 py-2.5 text-center">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[#6b7280]">{label}</p>
      <p className={`mt-1 text-base ${valueClassName}`}>{value}</p>
    </div>
  );
}

function HistoryMetric({ label, value, valueClassName = 'text-white' }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.18em] text-[#6b7280]">{label}</p>
      <p className={`mt-1 ${valueClassName}`}>{value}</p>
    </div>
  );
}
