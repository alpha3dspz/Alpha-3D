import { useState } from 'react';

export type ActiveTab = 'dashboard' | 'financeiro' | 'pedidos' | 'custos' | 'precificacao' | 'catalogo' | 'relatorios';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

const navItems: { id: ActiveTab; icon: string; label: string }[] = [
  { id: 'dashboard', icon: 'ri-dashboard-3-line', label: 'Dashboard' },
  { id: 'financeiro', icon: 'ri-wallet-3-line', label: 'Financeiro' },
  { id: 'pedidos', icon: 'ri-file-list-3-line', label: 'Pedidos' },
  { id: 'custos', icon: 'ri-shopping-cart-2-line', label: 'Custos' },
  { id: 'precificacao', icon: 'ri-calculator-line', label: 'Precificação' },
  { id: 'catalogo', icon: 'ri-store-2-line', label: 'Catálogo' },
  { id: 'relatorios', icon: 'ri-bar-chart-2-line', label: 'Relatórios' },
];

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const activeItem = navItems.find((item) => item.id === activeTab);
  const brandLogo = `${import.meta.env.BASE_URL}alpha-logo.svg`;
  const brandMark = `${import.meta.env.BASE_URL}favicon.svg`;

  return (
    <>
      <div className="sticky top-0 z-40 border-b border-[#1e1e35] bg-[#0c0c15]/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <img src={brandMark} alt="Alpha 3D" className="h-11 w-11 rounded-2xl border border-[#2d2d4e] bg-black p-1.5 shadow-[0_0_24px_rgba(124,58,237,0.25)]" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-[0.24em] text-white">ALPHA 3D</p>
              <p className="truncate text-xs text-[#8b92b0]">{activeItem?.label ?? 'Painel'}</p>
            </div>
          </div>
          <span className="rounded-full border border-[#2d2d4e] bg-[#141423] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[#c084fc]">
            Mobile
          </span>
        </div>
      </div>

      <aside
        className={`hidden shrink-0 border-r border-[#1e1e35] bg-[#0f0f1a] transition-all duration-300 lg:flex lg:h-dvh lg:flex-col ${
          collapsed ? 'lg:w-16' : 'lg:w-56'
        }`}
      >
        <div className={`flex items-center border-b border-[#1e1e35] ${collapsed ? 'justify-center px-2 py-4' : 'gap-3 px-4 py-5'}`}>
          {!collapsed && (
            <>
              <div className="flex-1">
                <img src={brandLogo} alt="Alpha 3D" className="h-12 w-full object-contain object-left" />
              </div>
              <button
                onClick={() => setCollapsed(true)}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[#4b5563] transition-colors hover:bg-[#1a1a2e] hover:text-white"
              >
                <i className="ri-arrow-left-s-line text-lg"></i>
              </button>
            </>
          )}
          {collapsed && (
            <img src={brandMark} alt="Alpha 3D" className="h-10 w-10 rounded-2xl border border-[#2d2d4e] bg-black p-1.5" />
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`group relative mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200 ${
                  isActive ? 'bg-[#151528] text-white' : 'text-[#6b7280] hover:bg-[#141423] hover:text-[#d1d5db]'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-[#c026d3] to-[#06b6d4]"></span>
                )}
                <span
                  className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-br from-[#c026d3]/20 to-[#06b6d4]/20 text-[#d8b4fe]'
                      : 'group-hover:bg-[#1e1e35]'
                  }`}
                >
                  <i className={`${item.icon} text-base`}></i>
                </span>
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="border-t border-[#1e1e35] py-3 text-[#6b7280] transition-colors hover:text-white"
          >
            <i className="ri-arrow-right-s-line text-lg"></i>
          </button>
        )}

        {!collapsed && (
          <div className="border-t border-[#1e1e35] px-4 py-4">
            <div className="rounded-2xl border border-[#1f1f35] bg-[#121221] p-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#6b7280]">Painel</p>
              <p className="mt-1 text-sm font-semibold text-white">Admin</p>
              <p className="text-xs text-[#4b5563]">Alpha Personalizados</p>
            </div>
          </div>
        )}
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#1e1e35] bg-[#0c0c15]/95 px-2 pt-2 backdrop-blur lg:hidden">
        <div className="grid grid-cols-7 gap-1 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-center transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-b from-[#211431] to-[#111827] text-white'
                    : 'text-[#717896]'
                }`}
              >
                <i className={`${item.icon} text-lg ${isActive ? 'text-[#d8b4fe]' : ''}`}></i>
                <span className="text-[10px] font-medium leading-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
