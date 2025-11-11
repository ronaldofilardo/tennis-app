export interface MatrizItem {
  id: number;
  Resultado: string;
  Golpe: string;
  Efeito: string;
  Direcao: string;
  RespostaAdv?: string;
}

import matrizDataJson from './matriz.json';

export interface MatrizItem {
  id: number;
  Resultado: string;
  Golpe: string;
  Efeito: string;
  Direcao: string;
  RespostaAdv?: string;
}

export const matrizData: MatrizItem[] = matrizDataJson as MatrizItem[];
