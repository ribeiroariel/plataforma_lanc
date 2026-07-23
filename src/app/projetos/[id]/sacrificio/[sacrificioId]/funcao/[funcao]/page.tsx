import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { FUNCOES_SACRIFICIO, rotuloFuncao } from "@/lib/sacrificio";

type Sacrificio = {
  id: string;
  projeto_id: string;
  leva: number | null;
  status: string;
  data: string | null;
  projetos: { nome: string } | null;
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
  if (!funcMeta) notFound();

  const usuario = await getUsuarioAtual();
  const supabase = await createClient();

  const { data: sacrificio } = await supabase
    .from("sacrificios")
    .select("id, projeto_id, leva, status, data, projetos:projeto_id(nome)")
    .eq("id", sacrificioId)
    .eq("projeto_id", id)
    .maybeSingle()
    .returns<Sacrificio>();
  if (!sacrificio) notFound();

  // Colegas designados a esta função (todos preenchem a mesma aba).
  const { data: designados } = await supabase
    .from("sacrificio_funcoes")
    .select("profile_id, profiles:profile_id(nome)")
    .eq("sacrificio_id", sacrificioId)
    .eq("funcao", funcao)
    .returns<Designado[]>();

  const souDesignado = (designados ?? []).some(
    (d) => d.profile_id === usuario?.id
  );

  // Coautor/orientador podem abrir a aba de qualquer função para acompanhar.
  const { data: membros } = await supabase
    .from("projeto_membros")
    .select("profile_id, papel")
    .eq("projeto_id", id)
    .returns<Membro[]>();
  const souCoautor = (membros ?? []).some(
    (m) => m.papel === "coautor" && m.profile_id === usuario?.id
  );
  const souOrientador = usuario?.papel === "orientador";

  if (!souDesignado && !souCoautor && !souOrientador) notFound();

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

      <section className="mt-8">
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
      </section>

      <div className="mt-8 rounded border border-dashed border-rule bg-paper-raised p-4">
        <p className="text-sm text-ink">
          O preenchimento ao vivo desta função é liberado na próxima atualização.
        </p>
        <p className="mt-1 text-xs leading-relaxed text-ink-soft">
          Aqui vai entrar o formulário específico de{" "}
          <span className="text-ink">{rotuloFuncao(funcao).toLowerCase()}</span>
          {" "}— o que você preencher e confirmar aparece na hora para o
          coautor/orientador na aba geral, e para os colegas desta mesma função.
        </p>
      </div>
    </main>
  );
}
