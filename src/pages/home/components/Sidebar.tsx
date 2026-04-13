import { useState } from 'react';

export type ActiveTab = 'dashboard' | 'pedidos' | 'custos' | 'precificacao' | 'catalogo' | 'relatorios';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

const navItems: { id: ActiveTab; icon: string; label: string }[] = [
  { id: 'dashboard', icon: 'ri-dashboard-3-line', label: 'Dashboard' },
  { id: 'pedidos', icon: 'ri-file-list-3-line', label: 'Pedidos' },
  { id: 'custos', icon: 'ri-shopping-cart-2-line', label: 'Custos' },
  { id: 'precificacao', icon: 'ri-calculator-line', label: 'Precificação' },
  { id: 'catalogo', icon: 'ri-store-2-line', label: 'Catálogo' },
  { id: 'relatorios', icon: 'ri-bar-chart-2-line', label: 'Relatórios' },
];

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`flex flex-col h-screen bg-[#0f0f1a] border-r border-[#1e1e35] transition-all duration-300 ${
        collapsed ? 'w-14' : 'w-48'
      } flex-shrink-0`}
    >
      {/* Logo */}
      <div className={`flex items-center border-b border-[#1e1e35] ${collapsed ? 'justify-center px-2 py-4' : 'px-3 py-5'}`}>
        {!collapsed && (
          <>
            <div className="flex-1 flex items-center justify-center">
              <img
                src="https://public.readdy.ai/ai/img_res/6bd67b31-cec1-4f08-8e1a-45906596921b.png"
                alt="Alpha Personalizados"
                className="w-full max-w-[160px] h-auto object-contain drop-shadow-[0_0_18px_rgba(192,38,211,0.7)]"
              />
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="w-5 h-5 flex items-center justify-center text-[#4b5563] hover:text-white transition-colors cursor-pointer flex-shrink-0"
            >
              <i className="ri-arrow-left-s-line text-base"></i>
            </button>
          </>
        )}
        {collapsed && (
          <img
            src="https://public.readdy.ai/ai/img_res/6bd67b31-cec1-4f08-8e1a-45906596921b.png"
            alt="Alpha"
            className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(192,38,211,0.6)]"
          />
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 mb-0.5 transition-all duration-200 cursor-pointer whitespace-nowrap relative group ${
                isActive ? 'text-white' : 'text-[#6b7280] hover:text-[#d1d5db]'
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-7 bg-gradient-to-b from-[#c026d3] to-[#7c3aed] rounded-r-full"></span>
              )}
              <span
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-200 flex-shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-br from-[#c026d3]/20 to-[#7c3aed]/20 text-[#c084fc]'
                    : 'group-hover:bg-[#1e1e35]'
                }`}
              >
                <i className={`${item.icon} text-sm`}></i>
              </span>
              {!collapsed && (
                <span className="text-xs font-medium">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse toggle at bottom (collapsed state) */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="w-full flex items-center justify-center py-3 text-[#6b7280] hover:text-white transition-colors cursor-pointer border-t border-[#1e1e35]"
        >
          <i className="ri-arrow-right-s-line text-base"></i>
        </button>
      )}

      {/* Footer */}
      {!collapsed && (
        <div className="px-3 py-3 border-t border-[#1e1e35]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#c026d3] to-[#7c3aed] flex items-center justify-center flex-shrink-0">
              <i className="ri-user-line text-white text-xs"></i>
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-medium truncate">Admin</p>
              <p className="text-[#4b5563] text-xs truncate">Alpha Personalizados</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
