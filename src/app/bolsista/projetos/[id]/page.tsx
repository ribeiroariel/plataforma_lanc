import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { testes as catalogoTestes } from "@/lib/testes";
import FormularioMembro from "./FormularioMembro";
import FormularioTeste from "./FormularioTeste";

type Projeto = {
  id: string;
  nome: string;
  descricao: string | null;
  numero_levas: number | null;
  created_at: string;
};

type Membro = {
  profile_id: string;
  papel: "coautor" | "ajudante";
  profiles: { nome: string } | null;
};

type Grupo = {
  id: string;
  nome: string;
  numero_ratos: number;
};

type TesteDesignado = {
  id: string;
  teste_slug: string;
  status: "pendente" | "concluido";
  profiles: { nome: string } | null;
};

export default async function DetalheProjeto({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const usuario = await getUsuarioAtual();

  const [{ data: projeto }, { data: membros }, { data: grupos }, { data: testesDesignados }] =
    await Promise.all([
      supabase
        .from("projetos")
        .select("id, nome, descricao, numero_levas, created_at")
        .eq("id", id)
        .maybeSingle()
        .returns<Projeto>(),
      supabase
        .from("projeto_membros")
        .select("profile_id, papel, profiles:profile_id(nome)")
        .eq("projeto_id", id)
        .returns<Membro[]>(),
      supabase
        .from("projeto_grupos")
        .select("id, nome, numero_ratos")
        .eq("projeto_id", id)
        .returns<Grupo[]>(),
      supabase
        .from("projeto_testes")
        .select("id, teste_slug, status, profiles:responsavel_id(nome)")
        .eq("projeto_id", id)
        .returns<TesteDesignado[]>(),
    ]);

  if (!projeto) notFound();

  const souCoautor =
    membros?.some(
      (m) => m.papel === "coautor" && m.profile_id === usuario?.id
    ) ?? false;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">{projeto.nome}</h1>
      {projeto.descricao && (
        <p className="mt-1 text-black/70 dark:text-white/70">
          {projeto.descricao}
        </p>
      )}
      {projeto.numero_levas && (
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          {projeto.numero_levas} leva(s) de sacrifício previstas.
        </p>
      )}

      <section className="mt-8">
        <h2 className="mb-2 font-semibold">Grupos experimentais</h2>
        <ul className="text-sm">
          {grupos?.map((g) => (
            <li key={g.id}>
              {g.nome} — {g.numero_ratos} rato(s)
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 font-semibold">Membros</h2>
        <ul className="text-sm">
          {membros?.map((m, i) => (
            <li key={i}>
              {m.profiles?.nome} — {m.papel === "coautor" ? "coautor" : "ajudante"}
            </li>
          ))}
        </ul>
        {souCoautor && <FormularioMembro projetoId={projeto.id} />}
      </section>

      <section className="mt-8">
        <h2 className="mb-2 font-semibold">Testes designados</h2>
        {(!testesDesignados || testesDesignados.length === 0) && (
          <p className="text-sm text-black/60 dark:text-white/60">
            Nenhum teste designado ainda
            {!souCoautor && " (ou você não é responsável por nenhum aqui)"}.
          </p>
        )}
        <ul className="text-sm">
          {testesDesignados?.map((t) => {
            const teste = catalogoTestes.find((c) => c.slug === t.teste_slug);
            return (
              <li key={t.id}>
                {teste?.titulo ?? t.teste_slug} — responsável:{" "}
                {t.profiles?.nome ?? "?"} —{" "}
                {t.status === "concluido" ? "concluído" : "pendente"}
              </li>
            );
          })}
        </ul>
        {souCoautor && (
          <FormularioTeste projetoId={projeto.id} testes={catalogoTestes} />
        )}
      </section>
    </main>
  );
}
