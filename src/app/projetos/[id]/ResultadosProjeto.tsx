"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  ErrorBar,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
} from "recharts";
import { estatisticas } from "@/lib/resumoResultados";
import { EmptyState } from "@/components/ui/EmptyState";

export type TesteResumo = {
  id: string;
  titulo: string;
  tecido: string;
  rotulo: string;
  unidade: string;
  encerrado: boolean;
  totalRatos: number;
  valores: { rato: string; grupoId: string; valor: number }[];
};

type Grupo = { id: string; nome: string };

// Cores dos grupos, da paleta científica do laboratório (em ordem).
const CORES = [
  "var(--color-ink-soft)",
  "var(--color-absorbance)",
  "var(--color-reagent)",
  "var(--color-pyrogallol)",
  "var(--color-signal)",
  "var(--color-alerta)",
];

function f(v: number | null, casas = 3) {
  return v === null ? "—" : v.toFixed(casas).replace(".", ",");
}

export default function ResultadosProjeto({
  projetoId,
  testes,
  grupos,
}: {
  projetoId: string;
  testes: TesteResumo[];
  grupos: Grupo[];
}) {
  const comDados = testes.filter((t) => t.valores.length > 0);
  const [sel, setSel] = useState(comDados[0]?.id ?? testes[0]?.id);
  const [referencia, setReferencia] = useState(grupos[0]?.id ?? "");
  const teste = testes.find((t) => t.id === sel);

  const porGrupo = useMemo(() => {
    if (!teste) return [];
    return grupos.map((g, i) => {
      const vals = teste.valores.filter((v) => v.grupoId === g.id).map((v) => v.valor);
      return { grupo: g, cor: CORES[i % CORES.length], ...estatisticas(vals), vals };
    });
  }, [teste, grupos]);

  if (testes.length === 0) {
    return (
      <EmptyState
        className="mt-6"
        titulo="Nenhum teste designado ainda"
        descricao="Quando os testes forem designados e os ratos confirmados, a comparação entre grupos aparece aqui."
      />
    );
  }

  const ref = porGrupo.find((p) => p.grupo.id === referencia);
  const casas = teste && teste.unidade === "Abs" ? 3 : 2;

  // Dados do gráfico: barra = média, barra de erro = EPM, pontos = ratos.
  const dadosBarras = porGrupo
    .filter((p) => p.media !== null)
    .map((p) => ({ grupo: p.grupo.nome, media: p.media, epm: p.epm ?? 0, cor: p.cor }));
  const dadosPontos = porGrupo.flatMap((p) =>
    p.vals.map((v) => ({ grupo: p.grupo.nome, valor: v }))
  );

  return (
    <div className="mt-6">
      <p className="mb-3 max-w-2xl text-xs leading-relaxed text-ink-soft">
        Visão <strong className="font-medium text-ink">preliminar</strong> para
        acompanhar o andamento: média, desvio-padrão e erro-padrão por grupo,
        só com os ratos já confirmados. Nos ensaios de ponto final é a
        absorbância líquida (sem normalizar por proteína nem diluição) — a
        análise final continua no R.
      </p>

      {/* Seletor de teste */}
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Teste">
        {testes.map((t) => {
          const on = t.id === sel;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setSel(t.id)}
              className={`rounded-full border px-3 py-1.5 text-left text-xs transition-colors ${
                on
                  ? "border-signal bg-signal text-white"
                  : "border-rule bg-paper-raised text-ink hover:border-signal"
              }`}
            >
              <span className="font-medium">{t.titulo}</span>
              <span className={on ? "text-white/80" : "text-ink-soft"}>
                {" "}· {t.tecido} · {t.valores.length}/{t.totalRatos}
              </span>
            </button>
          );
        })}
      </div>

      {teste && teste.valores.length === 0 && (
        <EmptyState
          className="mt-6"
          titulo="Ainda sem ratos confirmados neste teste"
          descricao="Assim que o responsável confirmar as leituras, os números aparecem aqui."
          acao={
            <Link
              href={`/projetos/${projetoId}/testes/${teste.id}`}
              className="text-sm text-absorbance hover:underline"
            >
              Abrir o teste
            </Link>
          }
        />
      )}

      {teste && teste.valores.length > 0 && (
        <div key={teste.id} className="anim-fade mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          {/* Tabela por grupo */}
          <div className="overflow-x-auto rounded-lg border border-rule bg-paper-raised">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rule text-left text-xs text-ink-soft font-medium">
                  <th className="px-3 py-2 font-normal">Grupo</th>
                  <th className="px-2 py-2 text-right font-normal">n</th>
                  <th className="px-2 py-2 text-right font-normal">Média</th>
                  <th className="px-2 py-2 text-right font-normal">DP</th>
                  <th className="px-2 py-2 text-right font-normal">EPM</th>
                  <th className="px-3 py-2 text-right font-normal">Δ% ref.</th>
                </tr>
              </thead>
              <tbody>
                {porGrupo.map((p) => {
                  const delta =
                    ref && ref.media && p.media !== null && p.grupo.id !== ref.grupo.id
                      ? ((p.media - ref.media) / Math.abs(ref.media)) * 100
                      : null;
                  return (
                    <tr key={p.grupo.id} className="border-b border-rule/60 last:border-0">
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-2 text-ink">
                          <span
                            aria-hidden
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: p.cor }}
                          />
                          {p.grupo.nome}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-ink-soft">{p.n}</td>
                      <td className="px-2 py-2 text-right font-mono text-ink">{f(p.media, casas)}</td>
                      <td className="px-2 py-2 text-right font-mono text-ink-soft">{f(p.dp, casas)}</td>
                      <td className="px-2 py-2 text-right font-mono text-ink-soft">{f(p.epm, casas)}</td>
                      <td
                        className={`px-3 py-2 text-right font-mono ${
                          delta === null
                            ? "text-ink-soft/60"
                            : delta > 0
                            ? "text-absorbance"
                            : "text-reagent"
                        }`}
                      >
                        {p.grupo.id === referencia
                          ? "ref."
                          : delta === null
                          ? "—"
                          : `${delta > 0 ? "+" : ""}${delta.toFixed(1).replace(".", ",")}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex flex-wrap items-center gap-2 border-t border-rule px-3 py-2 text-xs text-ink-soft">
              <span>{teste.rotulo}{teste.unidade && teste.unidade !== "Abs" ? ` (${teste.unidade})` : ""}</span>
              <label className="ml-auto flex items-center gap-1.5">
                Referência
                <select
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  className="rounded border border-rule bg-paper px-1.5 py-0.5 text-xs text-ink"
                >
                  {grupos.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nome}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* Gráfico: média ± EPM + cada rato */}
          <div className="h-72 rounded-lg border border-rule bg-paper-raised p-2">
            <ResponsiveContainer>
              <ComposedChart data={dadosBarras} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="var(--color-rule)" vertical={false} />
                <XAxis
                  dataKey="grupo"
                  type="category"
                  allowDuplicatedCategory={false}
                  stroke="var(--color-ink-soft)"
                  tick={{ fontSize: 11 }}
                />
                <YAxis stroke="var(--color-ink-soft)" tick={{ fontSize: 11 }} width={48} />
                <Tooltip
                  cursor={{ fill: "var(--color-ink)", fillOpacity: 0.04 }}
                  formatter={(v) => (typeof v === "number" ? v.toFixed(casas) : String(v))}
                  contentStyle={{
                    background: "var(--color-paper-raised)",
                    border: "1px solid var(--color-rule)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="media"
                  name="Média"
                  fill="var(--color-absorbance)"
                  fillOpacity={0.18}
                  stroke="var(--color-absorbance)"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={56}
                  isAnimationActive
                >
                  <ErrorBar dataKey="epm" width={8} stroke="var(--color-ink)" strokeWidth={1.2} />
                </Bar>
                <Scatter
                  data={dadosPontos}
                  dataKey="valor"
                  name="Rato"
                  fill="var(--color-absorbance)"
                  fillOpacity={0.75}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
