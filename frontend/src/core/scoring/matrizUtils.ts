// Utilitário para filtrar opções da matriz em cascata
import { matrizData } from '../../data/matrizData';
import type { MatrizItem } from '../../data/matrizData';

export function getResultados(): string[] {
  return Array.from(new Set(matrizData.map(item => item.Resultado)));
}

export function getGolpes(resultados: string[]): string[] {
  if (resultados.length === 0) return [];

  let filteredData = matrizData.filter(item => resultados.includes(item.Resultado));

  // Regra 3: Para "Erro forçado - EF", remover opções de golpes proibidos
  if (resultados.includes('Erro forçado - EF')) {
    const forbiddenShots = ['Swingvolley - BH', 'Swingvolley - FH', 'Drop shot - BH', 'Drop shot - FH'];
    filteredData = filteredData.filter(item => !forbiddenShots.includes(item.Golpe));
  }

  return Array.from(new Set(filteredData.map(item => item.Golpe)));
}

export function getEfeitos(resultados: string[], golpes: string[]): string[] {
  if (resultados.length === 0 || golpes.length === 0) return [];

  let filteredData = matrizData.filter(item =>
    resultados.includes(item.Resultado) &&
    golpes.includes(item.Golpe)
  );

  // Aplicar filtro de EF se necessário
  if (resultados.includes('Erro forçado - EF')) {
    const forbiddenShots = ['Swingvolley - BH', 'Swingvolley - FH', 'Drop shot - BH', 'Drop shot - FH'];
    filteredData = filteredData.filter(item => !forbiddenShots.includes(item.Golpe));
  }

  return Array.from(new Set(filteredData.map(item => item.Efeito)));
}

export function getDirecoes(resultados: string[], golpes: string[], efeitos: string[]): string[] {
  if (resultados.length === 0 || golpes.length === 0 || efeitos.length === 0) return [];

  let filteredData = matrizData.filter(item =>
    resultados.includes(item.Resultado) &&
    golpes.includes(item.Golpe) &&
    efeitos.includes(item.Efeito)
  );

  // Aplicar filtro de EF se necessário
  if (resultados.includes('Erro forçado - EF')) {
    const forbiddenShots = ['Swingvolley - BH', 'Swingvolley - FH', 'Drop shot - BH', 'Drop shot - FH'];
    filteredData = filteredData.filter(item => !forbiddenShots.includes(item.Golpe));
  }

  return Array.from(new Set(filteredData.map(item => item.Direcao)));
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
