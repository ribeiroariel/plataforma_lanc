export type GrupoComContagem = {
  id: string;
  nome: string;
  numero_ratos: number;
  ratos_por_leva: number[] | null;
};

export type RatoDoRoster = {
  numero: number;
  grupoId: string;
  grupoNome: string;
  leva: number;
};

/**
 * Gera a lista de ratos esperados do projeto. Numeração sequencial e
 * global, ordenada por leva e depois por grupo: leva 1 (todos os grupos),
 * depois leva 2, etc. Cada rato carrega a sua leva. Se um grupo não tiver
 * ratos_por_leva definido (projeto antigo), cai de volta para numero_ratos
 * na leva 1.
 */
export function gerarRoster(
  grupos: GrupoComContagem[],
  numeroLevas: number
): RatoDoRoster[] {
  const roster: RatoDoRoster[] = [];
  let contador = 1;
  const levas = Math.max(1, numeroLevas || 1);

  for (let leva = 1; leva <= levas; leva++) {
    for (const grupo of grupos) {
      const porLeva = grupo.ratos_por_leva;
      const n =
        porLeva && porLeva.length > 0
          ? porLeva[leva - 1] ?? 0
          : leva === 1
          ? grupo.numero_ratos
          : 0;
      for (let i = 0; i < n; i++) {
        roster.push({
          numero: contador++,
          grupoId: grupo.id,
          grupoNome: grupo.nome,
          leva,
        });
      }
    }
  }
  return roster;
}
