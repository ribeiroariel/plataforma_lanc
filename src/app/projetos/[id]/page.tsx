import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { testes as catalogoTestes } from "@/lib/testes";
import { nomeTecido, type Tecido } from "@/lib/tecidos";
import { configDoTeste, ehTesteDesignavel } from "@/lib/tiposTeste";
import { rotuloValor, valorResumo } from "@/lib/resumoResultados";
import { tituloSemTecido } from "@/lib/testes";
import { gerarRoster } from "@/lib/roster";
import { calcularRatosEfetivos, carregarDestinoRatos } from "@/lib/ratosEfetivos";
import { Abas } from "@/components/ui/Abas";
import ResultadosProjeto, { type TesteResumo } from "./ResultadosProjeto";
import FormularioMembro from "./FormularioMembro";
import FormularioTeste from "./FormularioTeste";
import FinalizarBotao from "./FinalizarBotao";
import ExcluirProjetoBotao from "./ExcluirProjetoBotao";
import { VoltarLink } from "@/components/ui/VoltarLink";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

type Projeto = {
  id: string;
  nome: string;
  descricao: string | null;
  numero_levas: number | null;
  especie: string | null;
  linhagem: string | null;
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
  encerrado: boolean;
  branco_reagente: Record<string, string> | null;
  profiles: { nome: string } | null;
};

type ResultadoRow = {
  projeto_teste_id: string;
  rato: string;
  grupo_id: string;
  leituras: { colunas?: Record<string, unknown> } | null;
  valor_calculado: number | null;
  confirmado: boolean;
};

const testesDesignaveis = catalogoTestes.filter((t) => ehTesteDesignavel(t.slug));

