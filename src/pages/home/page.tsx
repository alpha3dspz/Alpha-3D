import { useState, useEffect, useRef } from 'react';
import Sidebar, { type ActiveTab } from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Financeiro from './components/Financeiro';
import Pedidos from './components/Pedidos';
import Custos from './components/Custos';
import Precificacao from './components/Precificacao';
import Catalogo from './components/Catalogo';
import Relatorios from './components/Relatorios';
import { calculatePedidoMetrics, clampPedidoValorPago, isPedidoPago, normalizePedidoItem, type Pedido, type PedidoItem } from '@/mocks/pedidos';
import type { Custo } from '@/mocks/custos';
import type { Produto } from '@/mocks/produtos';
import { isSupabaseEnabled, supabase } from '@/lib/supabase';

const STORAGE_KEYS = {
  pedidos: 'alpha_pedidos',
  custos: 'alpha_custos',
  produtos: 'alpha_produtos',
};

const LEGACY_MOCK_IDS: Record<string, string[]> = {
  [STORAGE_KEYS.pedidos]: ['PED-001', 'PED-002', 'PED-003', 'PED-004', 'PED-005', 'PED-006', 'PED-007', 'PED-008', 'PED-009', 'PED-010', 'PED-011', 'PED-012'],
  [STORAGE_KEYS.custos]: ['CST-001', 'CST-002', 'CST-003', 'CST-004', 'CST-005', 'CST-006', 'CST-007', 'CST-008', 'CST-009', 'CST-010', 'CST-011', 'CST-012'],
  [STORAGE_KEYS.produtos]: ['PRD-001', 'PRD-002', 'PRD-003', 'PRD-004', 'PRD-005', 'PRD-006'],
};

function isLegacyMockData(value: unknown, key: string): value is Array<{ id: string }> {
  if (!Array.isArray(value)) {
    return false;
  }

  const legacyIds = LEGACY_MOCK_IDS[key];
  return value.length === legacyIds.length && value.every((item, index) => {
    return typeof item === 'object' && item !== null && 'id' in item && item.id === legacyIds[index];
  });
}

function loadFromStorage<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (isLegacyMockData(parsed, key)) {
      localStorage.removeItem(key);
      return [];
    }

    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

type PedidoSource = Partial<Pedido> & {
  id: string;
  quantidade?: number | string | null;
  valor_pago?: number | string | null;
  valor_venda?: number | string | null;
  gramas_filamento?: number | string | null;
  horas_impressao?: number | string | null;
  itens?: Partial<PedidoItem>[] | null;
};

type PedidoSupabaseRow = {
  id: string;
  cliente: string;
  produto: string;
  quantidade: number;
  impressora: string;
  gramas_filamento: number;
  status: Pedido['status'];
  pago: boolean;
  valor_pago: number;
  valor_venda: number;
  custo: number;
  horas_impressao: number;
  data: string;
  itens: PedidoItem[];
};

function normalizePedido(pedido: PedidoSource): Pedido {
  const valorVenda = Number(pedido.valorVenda ?? pedido.valor_venda) || 0;
  const custo = Number(pedido.custo) || 0;
  const gramasFilamento = Number(pedido.gramasFilamento ?? pedido.gramas_filamento) || 0;
  const horasImpressao = Number(pedido.horasImpressao ?? pedido.horas_impressao) || 0;
  const quantidade = Math.max(1, Math.floor(Number(pedido.quantidade) || 1));
  const valorPagoSource = pedido.valorPago ?? pedido.valor_pago;

  const legacyItem = normalizePedidoItem({
    produto: pedido.produto ?? '',
    quantidade,
    valorVenda,
    custo,
    gramasFilamento,
    horasImpressao,
  });

  const calculated = calculatePedidoMetrics(
    Array.isArray(pedido.itens) && pedido.itens.length > 0 ? pedido.itens : [legacyItem]
  );
  const hasItems = calculated.itens.length > 0;
  const normalizedValorVenda = hasItems ? calculated.valorVenda : valorVenda;
  const valorPago = clampPedidoValorPago(
    valorPagoSource == null ? (Boolean(pedido.pago) ? normalizedValorVenda : 0) : Number(valorPagoSource),
    normalizedValorVenda
  );

  return {
    id: pedido.id,
    cliente: pedido.cliente ?? '',
    produto: hasItems ? calculated.produto : (pedido.produto ?? ''),
    quantidade: hasItems ? calculated.quantidade : quantidade,
    impressora: pedido.impressora ?? '',
    gramasFilamento: hasItems ? calculated.gramasFilamento : gramasFilamento,
    status: pedido.status ?? 'Orçamento',
    pago: isPedidoPago({ valorVenda: normalizedValorVenda, valorPago }),
    valorPago,
    valorVenda: normalizedValorVenda,
    custo: hasItems ? calculated.custo : custo,
    horasImpressao: hasItems ? calculated.horasImpressao : horasImpressao,
    lucro: hasItems ? calculated.lucro : normalizedValorVenda - custo,
    data: pedido.data ?? new Date().toISOString().split('T')[0],
    itens: hasItems ? calculated.itens : [],
  };
}

