import { useState, useRef } from 'react';
import type { Produto } from '@/mocks/produtos';

interface CatalogoProps {
  produtos: Produto[];
  onChange: (produtos: Produto[]) => void;
}

const CATEGORIAS = ['Acessórios', 'Decoração', 'Organização', 'Brindes', 'Industrial', 'Outros'];
const WHATSAPP_NUMBER = '5511999999999';

function generateId(produtos: Produto[]): string {
  const max = produtos.reduce((m, p) => {
    const n = parseInt(p.id.replace('PRD-', ''), 10);
    return n > m ? n : m;
  }, 0);
  return `PRD-${String(max + 1).padStart(3, '0')}`;
}

export default function Catalogo({ produtos, onChange }: CatalogoProps) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<string>('Todos');
  const [form, setForm] = useState<Omit<Produto, 'id'>>({
    nome: '', descricao: '', preco: 0, imagem: '', categoria: 'Acessórios',
  });
  const [shareToast, setShareToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = produtos.filter(p => filterCat === 'Todos' || p.categoria === filterCat);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setForm(f => ({ ...f, imagem: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const openAdd = () => {
    setForm({ nome: '', descricao: '', preco: 0, imagem: '', categoria: 'Acessórios' });
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (p: Produto) => {
    setForm({ nome: p.nome, descricao: p.descricao, preco: p.preco, imagem: p.imagem, categoria: p.categoria });
    setEditId(p.id);
    setShowForm(true);
  };

  const saveForm = () => {
    if (!form.nome.trim()) return;
    if (editId) {
      onChange(produtos.map(p => p.id === editId ? { ...p, ...form } : p));
    } else {
      onChange([...produtos, { ...form, id: generateId(produtos) }]);
    }
    setShowForm(false);
    setEditId(null);
  };

  const deleteProduto = (id: string) => onChange(produtos.filter(p => p.id !== id));

  const shareProduct = (p: Produto) => {
    const msg = `Olá! Tenho interesse no produto: *${p.nome}* — R$ ${p.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Poderia me passar mais informações?`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const copyLink = (p: Produto) => {
    const link = `${window.location.origin}?produto=${p.id}`;
    navigator.clipboard.writeText(link).then(() => {
      setShareToast(p.id);
      setTimeout(() => setShareToast(null), 2000);
    });
  };

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Catálogo de Produtos</h1>
          <p className="text-[#6b7280] text-sm mt-1">{produtos.length} produtos cadastrados</p>
        </div>
        <button
          onClick={openAdd}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#c026d3] to-[#7c3aed] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 sm:w-auto"
        >
          <i className="ri-add-line"></i> Novo Produto
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(['Todos', ...CATEGORIAS] as const).map(c => (
          <button
            key={c}
            onClick={() => setFilterCat(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              filterCat === c
                ? 'bg-gradient-to-r from-[#c026d3] to-[#7c3aed] text-white'
                : 'bg-[#1a1a2e] border border-[#2d2d4e] text-[#9ca3af] hover:text-white'
            }`}
          >{c}</button>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="max-h-[92vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl border border-[#2d2d4e] bg-[#0f0f1a] p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">{editId ? 'Editar Produto' : 'Novo Produto'}</h3>
              <button onClick={() => setShowForm(false)} className="w-7 h-7 flex items-center justify-center text-[#6b7280] hover:text-white cursor-pointer">
                <i className="ri-close-line"></i>
              </button>
            </div>

            {/* Image Upload */}
            <div
              onClick={() => fileRef.current?.click()}
              className="w-full h-40 border-2 border-dashed border-[#2d2d4e] rounded-xl flex items-center justify-center cursor-pointer hover:border-[#7c3aed] transition-colors overflow-hidden relative"
            >
              {form.imagem ? (
                <img src={form.imagem} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <i className="ri-image-add-line text-[#4b5563] text-3xl block mb-2"></i>
                  <p className="text-[#4b5563] text-sm">Clique para fazer upload</p>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-[#6b7280] text-xs mb-1 block">Nome do Produto</label>
                <input type="text" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Suporte para celular" className="w-full bg-[#1a1a2e] border border-[#2d2d4e] text-white text-sm px-3 py-2 rounded-lg outline-none focus:border-[#7c3aed] placeholder-[#4b5563]" />
              </div>
              <div>
                <label className="text-[#6b7280] text-xs mb-1 block">Preço (R$)</label>
                <input type="number" value={form.preco || ''} onChange={e => setForm(f => ({ ...f, preco: parseFloat(e.target.value) || 0 }))} placeholder="0,00" className="w-full bg-[#1a1a2e] border border-[#2d2d4e] text-white text-sm px-3 py-2 rounded-lg outline-none focus:border-[#7c3aed] placeholder-[#4b5563]" />
              </div>
              <div>
                <label className="text-[#6b7280] text-xs mb-1 block">Categoria</label>
                <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} className="w-full bg-[#1a1a2e] border border-[#2d2d4e] text-white text-sm px-3 py-2 rounded-lg outline-none focus:border-[#7c3aed] cursor-pointer">
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-[#6b7280] text-xs mb-1 block">Descrição</label>
                <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={3} placeholder="Descreva o produto..." className="w-full bg-[#1a1a2e] border border-[#2d2d4e] text-white text-sm px-3 py-2 rounded-lg outline-none focus:border-[#7c3aed] placeholder-[#4b5563] resize-none" />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button onClick={() => setShowForm(false)} className="px-4 py-2.5 bg-[#1a1a2e] border border-[#2d2d4e] text-[#9ca3af] rounded-lg text-sm cursor-pointer hover:text-white whitespace-nowrap">Cancelar</button>
              <button onClick={saveForm} className="flex-1 py-2.5 bg-gradient-to-r from-[#c026d3] to-[#7c3aed] text-white rounded-lg text-sm font-medium cursor-pointer hover:opacity-90 whitespace-nowrap">Salvar Produto</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map(p => (
          <div key={p.id} className="bg-[#0f0f1a] border border-[#1e1e35] rounded-xl overflow-hidden hover:border-[#3d3d6e] transition-all duration-200 group">
            <div className="w-full h-48 overflow-hidden relative">
              {p.imagem ? (
                <img src={p.imagem} alt={p.nome} className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full bg-[#1a1a2e] flex items-center justify-center">
                  <i className="ri-image-line text-[#374151] text-4xl"></i>
                </div>
              )}
              <div className="absolute top-3 right-3 flex gap-1.5">
                <button onClick={() => openEdit(p)} className="w-7 h-7 flex items-center justify-center bg-black/60 rounded-lg text-white hover:bg-[#7c3aed] transition-colors cursor-pointer">
                  <i className="ri-edit-line text-xs"></i>
                </button>
                <button onClick={() => deleteProduto(p.id)} className="w-7 h-7 flex items-center justify-center bg-black/60 rounded-lg text-white hover:bg-[#f87171]/80 transition-colors cursor-pointer">
                  <i className="ri-delete-bin-line text-xs"></i>
                </button>
              </div>
              <div className="absolute top-3 left-3">
                <span className="px-2 py-0.5 bg-black/60 text-[#a855f7] text-xs rounded-full">{p.categoria}</span>
              </div>
            </div>
            <div className="p-4">
              <h3 className="text-white font-semibold text-sm mb-1">{p.nome}</h3>
              <p className="text-[#6b7280] text-xs mb-3 line-clamp-2">{p.descricao}</p>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[#c084fc] font-bold text-lg">R$ {p.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                <span className="text-[#4b5563] text-xs font-mono">{p.id}</span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={() => shareProduct(p)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#25d366]/10 border border-[#25d366]/30 text-[#25d366] rounded-lg text-xs font-medium hover:bg-[#25d366]/20 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-whatsapp-line"></i> Solicitar Orçamento
                </button>
                <button
                  onClick={() => copyLink(p)}
                  className="h-9 w-full flex items-center justify-center bg-[#1a1a2e] border border-[#2d2d4e] text-[#9ca3af] rounded-lg hover:text-white hover:border-[#7c3aed] transition-all cursor-pointer relative sm:w-9"
                >
                  {shareToast === p.id ? (
                    <i className="ri-check-line text-[#34d399] text-sm"></i>
                  ) : (
                    <i className="ri-share-line text-sm"></i>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-[#4b5563]">
          <i className="ri-store-2-line text-4xl mb-3 block"></i>
          <p className="text-sm">Nenhum produto encontrado</p>
          <button onClick={openAdd} className="mt-3 px-4 py-2 bg-gradient-to-r from-[#c026d3] to-[#7c3aed] text-white rounded-lg text-sm cursor-pointer whitespace-nowrap hover:opacity-90">Adicionar Produto</button>
        </div>
      )}
    </div>
  );
}
