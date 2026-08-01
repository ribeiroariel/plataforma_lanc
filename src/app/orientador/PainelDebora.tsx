"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MetricasBolsista } from "@/lib/painel";

type TempoTipo = { tipo: string; mediaMin: number; n: number };

// Cores de dados, da paleta científica do LANC (química dos ensaios).
const AZUL = "var(--color-absorbance)";
const VERDE = "var(--color-signal)";
const AMBAR = "var(--color-reagent)";
const VIOLETA = "var(--color-pyrogallol)";

const tooltipStyle = {
  background: "var(--color-paper-raised)",
  border: "1px solid var(--color-rule)",
  borderRadius: 6,
  fontSize: 12,
  boxShadow: "0 4px 16px rgb(0 0 0 / 0.08)",
};
const tickMono = { fontSize: 11, fill: "var(--color-ink-soft)" };
const gridProps = {
  vertical: false as const,
  strokeDasharray: "2 4",
  stroke: "var(--color-rule)",
};
const cursorSuave = { fill: "var(--color-ink)", fillOpacity: 0.04 };
const RADIUS: [number, number, number, number] = [4, 4, 0, 0];

function primeiroNome(nome: string): string {
  return nome.split(" ")[0];
}

export default function PainelDebora({
  metricas,
  temposPorTipo,
}: {
  metricas: MetricasBolsista[];
  temposPorTipo: TempoTipo[];
}) {
  const dado = (mapa: (m: MetricasBolsista) => number, chave: string) =>
    metricas.map((m) => ({ nome: primeiroNome(m.nome), [chave]: mapa(m) }));

  return (
    <div className="mt-14 flex flex-col gap-14">
      {/* ── Equipe ── */}
      <section>
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-signal">
          Equipe
        </p>
        <div className="overflow-x-auto rounded-lg border border-rule">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-rule bg-paper-raised text-left font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft">
                <th className="py-2.5 pl-4 pr-3 font-normal">Bolsista</th>
                <th className="py-2.5 pr-3 text-right font-normal">Proj.</th>
                <th className="py-2.5 pr-3 text-right font-normal">Concl.</th>
                <th className="py-2.5 pr-3 text-right font-normal">Pend.</th>
                <th className="py-2.5 pr-3 text-right font-normal">3 meses</th>
                <th className="py-2.5 pr-3 text-right font-normal">Horas</th>
                <th className="py-2.5 pr-3 text-right font-normal">Sacr.</th>
                <th className="py-2.5 pr-4 text-right font-normal">Reag.</th>
              </tr>
            </thead>
            <tbody>
              {metricas.map((m, i) => (
                <tr
                  key={m.id}
                  className={i % 2 === 1 ? "bg-paper-raised/40" : ""}
                >
                  <td className="py-2.5 pl-4 pr-3 font-medium text-ink">{m.nome}</td>
                  <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-ink-soft">{m.projetos}</td>
                  <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-ink">{m.testesConcluidos}</td>
                  <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-reagent">{m.testesPendentes || "—"}</td>
                  <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-ink-soft">{m.testes3Meses}</td>
                  <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-ink-soft">{m.horasLab}</td>
                  <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-ink-soft">{m.sacrificios}</td>
                  <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-ink-soft">{m.reagentesPreparados}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Comparativos ── */}
      <section>
        <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.16em] text-signal">
          Comparativos
        </p>
        <p className="mb-5 max-w-2xl text-xs leading-relaxed text-ink-soft">
          Como a equipe se distribui — testes, horas de bancada e produção.
          Horas e reagentes vêm das sessões de laboratório; o tempo de execução,
          dos horários de leitura de cada teste.
        </p>

        {metricas.length === 0 ? (
          <p className="text-sm text-ink-soft">Sem dados para comparar ainda.</p>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            <ChartCard titulo="Testes por bolsista" legenda>
              <BarChart
                data={metricas.map((m) => ({
                  nome: primeiroNome(m.nome),
                  Concluídos: m.testesConcluidos,
                  Pendentes: m.testesPendentes,
                }))}
                margin={{ top: 4, right: 8, left: -12, bottom: 0 }}
              >
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="nome" tickLine={false} axisLine={{ stroke: "var(--color-rule)" }} tick={tickMono} />
                <YAxis tickLine={false} axisLine={false} tick={tickMono} allowDecimals={false} width={28} />
                <Tooltip contentStyle={tooltipStyle} cursor={cursorSuave} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
                />
                <Bar dataKey="Concluídos" stackId="a" fill={AZUL} maxBarSize={44} />
                <Bar dataKey="Pendentes" stackId="a" fill={AMBAR} radius={RADIUS} maxBarSize={44} />
              </BarChart>
            </ChartCard>

            <ChartCard titulo="Testes nos últimos 3 meses" cor={AZUL}>
              <BarChart data={dado((m) => m.testes3Meses, "valor")} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="nome" tickLine={false} axisLine={{ stroke: "var(--color-rule)" }} tick={tickMono} />
                <YAxis tickLine={false} axisLine={false} tick={tickMono} allowDecimals={false} width={28} />
                <Tooltip contentStyle={tooltipStyle} cursor={cursorSuave} />
                <Bar dataKey="valor" name="Testes (3 m)" fill={AZUL} radius={RADIUS} maxBarSize={44} />
              </BarChart>
            </ChartCard>

            <ChartCard titulo="Horas no laboratório" cor={VERDE}>
              <BarChart data={dado((m) => m.horasLab, "horas")} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="nome" tickLine={false} axisLine={{ stroke: "var(--color-rule)" }} tick={tickMono} />
                <YAxis tickLine={false} axisLine={false} tick={tickMono} width={28} />
                <Tooltip contentStyle={tooltipStyle} cursor={cursorSuave} />
                <Bar dataKey="horas" name="Horas" fill={VERDE} radius={RADIUS} maxBarSize={44} />
              </BarChart>
            </ChartCard>

            <ChartCard titulo="Sacrifícios (participações)" cor={VIOLETA}>
              <BarChart data={dado((m) => m.sacrificios, "valor")} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="nome" tickLine={false} axisLine={{ stroke: "var(--color-rule)" }} tick={tickMono} />
                <YAxis tickLine={false} axisLine={false} tick={tickMono} allowDecimals={false} width={28} />
                <Tooltip contentStyle={tooltipStyle} cursor={cursorSuave} />
                <Bar dataKey="valor" name="Sacrifícios" fill={VIOLETA} radius={RADIUS} maxBarSize={44} />
              </BarChart>
            </ChartCard>

            <ChartCard titulo="Reagentes preparados" cor={AMBAR}>
              <BarChart data={dado((m) => m.reagentesPreparados, "valor")} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="nome" tickLine={false} axisLine={{ stroke: "var(--color-rule)" }} tick={tickMono} />
                <YAxis tickLine={false} axisLine={false} tick={tickMono} allowDecimals={false} width={28} />
                <Tooltip contentStyle={tooltipStyle} cursor={cursorSuave} />
                <Bar dataKey="valor" name="Reagentes" fill={AMBAR} radius={RADIUS} maxBarSize={44} />
              </BarChart>
            </ChartCard>

            {temposPorTipo.length > 0 && (
              <ChartCard titulo="Tempo médio de execução por tipo (min)" cor={AZUL}>
                <BarChart data={temposPorTipo} margin={{ top: 4, right: 8, left: -12, bottom: 18 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="tipo" tickLine={false} axisLine={{ stroke: "var(--color-rule)" }} tick={{ ...tickMono, fontSize: 10 }} interval={0} angle={-22} textAnchor="end" height={48} />
                  <YAxis tickLine={false} axisLine={false} tick={tickMono} width={28} />
                  <Tooltip contentStyle={tooltipStyle} cursor={cursorSuave} />
                  <Bar dataKey="mediaMin" name="Média (min)" fill={AZUL} radius={RADIUS} maxBarSize={40} />
                </BarChart>
              </ChartCard>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function ChartCard({
  titulo,
  cor,
  legenda,
  children,
}: {
  titulo: string;
  cor?: string;
  legenda?: boolean;
  children: React.ReactElement;
}) {
  return (
    <div className="rounded-lg border border-rule bg-paper-raised p-4">
      <div className="mb-3 flex items-center gap-2">
        {cor && !legenda && (
          <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: cor }} />
        )}
        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-soft">
          {titulo}
        </p>
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </div>
  );
}
