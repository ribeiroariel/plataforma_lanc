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
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href={souOrientador ? "/orientador" : "/projetos"}
        className="text-sm text-ink-soft hover:text-absorbance"
      >
        {souOrientador ? "← Painel da orientadora" : "← Meus projetos"}
      </Link>

      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl leading-tight text-ink">
            {projeto.nome}
          </h1>
          {projeto.descricao && (
            <p className="mt-1 text-ink-soft">{projeto.descricao}</p>
          )}
        </div>
        {usuario?.pode_exportar_dados && (
          <a
            href={`/api/exportar/${projeto.id}`}
            className="shrink-0 rounded bg-absorbance px-4 py-2 text-sm text-paper transition-colors hover:bg-ink"
          >
            ↓ Exportar para o R
          </a>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-ink-soft">
        <span>{totalRatos} rato(s) no total</span>
        {projeto.numero_levas && <span>· {projeto.numero_levas} leva(s) previstas</span>}
      </div>

      <section className="mt-10">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
          Grupos experimentais
        </h2>
        <div className="flex flex-wrap gap-2">
          {grupos?.map((g) => (
            <span
              key={g.id}
              className="rounded-full border border-rule px-3 py-1 text-sm text-ink"
            >
              {g.nome} <span className="text-ink-soft">· {g.numero_ratos} rato(s)</span>
            </span>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
          Membros
        </h2>
        <div className="flex flex-col gap-2">
          {membros?.map((m, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded border border-rule bg-paper-raised px-3 py-2 text-sm"
            >
              <span className="text-ink">{m.profiles?.nome}</span>
              <span
                className={`rounded-full px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide ${
                  m.papel === "coautor"
                    ? "bg-absorbance/12 text-absorbance"
                    : "bg-ink/5 text-ink-soft"
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
        <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
          Testes designados
        </h2>
        {(!testesDesignados || testesDesignados.length === 0) && (
          <p className="text-sm text-ink-soft">
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
                className="flex items-center justify-between gap-3 rounded border border-rule bg-paper-raised px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-ink">
                    {teste?.titulo ?? t.teste_slug}
                  </p>
                  <p className="text-ink-soft">
                    Responsável: {t.profiles?.nome ?? "?"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide ${
                      t.status === "concluido"
                        ? "bg-green-600/12 text-green-700 dark:text-green-400"
                        : "bg-reagent/12 text-reagent"
                    }`}
                  >
                    {t.status === "concluido" ? "concluído" : "pendente"}
                  </span>
                  {podeAbrir && (
                    <Link
                      href={`/projetos/${projeto.id}/testes/${t.id}`}
                      className="rounded border border-rule px-3 py-1 text-xs text-ink transition-colors hover:border-absorbance"
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
