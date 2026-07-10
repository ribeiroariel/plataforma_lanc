import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { testes as catalogoTestes } from "@/lib/testes";
import { nomeTecido, type Tecido } from "@/lib/tecidos";
import { ehTesteDesignavel } from "@/lib/tiposTeste";
import FormularioMembro from "./FormularioMembro";
import FormularioTeste from "./FormularioTeste";
import FinalizarBotao from "./FinalizarBotao";

type Projeto = {
  id: string;
  nome: string;
  descricao: string | null;
  numero_levas: number | null;
  finalizado: boolean;
  tecidos: string[] | null;
  created_at: string;
};

type Versao = {
  id: string;
  nota: string | null;
  created_at: string;
  profiles: { nome: string } | null;
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
  ratos_por_leva: number[] | null;
};

type PessoaAprovada = { id: string; nome: string };

type TesteDesignado = {
  id: string;
  teste_slug: string;
  status: "pendente" | "concluido";
  responsavel_id: string;
  leva: number | null;
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

  const [{ data: projeto }, { data: membros }, { data: grupos }, { data: testesDesignados }, { data: bolsistas }, { data: versoes }] =
    await Promise.all([
      supabase
        .from("projetos")
        .select("id, nome, descricao, numero_levas, finalizado, tecidos, created_at")
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
        .select("id, nome, numero_ratos, ratos_por_leva")
        .eq("projeto_id", id)
        .order("created_at", { ascending: true })
        .returns<Grupo[]>(),
      supabase
        .from("projeto_testes")
        .select("id, teste_slug, status, responsavel_id, leva, profiles:responsavel_id(nome)")
        .eq("projeto_id", id)
        .order("created_at", { ascending: true })
        .returns<TesteDesignado[]>(),
      supabase
        .from("profiles")
        .select("id, nome")
        .eq("papel", "bolsista")
        .eq("aprovado", true)
        .order("nome")
        .returns<PessoaAprovada[]>(),
      supabase
        .from("projeto_versoes")
        .select("id, nota, created_at, profiles:criado_por(nome)")
        .eq("projeto_id", id)
        .order("created_at", { ascending: false })
        .returns<Versao[]>(),
    ]);

  if (!projeto) notFound();

  // Só oferece na designação os testes dos tecidos que o projeto analisa
  // (sem tecidos definidos = todos, compatível com projetos antigos).
  const tecidosProjeto = new Set(projeto.tecidos ?? []);
  const testesParaDesignar =
    tecidosProjeto.size === 0
      ? testesDesignaveis
      : testesDesignaveis.filter((t) => tecidosProjeto.has(t.tecido));

  const souCoautor =
    membros?.some(
      (m) => m.papel === "coautor" && m.profile_id === usuario?.id
    ) ?? false;
  const souOrientador = usuario?.papel === "orientador";

  const totalRatos = grupos?.reduce((soma, g) => soma + g.numero_ratos, 0) ?? 0;

  // Pessoas que ainda não são membros (para o dropdown de adicionar membro).
  const idsMembros = new Set((membros ?? []).map((m) => m.profile_id));
  const naoMembros = (bolsistas ?? []).filter((b) => !idsMembros.has(b.id));

  // Membros do projeto (para o dropdown de designar teste).
  const membrosParaDesignar = (membros ?? []).map((m) => ({
    id: m.profile_id,
    nome: m.profiles?.nome ?? "?",
  }));

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

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-ink-soft">
        <span>{totalRatos} rato(s) no total</span>
        {projeto.numero_levas && <span>· {projeto.numero_levas} leva(s)</span>}
        {tecidosProjeto.size > 0 && (
          <span>
            · Tecidos:{" "}
            {(projeto.tecidos ?? [])
              .map((t) => nomeTecido(t as Tecido))
              .join(", ")}
          </span>
        )}
        {projeto.finalizado && (
          <span className="rounded-full bg-ink/5 px-2 py-0.5 uppercase tracking-wide text-ink-soft">
            finalizado
          </span>
        )}
      </div>

      {souCoautor && !projeto.finalizado && (
        <div className="mt-4 flex items-center gap-4">
          <Link
            href={`/projetos/${projeto.id}/editar`}
            className="text-xs text-signal hover:text-ink"
          >
            Editar grupos e levas
          </Link>
          <FinalizarBotao projetoId={projeto.id} />
        </div>
      )}

      <section className="mt-10">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
          Grupos experimentais
        </h2>
        <div className="overflow-x-auto">
          <table className="text-sm">
            <thead>
              <tr className="text-left font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                <th className="pb-2 pr-4 font-normal">Grupo</th>
                {Array.from(
                  { length: projeto.numero_levas ?? 1 },
                  (_, l) => (
                    <th key={l} className="pb-2 pr-4 font-normal">
                      Leva {l + 1}
                    </th>
                  )
                )}
                <th className="pb-2 font-normal">Total</th>
              </tr>
            </thead>
            <tbody>
              {grupos?.map((g) => (
                <tr key={g.id} className="border-t border-rule/60">
                  <td className="py-1.5 pr-4 text-ink">{g.nome}</td>
                  {Array.from(
                    { length: projeto.numero_levas ?? 1 },
                    (_, l) => (
                      <td key={l} className="py-1.5 pr-4 font-mono text-ink-soft">
                        {g.ratos_por_leva?.[l] ?? "—"}
                      </td>
                    )
                  )}
                  <td className="py-1.5 font-mono text-ink">{g.numero_ratos}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
        {souCoautor && (
          <FormularioMembro projetoId={projeto.id} pessoas={naoMembros} />
        )}
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
                    {teste ? teste.titulo : t.teste_slug}
                  </p>
                  <p className="text-ink-soft">
                    {t.leva && <span>Leva {t.leva} · </span>}
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
        {souCoautor && !projeto.finalizado && (
          <FormularioTeste
            projetoId={projeto.id}
            testes={testesParaDesignar}
            pessoas={membrosParaDesignar}
            numeroLevas={projeto.numero_levas ?? 1}
          />
        )}
      </section>

      {versoes && versoes.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
            Histórico de alterações
          </h2>
          <ul className="flex flex-col gap-2 text-sm">
            {versoes.map((v) => (
              <li key={v.id} className="flex flex-wrap gap-x-3 text-ink-soft">
                <span className="font-mono text-xs">
                  {new Date(v.created_at).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="text-ink">{v.nota ?? "Edição"}</span>
                <span className="text-ink-soft">— {v.profiles?.nome ?? "?"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
