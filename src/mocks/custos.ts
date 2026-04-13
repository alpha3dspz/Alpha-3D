export type TipoCusto = 'Filamento' | 'Impressora' | 'Manutenção' | 'Ferramenta' | 'Outros';

export interface Custo {
  id: string;
  tipo: TipoCusto;
  descricao: string;
  valor: number;
  data: string;
}
