"use client";

import { useState } from "react";
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
  const [aba, setAba] = useState<"bolsistas" | "ranking">("bolsistas");

  return (
    <section className="mt-12">
      <div className="mb-4 flex gap-2">
        <Tab ativo={aba === "bolsistas"} onClick={() => setAba("bolsistas")}>
          Bolsistas
        </Tab>
        <Tab ativo={aba === "ranking"} onClick={() => setAba("ranking")}>
          Ranking
        </Tab>
      </div>

      {aba === "bolsistas" ? (
        <VisaoBolsistas metricas={metricas} temposPorTipo={temposPorTipo} />
      ) : (
        <VisaoRanking metricas={metricas} />
      )}
    </section>
  );
}

function Tab({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 font-mono text-xs uppercase tracking-wide transition-colors ${
        ativo
          ? "bg-signal text-paper"
          : "border border-rule text-ink-soft hover:border-signal hover:text-signal"
      }`}
    >
      {children}
    </button>
  );
}

function VisaoBolsistas({
  metricas,
  temposPorTipo,
}: {
  metricas: MetricasBolsista[];
  temposPorTipo: TempoTipo[];
}) {
  const dadosTestes = metricas.map((m) => ({
    nome: primeiroNome(m.nome),
    Concluídos: m.testesConcluidos,
    Pendentes: m.testesPendentes,
  }));
  const dadosHoras = metricas.map((m) => ({
    nome: primeiroNome(m.nome),
    horas: m.horasLab,
  }));

  return (
    <div className="flex flex-col gap-10">
      {/* Tabela por bolsista */}
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

      {metricas.length > 0 && (
        <>
          <Grafico titulo="Testes por bolsista">
            <BarChart data={dadosTestes}>
              <CartesianGrid stroke="var(--color-rule)" />
              <XAxis dataKey="nome" stroke="var(--color-ink-soft)" tick={{ fontSize: 11 }} />
              <YAxis stroke="var(--color-ink-soft)" tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="Concluídos" stackId="a" fill="var(--color-absorbance)" />
              <Bar dataKey="Pendentes" stackId="a" fill="var(--color-reagent)" />
            </BarChart>
          </Grafico>

          <Grafico titulo="Horas no laboratório por bolsista">
            <BarChart data={dadosHoras}>
              <CartesianGrid stroke="var(--color-rule)" />
              <XAxis dataKey="nome" stroke="var(--color-ink-soft)" tick={{ fontSize: 11 }} />
              <YAxis stroke="var(--color-ink-soft)" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="horas" name="Horas" fill="var(--color-signal)" />
            </BarChart>
          </Grafico>
        </>
      )}

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
      {temposPorTipo.length === 0 && (
        <p className="text-xs text-ink-soft">
          O tempo de execução vem dos horários de início/fim da leitura
          registrados em cada teste — ainda não há dados suficientes para o
          gráfico por tipo.
        </p>
      )}
    </div>
  );
}

function VisaoRanking({ metricas }: { metricas: MetricasBolsista[] }) {
  const max = Math.max(1, ...metricas.map((m) => m.pontuacao));
  return (
    <div className="flex flex-col gap-3">
      <p className="max-w-2xl text-xs leading-relaxed text-ink-soft">
        Pontuação (0–100) combinando: nº de testes concluídos (30%), testes nos
        últimos 3 meses (30%), eficiência — tempo médio de execução, mais rápido
        pontua mais (20%) — e reagentes preparados (20%). Os pesos podem ser
        ajustados; o tempo de execução só conta quando os horários de leitura
        foram registrados.
      </p>
      {metricas.map((m, i) => (
        <div
          key={m.id}
          className="flex items-center gap-3 rounded border border-rule bg-paper-raised px-3 py-2"
        >
          <span className="w-6 shrink-0 text-center font-display text-lg text-ink-soft">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate font-medium text-ink">{m.nome}</span>
              <span className="font-mono tabular-nums text-signal">
                {m.pontuacao.toFixed(1)}
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-rule">
              <div
                className="h-full bg-signal"
                style={{ width: `${(m.pontuacao / max) * 100}%` }}
              />
            </div>
            <p className="mt-1 font-mono text-[11px] text-ink-soft">
              {m.testesConcluidos} testes · {m.testes3Meses} nos últ. 3 m ·{" "}
              {m.horasLab} h lab · {m.reagentesPreparados} reag.
            </p>
          </div>
        </div>
      ))}
    </div>
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
      <div className="h-64 w-full rounded border border-rule bg-paper-raised p-2">
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </div>
  );
}
