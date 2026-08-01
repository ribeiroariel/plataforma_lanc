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
}: {
  params: Promise<{ id: string; testeId: string }>;
}) {
  const { id: projetoId, testeId } = await params;
  const supabase = await createClient();
  const usuario = await getUsuarioAtual();

  const [{ data: projetoTeste }, { data: projeto }, { data: grupos }, { data: membros }, { data: resultados }, { data: passos }] =
    await Promise.all([
      supabase
        .from("projeto_testes")
        .select(
          "id, projeto_id, teste_slug, status, responsavel_id, leva, aparelho, recipiente, leitura_inicio, leitura_fim, encerrado, encerrado_por, encerrado_em, consideracoes"
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

  if (!souResponsavel && !souCoautor && !souOrientador) {
    // RLS já bloquearia a leitura de "resultados" de quem não é
    // responsável/coautor/orientadora, mas aqui é sobre a designação em
    // si — se chegou até aqui sem ser nenhum dos três, não deveria ver.
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
  const podeEditar = (souResponsavel || souCoautor) && !encerrado;

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

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href={`/projetos/${projetoId}`}
        className="text-sm text-ink-soft hover:text-absorbance"
      >
        ← {projeto?.nome ?? "Projeto"}
      </Link>
      {teste && (
        <p className="mt-2 font-mono text-xs font-medium uppercase tracking-[0.14em] text-signal">
          {nomeTecido(teste.tecido)}
        </p>
      )}
      <h1 className="mt-1 font-display text-3xl leading-tight text-ink">
        {teste ? tituloSemTecido(teste.titulo, teste.tecido) : projetoTeste.teste_slug}
      </h1>
      {projetoTeste.leva && (
        <p className="mt-1 font-mono text-xs text-ink-soft">
          Leva {projetoTeste.leva}
        </p>
      )}

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

      <ChecklistProcedimento
        projetoId={projetoId}
        projetoTesteId={projetoTeste.id}
        slug={projetoTeste.teste_slug}
        nRoster={roster.length}
        estado={estadoPassos}
        podeMarcar={podeEditar}
      />

      <RegistroResultado
        projetoId={projetoId}
        projetoTesteId={projetoTeste.id}
        statusAtual={projetoTeste.status}
        config={config}
        roster={roster}
        resultadosExistentes={resultados ?? []}
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

      {/* A foto da tabela colada no caderno só faz sentido depois de encerrar
          e imprimir — por isso aparece só aqui, junto do encerramento. */}
      {encerrado && (
        <FotosCaderno
          projetoId={projetoId}
          projetoTesteId={projetoTeste.id}
          fotos={fotosCaderno}
          podeAnexar={souResponsavel}
        />
      )}
    </main>
  );
}
