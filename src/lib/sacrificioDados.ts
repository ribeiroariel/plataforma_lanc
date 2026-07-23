// Carga compartilhada dos dados do "dia do sacrifício" (roster + ratos com
// tecidos/alíquotas), usada pela aba geral e pelas abas de função. Server-only:
// recebe o client do servidor já autenticado.
import { gerarRoster, type GrupoComContagem } from "@/lib/roster";
import type { createClient } from "@/lib/supabase/server";

type SupaServer = Awaited<ReturnType<typeof createClient>>;

export type RatoRosterItem = {
  numero: number;
  grupoId: string;
  grupoNome: string;
};
export type TecidoDia = {
  tecido: string;
  destino: "coleta" | "histologia" | "nao_coletado";
  motivo: string | null;
};
export type AliquotaDia = {
  tecido: string;
  pesoG: number | null;
  volumeUl: number | null;
  confirmado: boolean;
};
export type RatoDia = {
  id: string;
  rato: string;
  caixa: string | null;
  ordem: number | null;
  sobreviveu: boolean;
  motivo: string | null;
  status: string;
  tecidos: TecidoDia[];
  aliquotas: AliquotaDia[];
};

type RatoRow = {
  id: string;
  rato: string;
  caixa: string | null;
  ordem: number | null;
  sobreviveu: boolean;
  exclusao_motivo: string | null;
  status: string;
  sacrificio_rato_tecidos: {
    tecido: string;
    destino: "coleta" | "histologia" | "nao_coletado";
    nao_coletado_motivo: string | null;
  }[];
  sacrificio_aliquotas: {
    tecido: string;
    peso_g: number | null;
    volume_tampao_ul: number | null;
    confirmado: boolean;
  }[];
};

export async function carregarDia(
  supabase: SupaServer,
  projetoId: string,
  sacrificioId: string,
  sacrificioLeva: number | null,
  numeroLevas: number
): Promise<{
  roster: RatoRosterItem[];
  ratos: RatoDia[];
  ratosErro: string | null;
}> {
  const [{ data: grupos }, { data: ratos, error }] = await Promise.all([
    supabase
      .from("projeto_grupos")
      .select("id, nome, numero_ratos, ratos_por_leva")
      .eq("projeto_id", projetoId)
      .order("created_at", { ascending: true })
      .returns<GrupoComContagem[]>(),
    supabase
      .from("sacrificio_ratos")
      .select(
        "id, rato, caixa, ordem, sobreviveu, exclusao_motivo, status, sacrificio_rato_tecidos(tecido, destino, nao_coletado_motivo), sacrificio_aliquotas(tecido, peso_g, volume_tampao_ul, confirmado)"
      )
      .eq("sacrificio_id", sacrificioId)
      .returns<RatoRow[]>(),
  ]);

  const rosterCompleto = gerarRoster(grupos ?? [], numeroLevas);
  const roster = (
    sacrificioLeva
      ? rosterCompleto.filter((r) => r.leva === sacrificioLeva)
      : rosterCompleto
  ).map((r) => ({
    numero: r.numero,
    grupoId: r.grupoId,
    grupoNome: r.grupoNome,
  }));

  const ratosMapeados: RatoDia[] = (ratos ?? []).map((r) => ({
    id: r.id,
    rato: r.rato,
    caixa: r.caixa,
    ordem: r.ordem,
    sobreviveu: r.sobreviveu,
    motivo: r.exclusao_motivo,
    status: r.status,
    tecidos: (r.sacrificio_rato_tecidos ?? []).map((t) => ({
      tecido: t.tecido,
      destino: t.destino,
      motivo: t.nao_coletado_motivo,
    })),
    aliquotas: (r.sacrificio_aliquotas ?? []).map((a) => ({
      tecido: a.tecido,
      pesoG: a.peso_g,
      volumeUl: a.volume_tampao_ul,
      confirmado: a.confirmado,
    })),
  }));

  return { roster, ratos: ratosMapeados, ratosErro: error?.message ?? null };
}
