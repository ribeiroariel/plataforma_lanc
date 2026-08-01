"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MetricasBolsista } from "@/lib/painel";

type TempoTipo = { tipo: string; mediaMin: number; n: number };

const tooltipStyle = {
  background: "var(--color-paper-raised)",
  border: "1px solid var(--color-rule)",
  borderRadius: 4,
  fontSize: 12,
};

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
  const porNome = (mapa: (m: MetricasBolsista) => number, chave: string) =>
    metricas.map((m) => ({ nome: primeiroNome(m.nome), [chave]: mapa(m) }));

  return (
    <section className="mt-12 flex flex-col gap-10">
      {/* Tabela por bolsista */}
      <div>
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.12em] text-signal">
          Bolsistas
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-rule text-left font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                <th className="py-2 pr-3 font-normal">Bolsista</th>
                <th className="py-2 pr-3 font-normal">Projetos</th>
                <th className="py-2 pr-3 font-normal">Testes concl.</th>
                <th className="py-2 pr-3 font-normal">Pendentes</th>
                <th className="py-2 pr-3 font-normal">Últ. 3 meses</th>
                <th className="py-2 pr-3 font-normal">Horas lab</th>
                <th className="py-2 pr-3 font-normal">Sacrifícios</th>
                <th className="py-2 font-normal">Reag. prep.</th>
              </tr>
            </thead>
            <tbody>
              {metricas.map((m) => (
                <tr key={m.id} className="border-b border-rule/60">
                  <td className="py-1.5 pr-3 text-ink">{m.nome}</td>
                  <td className="py-1.5 pr-3 font-mono tabular-nums text-ink-soft">{m.projetos}</td>
                  <td className="py-1.5 pr-3 font-mono tabular-nums text-ink">{m.testesConcluidos}</td>
                  <td className="py-1.5 pr-3 font-mono tabular-nums text-reagent">{m.testesPendentes}</td>
                  <td className="py-1.5 pr-3 font-mono tabular-nums text-ink-soft">{m.testes3Meses}</td>
                  <td className="py-1.5 pr-3 font-mono tabular-nums text-ink-soft">{m.horasLab}</td>
                  <td className="py-1.5 pr-3 font-mono tabular-nums text-ink-soft">{m.sacrificios}</td>
                  <td className="py-1.5 font-mono tabular-nums text-ink-soft">{m.reagentesPreparados}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gráficos comparativos entre todos os bolsistas */}
      <div>
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.12em] text-signal">
          Comparativos
        </p>
        {metricas.length === 0 ? (
          <p className="text-sm text-ink-soft">Sem bolsistas para comparar ainda.</p>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            <Grafico titulo="Testes por bolsista (concluídos + pendentes)">
              <BarChart data={metricas.map((m) => ({ nome: primeiroNome(m.nome), Concluídos: m.testesConcluidos, Pendentes: m.testesPendentes }))}>
                <CartesianGrid stroke="var(--color-rule)" />
                <XAxis dataKey="nome" stroke="var(--color-ink-soft)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--color-ink-soft)" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="Concluídos" stackId="a" fill="var(--color-absorbance)" />
                <Bar dataKey="Pendentes" stackId="a" fill="var(--color-reagent)" />
              </BarChart>
            </Grafico>

            <Grafico titulo="Testes nos últimos 3 meses">
              <BarChart data={porNome((m) => m.testes3Meses, "valor")}>
                <CartesianGrid stroke="var(--color-rule)" />
                <XAxis dataKey="nome" stroke="var(--color-ink-soft)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--color-ink-soft)" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="valor" name="Testes (3 m)" fill="var(--color-absorbance)" />
              </BarChart>
            </Grafico>

            <Grafico titulo="Horas no laboratório">
              <BarChart data={porNome((m) => m.horasLab, "horas")}>
                <CartesianGrid stroke="var(--color-rule)" />
                <XAxis dataKey="nome" stroke="var(--color-ink-soft)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--color-ink-soft)" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="horas" name="Horas" fill="var(--color-signal)" />
              </BarChart>
            </Grafico>

            <Grafico titulo="Sacrifícios (participações)">
              <BarChart data={porNome((m) => m.sacrificios, "valor")}>
                <CartesianGrid stroke="var(--color-rule)" />
                <XAxis dataKey="nome" stroke="var(--color-ink-soft)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--color-ink-soft)" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="valor" name="Sacrifícios" fill="var(--color-pyrogallol)" />
              </BarChart>
            </Grafico>

            <Grafico titulo="Reagentes preparados">
              <BarChart data={porNome((m) => m.reagentesPreparados, "valor")}>
                <CartesianGrid stroke="var(--color-rule)" />
                <XAxis dataKey="nome" stroke="var(--color-ink-soft)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--color-ink-soft)" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="valor" name="Reagentes" fill="var(--color-reagent)" />
              </BarChart>
            </Grafico>

            {temposPorTipo.length > 0 && (
              <Grafico titulo="Tempo médio de execução por tipo de teste (min)">
                <BarChart data={temposPorTipo}>
                  <CartesianGrid stroke="var(--color-rule)" />
                  <XAxis dataKey="tipo" stroke="var(--color-ink-soft)" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis stroke="var(--color-ink-soft)" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="mediaMin" name="Média (min)" fill="var(--color-pyrogallol)" />
                </BarChart>
              </Grafico>
            )}
          </div>
        )}
        <p className="mt-3 max-w-2xl text-[11px] leading-relaxed text-ink-soft">
          Horas no lab e reagentes preparados vêm das sessões de laboratório; o
          tempo de execução, dos horários de leitura registrados em cada teste.
        </p>
      </div>
    </section>
  );
}

function Grafico({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactElement;
}) {
  return (
    <div>
      <p className="mb-2 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
        {titulo}
      </p>
      <div className="h-56 w-full rounded border border-rule bg-paper-raised p-2">
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </div>
  );
}
