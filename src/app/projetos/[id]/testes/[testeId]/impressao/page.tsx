import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { testes as catalogoTestes, nomeTecido, tituloSemTecido } from "@/lib/testes";
import { configDoTeste, type ConfigTeste } from "@/lib/tiposTeste";
import { gerarRoster, type GrupoComContagem } from "@/lib/roster";
import {
  ehAparelho,
  ehRecipiente,
  nomeAparelho,
  nomeRecipiente,
} from "@/lib/recipientes";
import BotaoImprimir from "./BotaoImprimir";

type ProjetoTeste = {
  id: string;
  projeto_id: string;
  teste_slug: string;
  responsavel_id: string;
  leva: number | null;
  aparelho: string | null;
  recipiente: string | null;
  leitura_inicio: string | null;
  leitura_fim: string | null;
  encerrado: boolean;
  encerrado_por: string | null;
  encerrado_em: string | null;
};

type Resultado = {
  rato: string;
  grupo_id: string;
  leituras: { colunas?: Record<string, unknown> } | null;
  valor_calculado: number | null;
  dentro_do_padrao: boolean | null;
  observacoes: string | null;
};

const TEMPOS_CAT = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const TEMPOS_SOD = [0, 30, 60, 90, 120];

type Coluna = { key: string; label: string };

// Mesmas colunas brutas da tela de registro, derivadas do tipo de ensaio.
function colunasDoConfig(config: ConfigTeste): Coluna[] {
  if (config.familia === "cat")
    return TEMPOS_CAT.map((t) => ({ key: `t${t}`, label: `${t}s` }));
  if (config.familia === "sod")
    return TEMPOS_SOD.map((t) => ({ key: `t${t}`, label: `${t}s` }));
  if (config.familia === "curva")
    return [
      { key: "abs", label: "Absorbância" },
      { key: "dil", label: "Diluição" },
    ];
  return (config.camposBrutos ?? []).map((c) => ({
    key: c.chave,
    label: c.rotulo,
  }));
}

