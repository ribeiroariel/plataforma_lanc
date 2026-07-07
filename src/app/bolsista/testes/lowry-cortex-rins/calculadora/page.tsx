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

function regressaoLinear(pontos: { x: number; y: number }[]) {
  const n = pontos.length;
  const somaX = pontos.reduce((s, p) => s + p.x, 0);
  const somaY = pontos.reduce((s, p) => s + p.y, 0);
  const mediaX = somaX / n;
  const mediaY = somaY / n;

  let numerador = 0;
  let denominador = 0;
  for (const p of pontos) {
    numerador += (p.x - mediaX) * (p.y - mediaY);
    denominador += (p.x - mediaX) ** 2;
  }
  const inclinacao = denominador === 0 ? 0 : numerador / denominador;
  const intercepto = mediaY - inclinacao * mediaX;

  let ssRes = 0;
  let ssTot = 0;
  for (const p of pontos) {
    const previsto = inclinacao * p.x + intercepto;
    ssRes += (p.y - previsto) ** 2;
    ssTot += (p.y - mediaY) ** 2;
  }
  const rQuadrado = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { inclinacao, intercepto, rQuadrado };
}

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
    <article>
      <p className="mb-1 text-sm">
        <Link href="/bolsista/testes/lowry-cortex-rins" className="underline">
          ← Voltar ao protocolo
        </Link>
      </p>
      <h1 className="mb-4 text-2xl font-semibold">
        Calculadora — Curva padrão de Lowry
      </h1>

      <section className="mb-8">
        <h2 className="mb-2 font-semibold">
          1. Absorbância dos tubos padrão (BSA)
        </h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {PONTOS_PADRAO.map((x) => (
            <label key={x} className="flex flex-col gap-1 text-sm">
              {x === 0 ? "Branco (0 µg)" : `${x} µg`}
              <input
                type="number"
                step="0.001"
                inputMode="decimal"
                value={absorbancias[x]}
                onChange={(e) => atualizarAbsorbancia(x, e.target.value)}
                className="rounded border border-black/15 px-2 py-1 dark:border-white/20"
              />
            </label>
          ))}
        </div>
      </section>

      {regressao && (
        <section className="mb-8">
          <h2 className="mb-2 font-semibold">2. Resultado da curva</h2>
          <p
            className={`mb-3 inline-block rounded px-3 py-1 text-sm font-medium ${
              dentroDoPadrao
                ? "bg-green-500/15 text-green-700 dark:text-green-400"
                : "bg-red-500/15 text-red-700 dark:text-red-400"
            }`}
          >
            R² = {r2!.toFixed(4)}{" "}
            {dentroDoPadrao
              ? "— dentro do padrão do manual (≥ 0,99)"
              : "— abaixo do exigido pelo manual (≥ 0,99). Considere refazer a curva."}
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer>
              <ComposedChart data={dadosGrafico}>
                <CartesianGrid strokeOpacity={0.15} />
                <XAxis
                  dataKey="x"
                  type="number"
                  label={{ value: "µg de BSA", position: "insideBottom", offset: -5 }}
                />
                <YAxis
                  label={{ value: "Absorbância (650 nm)", angle: -90, position: "insideLeft" }}
                />
                <Tooltip />
                <Scatter dataKey="y" fill="#2563eb" name="Observado" />
                <Line
                  type="linear"
                  dataKey="yAjustado"
                  stroke="#dc2626"
                  dot={false}
                  name="Reta ajustada"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-2 font-semibold">3. Amostras</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-black/60 dark:text-white/60">
              <th className="pb-2">Rótulo</th>
              <th className="pb-2">Absorbância</th>
              <th className="pb-2">Fator de diluição</th>
              <th className="pb-2">mg proteína/mL</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {amostras.map((a, i) => (
              <tr key={i}>
                <td className="pr-2 py-1">
                  <input
                    value={a.rotulo}
                    onChange={(e) => atualizarAmostra(i, "rotulo", e.target.value)}
                    className="w-full rounded border border-black/15 px-2 py-1 dark:border-white/20"
                  />
                </td>
                <td className="pr-2 py-1">
                  <input
                    type="number"
                    step="0.001"
                    value={a.absorbancia}
                    onChange={(e) =>
                      atualizarAmostra(i, "absorbancia", e.target.value)
                    }
                    className="w-full rounded border border-black/15 px-2 py-1 dark:border-white/20"
                  />
                </td>
                <td className="pr-2 py-1">
                  <input
                    type="number"
                    step="0.1"
                    value={a.fatorDiluicao}
                    onChange={(e) =>
                      atualizarAmostra(i, "fatorDiluicao", e.target.value)
                    }
                    className="w-full rounded border border-black/15 px-2 py-1 dark:border-white/20"
                  />
                </td>
                <td className="pr-2 py-1">
                  {amostrasCalculadas[i] && !Number.isNaN(amostrasCalculadas[i].mgPorMl)
                    ? amostrasCalculadas[i].mgPorMl.toFixed(3)
                    : "—"}
                </td>
                <td className="py-1">
                  <button
                    type="button"
                    onClick={() => removerAmostra(i)}
                    className="text-red-600 underline"
                  >
                    remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          onClick={adicionarAmostra}
          className="mt-3 rounded border border-black/20 px-3 py-1 text-sm dark:border-white/20"
        >
          + Adicionar amostra
        </button>
      </section>

      <button
        type="button"
        onClick={salvar}
        disabled={!regressao || salvando}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {salvando ? "Salvando..." : "Salvar curva e enviar pra Débora"}
      </button>

      {mensagem && <p className="mt-3 text-sm">{mensagem}</p>}
    </article>
  );
}
