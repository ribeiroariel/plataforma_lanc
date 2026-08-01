import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import type { CaixaRow, TratamentoRow } from "@/lib/bioterio";
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

  const [{ data: projeto }, { data: grupos }, { data: membros }, { data: caixas }, { data: tratamentos }] =
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
        .select("id, numero, grupo_id, num_ratos, peso_medio_g, mortos")
        .eq("projeto_id", id)
        .order("numero", { ascending: true })
        .returns<CaixaRow[]>(),
      supabase
        .from("bioterio_tratamentos")
        .select(
          "id, grupo_id, inducao_ativa, inducao_doenca, inducao_substancia, inducao_via, inducao_dose, tratamento_ativa, tratamento_substancia, tratamento_via, tratamento_dose, tratamento_dias, tratamento_inicio"
        )
        .eq("projeto_id", id)
        .returns<TratamentoRow[]>(),
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
        tratamentos={tratamentos ?? []}
        podeEditar={souMembro}
      />
    </main>
  );
}
