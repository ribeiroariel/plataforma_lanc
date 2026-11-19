// Quantos (e quais) ratos de fato entram num teste, cruzando o roster do
// projeto com o que aconteceu com os animais:
//
//  1. Biotério — `bioterio_caixas.mortos`: mortes durante o tratamento, por
//     caixa (grupo + leva). Não diz QUAL rato morreu, só quantos.
//  2. Sacrifício — `sacrificio_ratos.sobreviveu = false`: o rato, com número,
//     não chegou ao sacrifício (com motivo).
//  3. Sacrifício — destino do tecido: se o órgão daquele tecido foi pra
//     histologia ou não foi coletado, o rato não tem amostra pra bioquímica
//     DAQUELE tecido (ex.: rim direito na histologia e esquerdo não coletado
//     → sai dos testes de rins, mas continua nos de fígado).
//
// Os ratos identificados (2 e 3) saem da tabela de registro. As mortes do
// biotério que ainda não têm número (1 menos as já identificadas no
// sacrifício) não dá pra saber qual rato é — o N efetivo já desconta, e a
// tela avisa para deixar esses em branco.
//
// Este N efetivo é o que alimenta as calculadoras de reagente, o
// procedimento, o consumo real e o progresso do teste.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RatoDoRoster } from "@/lib/roster";
import { orgaosDoTecido } from "@/lib/sacrificio";

export type CaixaMortos = { grupo_id: string; leva: number | null; mortos: number };

export type RatoSacrificio = {
  rato: string;
  grupo_id: string;
  leva: number | null;
  sobreviveu: boolean;
  exclusao_motivo: string | null;
  destino: string | null;
  tecidos: { tecido: string; destino: string }[];
};

export type RatoExcluido = { numero: number; grupoNome: string; motivo: string };

export type RatosEfetivos = {
  /** Roster do teste sem os ratos identificados como fora. */
  ativos: RatoDoRoster[];
  excluidos: RatoExcluido[];
  /** Mortes do biotério ainda sem número de rato, por grupo. */
  semIdentificar: { grupoId: string; grupoNome: string; n: number }[];
  /** Roster original (antes de descontar). */
  previstos: number;
  /** N que vai pra bancada: ativos − mortes sem identificar. */
  nEfetivo: number;
};

const MOTIVO_DESTINO: Record<string, string> = {
  histologia: "tecido foi para histologia",
  nao_coletado: "tecido não coletado",
};

