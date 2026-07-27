import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { gerarRoster, type GrupoComContagem } from "@/lib/roster";
import DiaSacrificio from "./DiaSacrificio";

type Sacrificio = {
  id: string;
  projeto_id: string;
  leva: number | null;
  data: string | null;
  status: string;
};
type Projeto = { nome: string; numero_levas: number | null; finalizado: boolean };
type Membro = { profile_id: string; papel: "coautor" | "ajudante" };
type TecidoColeta = {
  tecido: string;
  destino: "coleta" | "histologia" | "nao_coletado";
  nao_coletado_motivo: string | null;
};
type Aliquota = {
  tecido: string;
  peso_g: number | null;
  volume_tampao_ul: number | null;
  confirmado: boolean;
};
type RatoSalvo = {
  id: string;
  rato: string;
  caixa: string | null;
  ordem: number | null;
  sobreviveu: boolean;
  exclusao_motivo: string | null;
  status: string;
  sacrificio_rato_tecidos: TecidoColeta[];
  sacrificio_aliquotas: Aliquota[];
};

export default async function PaginaDiaSacrificio({
  params,
}: {
  params: Promise<{ id: string; sacrificioId: string }>;
}) {
  const { id, sacrificioId } = await params;
  const supabase = await createClient();
  const usuario = await getUsuarioAtual();

  const { data: sacrificio } = await supabase
    .from("sacrificios")
    .select("id, projeto_id, leva, data, status")
    .eq("id", sacrificioId)
    .eq("projeto_id", id)
    .maybeSingle()
    .returns<Sacrificio>();
  if (!sacrificio) notFound();

  const [
    { data: projeto },
    { data: grupos },
    { data: membros },
    { data: ratos, error: ratosErro },
  ] =
    await Promise.all([
      supabase
        .from("projetos")
        .select("nome, numero_levas, finalizado")
        .eq("id", id)
        .maybeSingle()
        .returns<Projeto>(),
      supabase
        .from("projeto_grupos")
        .select("id, nome, numero_ratos, ratos_por_leva")
        .eq("projeto_id", id)
        .order("created_at", { ascending: true })
        .returns<GrupoComContagem[]>(),
      supabase
        .from("projeto_membros")
        .select("profile_id, papel")
        .eq("projeto_id", id)
        .returns<Membro[]>(),
      supabase
        .from("sacrificio_ratos")
        .select(
          "id, rato, caixa, ordem, sobreviveu, exclusao_motivo, status, sacrificio_rato_tecidos(tecido, destino, nao_coletado_motivo), sacrificio_aliquotas(tecido, peso_g, volume_tampao_ul, confirmado)"
        )
        .eq("sacrificio_id", sacrificioId)
        .returns<RatoSalvo[]>(),
    ]);

  const souCoautor =
    membros?.some(
      (m) => m.papel === "coautor" && m.profile_id === usuario?.id
    ) ?? false;
  const souOrientador = usuario?.papel === "orientador";
  // A aba geral (planejamento + consolidação ao vivo) é de quem organiza:
  // coautores e orientador. Quem só tem função no dia usa a aba da função —
  // mandamos para a lista dela. (Na fatia 3, quem tem a função "Organização
  // geral" também passa a ter acesso a esta aba geral.)
  if (!souCoautor && !souOrientador) redirect("/minhas-funcoes");

  const rosterCompleto = gerarRoster(grupos ?? [], projeto?.numero_levas ?? 1);
  const roster = (
    sacrificio.leva
      ? rosterCompleto.filter((r) => r.leva === sacrificio.leva)
      : rosterCompleto
  ).map((r) => ({
    numero: r.numero,
    grupoId: r.grupoId,
    grupoNome: r.grupoNome,
  }));

  const podeRegistrar =
    souCoautor &&
    sacrificio.status !== "concluido" &&
    !(projeto?.finalizado ?? false);

  // Encerrar/reabrir é de quem organiza (coautor ou orientador), mesmo com o
  // sacrifício já concluído (para reabrir).
  const podeEncerrar =
    (souCoautor || souOrientador) && !(projeto?.finalizado ?? false);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href={`/projetos/${id}/sacrificio`}
        className="text-sm text-ink-soft hover:text-absorbance"
      >
        ← Sacrifício
      </Link>
      <h1 className="mt-1 font-display text-3xl leading-tight text-ink">
        Dia do sacrifício{sacrificio.leva ? ` — Leva ${sacrificio.leva}` : ""}
      </h1>
      <p className="mt-1 font-mono text-xs text-ink-soft">
        {projeto?.nome} · {sacrificio.status}
      </p>

      {ratosErro && (
        <p className="mt-4 rounded border border-alerta/50 bg-alerta/10 p-3 text-sm text-alerta">
          Não foi possível carregar os ratos deste sacrifício, então as etapas
          abaixo (contagem, coleta e alíquotas) podem não aparecer mesmo depois
          de salvar. Detalhe técnico: {ratosErro.message}
        </p>
      )}

      <DiaSacrificio
        projetoId={id}
        sacrificioId={sacrificio.id}
        podeRegistrar={podeRegistrar}
        podeEncerrar={podeEncerrar}
        status={sacrificio.status}
        roster={roster}
        ratos={(ratos ?? []).map((r) => ({
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
        }))}
      />
    </main>
  );
}