function dataHora(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Horário de leitura é texto literal digitado ("2026-07-27T14:30") — sem fuso.
function horarioLeitura(v: string | null): string {
  if (!v) return "—";
  return v.replace("T", " ");
}

export default async function PaginaImpressao({
  params,
}: {
  params: Promise<{ id: string; testeId: string }>;
}) {
  const { id: projetoId, testeId } = await params;
  const supabase = await createClient();
  const usuario = await getUsuarioAtual();

  const [{ data: projetoTeste }, { data: projeto }, { data: grupos }, { data: membros }, { data: resultados }] =
    await Promise.all([
      supabase
        .from("projeto_testes")
        .select(
          "id, projeto_id, teste_slug, responsavel_id, leva, aparelho, recipiente, leitura_inicio, leitura_fim, encerrado, encerrado_por, encerrado_em"
        )
        .eq("id", testeId)
        .eq("projeto_id", projetoId)
        .maybeSingle()
        .returns<ProjetoTeste>(),
      supabase
        .from("projetos")
        .select("nome, numero_levas, especie, linhagem")
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
        .select("rato, grupo_id, leituras, valor_calculado, dentro_do_padrao, observacoes")
        .eq("projeto_teste_id", testeId)
        .returns<Resultado[]>(),
    ]);

  if (!projetoTeste) notFound();

  const souResponsavel = projetoTeste.responsavel_id === usuario?.id;
  const souCoautor =
    membros?.some((m) => m.papel === "coautor" && m.profile_id === usuario?.id) ??
    false;
  const souOrientador = usuario?.papel === "orientador";
  if (!souResponsavel && !souCoautor && !souOrientador) notFound();

  const teste = catalogoTestes.find((t) => t.slug === projetoTeste.teste_slug);
  const config = configDoTeste(projetoTeste.teste_slug);

  const voltarHref = `/projetos/${projetoId}/testes/${projetoTeste.id}`;

  // A impressão só existe depois de encerrar (dados finais e travados).
  if (!projetoTeste.encerrado || !config) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <p className="text-sm text-ink-soft">
          A tabela para impressão fica disponível depois que o teste é encerrado.
        </p>
        <Link href={voltarHref} className="mt-4 inline-block text-sm text-signal hover:underline">
          ← Voltar ao teste
        </Link>
      </main>
    );
  }

  // Nomes de responsável e de quem encerrou.
  const idsPessoas = Array.from(
    new Set(
      [projetoTeste.responsavel_id, projetoTeste.encerrado_por].filter(
        (v): v is string => Boolean(v)
      )
    )
  );
  const nomePessoa = new Map<string, string>();
  if (idsPessoas.length > 0) {
    const { data: perfis } = await supabase
      .from("profiles")
      .select("id, nome")
      .in("id", idsPessoas);
    for (const p of perfis ?? []) nomePessoa.set(p.id, p.nome);
  }

  const rosterCompleto = gerarRoster(grupos ?? [], projeto?.numero_levas ?? 1);
  const roster = projetoTeste.leva
    ? rosterCompleto.filter((r) => r.leva === projetoTeste.leva)
    : rosterCompleto;
  const temLevas = roster.some((r) => r.leva > 1);

  const colunas = colunasDoConfig(config);
  const porRato = new Map(resultados?.map((r) => [r.rato, r]) ?? []);

  const aparelhoLabel = ehAparelho(projetoTeste.aparelho)
    ? nomeAparelho(projetoTeste.aparelho)
    : "—";
  const recipienteLabel = ehRecipiente(projetoTeste.recipiente)
    ? nomeRecipiente(projetoTeste.recipiente)
    : "—";

  const metadados: { rotulo: string; valor: string }[] = [
    { rotulo: "Projeto", valor: projeto?.nome ?? "—" },
    {
      rotulo: "Ensaio",
      valor: teste
        ? tituloSemTecido(teste.titulo, teste.tecido)
        : projetoTeste.teste_slug,
    },
    { rotulo: "Tecido / matriz", valor: teste ? nomeTecido(teste.tecido) : "—" },
    {
      rotulo: "Modelo animal",
      valor:
        [
          projeto?.especie === "camundongo"
            ? "Camundongo"
            : projeto?.especie === "rato"
            ? "Rato"
            : null,
          projeto?.linhagem,
        ]
          .filter(Boolean)
          .join(" ") || "—",
    },
    { rotulo: "Leva", valor: projetoTeste.leva ? String(projetoTeste.leva) : "todas" },
    { rotulo: "Responsável", valor: nomePessoa.get(projetoTeste.responsavel_id) ?? "—" },
    { rotulo: "Aparelho", valor: aparelhoLabel },
    { rotulo: "Recipiente", valor: recipienteLabel },
    { rotulo: "Início da leitura", valor: horarioLeitura(projetoTeste.leitura_inicio) },
    { rotulo: "Fim da leitura", valor: horarioLeitura(projetoTeste.leitura_fim) },
    {
      rotulo: "Encerrado por",
      valor: projetoTeste.encerrado_por
        ? nomePessoa.get(projetoTeste.encerrado_por) ?? "—"
        : "—",
    },
    { rotulo: "Encerrado em", valor: dataHora(projetoTeste.encerrado_em) },
  ];

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Barra de ações — não sai na impressão */}
      <div
        data-noprint
        className="mb-6 flex items-center justify-between gap-3 border-b border-rule pb-4"
      >
        <Link href={voltarHref} className="text-sm text-ink-soft hover:text-signal">
          ← Voltar ao teste
        </Link>
        <BotaoImprimir />
      </div>

      {/* Folha para o caderno de experimentos — tipografia científica (serif),
          fonte compacta para caber em menos páginas. */}
      <div className="font-display text-[11px] leading-snug text-neutral-900">
        <header className="mb-3 flex items-center gap-3 border-b-2 border-neutral-800 pb-2.5">
          <Image
            src="/logo-lanc.jpg"
            alt="Logo do LANC"
            width={48}
            height={48}
            unoptimized
            priority
            className="h-11 w-11 shrink-0 rounded-full object-cover"
          />
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-neutral-600">
              LANC — Laboratório de Neurociências e Comportamento · FURB
            </p>
            <h1 className="mt-0.5 font-display text-lg font-medium leading-tight text-neutral-900">
              {metadados[1].valor} — {metadados[2].valor}
            </h1>
          </div>
        </header>

        <dl className="mb-3 grid grid-cols-3 gap-x-5 gap-y-1 sm:grid-cols-4">
          {metadados.map((m) => (
            <div key={m.rotulo} className="flex flex-col">
              <dt className="font-mono text-[8px] uppercase tracking-wide text-neutral-500">
                {m.rotulo}
              </dt>
              <dd className="text-[11px] text-neutral-900">{m.valor}</dd>
            </div>
          ))}
        </dl>

        <p className="mb-1.5 text-[10px] italic text-neutral-600">
          Tabela 1. Leituras registradas por animal — {metadados[1].valor} (
          {metadados[2].valor}). Projeto {metadados[0].valor}.
        </p>

        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="border-t-2 border-b border-neutral-800 text-left align-bottom">
              <th className="py-1 pr-2.5 font-semibold">Nº</th>
              {temLevas && <th className="py-1 pr-2.5 font-semibold">Leva</th>}
              <th className="py-1 pr-2.5 font-semibold">Grupo</th>
              {colunas.map((c) => (
                <th key={c.key} className="py-1 pr-2.5 text-right font-semibold">
                  {c.label}
                </th>
              ))}
              {config.familia !== "simples" && (
                <th className="py-1 pr-2.5 text-right font-semibold">
                  Valor{config.unidadeResultado ? ` (${config.unidadeResultado})` : ""}
                </th>
              )}
              <th className="py-1 pr-2.5 font-semibold">QC</th>
              <th className="py-1 font-semibold">Observação</th>
            </tr>
          </thead>
          <tbody className="[&>tr:last-child>td]:border-b-2 [&>tr:last-child>td]:border-neutral-800">
            {roster.map((r) => {
              const res = porRato.get(String(r.numero));
              const cols = (res?.leituras?.colunas ?? {}) as Record<string, unknown>;
              return (
                <tr key={r.numero}>
                  <td className="py-[3px] pr-2.5 tabular-nums">{r.numero}</td>
                  {temLevas && <td className="py-[3px] pr-2.5 tabular-nums">{r.leva}</td>}
                  <td className="py-[3px] pr-2.5 whitespace-nowrap">{r.grupoNome}</td>
                  {colunas.map((c) => {
                    const v = cols[c.key];
                    return (
                      <td key={c.key} className="py-[3px] pr-2.5 text-right tabular-nums">
                        {typeof v === "number" || typeof v === "string" ? String(v) : "—"}
                      </td>
                    );
                  })}
                  {config.familia !== "simples" && (
                    <td className="py-[3px] pr-2.5 text-right tabular-nums">
                      {res?.valor_calculado != null
                        ? res.valor_calculado.toFixed(config.familia === "curva" ? 3 : 4)
                        : "—"}
                    </td>
                  )}
                  <td className="py-[3px] pr-2.5">
                    {res?.dentro_do_padrao == null
                      ? "—"
                      : res.dentro_do_padrao
                      ? "ok"
                      : "fora"}
                  </td>
                  <td className="py-[3px]">{res?.observacoes ?? ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {config.familia === "simples" && (
          <p className="mt-2 max-w-2xl text-[9px] leading-relaxed text-neutral-600">
            Absorbâncias brutas. A normalização por proteína e o fator de diluição
            são aplicados depois, na análise dos dados (R).
          </p>
        )}

        <p className="mt-4 border-t border-neutral-300 pt-2 font-mono text-[9px] text-neutral-500">
          Impresso da plataforma LANC em {dataHora(new Date().toISOString())}. Colar
          no caderno de experimentos.
        </p>
      </div>
    </main>
  );
}
