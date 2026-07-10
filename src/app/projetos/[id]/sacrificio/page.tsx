import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import PlanejarSacrificio from "./PlanejarSacrificio";

type Projeto = {
  id: string;
  nome: string;
  numero_levas: number | null;
  finalizado: boolean;
};
type Membro = {
  profile_id: string;
  papel: "coautor" | "ajudante";
  profiles: { nome: string } | null;
};
type Funcao = {
  id: string;
  funcao: string;
  profile_id: string;
  profiles: { nome: string } | null;
};
type Sacrificio = {
  id: string;
  leva: number | null;
  data: string | null;
  duracao_estimada_min: number | null;
  status: string;
  sacrificio_funcoes: Funcao[];
};

export default async function PaginaSacrificio({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const usuario = await getUsuarioAtual();

  const [{ data: projeto }, { data: membros }, { data: sacrificios }] =
    await Promise.all([
      supabase
        .from("projetos")
        .select("id, nome, numero_levas, finalizado")
        .eq("id", id)
        .maybeSingle()
        .returns<Projeto>(),
      supabase
        .from("projeto_membros")
        .select("profile_id, papel, profiles:profile_id(nome)")
        .eq("projeto_id", id)
        .returns<Membro[]>(),
      supabase
        .from("sacrificios")
        .select(
          "id, leva, data, duracao_estimada_min, status, sacrificio_funcoes(id, funcao, profile_id, profiles:profile_id(nome))"
        )
        .eq("projeto_id", id)
        .order("leva", { ascending: true })
        .returns<Sacrificio[]>(),
    ]);

  if (!projeto) notFound();

  const souCoautor =
    membros?.some(
      (m) => m.papel === "coautor" && m.profile_id === usuario?.id
    ) ?? false;
  const souMembro =
    membros?.some((m) => m.profile_id === usuario?.id) ?? false;
  const souOrientador = usuario?.papel === "orientador";
  if (!souMembro && !souOrientador) notFound();

  const membrosParaDesignar = (membros ?? []).map((m) => ({
    id: m.profile_id,
    nome: m.profiles?.nome ?? "?",
  }));

  const levasComSacrificio = new Set((sacrificios ?? []).map((s) => s.leva));
  const levasDisponiveis = Array.from(
    { length: projeto.numero_levas ?? 1 },
    (_, i) => i + 1
  ).filter((l) => !levasComSacrificio.has(l));

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href={`/projetos/${id}`}
        className="text-sm text-ink-soft hover:text-absorbance"
      >
        ← {projeto.nome}
      </Link>
      <h1 className="mt-1 font-display text-3xl leading-tight text-ink">
        Sacrifício
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        Planejamento e registro do dia de sacrifício, por leva.
      </p>

      <PlanejarSacrificio
        projetoId={projeto.id}
        podeGerenciar={souCoautor && !projeto.finalizado}
        levasDisponiveis={levasDisponiveis}
        membros={membrosParaDesignar}
        sacrificios={(sacrificios ?? []).map((s) => ({
          id: s.id,
          leva: s.leva,
          data: s.data,
          duracaoMin: s.duracao_estimada_min,
          status: s.status,
          funcoes: s.sacrificio_funcoes.map((f) => ({
            id: f.id,
            funcao: f.funcao,
            pessoa: f.profiles?.nome ?? "?",
          })),
        }))}
      />
    </main>
  );
}
