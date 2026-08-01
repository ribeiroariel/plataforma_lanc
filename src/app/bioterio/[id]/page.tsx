import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import type { CaixaRow, ProcedimentoRow } from "@/lib/bioterio";
import Bioterio from "./Bioterio";

type Projeto = { id: string; nome: string; especie: string | null };
type Grupo = { id: string; nome: string };

export default async function PaginaBioterioProjeto({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect("/login");
  const supabase = await createClient();

  const [{ data: projeto }, { data: grupos }, { data: membros }, { data: caixas }, { data: procedimentos }] =
    await Promise.all([
      supabase
        .from("projetos")
        .select("id, nome, especie")
        .eq("id", id)
        .maybeSingle()
        .returns<Projeto>(),
      supabase
        .from("projeto_grupos")
        .select("id, nome")
        .eq("projeto_id", id)
        .order("created_at", { ascending: true })
        .returns<Grupo[]>(),
      supabase
        .from("projeto_membros")
        .select("profile_id, papel")
        .eq("projeto_id", id),
      supabase
        .from("bioterio_caixas")
        .select("id, grupo_id, num_ratos, ordem, pesos, mortos")
        .eq("projeto_id", id)
        .order("ordem", { ascending: true })
        .returns<CaixaRow[]>(),
      supabase
        .from("bioterio_procedimentos")
        .select(
          "id, tipo, doenca, substancia, dose_valor, dose_unidade, concentracao, via, dias, inicio, caixa_ids, ordem"
        )
        .eq("projeto_id", id)
        .order("ordem", { ascending: true })
        .returns<ProcedimentoRow[]>(),
    ]);

  if (!projeto) notFound();

  const souMembro =
    membros?.some((m) => m.profile_id === usuario.id) ?? false;
  const souOrientador = usuario.papel === "orientador";
  if (!souMembro && !souOrientador) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/bioterio" className="text-sm text-ink-soft hover:text-signal">
        ← Procedimentos de biotério
      </Link>
      <h1 className="mt-1 font-display text-3xl leading-tight text-ink">
        {projeto.nome}
      </h1>

      <Bioterio
        projetoId={projeto.id}
        especie={projeto.especie}
        grupos={grupos ?? []}
        caixas={caixas ?? []}
        procedimentos={procedimentos ?? []}
        podeEditar={souMembro}
      />
    </main>
  );
}
