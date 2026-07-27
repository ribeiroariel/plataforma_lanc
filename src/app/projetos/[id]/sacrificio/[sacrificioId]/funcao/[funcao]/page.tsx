import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { FUNCOES_SACRIFICIO, FUNCAO_ESCOPO, rotuloFuncao } from "@/lib/sacrificio";
import { carregarDia } from "@/lib/sacrificioDados";
import DiaSacrificio from "../../DiaSacrificio";

type Sacrificio = {
  id: string;
  projeto_id: string;
  leva: number | null;
  status: string;
  data: string | null;
  projetos: {
    nome: string;
    numero_levas: number | null;
    finalizado: boolean;
  } | null;
};
type Designado = { profile_id: string; profiles: { nome: string } | null };
type Membro = { profile_id: string; papel: "coautor" | "ajudante" };

export default async function PaginaFuncaoSacrificio({
  params,
}: {
  params: Promise<{ id: string; sacrificioId: string; funcao: string }>;
}) {
  const { id, sacrificioId, funcao } = await params;
  const funcMeta = FUNCOES_SACRIFICIO.find((f) => f.valor === funcao);
  const escopo = FUNCAO_ESCOPO[funcao];
  if (!funcMeta || !escopo) notFound();

  const usuario = await getUsuarioAtual();
  const supabase = await createClient();

  const { data: sacrificio } = await supabase
    .from("sacrificios")
    .select(
      "id, projeto_id, leva, status, data, projetos:projeto_id(nome, numero_levas, finalizado)"
    )
    .eq("id", sacrificioId)
    .eq("projeto_id", id)
    .maybeSingle()
    .returns<Sacrificio>();
  if (!sacrificio) notFound();

  const [{ data: designados }, { data: membros }] = await Promise.all([
    supabase
      .from("sacrificio_funcoes")
      .select("profile_id, profiles:profile_id(nome)")
      .eq("sacrificio_id", sacrificioId)
      .eq("funcao", funcao)
      .returns<Designado[]>(),
    supabase
      .from("projeto_membros")
      .select("profile_id, papel")
      .eq("projeto_id", id)
      .returns<Membro[]>(),
  ]);

  const souDesignado = (designados ?? []).some(
    (d) => d.profile_id === usuario?.id
  );
  const souCoautor = (membros ?? []).some(
    (m) => m.papel === "coautor" && m.profile_id === usuario?.id
  );
  const souOrientador = usuario?.papel === "orientador";
  if (!souDesignado && !souCoautor && !souOrientador) notFound();

  const { roster, ratos, ratosErro } = await carregarDia(
    supabase,
    id,
    sacrificioId,
    sacrificio.leva,
    sacrificio.projetos?.numero_levas ?? 1
  );

  const finalizado = sacrificio.projetos?.finalizado ?? false;
  // Preenche quem é designado a esta função (ou coautor); orientador só observa.
  const podeRegistrar =
    (souDesignado || souCoautor) &&
    sacrificio.status !== "concluido" &&
    !finalizado;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/minhas-funcoes"
        className="text-sm text-ink-soft hover:text-absorbance"
      >
        ← Minhas funções
      </Link>
      <p className="mt-1 font-mono text-xs uppercase tracking-[0.14em] text-ink-soft">
        Função no sacrifício
      </p>
      <h1 className="mt-1 font-display text-3xl leading-tight text-ink">
        {rotuloFuncao(funcao)}
      </h1>
      <p className="mt-1 font-mono text-xs text-ink-soft">
        {sacrificio.projetos?.nome}
        {sacrificio.leva ? ` · Leva ${sacrificio.leva}` : ""} ·{" "}
        {sacrificio.status}
      </p>

      <section className="mt-6">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft">
          Equipe desta função
        </p>
        <div className="flex flex-wrap gap-2">
          {(designados ?? []).length === 0 ? (
            <span className="text-sm text-ink-soft">—</span>
          ) : (
            (designados ?? []).map((d) => (
              <span
                key={d.profile_id}
                className="rounded-full bg-ink/5 px-2.5 py-0.5 text-sm text-ink"
              >
                {d.profiles?.nome ?? "bolsista"}
                {d.profile_id === usuario?.id ? " (você)" : ""}
              </span>
            ))
          )}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-ink-soft">
          O que você preencher e confirmar aqui aparece na hora para o
          coautor/orientador na aba geral e para os colegas desta mesma função.
        </p>
      </section>

      {ratosErro && (
        <p className="mt-4 rounded border border-alerta/50 bg-alerta/10 p-3 text-sm text-alerta">
          Não foi possível carregar os ratos deste sacrifício. Detalhe técnico:{" "}
          {ratosErro}
        </p>
      )}

      <DiaSacrificio
        projetoId={id}
        sacrificioId={sacrificio.id}
        podeRegistrar={podeRegistrar}
        podeEncerrar={false}
        status={sacrificio.status}
        roster={roster}
        ratos={ratos}
        secoes={escopo.secoes}
        orgaosVisiveis={escopo.orgaos}
      />
    </main>
  );
}
