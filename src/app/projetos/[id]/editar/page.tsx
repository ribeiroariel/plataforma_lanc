import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import EditarForm from "./EditarForm";

type Projeto = {
  id: string;
  nome: string;
  descricao: string | null;
  numero_levas: number | null;
  finalizado: boolean;
};
type Grupo = {
  id: string;
  nome: string;
  numero_ratos: number;
  ratos_por_leva: number[] | null;
};
type Membro = { profile_id: string; papel: "coautor" | "ajudante" };

export default async function EditarProjeto({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const usuario = await getUsuarioAtual();

  const [{ data: projeto }, { data: grupos }, { data: membros }] =
    await Promise.all([
      supabase
        .from("projetos")
        .select("id, nome, descricao, numero_levas, finalizado")
        .eq("id", id)
        .maybeSingle()
        .returns<Projeto>(),
      supabase
        .from("projeto_grupos")
        .select("id, nome, numero_ratos, ratos_por_leva")
        .eq("projeto_id", id)
        .order("created_at", { ascending: true })
        .returns<Grupo[]>(),
      supabase
        .from("projeto_membros")
        .select("profile_id, papel")
        .eq("projeto_id", id)
        .returns<Membro[]>(),
    ]);

  if (!projeto) notFound();

  const souCoautor =
    membros?.some((m) => m.papel === "coautor" && m.profile_id === usuario?.id) ??
    false;
  if (!souCoautor || projeto.finalizado) redirect(`/projetos/${id}`);

  const levas = projeto.numero_levas ?? 1;
  const gruposIniciais = (grupos ?? []).map((g) => {
    const ratos = Array.from({ length: levas }, (_, l) =>
      g.ratos_por_leva && g.ratos_por_leva.length > 0
        ? String(g.ratos_por_leva[l] ?? "")
        : l === 0
        ? String(g.numero_ratos)
        : ""
    );
    return { id: g.id, nome: g.nome, ratos };
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link href={`/projetos/${id}`} className="text-sm text-ink-soft hover:text-signal">
        ← {projeto.nome}
      </Link>
      <h1 className="mt-2 font-display text-3xl leading-tight text-ink">
        Editar projeto
      </h1>

      <EditarForm
        projetoId={projeto.id}
        nomeInicial={projeto.nome}
        descricaoInicial={projeto.descricao ?? ""}
        levasInicial={levas}
        gruposIniciais={gruposIniciais}
      />
    </main>
  );
}
