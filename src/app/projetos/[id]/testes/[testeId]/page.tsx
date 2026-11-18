import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { testes as catalogoTestes, nomeTecido, tituloSemTecido } from "@/lib/testes";
import { configDoTeste } from "@/lib/tiposTeste";
import { gerarRoster, type GrupoComContagem } from "@/lib/roster";
import { listarFotosCaderno } from "@/lib/actions/fotos-caderno";
import { ehAparelho, ehRecipiente, nomeAparelho } from "@/lib/recipientes";
import RegistroResultado from "./RegistroResultado";
import PreparacaoTeste from "./PreparacaoTeste";
import CalculadorasDoDia from "./CalculadorasDoDia";
import ChecklistProcedimento, { type EstadoPasso } from "./ChecklistProcedimento";
import MetadadosLeitura from "./MetadadosLeitura";
import FotosCaderno from "./FotosCaderno";
import EncerramentoTeste from "./EncerramentoTeste";
import ConsumoReal from "./ConsumoReal";
import ConsideracoesTeste from "./ConsideracoesTeste";
import { procedimentoDoSlug } from "@/lib/procedimentos";
import { Abas } from "@/components/ui/Abas";
import { Badge } from "@/components/ui/Badge";

type ProjetoTeste = {
  id: string;
  projeto_id: string;
  teste_slug: string;
  status: "pendente" | "concluido";
  responsavel_id: string;
  leva: number | null;
  aparelho: string | null;
  recipiente: string | null;
  leitura_inicio: string | null;
  leitura_fim: string | null;
  encerrado: boolean;
  encerrado_por: string | null;
  encerrado_em: string | null;
  consideracoes: string | null;
  branco_reagente: Record<string, string> | null;
};

type Resultado = {
  rato: string;
  grupo_id: string;
  leituras: Record<string, unknown>;
  valor_calculado: number | null;
  dentro_do_padrao: boolean | null;
  observacoes: string | null;
  confirmado: boolean;
};

type PassoRegistro = {
  passo_id: string;
  feito: boolean;
  feito_em: string | null;
  feito_por: string | null;
};