export default async function DetalheProjeto({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aba?: string }>;
}) {
  const { id } = await params;
  const { aba: abaPedida } = await searchParams;
  const supabase = await createClient();
  const usuario = await getUsuarioAtual();

  const [{ data: projeto }, { data: membros }, { data: grupos }, { data: testesDesignados }, { data: bolsistas }, { data: versoes }] =
    await Promise.all([
      supabase
        .from("projetos")
        .select("id, nome, descricao, numero_levas, especie, linhagem, finalizado, tecidos, created_at")
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
        .order("ordem", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true })
        .returns<Grupo[]>(),
      supabase
        .from("projeto_testes")
        .select("id, teste_slug, status, responsavel_id, leva, encerrado, branco_reagente, profiles:responsavel_id(nome)")
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

  // Projeto só pode ser excluído por um coautor enquanto não houver nada
  // registrado nele: nenhum resultado de teste e nenhum sacrifício. A guarda
  // real é a RPC excluir_projeto; aqui só decidimos se mostra o botão, para
  // não oferecer uma ação que a função vai recusar.
  let temDadosRegistrados = false;
  if (souCoautor) {
    const testeIds = (testesDesignados ?? []).map((t) => t.id);
    const { count: nSacrificios } = await supabase
      .from("sacrificios")
      .select("id", { count: "exact", head: true })
      .eq("projeto_id", id);
    let nResultados = 0;
    if (testeIds.length > 0) {
      const { count } = await supabase
        .from("resultados_teste")
        .select("id", { count: "exact", head: true })
        .in("projeto_teste_id", testeIds);
      nResultados = count ?? 0;
    }
    temDadosRegistrados = nResultados > 0 || (nSacrificios ?? 0) > 0;
  }

  // --- Aba Resultados: resumo por grupo de cada teste (só ratos confirmados).
  // RLS já limita: ajudante só recebe os resultados dos testes dele.
  const idsTestes = (testesDesignados ?? []).map((t) => t.id);
  const { data: resultadosRows } =
    idsTestes.length > 0
      ? await supabase
          .from("resultados_teste")
          .select("projeto_teste_id, rato, grupo_id, leituras, valor_calculado, confirmado")
          .in("projeto_teste_id", idsTestes)
          .returns<ResultadoRow[]>()
      : { data: [] as ResultadoRow[] };
  const rosterProjeto = gerarRoster(grupos ?? [], projeto.numero_levas ?? 1);
  const destinoProjeto = (await carregarDestinoRatos(supabase, [id])).get(id);
  const resumos: TesteResumo[] = (testesDesignados ?? []).flatMap((t) => {
    const config = configDoTeste(t.teste_slug);
    if (!config) return [];
    const cat = catalogoTestes.find((c) => c.slug === t.teste_slug);
    const { rotulo, unidade } = rotuloValor(config);
    const brAbs = Number(t.branco_reagente?.abs);
    const valores = (resultadosRows ?? [])
      .filter((r) => r.projeto_teste_id === t.id && r.confirmado)
      .flatMap((r) => {
        const v = valorResumo(
          config,
          r.leituras?.colunas ?? {},
          r.valor_calculado,
          Number.isFinite(brAbs) ? brAbs : null
        );
        return v === null || !Number.isFinite(v)
          ? []
          : [{ rato: r.rato, grupoId: r.grupo_id, valor: v }];
      });
    // Total = ratos efetivos (desconta mortos no biotério e quem ficou fora
    // no sacrifício), a mesma regra da página do teste.
    const totalRatos = calcularRatosEfetivos({
      roster: t.leva ? rosterProjeto.filter((r) => r.leva === t.leva) : rosterProjeto,
      tecido: cat?.tecido ?? null,
      caixas: destinoProjeto?.caixas ?? [],
      sacrificio: destinoProjeto?.sacrificio ?? [],
      comResultado: new Set(
        (resultadosRows ?? []).filter((r) => r.projeto_teste_id === t.id).map((r) => r.rato)
      ),
    }).nEfetivo;
    return [
      {
        id: t.id,
        titulo: cat ? tituloSemTecido(cat.titulo, cat.tecido) : t.teste_slug,
        tecido: cat ? nomeTecido(cat.tecido as Tecido) : "",
        rotulo,
        unidade,
        encerrado: t.encerrado,
        totalRatos,
        valores,
      },
    ];
  });
  const confirmadosPorTeste = new Map(resumos.map((r) => [r.id, r]));
  const nPendentes = (testesDesignados ?? []).filter((t) => t.status === "pendente").length;

  // Pessoas que ainda não são membros (para o dropdown de adicionar membro).
  const idsMembros = new Set((membros ?? []).map((m) => m.profile_id));
  const naoMembros = (bolsistas ?? []).filter((b) => !idsMembros.has(b.id));

  // Membros do projeto (para o dropdown de designar teste).
  const membrosParaDesignar = (membros ?? []).map((m) => ({
    id: m.profile_id,
    nome: m.profiles?.nome ?? "?",
  }));

  const especie = [
    projeto.especie === "camundongo" ? "Camundongo" : projeto.especie === "rato" ? "Rato" : null,
    projeto.linhagem,
  ]
    .filter(Boolean)
    .join(" ");
  const nConcluidos = (testesDesignados?.length ?? 0) - nPendentes;
  const ratosConfirmadosTotal = resumos.reduce((soma, r) => soma + r.valores.length, 0);
  const ratosEsperadosTotal = resumos.reduce((soma, r) => soma + r.totalRatos, 0);

  const visaoGeral = (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <section className="rounded-lg border border-rule bg-paper-raised p-4">
        <SectionTitle>Grupos experimentais</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-soft font-medium">
                <th className="pb-2 pr-4 font-normal">Grupo</th>
                {Array.from({ length: projeto.numero_levas ?? 1 }, (_, l) => (
                  <th key={l} className="pb-2 pr-4 text-right font-normal">
                    Leva {l + 1}
                  </th>
                ))}
                <th className="pb-2 text-right font-normal">Total</th>
              </tr>
            </thead>
            <tbody>
              {grupos?.map((g) => (
                <tr key={g.id} className="border-t border-rule/60">
                  <td className="py-1.5 pr-4 text-ink">{g.nome}</td>
                  {Array.from({ length: projeto.numero_levas ?? 1 }, (_, l) => (
                    <td key={l} className="py-1.5 pr-4 text-right font-mono text-ink-soft">
                      {g.ratos_por_leva?.[l] ?? "—"}
                    </td>
                  ))}
                  <td className="py-1.5 text-right font-mono text-ink">{g.numero_ratos}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-rule">
                <td className="py-1.5 pr-4 text-xs text-ink-soft font-medium">Total</td>
                {Array.from({ length: projeto.numero_levas ?? 1 }, (_, l) => (
                  <td key={l} className="py-1.5 pr-4" />
                ))}
                <td className="py-1.5 text-right font-mono font-medium text-ink">{totalRatos}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {souCoautor && !projeto.finalizado && (
          <Link
            href={`/projetos/${projeto.id}/editar`}
            className="mt-3 inline-block text-xs text-signal hover:text-ink"
          >
            Editar grupos e levas
          </Link>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <Link
          href={`/projetos/${projeto.id}/sacrificio`}
          className="group flex items-center justify-between rounded-lg border border-rule bg-paper-raised p-4 transition-colors hover:border-absorbance"
        >
          <span>
            <span className="block font-display text-lg text-ink group-hover:text-absorbance">
              Sacrifício
            </span>
            <span className="text-xs text-ink-soft">
              Planejar o dia, funções da equipe e alíquotas por tecido.
            </span>
          </span>
        </Link>
        <a
          href="#aba-resultados"
          className="group flex items-center justify-between rounded-lg border border-rule bg-paper-raised p-4 transition-colors hover:border-absorbance"
        >
          <span>
            <span className="block font-display text-lg text-ink group-hover:text-absorbance">
              Resultados por grupo
            </span>
            <span className="text-xs text-ink-soft">
              {ratosConfirmadosTotal} de {ratosEsperadosTotal} leituras confirmadas em{" "}
              {resumos.length} teste(s).
            </span>
          </span>
        </a>

        {souCoautor && (
          <div className="rounded-lg border border-dashed border-rule p-4">
            <p className="mb-2 text-xs text-ink-soft font-medium">
              Ações do projeto
            </p>
            <div className="flex flex-wrap items-center gap-4">
              {!projeto.finalizado && <FinalizarBotao projetoId={projeto.id} />}
              {!temDadosRegistrados && (
                <ExcluirProjetoBotao projetoId={projeto.id} nomeProjeto={projeto.nome} />
              )}
            </div>
            {!temDadosRegistrados && (
              <p className="mt-2 text-xs text-ink-soft">
                A exclusão só fica disponível enquanto o projeto não tem nenhum
                resultado ou sacrifício registrado.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );

  const abaTestes = (
    <section className="mt-6">
      {(!testesDesignados || testesDesignados.length === 0) && (
        <EmptyState
          titulo="Nenhum teste designado ainda"
          descricao={
            !souCoautor && !souOrientador
              ? "Você não é responsável por nenhum teste neste projeto."
              : souCoautor
              ? "Designe abaixo quais ensaios cada membro vai registrar."
              : undefined
          }
        />
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {testesDesignados?.map((t) => {
          const teste = catalogoTestes.find((c) => c.slug === t.teste_slug);
          const souResponsavel = t.responsavel_id === usuario?.id;
          const podeAbrir = souResponsavel || souCoautor || souOrientador;
          const resumo = confirmadosPorTeste.get(t.id);
          const feitos = resumo?.valores.length ?? 0;
          const total = resumo?.totalRatos ?? 0;
          const pct = total > 0 ? Math.round((feitos / total) * 100) : 0;
          const corpo = (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-signal font-medium">
                    {teste ? nomeTecido(teste.tecido as Tecido) : ""}
                    {t.leva ? ` · Leva ${t.leva}` : ""}
                  </p>
                  <p className="mt-0.5 font-medium leading-snug text-ink">
                    {teste ? tituloSemTecido(teste.titulo, teste.tecido) : t.teste_slug}
                  </p>
                </div>
                {t.encerrado ? (
                  <Badge tom="neutro">encerrado</Badge>
                ) : (
                  <Badge tom={t.status === "concluido" ? "sucesso" : "atencao"}>
                    {t.status === "concluido" ? "concluído" : "pendente"}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-ink-soft">
                Responsável: {t.profiles?.nome ?? "?"}
                {souResponsavel && <span className="text-absorbance"> (você)</span>}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-rule">
                  <div
                    className="h-full rounded-full bg-absorbance"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="font-mono text-[11px] text-ink-soft">
                  {feitos}/{total} ratos
                </span>
              </div>
              {podeAbrir && (
                <p className="mt-2 font-mono text-[11px] text-absorbance">
                  {souResponsavel && !t.encerrado ? "Registrar" : "Ver resultados"}
                </p>
              )}
            </>
          );
          return podeAbrir ? (
            <Link
              key={t.id}
              href={`/projetos/${projeto.id}/testes/${t.id}`}
              className="rounded-lg border border-rule bg-paper-raised p-4 transition-colors hover:border-absorbance"
            >
              {corpo}
            </Link>
          ) : (
            <div key={t.id} className="rounded-lg border border-rule bg-paper-raised p-4">
              {corpo}
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
  );

  const abaEquipe = (
    <section className="mt-6 max-w-2xl">
      <div className="flex flex-col gap-2">
        {membros?.map((m, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg border border-rule bg-paper-raised px-4 py-2.5 text-sm"
          >
            <span className="text-ink">
              {m.profiles?.nome}
              {m.profile_id === usuario?.id && <span className="text-ink-soft"> (você)</span>}
            </span>
            <Badge tom={m.papel === "coautor" ? "info" : "neutro"}>
              {m.papel === "coautor" ? "coautor" : "ajudante"}
            </Badge>
          </div>
        ))}
      </div>
      {souCoautor && <FormularioMembro projetoId={projeto.id} pessoas={naoMembros} />}
    </section>
  );

  const abaHistorico = (
    <section className="mt-6 max-w-2xl">
      {!versoes || versoes.length === 0 ? (
        <EmptyState titulo="Nenhuma alteração registrada" descricao="Edições de grupos e levas aparecem aqui, com quem fez e quando." />
      ) : (
        <ol className="relative ml-2 border-l border-rule">
          {versoes.map((v) => (
            <li key={v.id} className="relative pb-5 pl-5 last:pb-0">
              <span aria-hidden className="absolute top-1.5 -left-[5px] h-2.5 w-2.5 rounded-full border-2 border-paper bg-signal" />
              <p className="font-mono text-[11px] text-ink-soft">
                {new Date(v.created_at).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p className="text-sm text-ink">{v.nota ?? "Edição"}</p>
              <p className="text-xs text-ink-soft">{v.profiles?.nome ?? "?"}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <VoltarLink href={souOrientador ? "/orientador" : "/projetos"}>
        {souOrientador ? "Painel da orientadora" : "Meus projetos"}
      </VoltarLink>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-signal font-medium">
            Projeto{projeto.finalizado ? " · finalizado" : ""}
          </p>
          <h1 className="mt-1 font-display text-3xl leading-tight text-ink sm:text-4xl">
            {projeto.nome}
          </h1>
          {projeto.descricao && (
            <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">{projeto.descricao}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge tom="neutro">{totalRatos} animais</Badge>
            {especie && <Badge tom="neutro">{especie}</Badge>}
            {projeto.numero_levas && <Badge tom="neutro">{projeto.numero_levas} leva(s)</Badge>}
            {(projeto.tecidos ?? []).map((t) => (
              <Badge key={t} tom="info">
                {nomeTecido(t as Tecido)}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          {(souCoautor || souOrientador || usuario?.pode_exportar_dados) && (
            <a
              href={`/api/exportar-transparencia/${projeto.id}`}
              className="rounded border border-absorbance px-4 py-2 text-center text-sm text-absorbance transition-colors hover:bg-absorbance hover:text-paper"
            >
              ↓ Dados brutos (transparência)
            </a>
          )}
          {usuario?.pode_exportar_dados && (
            <a
              href={`/api/exportar/${projeto.id}`}
              className="rounded bg-absorbance px-4 py-2 text-center text-sm text-paper transition-colors hover:bg-ink"
            >
              ↓ Exportar para o R
            </a>
          )}
        </div>
      </header>

      {/* Números do projeto */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Numero rotulo="Testes" valor={testesDesignados?.length ?? 0} cor="var(--color-pyrogallol)" />
        <Numero rotulo="Concluídos" valor={nConcluidos} cor="var(--color-sucesso)" />
        <Numero rotulo="Pendentes" valor={nPendentes} cor="var(--color-reagent)" />
        <Numero
          rotulo="Leituras confirmadas"
          valor={`${ratosConfirmadosTotal}/${ratosEsperadosTotal}`}
          cor="var(--color-absorbance)"
        />
      </div>

      <Abas
        className="mt-6"
        inicial={abaPedida ?? (souOrientador ? "resultados" : "testes")}
        abas={[
          { id: "geral", rotulo: "Visão geral", conteudo: visaoGeral },
          {
            id: "testes",
            rotulo: "Testes",
            indicador: nPendentes > 0 ? `${nPendentes} pend.` : testesDesignados?.length ?? 0,
            conteudo: abaTestes,
          },
          {
            id: "resultados",
            rotulo: "Resultados",
            conteudo: (
              <ResultadosProjeto
                projetoId={projeto.id}
                testes={resumos}
                grupos={(grupos ?? []).map((g) => ({ id: g.id, nome: g.nome }))}
              />
            ),
          },
          { id: "equipe", rotulo: "Equipe", indicador: membros?.length ?? 0, conteudo: abaEquipe },
          { id: "historico", rotulo: "Histórico", conteudo: abaHistorico },
        ]}
      />
    </main>
  );
}

function Numero({
  rotulo,
  valor,
}: {
  rotulo: string;
  valor: number | string;
  cor?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-rule bg-paper-raised px-4 py-3">
      <p className="font-display text-3xl leading-none tabular-nums text-ink">{valor}</p>
      <p className="mt-1.5 text-xs text-ink-soft font-medium">
        {rotulo}
      </p>
    </div>
  );
}
