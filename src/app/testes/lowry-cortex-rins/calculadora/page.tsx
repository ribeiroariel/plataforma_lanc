"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import { salvarCurvaLowry } from "@/lib/actions/lowry";
import { regressaoLinear } from "@/lib/estatistica";
import { INPUT_SM, BOTAO_PRIMARIO, BOTAO_SECUNDARIO_SM } from "@/lib/estilos";

// Pontos fixos da curva padrão de BSA, conforme
// content/testes/lowry-cortex-rins.md (seção 14.4 do manual).
const PONTOS_PADRAO = [0, 10, 20, 40, 60, 80] as const;
const VOLUME_AMOSTRA_UL = 10;
const R2_MINIMO = 0.99;

type Amostra = {
  rotulo: string;
  absorbancia: string;
  fatorDiluicao: string;
};

export default function CalculadoraLowry() {
  const [absorbancias, setAbsorbancias] = useState<Record<number, string>>({
    0: "",
    10: "",
    20: "",
    40: "",
    60: "",
    80: "",
  });
  const [amostras, setAmostras] = useState<Amostra[]>([
    { rotulo: "Amostra 1", absorbancia: "", fatorDiluicao: "1" },
  ]);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const pontosValidos = PONTOS_PADRAO.map((x) => ({
    x,
    y: parseFloat(absorbancias[x]),
  })).filter((p) => !Number.isNaN(p.y));

  const regressao =
    pontosValidos.length >= 2 ? regressaoLinear(pontosValidos) : null;

  const dadosGrafico = PONTOS_PADRAO.map((x) => {
    const y = parseFloat(absorbancias[x]);
    return {
      x,
      y: Number.isNaN(y) ? null : y,
      yAjustado: regressao
        ? regressao.inclinacao * x + regressao.intercepto
        : null,
    };
  });

  const amostrasCalculadas = useMemo(() => {
    if (!regressao) return [];
    return amostras.map((a) => {
      const abs = parseFloat(a.absorbancia);
      const fator = parseFloat(a.fatorDiluicao) || 1;
      if (Number.isNaN(abs) || regressao.inclinacao === 0) {
        return { microgramas: NaN, mgPorMl: NaN };
      }
      const microgramas = (abs - regressao.intercepto) / regressao.inclinacao;
      const mgPorMl = (microgramas / VOLUME_AMOSTRA_UL) * fator;
      return { microgramas, mgPorMl };
    });
  }, [amostras, regressao]);

  function atualizarAbsorbancia(x: number, valor: string) {
    setAbsorbancias((prev) => ({ ...prev, [x]: valor }));
  }

  function atualizarAmostra(
    indice: number,
    campo: keyof Amostra,
    valor: string
  ) {
    setAmostras((prev) =>
      prev.map((a, i) => (i === indice ? { ...a, [campo]: valor } : a))
    );
  }

  function adicionarAmostra() {
    setAmostras((prev) => [
      ...prev,
      {
        rotulo: `Amostra ${prev.length + 1}`,
        absorbancia: "",
        fatorDiluicao: "1",
      },
    ]);
  }

  function removerAmostra(indice: number) {
    setAmostras((prev) => prev.filter((_, i) => i !== indice));
  }

  async function salvar() {
    if (!regressao) return;
    setSalvando(true);
    setMensagem(null);

    const resultado = await salvarCurvaLowry({
      absBranco: parseFloat(absorbancias[0]),
      abs10: parseFloat(absorbancias[10]),
      abs20: parseFloat(absorbancias[20]),
      abs40: parseFloat(absorbancias[40]),
      abs60: parseFloat(absorbancias[60]),
      abs80: parseFloat(absorbancias[80]),
      inclinacao: regressao.inclinacao,
      intercepto: regressao.intercepto,
      rQuadrado: regressao.rQuadrado,
      amostras: amostras.map((a, i) => ({
        rotulo: a.rotulo,
        absorbancia: parseFloat(a.absorbancia),
        fatorDiluicao: parseFloat(a.fatorDiluicao) || 1,
        microgramas: amostrasCalculadas[i]?.microgramas ?? NaN,
        mgPorMl: amostrasCalculadas[i]?.mgPorMl ?? NaN,
      })),
    });

    setSalvando(false);
    setMensagem(
      "erro" in resultado
        ? resultado.erro
        : "Curva salva. A orientadora já pode ver este registro."
    );
  }

  const r2 = regressao?.rQuadrado ?? null;
  const dentroDoPadrao = r2 !== null && r2 >= R2_MINIMO;

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link
        href="/testes/lowry-cortex-rins"
        className="text-sm text-ink-soft hover:text-absorbance"
      >
        ← Voltar ao protocolo
      </Link>
      <h1 className="mt-2 font-display text-3xl leading-tight text-ink">
        Calculadora — Curva padrão de Lowry
      </h1>
      <p className="mt-2 mb-8 max-w-2xl text-sm leading-relaxed text-ink-soft">
        Ferramenta solta, sem vínculo com projeto. Se essa curva é para um
        rato de um projeto específico, registre pelo próprio projeto (aba
        &quot;Testes designados&quot; → Lowry) — assim o resultado fica
        junto com o resto dos dados desse projeto e entra na exportação
        para o R.
      </p>

      <section className="mb-8">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
          1 · Absorbância dos tubos padrão (BSA)
        </h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {PONTOS_PADRAO.map((x) => (
            <label key={x} className="flex flex-col gap-1 text-xs text-ink-soft">
              {x === 0 ? "Branco (0 µg)" : `${x} µg`}
              <input
                type="number"
                step="0.001"
                inputMode="decimal"
                value={absorbancias[x]}
                onChange={(e) => atualizarAbsorbancia(x, e.target.value)}
                className={INPUT_SM}
              />
            </label>
          ))}
        </div>
      </section>

      {regressao && (
        <section className="mb-8">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
            2 · Resultado da curva
          </h2>
          <p
            className={`mb-4 inline-block rounded px-3 py-1 text-sm font-medium ${
              dentroDoPadrao
                ? "bg-green-600/12 text-green-700 dark:text-green-400"
                : "bg-alerta/12 text-alerta"
            }`}
          >
            R² = {r2!.toFixed(4)}{" "}
            {dentroDoPadrao
              ? "— dentro do padrão do manual (≥ 0,99)"
              : "— abaixo do exigido pelo manual (≥ 0,99). Considere refazer a curva."}
          </p>

          <div className="h-64 w-full rounded border border-rule bg-paper-raised p-2">
            <ResponsiveContainer>
              <ComposedChart data={dadosGrafico}>
                <CartesianGrid stroke="var(--color-rule)" />
                <XAxis
                  dataKey="x"
                  type="number"
                  stroke="var(--color-ink-soft)"
                  tick={{ fontSize: 11 }}
                  label={{ value: "µg de BSA", position: "insideBottom", offset: -5, fontSize: 11 }}
                />
                <YAxis
                  stroke="var(--color-ink-soft)"
                  tick={{ fontSize: 11 }}
                  label={{ value: "Abs (650 nm)", angle: -90, position: "insideLeft", fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-paper-raised)",
                    border: "1px solid var(--color-rule)",
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                />
                <Scatter dataKey="y" fill="var(--color-absorbance)" name="Observado" />
                <Line
                  type="linear"
                  dataKey="yAjustado"
                  stroke="var(--color-alerta)"
                  dot={false}
                  name="Reta ajustada"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
          3 · Amostras
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                <th className="pb-2 font-normal">Rótulo</th>
                <th className="pb-2 font-normal">Absorbância</th>
                <th className="pb-2 font-normal">Fator diluição</th>
                <th className="pb-2 font-normal">mg proteína/mL</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {amostras.map((a, i) => (
                <tr key={i} className="border-t border-rule/60">
                  <td className="py-1.5 pr-2">
                    <input
                      value={a.rotulo}
                      onChange={(e) => atualizarAmostra(i, "rotulo", e.target.value)}
                      className={`${INPUT_SM} w-full`}
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      type="number"
                      step="0.001"
                      value={a.absorbancia}
                      onChange={(e) =>
                        atualizarAmostra(i, "absorbancia", e.target.value)
                      }
                      className={`${INPUT_SM} w-full`}
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      type="number"
                      step="0.1"
                      value={a.fatorDiluicao}
                      onChange={(e) =>
                        atualizarAmostra(i, "fatorDiluicao", e.target.value)
                      }
                      className={`${INPUT_SM} w-full`}
                    />
                  </td>
                  <td className="py-1.5 pr-2 font-mono tabular-nums text-ink">
                    {amostrasCalculadas[i] && !Number.isNaN(amostrasCalculadas[i].mgPorMl)
                      ? amostrasCalculadas[i].mgPorMl.toFixed(3)
                      : "—"}
                  </td>
                  <td className="py-1.5">
                    <button
                      type="button"
                      onClick={() => removerAmostra(i)}
                      className="text-ink-soft hover:text-alerta"
                      aria-label="Remover amostra"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={adicionarAmostra}
          className={`mt-3 ${BOTAO_SECUNDARIO_SM}`}
        >
          + Adicionar amostra
        </button>
      </section>

      <button
        type="button"
        onClick={salvar}
        disabled={!regressao || salvando}
        className={BOTAO_PRIMARIO}
      >
        {salvando ? "Salvando..." : "Salvar curva e enviar para a Débora"}
      </button>

      {mensagem && <p className="mt-3 text-sm text-ink-soft">{mensagem}</p>}
    </article>
  );
}
