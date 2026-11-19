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
import { calcularRatosEfetivos, carregarDestinoRatos } from "@/lib/ratosEfetivos";
import { AmostrasDoDiaProvider } from "./AmostrasDoDia";
import CronometroTeste from "./CronometroTeste";

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
  const rosterPrevisto = projetoTeste.leva
    ? rosterCompleto.filter((r) => r.leva === projetoTeste.leva)
    : rosterCompleto;

  // Cruza com biotério (mortes por caixa) e sacrifício (quem não sobreviveu,
  // tecido que não foi coletado): o teste só lista e conta quem de fato tem
  // amostra. Rato que já tem leitura registrada nunca some da tabela.
  const destinos = (await carregarDestinoRatos(supabase, [projetoId])).get(projetoId);
  const efetivos = calcularRatosEfetivos({
    roster: rosterPrevisto,
    tecido: teste?.tecido ?? null,
    caixas: destinos?.caixas ?? [],
    sacrificio: destinos?.sacrificio ?? [],
    comResultado: new Set((resultados ?? []).map((r) => r.rato)),
  });
  const roster = efetivos.ativos;
  const nEfetivo = efetivos.nEfetivo;

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
  const registroFeito = nEfetivo > 0 && ratosConfirmados >= nEfetivo;

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

  // Cronômetro do teste: execuções deste teste (tempo total) e o que a pessoa
  // tem aberto agora. Se a tabela ainda não existir (migração pendente), o
  // botão simplesmente não aparece.
  const [{ data: execucoes, error: erroExec }, { data: abertasMinhas }, { data: labAberto }] =
    await Promise.all([
      supabase
        .from("teste_execucoes")
        .select("id, inicio, fim, profile_id")
        .eq("projeto_teste_id", projetoTeste.id)
        .returns<{ id: string; inicio: string; fim: string | null; profile_id: string }[]>(),
      supabase
        .from("teste_execucoes")
        .select("id, projeto_teste_id, inicio")
        .eq("profile_id", usuario?.id ?? "")
        .is("fim", null)
        .returns<{ id: string; projeto_teste_id: string; inicio: string }[]>(),
      supabase
        .from("sessoes_lab")
        .select("id")
        .eq("profile_id", usuario?.id ?? "")
        .is("fim", null)
        .limit(1)
        .maybeSingle(),
    ]);
  const minutosTeste = (execucoes ?? [])
    .filter((e) => e.fim)
    .reduce((soma, e) => soma + (new Date(e.fim!).getTime() - new Date(e.inicio).getTime()) / 60000, 0);
  const minhaAberta = (abertasMinhas ?? []).find((e) => e.projeto_teste_id === projetoTeste.id) ?? null;
  const outroAberto = (abertasMinhas ?? []).some((e) => e.projeto_teste_id !== projetoTeste.id);

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
            <p className="text-xs font-medium text-signal">
              {nomeTecido(teste.tecido)}
              {projetoTeste.leva ? ` · Leva ${projetoTeste.leva}` : ""}
            </p>
          )}
          <h1 className="mt-1 font-display text-3xl leading-tight text-ink sm:text-4xl">
            {teste ? tituloSemTecido(teste.titulo, teste.tecido) : projetoTeste.teste_slug}
          </h1>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
        {!erroExec && (
          <CronometroTeste
            projetoId={projetoId}
            projetoTesteId={projetoTeste.id}
            aberta={minhaAberta ? { id: minhaAberta.id, inicio: minhaAberta.inicio } : null}
            outroTesteAberto={outroAberto}
            labAberto={Boolean(labAberto)}
            minutosAnteriores={Math.round(minutosTeste)}
            podeIniciar={podeEditar}
          />
        )}
        <div className="flex flex-wrap items-center gap-2">
          {encerrado ? (
            <Badge tom="neutro">encerrado</Badge>
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
          valor={`${ratosConfirmados}/${nEfetivo}`}
          pct={pct(ratosConfirmados, nEfetivo)}
          cor="var(--color-absorbance)"
        />
        <Progresso
          rotulo="Fechamento"
          valor={encerrado ? "encerrado" : "aberto"}
          pct={encerrado ? 100 : 0}
          cor="var(--color-sucesso)"
        />
      </div>

      <AmostrasDoDiaProvider nEfetivo={nEfetivo} previstos={efetivos.previstos}>
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
            indicador: `${ratosConfirmados}/${nEfetivo}`,
            conteudo: (
              <>
                {!preparado && !encerrado && (
                  <p className="mt-6 rounded border border-reagent/40 bg-reagent/[0.06] px-3 py-2 text-sm text-ink">
                    Aparelho e recipiente ainda não foram escolhidos na etapa
                    Preparar. Escolha antes de registrar: eles definem os volumes
                    e entram na planilha de dados brutos.{" "}
                    <a href="#aba-preparar" className="text-absorbance underline">
                      Ir para Preparar
                    </a>
                  </p>
                )}
                <AvisoRatosFora
                  excluidos={efetivos.excluidos}
                  semIdentificar={efetivos.semIdentificar}
                  previstos={efetivos.previstos}
                  nEfetivo={nEfetivo}
                />
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
      </AmostrasDoDiaProvider>
    </main>
  );
}

function AvisoRatosFora({
  excluidos,
  semIdentificar,
  previstos,
  nEfetivo,
}: {
  excluidos: { numero: number; grupoNome: string; motivo: string }[];
  semIdentificar: { grupoNome: string; n: number }[];
  previstos: number;
  nEfetivo: number;
}) {
  if (excluidos.length === 0 && semIdentificar.length === 0) return null;
  return (
    <div className="mt-6 rounded-lg border border-reagent/40 bg-reagent/[0.06] p-4 text-sm">
      <p className="font-medium text-ink">
        {previstos} ratos previstos → <span className="text-reagent">{nEfetivo} efetivos</span>{" "}
        neste teste
      </p>
      {excluidos.length > 0 && (
        <ul className="mt-2 flex flex-col gap-0.5 text-xs text-ink-soft">
          {excluidos.map((e) => (
            <li key={e.numero}>
              <span className="font-mono text-ink">Rato {e.numero}</span> ({e.grupoNome}) —{" "}
              {e.motivo}. Fora da tabela.
            </li>
          ))}
        </ul>
      )}
      {semIdentificar.length > 0 && (
        <p className="mt-2 text-xs leading-relaxed text-ink-soft">
          Mortes no biotério ainda sem número de rato:{" "}
          {semIdentificar.map((g) => `${g.n} no ${g.grupoNome}`).join(", ")}. A contagem
          já desconta; deixe em branco os ratos que morreram. Quando o dia do
          sacrifício marcar quem não sobreviveu, eles saem da tabela sozinhos.
        </p>
      )}
    </div>
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
        <span className="text-xs text-ink-soft font-medium">
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
