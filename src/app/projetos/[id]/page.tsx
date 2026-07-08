import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { testes as catalogoTestes } from "@/lib/testes";
import { ehTesteDesignavel } from "@/lib/tiposTeste";
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
  responsavel_id: string;
  profiles: { nome: string } | null;
};

const testesDesignaveis = catalogoTestes.filter((t) => ehTesteDesignavel(t.slug));

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
        .order("created_at", { ascending: true })
        .returns<Grupo[]>(),
      supabase
        .from("projeto_testes")
        .select("id, teste_slug, status, responsavel_id, profiles:responsavel_id(nome)")
        .eq("projeto_id", id)
        .order("created_at", { ascending: true })
        .returns<TesteDesignado[]>(),
    ]);

  if (!projeto) notFound();

  const souCoautor =
    membros?.some(
      (m) => m.papel === "coautor" && m.profile_id === usuario?.id
    ) ?? false;
  const souOrientador = usuario?.papel === "orientador";

  const totalRatos = grupos?.reduce((soma, g) => soma + g.numero_ratos, 0) ?? 0;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href={souOrientador ? "/orientador" : "/projetos"}
        className="text-sm text-black/60 hover:underline dark:text-white/60"
      >
        {souOrientador ? "← Painel da orientadora" : "← Meus projetos"}
      </Link>

      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{projeto.nome}</h1>
          {projeto.descricao && (
            <p className="mt-1 text-black/70 dark:text-white/70">
              {projeto.descricao}
            </p>
          )}
        </div>
        {usuario?.pode_exportar_dados && (
          <a
            href={`/api/exportar/${projeto.id}`}
            className="shrink-0 rounded bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
          >
            ⬇ Exportar para o R
          </a>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-black/60 dark:text-white/60">
        <span>{totalRatos} rato(s) no total</span>
        {projeto.numero_levas && <span>{projeto.numero_levas} leva(s) previstas</span>}
      </div>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">Grupos experimentais</h2>
        <div className="flex flex-wrap gap-2">
          {grupos?.map((g) => (
            <span
              key={g.id}
              className="rounded-full border border-black/15 px-3 py-1 text-sm dark:border-white/20"
            >
              {g.nome} · {g.numero_ratos} rato(s)
            </span>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">Membros</h2>
        <div className="flex flex-col gap-2">
          {membros?.map((m, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded border border-black/10 px-3 py-2 text-sm dark:border-white/10"
            >
              <span>{m.profiles?.nome}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  m.papel === "coautor"
                    ? "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                    : "bg-black/10 text-black/60 dark:bg-white/10 dark:text-white/60"
                }`}
              >
                {m.papel === "coautor" ? "coautor" : "ajudante"}
              </span>
            </div>
          ))}
        </div>
        {souCoautor && <FormularioMembro projetoId={projeto.id} />}
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">Testes designados</h2>
        {(!testesDesignados || testesDesignados.length === 0) && (
          <p className="text-sm text-black/60 dark:text-white/60">
            Nenhum teste designado ainda
            {!souCoautor && !souOrientador && " (ou você não é responsável por nenhum aqui)"}.
          </p>
        )}
        <div className="flex flex-col gap-2">
          {testesDesignados?.map((t) => {
            const teste = catalogoTestes.find((c) => c.slug === t.teste_slug);
            const souResponsavel = t.responsavel_id === usuario?.id;
            const podeAbrir = souResponsavel || souCoautor || souOrientador;
            return (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 rounded border border-black/10 px-3 py-2 text-sm dark:border-white/10"
              >
                <div>
                  <p className="font-medium">{teste?.titulo ?? t.teste_slug}</p>
                  <p className="text-black/60 dark:text-white/60">
                    Responsável: {t.profiles?.nome ?? "?"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      t.status === "concluido"
                        ? "bg-green-500/15 text-green-700 dark:text-green-400"
                        : "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400"
                    }`}
                  >
                    {t.status === "concluido" ? "concluído" : "pendente"}
                  </span>
                  {podeAbrir && (
                    <Link
                      href={`/projetos/${projeto.id}/testes/${t.id}`}
                      className="rounded border border-black/20 px-3 py-1 text-xs dark:border-white/20"
                    >
                      {souResponsavel ? "Registrar resultado" : "Ver"}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {souCoautor && (
          <FormularioTeste projetoId={projeto.id} testes={testesDesignaveis} />
        )}
      </section>
    </main>
  );
}