export default async function PaginaResultado({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; testeId: string }>;
  searchParams: Promise<{ aba?: string }>;
}) {
  const { id: projetoId, testeId } = await params;
  const { aba: abaPedida } = await searchParams;
  const supabase = await createClient();
  const usuario = await getUsuarioAtual();

  const [{ data: projetoTeste }, { data: projeto }, { data: grupos }, { data: membros }, { data: resultados }, { data: passos }] =
    await Promise.all([
      supabase
        .from("projeto_testes")
        .select(
          "id, projeto_id, teste_slug, status, responsavel_id, leva, aparelho, recipiente, leitura_inicio, leitura_fim, encerrado, encerrado_por, encerrado_em, consideracoes, branco_reagente"
        )
        .eq("id", testeId)
        .eq("projeto_id", projetoId)
        .maybeSingle()
        .returns<ProjetoTeste>(),
      supabase
        .from("projetos")
        .select("nome, numero_levas")
        .eq("id", projetoId)
        .maybeSingle(),
      supabase
        .from("projeto_grupos")
        .select("id, nome, numero_ratos, ratos_por_leva")
        .eq("projeto_id", projetoId)
        .order("ordem", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true })
        .returns<GrupoComContagem[]>(),
      supabase
        .from("projeto_membros")
        .select("profile_id, papel")
        .eq("projeto_id", projetoId),
      supabase
        .from("resultados_teste")
        .select("rato, grupo_id, leituras, valor_calculado, dentro_do_padrao, observacoes, confirmado")
        .eq("projeto_teste_id", testeId)
        .returns<Resultado[]>(),
      supabase
        .from("projeto_teste_passos")
        .select("passo_id, feito, feito_em, feito_por")
        .eq("projeto_teste_id", testeId)
        .returns<PassoRegistro[]>(),
    ]);

  if (!projetoTeste) notFound();

  const teste = catalogoTestes.find((t) => t.slug === projetoTeste.teste_slug);
  const config = configDoTeste(projetoTeste.teste_slug);

  const souResponsavel = projetoTeste.responsavel_id === usuario?.id;
  const souCoautor =
    membros?.some((m) => m.papel === "coautor" && m.profile_id === usuario?.id) ??
    false;
  const souOrientador = usuario?.papel === "orientador";

  // O usuário é AJUDANTE deste teste? (RLS de projeto_teste_ajudantes deixa ver
  // a própria linha). Sem isto, um ajudante caía em 404 ao abrir o próprio
  // teste em "Meus testes".
  const { data: ajudanteRow } = await supabase
    .from("projeto_teste_ajudantes")
    .select("profile_id")
    .eq("projeto_teste_id", testeId)
    .eq("profile_id", usuario?.id ?? "")
    .maybeSingle();
  const souAjudante = !!ajudanteRow;

  if (!souResponsavel && !souCoautor && !souOrientador && !souAjudante) {
    // RLS já bloquearia a leitura de "resultados" de quem não é
    // responsável/coautor/ajudante/orientadora — se chegou aqui sem ser nenhum,
    // não deveria ver.
    notFound();
  }

  const rosterCompleto = gerarRoster(grupos ?? [], projeto?.numero_levas ?? 1);
  // Se o teste foi designado para uma leva específica, o registro só mostra
  // os ratos daquela leva. Sem leva definida, mostra todos.
  const roster = projetoTeste.leva
    ? rosterCompleto.filter((r) => r.leva === projetoTeste.leva)
    : rosterCompleto;

  if (!config) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <p className="text-sm text-ink-soft">
          Este teste ainda não tem uma tela de registro de resultado
          disponível.
        </p>
      </main>
    );
  }

  const encerrado = projetoTeste.encerrado === true;
  const podeEditar = (souResponsavel || souCoautor || souAjudante) && !encerrado;

  const fotosCaderno = await listarFotosCaderno(projetoTeste.id);

  // Consumo real já registrado (reagente -> volume real em µL), para a seção de
  // baixa de estoque no fim do teste.
  const { data: consumoRows } = await supabase
    .from("consumo_real")
    .select("reagente_nome, volume_real_ul")
    .eq("projeto_teste_id", projetoTeste.id)
    .returns<{ reagente_nome: string; volume_real_ul: number | null }[]>();
  const consumoExistente: Record<string, number | null> = {};
  for (const c of consumoRows ?? []) {
    consumoExistente[c.reagente_nome] = c.volume_real_ul;
  }

  // Estado do checklist do procedimento: mapa passo_id -> {feito, quem, quando}.
  // Inclui quem encerrou o teste, para nomear no bloco de encerramento.
  const idsFeitores = Array.from(
    new Set(
      [
        ...(passos ?? []).map((p) => p.feito_por),
        projetoTeste.encerrado_por,
      ].filter((v): v is string => Boolean(v))
    )
  );
  const nomesPorId = new Map<string, string>();
  if (idsFeitores.length > 0) {
    const { data: perfis } = await supabase
      .from("profiles")
      .select("id, nome")
      .in("id", idsFeitores);
    for (const p of perfis ?? []) nomesPorId.set(p.id, p.nome);
  }
  const estadoPassos: Record<string, EstadoPasso> = {};
  for (const p of passos ?? []) {
    estadoPassos[p.passo_id] = {
      feito: p.feito,
      porNome: p.feito_por ? nomesPorId.get(p.feito_por) ?? null : null,
      em: p.feito_em,
    };
  }

  // --- Progresso (cabeçalho e indicadores das abas) ---
  const totalPassos = procedimentoDoSlug(projetoTeste.teste_slug)?.length ?? 0;
  const passosFeitos = (passos ?? []).filter((p) => p.feito).length;
  const ratosConfirmados = (resultados ?? []).filter(
    (r) => r.confirmado && roster.some((x) => String(x.numero) === r.rato)
  ).length;
  const ratosIniciados = (resultados ?? []).length;
  const preparado = Boolean(projetoTeste.aparelho && projetoTeste.recipiente);
  const procedimentoFeito = totalPassos > 0 && passosFeitos >= totalPassos;
  const registroFeito = roster.length > 0 && ratosConfirmados >= roster.length;

  // Abre na etapa em que o teste está, a menos que o link peça outra.
  const abaInicial =
    abaPedida ??
    (encerrado || registroFeito
      ? "fechamento"
      : ratosIniciados > 0 || procedimentoFeito
      ? "registro"
      : passosFeitos > 0 || preparado
      ? "procedimento"
      : "preparar");

  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link
        href={`/projetos/${projetoId}?aba=testes`}
        className="text-sm text-ink-soft transition-colors hover:text-absorbance"
      >
        ← {projeto?.nome ?? "Projeto"}
      </Link>

      <header className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {teste && (
            <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-signal">
              {nomeTecido(teste.tecido)}
              {projetoTeste.leva ? ` · Leva ${projetoTeste.leva}` : ""}
            </p>
          )}
          <h1 className="mt-1 font-display text-3xl leading-tight text-ink sm:text-4xl">
            {teste ? tituloSemTecido(teste.titulo, teste.tecido) : projetoTeste.teste_slug}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {encerrado ? (
            <Badge tom="neutro">🔒 encerrado</Badge>
          ) : (
            <Badge tom={projetoTeste.status === "concluido" ? "sucesso" : "atencao"}>
              {projetoTeste.status === "concluido" ? "concluído" : "em andamento"}
            </Badge>
          )}
          {souResponsavel ? (
            <Badge tom="info">você é o responsável</Badge>
          ) : souAjudante ? (
            <Badge tom="neutro">ajudante</Badge>
          ) : souOrientador ? (
            <Badge tom="roxo">acompanhando</Badge>
          ) : null}
        </div>
      </header>

      {/* Painel de progresso — onde o teste está, de relance. */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Progresso
          rotulo="Procedimento"
          valor={`${passosFeitos}/${totalPassos} passos`}
          pct={pct(passosFeitos, totalPassos)}
          cor="var(--color-pyrogallol)"
        />
        <Progresso
          rotulo="Ratos confirmados"
          valor={`${ratosConfirmados}/${roster.length}`}
          pct={pct(ratosConfirmados, roster.length)}
          cor="var(--color-absorbance)"
        />
        <Progresso
          rotulo="Fechamento"
          valor={encerrado ? "encerrado" : "aberto"}
          pct={encerrado ? 100 : 0}
          cor="var(--color-sucesso)"
        />
      </div>

      <Abas
        className="mt-6"
        inicial={abaInicial}
        abas={[
          {
            id: "preparar",
            passo: 1,
            rotulo: "Preparar",
            feita: preparado,
            conteudo: (
              <>
                <PreparacaoTeste
                  projetoId={projetoId}
                  projetoTesteId={projetoTeste.id}
                  slug={projetoTeste.teste_slug}
                  aparelho={ehAparelho(projetoTeste.aparelho) ? projetoTeste.aparelho : null}
                  recipiente={
                    ehRecipiente(projetoTeste.recipiente) ? projetoTeste.recipiente : null
                  }
                  podeEditar={podeEditar}
                />
                <CalculadorasDoDia
                  slug={projetoTeste.teste_slug}
                  nRoster={roster.length}
                  recipiente={
                    ehRecipiente(projetoTeste.recipiente) ? projetoTeste.recipiente : null
                  }
                />
              </>
            ),
          },
          {
            id: "procedimento",
            passo: 2,
            rotulo: "Procedimento",
            feita: procedimentoFeito,
            indicador: totalPassos > 0 ? `${passosFeitos}/${totalPassos}` : undefined,
            conteudo: (
              <ChecklistProcedimento
                projetoId={projetoId}
                projetoTesteId={projetoTeste.id}
                slug={projetoTeste.teste_slug}
                nRoster={roster.length}
                estado={estadoPassos}
                podeMarcar={podeEditar}
              />
            ),
          },
          {
            id: "registro",
            passo: 3,
            rotulo: "Registro",
            feita: registroFeito,
            indicador: `${ratosConfirmados}/${roster.length}`,
            conteudo: (
              <>
                <RegistroResultado
                  projetoId={projetoId}
                  projetoTesteId={projetoTeste.id}
                  statusAtual={projetoTeste.status}
                  config={config}
                  roster={roster}
                  resultadosExistentes={resultados ?? []}
                  brancoReagenteSalvo={projetoTeste.branco_reagente ?? {}}
                  podeRegistrar={souResponsavel && !encerrado}
                  podeAlterarStatus={podeEditar}
                />
                <MetadadosLeitura
                  projetoId={projetoId}
                  projetoTesteId={projetoTeste.id}
                  aparelhoLabel={
                    ehAparelho(projetoTeste.aparelho)
                      ? nomeAparelho(projetoTeste.aparelho)
                      : ""
                  }
                  inicio={projetoTeste.leitura_inicio}
                  fim={projetoTeste.leitura_fim}
                  podeEditar={podeEditar}
                />
              </>
            ),
          },
          {
            id: "fechamento",
            passo: 4,
            rotulo: "Fechamento",
            feita: encerrado,
            conteudo: (
              <>
                <ConsumoReal
                  projetoId={projetoId}
                  projetoTesteId={projetoTeste.id}
                  slug={projetoTeste.teste_slug}
                  nRoster={roster.length}
                  recipiente={
                    ehRecipiente(projetoTeste.recipiente) ? projetoTeste.recipiente : null
                  }
                  existentes={consumoExistente}
                  podeRegistrar={podeEditar}
                />
                <ConsideracoesTeste
                  projetoId={projetoId}
                  projetoTesteId={projetoTeste.id}
                  inicial={projetoTeste.consideracoes ?? ""}
                  podeEditar={podeEditar}
                />
                <EncerramentoTeste
                  projetoId={projetoId}
                  projetoTesteId={projetoTeste.id}
                  encerrado={encerrado}
                  encerradoPorNome={
                    projetoTeste.encerrado_por
                      ? nomesPorId.get(projetoTeste.encerrado_por) ?? null
                      : null
                  }
                  encerradoEm={projetoTeste.encerrado_em}
                  podeEncerrar={souResponsavel || souCoautor}
                />
                {/* A foto da tabela colada no caderno só faz sentido depois
                    de encerrar e imprimir. */}
                {encerrado && (
                  <FotosCaderno
                    projetoId={projetoId}
                    projetoTesteId={projetoTeste.id}
                    fotos={fotosCaderno}
                    podeAnexar={souResponsavel}
                  />
                )}
              </>
            ),
          },
        ]}
      />
    </main>
  );
}

function Progresso({
  rotulo,
  valor,
  pct,
  cor,
}: {
  rotulo: string;
  valor: string;
  pct: number;
  cor: string;
}) {
  return (
    <div className="rounded-lg border border-rule bg-paper-raised px-4 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
          {rotulo}
        </span>
        <span className="font-mono text-sm text-ink">{valor}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-rule">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: cor }}
        />
      </div>
    </div>
  );
}