function normalizeCusto(custo: Partial<Custo> & { id: string }): Custo {
  return {
    id: custo.id,
    tipo: custo.tipo ?? 'Outros',
    descricao: custo.descricao ?? '',
    valor: Number(custo.valor) || 0,
    quantidade: Number(custo.quantidade) || 1,
    data: custo.data ?? new Date().toISOString().split('T')[0],
  };
}

function normalizeProduto(produto: Partial<Produto> & { id: string }): Produto {
  return {
    id: produto.id,
    nome: produto.nome ?? '',
    descricao: produto.descricao ?? '',
    preco: Number(produto.preco) || 0,
    imagem: produto.imagem ?? '',
    categoria: produto.categoria ?? 'Outros',
  };
}

async function syncProdutosToSupabase(produtos: Produto[]) {
  if (!supabase) {
    return;
  }

  const { data: existingRows, error: fetchError } = await supabase
    .from('produtos')
    .select('id');

  if (fetchError) {
    throw fetchError;
  }

  if (produtos.length > 0) {
    const { error: upsertError } = await supabase
      .from('produtos')
      .upsert(produtos, { onConflict: 'id' });

    if (upsertError) {
      throw upsertError;
    }
  }

  const remoteIds = (existingRows ?? []).map((row) => row.id);
  const localIds = new Set(produtos.map((produto) => produto.id));
  const idsToDelete = remoteIds.filter((id) => !localIds.has(id));

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('produtos')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      throw deleteError;
    }
  }
}

async function syncCustosToSupabase(custos: Custo[]) {
  if (!supabase) {
    return;
  }

  const { data: existingRows, error: fetchError } = await supabase
    .from('custos')
    .select('id');

  if (fetchError) {
    throw fetchError;
  }

  if (custos.length > 0) {
    const { error: upsertError } = await supabase
      .from('custos')
      .upsert(custos, { onConflict: 'id' });

    if (upsertError) {
      throw upsertError;
    }
  }

  const remoteIds = (existingRows ?? []).map((row) => row.id);
  const localIds = new Set(custos.map((custo) => custo.id));
  const idsToDelete = remoteIds.filter((id) => !localIds.has(id));

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('custos')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      throw deleteError;
    }
  }
}

function mapPedidoToSupabaseRow(pedido: Pedido): PedidoSupabaseRow {
  const normalized = normalizePedido(pedido);

  return {
    id: normalized.id,
    cliente: normalized.cliente,
    produto: normalized.produto,
    quantidade: normalized.quantidade,
    impressora: normalized.impressora,
    gramas_filamento: normalized.gramasFilamento,
    status: normalized.status,
    pago: normalized.pago,
    valor_pago: normalized.valorPago,
    valor_venda: normalized.valorVenda,
    custo: normalized.custo,
    horas_impressao: normalized.horasImpressao,
    data: normalized.data,
    itens: normalized.itens,
  };
}