export function calcularRatosEfetivos(params: {
  roster: RatoDoRoster[];
  tecido: string | null;
  caixas: CaixaMortos[];
  sacrificio: RatoSacrificio[];
  /** Ratos que já têm leitura registrada — nunca somem da tabela. */
  comResultado?: Set<string>;
}): RatosEfetivos {
  const { roster, tecido, caixas, sacrificio, comResultado } = params;
  const orgaos = tecido ? orgaosDoTecido(tecido) : [];
  const porRato = new Map(sacrificio.map((s) => [s.rato, s]));
  const levasDoRoster = new Set(roster.map((r) => r.leva));

  const excluidos: RatoExcluido[] = [];
  const ativos: RatoDoRoster[] = [];
  for (const r of roster) {
    const s = porRato.get(String(r.numero));
    let motivo: string | null = null;
    if (s && !s.sobreviveu) {
      motivo = s.exclusao_motivo?.trim()
        ? `não sobreviveu — ${s.exclusao_motivo.trim()}`
        : "não sobreviveu até o sacrifício";
    } else if (s && s.destino === "histologia") {
      motivo = "rato todo foi para histologia";
    } else if (s && orgaos.length > 0) {
      const doTecido = s.tecidos.filter((t) => orgaos.includes(t.tecido));
      if (doTecido.length > 0 && !doTecido.some((t) => t.destino === "coleta")) {
        motivo = MOTIVO_DESTINO[doTecido[0].destino] ?? "tecido não coletado";
      }
    }
    if (motivo && !comResultado?.has(String(r.numero))) {
      excluidos.push({ numero: r.numero, grupoNome: r.grupoNome, motivo });
    } else {
      ativos.push(r);
    }
  }

  // Mortes do biotério ainda sem número: por (grupo, leva), as mortes da
  // caixa menos as já identificadas no sacrifício daquela leva. Caixa sem
  // leva (cadastro antigo) conta como leva 1.
  const nomeGrupo = new Map(roster.map((r) => [r.grupoId, r.grupoNome]));
  const mortosCaixa = new Map<string, number>();
  for (const c of caixas) {
    const leva = c.leva ?? 1;
    if (!levasDoRoster.has(leva) || !nomeGrupo.has(c.grupo_id)) continue;
    const k = `${c.grupo_id}|${leva}`;
    mortosCaixa.set(k, (mortosCaixa.get(k) ?? 0) + Math.max(0, c.mortos));
  }
  const identificados = new Map<string, number>();
  for (const s of sacrificio) {
    if (s.sobreviveu) continue;
    const k = `${s.grupo_id}|${s.leva ?? 1}`;
    identificados.set(k, (identificados.get(k) ?? 0) + 1);
  }
  const semPorGrupo = new Map<string, number>();
  for (const [k, n] of mortosCaixa) {
    const resto = Math.max(0, n - (identificados.get(k) ?? 0));
    if (resto === 0) continue;
    const grupoId = k.split("|")[0];
    semPorGrupo.set(grupoId, (semPorGrupo.get(grupoId) ?? 0) + resto);
  }
  const semIdentificar = Array.from(semPorGrupo.entries()).map(([grupoId, n]) => ({
    grupoId,
    grupoNome: nomeGrupo.get(grupoId) ?? "grupo",
    n,
  }));
  const nSem = semIdentificar.reduce((s, g) => s + g.n, 0);

  return {
    ativos,
    excluidos,
    semIdentificar,
    previstos: roster.length,
    nEfetivo: Math.max(0, ativos.length - nSem),
  };
}

type SacrificioRatoRow = {
  rato: string;
  grupo_id: string;
  sobreviveu: boolean;
  exclusao_motivo: string | null;
  destino: string | null;
  sacrificios: { projeto_id: string; leva: number | null } | null;
  sacrificio_rato_tecidos: { tecido: string; destino: string }[] | null;
};

/** Busca mortes (biotério) e o que aconteceu no sacrifício, por projeto. */
export async function carregarDestinoRatos(
  supabase: SupabaseClient,
  projetoIds: string[]
): Promise<Map<string, { caixas: CaixaMortos[]; sacrificio: RatoSacrificio[] }>> {
  const mapa = new Map<string, { caixas: CaixaMortos[]; sacrificio: RatoSacrificio[] }>();
  for (const id of projetoIds) mapa.set(id, { caixas: [], sacrificio: [] });
  if (projetoIds.length === 0) return mapa;

  const [{ data: caixas }, { data: ratos }] = await Promise.all([
    supabase
      .from("bioterio_caixas")
      .select("projeto_id, grupo_id, leva, mortos")
      .in("projeto_id", projetoIds)
      .gt("mortos", 0)
      .returns<(CaixaMortos & { projeto_id: string })[]>(),
    supabase
      .from("sacrificio_ratos")
      .select(
        "rato, grupo_id, sobreviveu, exclusao_motivo, destino, sacrificios!inner(projeto_id, leva), sacrificio_rato_tecidos(tecido, destino)"
      )
      .in("sacrificios.projeto_id", projetoIds)
      .returns<SacrificioRatoRow[]>(),
  ]);

  for (const c of caixas ?? []) mapa.get(c.projeto_id)?.caixas.push(c);
  for (const r of ratos ?? []) {
    const pid = r.sacrificios?.projeto_id;
    if (!pid) continue;
    mapa.get(pid)?.sacrificio.push({
      rato: r.rato,
      grupo_id: r.grupo_id,
      leva: r.sacrificios?.leva ?? null,
      sobreviveu: r.sobreviveu,
      exclusao_motivo: r.exclusao_motivo,
      destino: r.destino,
      tecidos: r.sacrificio_rato_tecidos ?? [],
    });
  }
  return mapa;
}
