import Link from "next/link";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import {
  calcularMetricas,
  temposPorTipo,
  type SessaoBruta,
  type FuncaoBruta,
} from "@/lib/painel";
import PainelDebora from "./PainelDebora";
import { testes as catalogoTestes, nomeTecido, tituloSemTecido } from "@/lib/testes";
import { Abas } from "@/components/ui/Abas";
import { Badge } from "@/components/ui/Badge";

type Bolsista = { id: string; nome: string };
type Projeto = { id: string; nome: string; created_at: string; finalizado: boolean };
type TesteDesignado = {
  id: string;
  projeto_id: string;
  teste_slug: string;
  status: "pendente" | "concluido";
  responsavel_id: string;
  created_at: string | null;
  encerrado_em: string | null;
  leitura_inicio: string | null;
  leitura_fim: string | null;
};
type Membro = { projeto_id: string; profile_id: string };

function primeiroNome(nome: string | undefined): string {
  return (nome ?? "").split(" ")[0] || "orientadora";
}

// Fora do componente: o lint de React não aceita relógio direto no render.
const agoraMs = () => Date.now();

const dataHoje = () =>
  new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export default async function PainelOrientadora() {
  const usuario = await getUsuarioAtual();
  const supabase = await createClient();

  const [
    { data: bolsistas },
    { data: projetos },
    { data: testes },
    { data: membros },
    { data: sessoes },
    { data: funcoes },
    { data: registros },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, nome")
      .eq("papel", "bolsista")
      .eq("aprovado", true)
      .order("nome")
      .returns<Bolsista[]>(),
    supabase
      .from("projetos")
      .select("id, nome, created_at, finalizado")
      .order("created_at", { ascending: false })
      .returns<Projeto[]>(),
    supabase
      .from("projeto_testes")
      .select(
        "id, projeto_id, teste_slug, status, responsavel_id, created_at, encerrado_em, leitura_inicio, leitura_fim"
      )
      .returns<TesteDesignado[]>(),
    supabase
      .from("projeto_membros")
      .select("projeto_id, profile_id")
      .returns<Membro[]>(),
    supabase
      .from("sessoes_lab")
      .select("profile_id, inicio, fim, topicos")
      .returns<SessaoBruta[]>(),
    supabase
      .from("sacrificio_funcoes")
      .select("profile_id, sacrificio_id")
      .returns<FuncaoBruta[]>(),
    // Só o necessário para atividade recente e testes parados.
    supabase
      .from("resultados_teste")
      .select("projeto_teste_id, registrado_por, created_at, confirmado")
      .order("created_at", { ascending: false })
      .limit(2000)
      .returns<
        { projeto_teste_id: string; registrado_por: string; created_at: string; confirmado: boolean }[]
      >(),
  ]);

  const metricas = calcularMetricas({
    bolsistas: bolsistas ?? [],
    membros: membros ?? [],
    testes: testes ?? [],
    sessoes: sessoes ?? [],
    funcoes: funcoes ?? [],
  });
  const tempos = temposPorTipo(testes ?? []);

  const totalTestes = testes?.length ?? 0;
  const totalConcluidos = testes?.filter((t) => t.status === "concluido").length ?? 0;
  const totalPendentes = totalTestes - totalConcluidos;
  const projetosAtivos = (projetos ?? []).filter((p) => !p.finalizado).length;
  const horasTotais = Math.round(metricas.reduce((s, m) => s + m.horasLab, 0));

  // KPIs — cada um com um acento da paleta científica do laboratório.
  const kpis: { rotulo: string; valor: number; cor: string }[] = [
    { rotulo: "Bolsistas", valor: bolsistas?.length ?? 0, cor: "var(--color-absorbance)" },
    { rotulo: "Projetos ativos", valor: projetosAtivos, cor: "var(--color-pyrogallol)" },
    { rotulo: "Testes concluídos", valor: totalConcluidos, cor: "var(--color-signal)" },
    { rotulo: "Testes pendentes", valor: totalPendentes, cor: "var(--color-reagent)" },
    { rotulo: "Horas no laboratório", valor: horasTotais, cor: "var(--color-absorbance)" },
  ];

  // --- Atividade recente: leituras agrupadas por teste + pessoa + dia.
  const nomeDe = new Map((bolsistas ?? []).map((b) => [b.id, b.nome]));
  const testePorId = new Map((testes ?? []).map((t) => [t.id, t]));
  const projetoPorId = new Map((projetos ?? []).map((p) => [p.id, p]));
  const tituloTeste = (slug: string) => {
    const c = catalogoTestes.find((x) => x.slug === slug);
    return c ? `${tituloSemTecido(c.titulo, c.tecido)} — ${nomeTecido(c.tecido)}` : slug;
  };
  const diaBR = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const blocos = new Map<
    string,
    { testeId: string; pessoa: string; dia: string; quando: string; n: number }
  >();
  for (const r of registros ?? []) {
    const chave = `${r.projeto_teste_id}|${r.registrado_por}|${diaBR(r.created_at)}`;
    const b = blocos.get(chave);
    if (b) b.n += 1;
    else
      blocos.set(chave, {
        testeId: r.projeto_teste_id,
        pessoa: r.registrado_por,
        dia: diaBR(r.created_at),
        quando: r.created_at,
        n: 1,
      });
  }
  const atividade = Array.from(blocos.values())
    .sort((a, b) => b.quando.localeCompare(a.quando))
    .slice(0, 12);

  // --- Precisa de atenção: testes pendentes sem leitura há 14+ dias (ou
  // nunca iniciados há 14+ dias desde a designação).
  const ultimaLeitura = new Map<string, string>();
  for (const r of registros ?? []) {
    if (!ultimaLeitura.has(r.projeto_teste_id)) ultimaLeitura.set(r.projeto_teste_id, r.created_at);
  }
  const agora = agoraMs();
  const DIA = 86_400_000;
  const parados = (testes ?? [])
    .filter((t) => t.status === "pendente" && !t.encerrado_em)
    .map((t) => {
      const ref = ultimaLeitura.get(t.id) ?? t.created_at;
      const dias = ref ? Math.floor((agora - new Date(ref).getTime()) / DIA) : null;
      return { t, dias, iniciado: ultimaLeitura.has(t.id) };
    })
    .filter((x) => x.dias !== null && x.dias >= 14)
    .sort((a, b) => (b.dias ?? 0) - (a.dias ?? 0));

  const hojeBR = diaBR(new Date().toISOString());
  const ontemBR = diaBR(new Date(agora - DIA).toISOString());
  const rotuloDia = (d: string) => (d === hojeBR ? "hoje" : d === ontemBR ? "ontem" : d);

  const listaAtividade = (
    <section className="mt-6">
      {atividade.length === 0 ? (
        <p className="text-sm text-ink-soft">Nenhuma leitura registrada ainda.</p>
      ) : (
        <ol className="relative ml-2 border-l border-rule">
          {atividade.map((a) => {
            const t = testePorId.get(a.testeId);
            const proj = t ? projetoPorId.get(t.projeto_id) : undefined;
            return (
              <li key={`${a.testeId}${a.pessoa}${a.dia}`} className="relative pb-4 pl-5 last:pb-0">
                <span
                  aria-hidden
                  className="absolute top-1.5 -left-[5px] h-2.5 w-2.5 rounded-full border-2 border-paper bg-absorbance"
                />
                <p className="text-sm text-ink">
                  <span className="font-medium">{(nomeDe.get(a.pessoa) ?? "Alguém").split(" ")[0]}</span>{" "}
                  registrou {a.n} leitura{a.n > 1 ? "s" : ""} em{" "}
                  {t ? (
                    <Link
                      href={`/projetos/${t.projeto_id}/testes/${t.id}?aba=registro`}
                      className="text-absorbance hover:underline"
                    >
                      {tituloTeste(t.teste_slug)}
                    </Link>
                  ) : (
                    "um teste"
                  )}
                </p>
                <p className="font-mono text-[11px] text-ink-soft">
                  {rotuloDia(a.dia)}
                  {proj ? ` · ${proj.nome}` : ""}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );

  const listaAtencao = (
    <section className="mt-6">
      {parados.length === 0 ? (
        <p className="text-sm text-ink-soft">
          Nenhum teste parado: todos os pendentes tiveram leitura nos últimos 14 dias.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {parados.map(({ t, dias, iniciado }) => (
            <Link
              key={t.id}
              href={`/projetos/${t.projeto_id}/testes/${t.id}`}
              className="rounded-lg border border-rule bg-paper-raised p-3 transition-colors hover:border-reagent"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-snug text-ink">{tituloTeste(t.teste_slug)}</p>
                <Badge tom="atencao">{dias} dias</Badge>
              </div>
              <p className="mt-1 text-xs text-ink-soft">
                {projetoPorId.get(t.projeto_id)?.nome ?? "projeto"} ·{" "}
                {(nomeDe.get(t.responsavel_id) ?? "?").split(" ")[0]} ·{" "}
                {iniciado ? "sem leitura nova" : "não iniciado"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      {/* Hero editorial */}
      <header className="border-b border-rule pb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-signal">
          LANC · Painel da orientadora
        </p>
        <h1 className="mt-3 font-display text-4xl leading-[1.05] text-ink sm:text-5xl">
          Olá, {primeiroNome(usuario?.nome)}.
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">
          Uma visão do laboratório num só lugar: a equipe, o andamento dos
          projetos e a atividade de bancada — para acompanhar de perto sem
          precisar perguntar.
        </p>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft/70">
          {dataHoje()}
        </p>
      </header>

      {/* KPIs */}
      <section className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <div
            key={k.rotulo}
            className="relative overflow-hidden rounded-lg border border-rule bg-paper-raised px-4 py-4"
          >
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-[3px]"
              style={{ background: k.cor }}
            />
            <p className="font-display text-4xl leading-none tabular-nums text-ink">
              {k.valor}
            </p>
            <p className="mt-2 font-mono text-[10px] uppercase leading-tight tracking-[0.1em] text-ink-soft">
              {k.rotulo}
            </p>
          </div>
        ))}
      </section>

      {/* Acompanhamento: o que aconteceu e o que está parado */}
      <Abas
        className="mt-10"
        parametro="acomp"
        inicial={parados.length > 0 ? "atencao" : "atividade"}
        abas={[
          { id: "atividade", rotulo: "Atividade recente", conteudo: listaAtividade },
          {
            id: "atencao",
            rotulo: "Precisa de atenção",
            indicador: parados.length,
            conteudo: listaAtencao,
          },
        ]}
      />

      {/* Equipe + comparativos */}
      {!bolsistas || bolsistas.length === 0 ? (
        <p className="mt-12 text-sm text-ink-soft">
          Nenhum bolsista aprovado ainda. Quando a equipe começar a registrar
          testes e sessões, os números aparecem aqui.
        </p>
      ) : (
        <PainelDebora metricas={metricas} temposPorTipo={tempos} />
      )}

      {/* Projetos */}
      <section className="mt-16">
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-signal">
          Projetos
        </p>
        {(!projetos || projetos.length === 0) && (
          <p className="text-sm text-ink-soft">Nenhum projeto criado ainda.</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {projetos?.map((p) => {
            const testesDoProjeto = (testes ?? []).filter((t) => t.projeto_id === p.id);
            const membrosDoProjeto = (membros ?? []).filter((m) => m.projeto_id === p.id).length;
            const pendentes = testesDoProjeto.filter((t) => t.status === "pendente");
            const feitos = testesDoProjeto.length - pendentes.length;
            const progresso =
              testesDoProjeto.length > 0
                ? Math.round((feitos / testesDoProjeto.length) * 100)
                : 0;
            return (
              <Link
                key={p.id}
                href={`/projetos/${p.id}?aba=resultados`}
                className="group block rounded-lg border border-rule bg-paper-raised p-4 transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-signal"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-display text-lg leading-snug text-ink group-hover:text-signal">
                    {p.nome}
                  </p>
                  {p.finalizado && (
                    <span className="shrink-0 rounded-full bg-ink/5 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-ink-soft">
                      finalizado
                    </span>
                  )}
                </div>
                <p className="mt-1 font-mono text-[11px] text-ink-soft">
                  {membrosDoProjeto} membro(s) · {testesDoProjeto.length} teste(s)
                </p>
                {testesDoProjeto.length > 0 && (
                  <div className="mt-3">
                    <div className="h-1 w-full overflow-hidden rounded-full bg-rule">
                      <div className="h-full bg-signal" style={{ width: `${progresso}%` }} />
                    </div>
                    <p className="mt-1.5 font-mono text-[10px] text-ink-soft">
                      {feitos}/{testesDoProjeto.length} concluídos
                      {pendentes.length > 0 && (
                        <span className="text-reagent"> · {pendentes.length} pendente(s)</span>
                      )}
                    </p>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