async function syncPedidosToSupabase(pedidos: Pedido[]) {
  if (!supabase) {
    return;
  }

  const { data: existingRows, error: fetchError } = await supabase
    .from('pedidos')
    .select('id');

  if (fetchError) {
    throw fetchError;
  }

  if (pedidos.length > 0) {
    const rows = pedidos.map((pedido) => mapPedidoToSupabaseRow(pedido));
    const { error: upsertError } = await supabase
      .from('pedidos')
      .upsert(rows, { onConflict: 'id' });

    if (upsertError) {
      throw upsertError;
    }
  }

  const remoteIds = (existingRows ?? []).map((row) => row.id);
  const localIds = new Set(pedidos.map((pedido) => pedido.id));
  const idsToDelete = remoteIds.filter((id) => !localIds.has(id));

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('pedidos')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      throw deleteError;
    }
  }
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [pedidos, setPedidos] = useState<Pedido[]>(() => loadFromStorage<Pedido>(STORAGE_KEYS.pedidos).map(pedido => normalizePedido(pedido)));
  const [custos, setCustos] = useState<Custo[]>(() => loadFromStorage<Custo>(STORAGE_KEYS.custos).map(custo => normalizeCusto(custo)));
  const [produtos, setProdutos] = useState<Produto[]>(() => loadFromStorage<Produto>(STORAGE_KEYS.produtos).map(produto => normalizeProduto(produto)));
  const [saveIndicator, setSaveIndicator] = useState(false);
  const initialPedidosRef = useRef(pedidos);
  const initialCustosRef = useRef(custos);
  const initialProdutosRef = useRef(produtos);
  const isHydratingRemotePedidosRef = useRef(false);
  const isHydratingRemoteCustosRef = useRef(false);
  const isHydratingRemoteProdutosRef = useRef(false);
  const hasLoadedRemotePedidosRef = useRef(false);
  const hasLoadedRemoteCustosRef = useRef(false);
  const hasLoadedRemoteProdutosRef = useRef(false);

  const showSave = () => {
    setSaveIndicator(true);
    setTimeout(() => setSaveIndicator(false), 1500);
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.pedidos, JSON.stringify(pedidos));
    showSave();
  }, [pedidos]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.custos, JSON.stringify(custos));
    showSave();
  }, [custos]);

  useEffect(() => {
    if (!isSupabaseEnabled || !supabase || hasLoadedRemotePedidosRef.current) {
      return;
    }

    hasLoadedRemotePedidosRef.current = true;
    isHydratingRemotePedidosRef.current = true;

    const loadRemotePedidos = async () => {
      const { data, error } = await supabase
        .from('pedidos')
        .select('id, cliente, produto, quantidade, impressora, gramas_filamento, status, pago, valor_pago, valor_venda, custo, horas_impressao, data, itens')
        .order('data', { ascending: false });

      if (error) {
        console.error('Erro ao carregar pedidos do Supabase.', error);
        isHydratingRemotePedidosRef.current = false;
        return;
      }

      const remotePedidos = (data ?? []).map((pedido) => normalizePedido(pedido));

      if (remotePedidos.length > 0) {
        setPedidos(remotePedidos);
        isHydratingRemotePedidosRef.current = false;
        return;
      }

      if (initialPedidosRef.current.length > 0) {
        try {
          await syncPedidosToSupabase(initialPedidosRef.current.map((pedido) => normalizePedido(pedido)));
        } catch (syncError) {
          console.error('Erro ao sincronizar pedidos locais com o Supabase.', syncError);
        }
      }

      isHydratingRemotePedidosRef.current = false;
    };

    void loadRemotePedidos();
  }, []);

  useEffect(() => {
    if (!isSupabaseEnabled || !supabase || hasLoadedRemoteCustosRef.current) {
      return;
    }

    hasLoadedRemoteCustosRef.current = true;
    isHydratingRemoteCustosRef.current = true;

    const loadRemoteCustos = async () => {
      const { data, error } = await supabase
        .from('custos')
        .select('id, tipo, descricao, valor, quantidade, data')
        .order('data', { ascending: false });

      if (error) {
        console.error('Erro ao carregar custos do Supabase.', error);
        isHydratingRemoteCustosRef.current = false;
        return;
      }

      const remoteCustos = (data ?? []).map((custo) => normalizeCusto(custo));

      if (remoteCustos.length > 0) {
        setCustos(remoteCustos);
        isHydratingRemoteCustosRef.current = false;
        return;
      }

      if (initialCustosRef.current.length > 0) {
        try {
          await syncCustosToSupabase(initialCustosRef.current.map((custo) => normalizeCusto(custo)));
        } catch (syncError) {
          console.error('Erro ao sincronizar custos locais com o Supabase.', syncError);
        }
      }

      isHydratingRemoteCustosRef.current = false;
    };

    void loadRemoteCustos();
  }, []);

  useEffect(() => {
    if (!isSupabaseEnabled || !supabase || hasLoadedRemoteProdutosRef.current) {
      return;
    }

    hasLoadedRemoteProdutosRef.current = true;
    isHydratingRemoteProdutosRef.current = true;

    const loadRemoteProdutos = async () => {
      const { data, error } = await supabase
        .from('produtos')
        .select('id, nome, descricao, preco, imagem, categoria')
        .order('nome', { ascending: true });

      if (error) {
        console.error('Erro ao carregar produtos do Supabase.', error);
        isHydratingRemoteProdutosRef.current = false;
        return;
      }

      const remoteProdutos = (data ?? []).map((produto) => normalizeProduto(produto));

      if (remoteProdutos.length > 0) {
        setProdutos(remoteProdutos);
        isHydratingRemoteProdutosRef.current = false;
        return;
      }

      if (initialProdutosRef.current.length > 0) {
        try {
          await syncProdutosToSupabase(initialProdutosRef.current.map((produto) => normalizeProduto(produto)));
        } catch (syncError) {
          console.error('Erro ao sincronizar produtos locais com o Supabase.', syncError);
        }
      }

      isHydratingRemoteProdutosRef.current = false;
    };

    void loadRemoteProdutos();
  }, []);

  useEffect(() => {
    if (!isSupabaseEnabled || !supabase || isHydratingRemotePedidosRef.current) {
      return;
    }

    const sync = async () => {
      try {
        await syncPedidosToSupabase(pedidos.map((pedido) => normalizePedido(pedido)));
      } catch (error) {
        console.error('Erro ao salvar pedidos no Supabase.', error);
      }
    };

    void sync();
  }, [pedidos]);

  useEffect(() => {
    if (!isSupabaseEnabled || !supabase || isHydratingRemoteCustosRef.current) {
      return;
    }

    const sync = async () => {
      try {
        await syncCustosToSupabase(custos.map((custo) => normalizeCusto(custo)));
      } catch (error) {
        console.error('Erro ao salvar custos no Supabase.', error);
      }
    };

    void sync();
  }, [custos]);

  useEffect(() => {
    if (!isSupabaseEnabled || !supabase || isHydratingRemoteProdutosRef.current) {
      return;
    }

    const sync = async () => {
      try {
        await syncProdutosToSupabase(produtos.map((produto) => normalizeProduto(produto)));
      } catch (error) {
        console.error('Erro ao salvar produtos no Supabase.', error);
      }
    };

    void sync();
  }, [produtos]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.produtos, JSON.stringify(produtos));
    showSave();
  }, [produtos]);

  return (
    <div className="flex min-h-dvh flex-col bg-[#080812] font-sans text-white lg:flex-row">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="relative flex-1 overflow-y-auto pb-24 lg:pb-0">
        <div
          className={`fixed right-3 top-20 z-50 flex items-center gap-2 rounded-lg border border-[#059669]/40 bg-[#059669]/20 px-3 py-2 text-xs font-medium text-[#34d399] transition-all duration-300 lg:right-4 lg:top-4 ${
            saveIndicator ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
          }`}
        >
          <i className="ri-check-line"></i>
          Salvo automaticamente
        </div>

        {activeTab === 'dashboard' && (
          <Dashboard pedidos={pedidos} custos={custos} />
        )}
        {activeTab === 'financeiro' && (
          <Financeiro pedidos={pedidos} custos={custos} />
        )}
        {activeTab === 'pedidos' && (
          <Pedidos pedidos={pedidos} produtos={produtos} custos={custos} onChange={setPedidos} />
        )}
        {activeTab === 'custos' && (
          <Custos custos={custos} pedidos={pedidos} onChange={setCustos} />
        )}
        {activeTab === 'precificacao' && (
          <Precificacao custos={custos} pedidos={pedidos} />
        )}
        {activeTab === 'catalogo' && (
          <Catalogo produtos={produtos} onChange={setProdutos} />
        )}
        {activeTab === 'relatorios' && (
          <Relatorios pedidos={pedidos} />
        )}
      </main>
    </div>
  );
}
