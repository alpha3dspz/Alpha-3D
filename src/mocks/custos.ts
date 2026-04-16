export type TipoCusto = 'Filamento' | 'Impressora' | 'Manutenção' | 'Ferramenta' | 'Acessórios' | 'Peças' | 'Outros';

export interface Custo {
  id: string;
  tipo: TipoCusto;
  descricao: string;
  valor: number;
  quantidade: number;
  data: string;
}
