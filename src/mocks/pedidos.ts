export type StatusPedido = 'Orçamento' | 'Fechado' | 'Em andamento' | 'Concluído' | 'Retirado';

export interface Pedido {
  id: string;
  cliente: string;
  produto: string;
  gramasFilamento: number;
  status: StatusPedido;
  pago: boolean;
  valorVenda: number;
  custo: number;
  horasImpressao: number;
  lucro: number;
  data: string;
}
