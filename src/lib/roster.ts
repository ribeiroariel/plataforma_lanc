export type GrupoComContagem = {
  id: string;
  nome: string;
  numero_ratos: number;
};

export type RatoDoRoster = {
  numero: number;
  grupoId: string;
  grupoNome: string;
};

/**
 * Gera a lista de ratos esperados do projeto: numeração sequencial e
 * global, na ordem dos grupos (grupo 1 = ratos 1..N1, grupo 2 = ratos
 * N1+1..N1+N2, ...) — mesmo esquema já usado nas planilhas do Ariel fora
 * do site (ver "Para análise estatísica/*_organizado_*.xlsx").
 */
export function gerarRoster(grupos: GrupoComContagem[]): RatoDoRoster[] {
  const roster: RatoDoRoster[] = [];
  let contador = 1;
  for (const grupo of grupos) {
    for (let i = 0; i < grupo.numero_ratos; i++) {
      roster.push({ numero: contador, grupoId: grupo.id, grupoNome: grupo.nome });
      contador++;
    }
  }
  return roster;
}
