import { useState, useEffect } from 'react';
import Sidebar, { type ActiveTab } from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Pedidos from './components/Pedidos';
import Custos from './components/Custos';
import Precificacao from './components/Precificacao';
import Catalogo from './components/Catalogo';
import Relatorios from './components/Relatorios';
import type { Pedido } from '@/mocks/pedidos';
import type { Custo } from '@/mocks/custos';
import type { Produto } from '@/mocks/produtos';

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

function normalizePedido(pedido: Partial<Pedido> & { id: string }): Pedido {
  const valorVenda = Number(pedido.valorVenda) || 0;
  const custo = Number(pedido.custo) || 0;

  return {
    id: pedido.id,
    cliente: pedido.cliente ?? '',
    produto: pedido.produto ?? '',
    gramasFilamento: Number(pedido.gramasFilamento) || 0,
    status: pedido.status ?? 'Orçamento',
    pago: Boolean(pedido.pago),
    valorVenda,
    custo,
    horasImpressao: Number(pedido.horasImpressao) || 0,
    lucro: valorVenda - custo,
    data: pedido.data ?? new Date().toISOString().split('T')[0],
  };
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [pedidos, setPedidos] = useState<Pedido[]>(() => loadFromStorage<Pedido>(STORAGE_KEYS.pedidos).map(pedido => normalizePedido(pedido)));
  const [custos, setCustos] = useState<Custo[]>(() => loadFromStorage<Custo>(STORAGE_KEYS.custos));
  const [produtos, setProdutos] = useState<Produto[]>(() => loadFromStorage<Produto>(STORAGE_KEYS.produtos));
  const [saveIndicator, setSaveIndicator] = useState(false);

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
    localStorage.setItem(STORAGE_KEYS.produtos, JSON.stringify(produtos));
    showSave();
  }, [produtos]);

  return (
    <div className="flex h-screen bg-[#080812] overflow-hidden font-sans">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        {/* Save indicator */}
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-[#059669]/20 border border-[#059669]/40 rounded-lg text-[#34d399] text-xs font-medium transition-all duration-300 ${
            saveIndicator ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
          }`}
        >
          <i className="ri-check-line"></i>
          Salvo automaticamente
        </div>

        {activeTab === 'dashboard' && (
          <Dashboard pedidos={pedidos} custos={custos} />
        )}
        {activeTab === 'pedidos' && (
          <Pedidos pedidos={pedidos} produtos={produtos} onChange={setPedidos} />
        )}
        {activeTab === 'custos' && (
          <Custos custos={custos} pedidos={pedidos} onChange={setCustos} />
        )}
        {activeTab === 'precificacao' && (
          <Precificacao />
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
