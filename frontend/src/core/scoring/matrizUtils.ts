// Utilitário para filtrar opções da matriz em cascata
import { matrizData } from '../../data/matrizData';
import type { MatrizItem } from '../../data/matrizData';

export function getResultados(): string[] {
  return ['Erro forçado - EF', 'Erro não Forçado - ENF', 'Winner'];
}

export function getGolpes(resultados: string[]): string[] {
  return [
    'Forehand - FH', 'Backhand - BH', 'Voleio Forehand - VFH', 'Voleio Backhand - VBH',
    'Smash - SM', 'Swingvolley - FH', 'Swingvolley - BH', 'Drop volley - FH', 'Drop volley - BH',
    'Drop shot - FH', 'Drop shot - BH'
  ];
}

export function getEfeitos(resultados: string[], golpes: string[]): string[] {
  return ['Chapado', 'Top spin', 'Cortado'];
}

export function getDirecoes(resultados: string[], golpes: string[], efeitos: string[]): string[] {
  return ['Centro', 'Cruzada', 'Inside In', 'Inside Out', 'Paralela'];
}

export function getRespostaAdv(resultados: string[], golpes: string[], efeitos: string[], direcoes: string[]): string[] {
  return Array.from(new Set(
  matrizData
      .filter((item: MatrizItem) =>
        resultados.includes(item.Resultado) &&
        golpes.includes(item.Golpe) &&
        efeitos.includes(item.Efeito) &&
        direcoes.includes(item.Direcao)
      )
      .map((item: MatrizItem) => item.RespostaAdv)
      .filter((v): v is string => Boolean(v))
  ));
}

export function getMatrizItem(resultado: string, golpe: string, efeito: string, direcao: string, respostaAdv?: string): MatrizItem | undefined {
  return matrizData.find((item: MatrizItem) =>
    item.Resultado === resultado &&
    item.Golpe === golpe &&
    item.Efeito === efeito &&
    item.Direcao === direcao &&
    (respostaAdv ? item.RespostaAdv === respostaAdv : true)
  );
}
