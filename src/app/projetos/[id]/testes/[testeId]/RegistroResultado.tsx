"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import { regressaoLinear } from "@/lib/estatistica";
import type { RatoDoRoster } from "@/lib/roster";
import type { ConfigTeste } from "@/lib/tiposTeste";
import {
  salvarResultadosLote,
  definirStatusTeste,
  type LinhaResultado,
} from "@/lib/actions/resultados";
import { INPUT_SM, BOTAO_PRIMARIO } from "@/lib/estilos";

const TEMPOS_CAT = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const TEMPOS_SOD = [0, 30, 60, 90, 120];
const PONTOS_CURVA_LOWRY = [0, 10, 20, 40, 60, 80];
const VOLUME_AMOSTRA_LOWRY_UL = 10;

type Resultado = {
  rato: string;
  grupo_id: string;
  leituras: Record<string, unknown>;
  valor_calculado: number | null;
  dentro_do_padrao: boolean | null;
};

type Coluna = { key: string; label: string };

type Props = {
  projetoId: string;
  projetoTesteId: string;
  statusAtual: "pendente" | "concluido";
  config: ConfigTeste;
  roster: RatoDoRoster[];
  resultadosExistentes: Resultado[];
  podeRegistrar: boolean;
  podeAlterarStatus: boolean;
};

function temposDaFamilia(familia: ConfigTeste["familia"]): number[] {
  if (familia === "cat") return TEMPOS_CAT;
  if (familia === "sod") return TEMPOS_SOD;
  return [];
}

function colunasDaFamilia(config: ConfigTeste): Coluna[] {
  if (config.familia === "cat" || config.familia === "sod") {
    return temposDaFamilia(config.familia).map((t) => ({
      key: `t${t}`,
      label: `${t}s`,
    }));
  }
  if (config.familia === "curva") {
    return [
      { key: "abs", label: "Absorbância" },
      { key: "dil", label: "Diluição" },
    ];
  }
  // simples
  return [
    ...(config.camposBrutos ?? []).map((c) => ({
      key: c.chave,
      label: c.rotulo,
    })),
    {
      key: "valor_final",
      label: `Valor final${
        config.unidadeResultado ? ` (${config.unidadeResultado})` : ""
      }`,
    },
  ];
}

/** Regressão nos tempos preenchidos de uma linha (ΔAbs/min = inclinação × 60). */
function slopeMinLinha(tempos: number[], linha: Record<string, string>) {
  const pontos = tempos
    .map((t) => ({ x: t, y: parseFloat(linha[`t${t}`] ?? "") }))
    .filter((p) => !Number.isNaN(p.y));
  if (pontos.length < 2) return null;
  return regressaoLinear(pontos).inclinacao * 60;
}

function fmt(v: number | null, casas = 4) {
  if (v === null || Number.isNaN(v)) return "—";
  return v.toFixed(casas);
}

export default function RegistroResultado({
  projetoId,
  projetoTesteId,
  statusAtual,
  config,
  roster,
  resultadosExistentes,
  podeRegistrar,
  podeAlterarStatus,
}: Props) {
  const colunas = colunasDaFamilia(config);
  const temLevas = roster.some((r) => r.leva > 1);

  // linhas[ratoNumero][colKey] = valor digitado
  const [linhas, setLinhas] = useState<Record<string, Record<string, string>>>(
    () => {
      const inicial: Record<string, Record<string, string>> = {};
      for (const r of resultadosExistentes) {
        const salvas = (r.leituras?.colunas ?? {}) as Record<string, unknown>;
        inicial[r.rato] = Object.fromEntries(
          Object.entries(salvas).map(([k, v]) => [k, v == null ? "" : String(v)])
        );
      }
      return inicial;
    }
  );

  // Controles de qualidade da sessão (compartilhados por todos os ratos).
  const [qcCat, setQcCat] = useState("");
  const [controleSod, setControleSod] = useState<Record<string, string>>({});
  const [curva, setCurva] = useState<Record<string, string>>({});

  const [status, setStatus] = useState(statusAtual);
  const [salvando, setSalvando] = useState(false);
  const [alterandoStatus, setAlterandoStatus] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  function setCelula(rato: string, col: string, valor: string) {
    setLinhas((prev) => ({
      ...prev,
      [rato]: { ...(prev[rato] ?? {}), [col]: valor },
    }));
  }

  // --- QC de sessão + regressões ---
  const qcCatOk = useMemo(() => {
    if (config.familia !== "cat" || !config.qc) return null;
    const v = parseFloat(qcCat);
    if (Number.isNaN(v)) return null;
    return v >= config.qc.min && v <= config.qc.max;
  }, [qcCat, config]);

  const controleSodSlopeMin = useMemo(() => {
    if (config.familia !== "sod") return null;
    return slopeMinLinha(TEMPOS_SOD, controleSod);
  }, [controleSod, config.familia]);

  const qcSodOk = useMemo(() => {
    if (!config.qc || controleSodSlopeMin === null) return null;
    return (
      controleSodSlopeMin >= config.qc.min && controleSodSlopeMin <= config.qc.max
    );
  }, [controleSodSlopeMin, config.qc]);

  const regressaoCurva = useMemo(() => {
    if (config.familia !== "curva") return null;
    const pontos = PONTOS_CURVA_LOWRY.map((p) => ({
      x: p,
      y: parseFloat(curva[`p${p}`] ?? ""),
    })).filter((pt) => !Number.isNaN(pt.y));
    if (pontos.length < 2) return null;
    return regressaoLinear(pontos);
  }, [curva, config.familia]);

  const qcCurvaOk = useMemo(() => {
    if (!config.qc || !regressaoCurva) return null;
    return regressaoCurva.rQuadrado >= config.qc.min;
  }, [regressaoCurva, config.qc]);

  const qcSessaoOk =
    config.familia === "cat"
      ? qcCatOk
      : config.familia === "sod"
      ? qcSodOk
      : config.familia === "curva"
      ? qcCurvaOk
      : null;

  // --- valor calculado por rato ---
  function valorDoRato(rato: string): number | null {
    const linha = linhas[rato] ?? {};
    if (config.familia === "cat") {
      const s = slopeMinLinha(TEMPOS_CAT, linha);
      return s === null ? null : Math.abs(s);
    }
    if (config.familia === "sod") {
      const s = slopeMinLinha(TEMPOS_SOD, linha);
      if (s === null || !controleSodSlopeMin || controleSodSlopeMin <= 0)
        return null;
      return (1 - s / controleSodSlopeMin) * 100;
    }
    if (config.familia === "curva") {
      const abs = parseFloat(linha.abs ?? "");
      const dil = parseFloat(linha.dil ?? "") || 1;
      if (Number.isNaN(abs) || !regressaoCurva || regressaoCurva.inclinacao === 0)
        return null;
      const ug = (abs - regressaoCurva.intercepto) / regressaoCurva.inclinacao;
      return (ug / VOLUME_AMOSTRA_LOWRY_UL) * dil;
    }
    // simples
    const v = parseFloat(linha.valor_final ?? "");
    return Number.isNaN(v) ? null : v;
  }

  const graficoGrupos = useMemo(() => {
    return roster
      .map((r) => {
        const v = valorDoRato(String(r.numero));
        return v === null ? null : { grupo: r.grupoNome, valor: v };
      })
      .filter((d): d is { grupo: string; valor: number } => d !== null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linhas, controleSodSlopeMin, regressaoCurva, roster]);

  async function salvar() {
    setMensagem(null);
    setSalvando(true);

    const sessao: Record<string, unknown> = {};
    if (config.familia === "cat") sessao.qc_h2o2 = qcCat === "" ? null : parseFloat(qcCat);
    if (config.familia === "sod") {
      sessao.controle = controleSod;
      sessao.controle_slope_min = controleSodSlopeMin;
    }
    if (config.familia === "curva") {
      sessao.curva_pontos = PONTOS_CURVA_LOWRY;
      sessao.curva = curva;
      sessao.curva_r2 = regressaoCurva?.rQuadrado ?? null;
      sessao.curva_inclinacao = regressaoCurva?.inclinacao ?? null;
      sessao.curva_intercepto = regressaoCurva?.intercepto ?? null;
    }

    const linhasParaSalvar: LinhaResultado[] = [];
    for (const r of roster) {
      const rato = String(r.numero);
      const dados = linhas[rato] ?? {};
      const temAlgum = Object.values(dados).some((v) => v !== "" && v != null);
      if (!temAlgum) continue;
      linhasParaSalvar.push({
        rato,
        grupoId: r.grupoId,
        leituras: {
          tipo: config.familia,
          colunas: dados,
          sessao,
        },
        valorCalculado: valorDoRato(rato),
        dentroDoPadrao: qcSessaoOk,
      });
    }

    const resultado = await salvarResultadosLote({
      projetoId,
      projetoTesteId,
      linhas: linhasParaSalvar,
    });
    setSalvando(false);
    setMensagem(
      "erro" in resultado
        ? resultado.erro
        : `${linhasParaSalvar.length} resultado(s) salvo(s).`
    );
  }

  async function alternarStatus() {
    const novo = status === "concluido" ? "pendente" : "concluido";
    setAlterandoStatus(true);
    const r = await definirStatusTeste(projetoId, projetoTesteId, novo);
    setAlterandoStatus(false);
    if (!("erro" in r)) setStatus(novo);
  }

  return (
    <div className="mt-6">
      <div className="mb-6 flex items-center gap-3">
        <span
          className={`rounded-full px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide ${
            status === "concluido"
              ? "bg-green-600/12 text-green-700 dark:text-green-400"
              : "bg-reagent/12 text-reagent"
          }`}
        >
          {status === "concluido" ? "concluído" : "pendente"}
        </span>
        {podeAlterarStatus && (
          <button
            type="button"
            onClick={alternarStatus}
            disabled={alterandoStatus}
            className="text-xs text-signal underline-offset-4 hover:underline disabled:opacity-50"
          >
            {status === "concluido" ? "Reabrir" : "Marcar como concluído"}
          </button>
        )}
      </div>

      {/* Controle de qualidade da sessão */}
      {config.familia === "cat" && config.qc && (
        <PainelSessao titulo="Controle de qualidade da sessão">
          <label className="flex max-w-xs flex-col gap-1 text-xs text-ink-soft">
            {config.qc.rotulo} ({config.qc.unidade})
            <input
              type="number"
              step="0.001"
              value={qcCat}
              onChange={(e) => setQcCat(e.target.value)}
              disabled={!podeRegistrar}
              className={INPUT_SM}
            />
          </label>
          {qcCatOk !== null && <AvisoQC ok={qcCatOk} config={config} />}
        </PainelSessao>
      )}

      {config.familia === "sod" && config.qc && (
        <PainelSessao titulo={`Controle da sessão — ${config.qc.rotulo}`}>
          <div className="flex flex-wrap gap-2">
            {TEMPOS_SOD.map((t) => (
              <label key={t} className="flex flex-col gap-1 text-xs text-ink-soft">
                {t}s
                <input
                  type="number"
                  step="0.001"
                  value={controleSod[`t${t}`] ?? ""}
                  onChange={(e) =>
                    setControleSod((p) => ({ ...p, [`t${t}`]: e.target.value }))
                  }
                  disabled={!podeRegistrar}
                  className={`${INPUT_SM} w-20`}
                />
              </label>
            ))}
          </div>
          {controleSodSlopeMin !== null && (
            <p className="mt-2 text-xs">
              Taxa do controle:{" "}
              <span className="font-mono">{fmt(controleSodSlopeMin)}</span>{" "}
              {config.qc.unidade}
              {qcSodOk === false && (
                <span className="text-alerta"> — fora do padrão. {config.qc.dica}</span>
              )}
              {qcSodOk === true && (
                <span className="text-green-700 dark:text-green-400"> — dentro do padrão.</span>
              )}
            </p>
          )}
        </PainelSessao>
      )}

      {config.familia === "curva" && config.qc && (
        <PainelSessao titulo="Curva padrão da sessão (BSA)">
          <div className="flex flex-wrap gap-2">
            {PONTOS_CURVA_LOWRY.map((p) => (
              <label key={p} className="flex flex-col gap-1 text-xs text-ink-soft">
                {p === 0 ? "Branco" : `${p} µg`}
                <input
                  type="number"
                  step="0.001"
                  value={curva[`p${p}`] ?? ""}
                  onChange={(e) =>
                    setCurva((prev) => ({ ...prev, [`p${p}`]: e.target.value }))
                  }
                  disabled={!podeRegistrar}
                  className={`${INPUT_SM} w-20`}
                />
              </label>
            ))}
          </div>
          {regressaoCurva && (
            <p className="mt-2 text-xs">
              R² = <span className="font-mono">{regressaoCurva.rQuadrado.toFixed(4)}</span>
              {qcCurvaOk === false && (
                <span className="text-alerta"> — abaixo de 0,99. {config.qc.dica}</span>
              )}
              {qcCurvaOk === true && (
                <span className="text-green-700 dark:text-green-400"> — dentro do padrão.</span>
              )}
            </p>
          )}
        </PainelSessao>
      )}

      {/* Tabela de ratos × leituras */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-rule text-left font-mono text-[11px] uppercase tracking-wide text-ink-soft">
              <th className="py-2 pr-3 font-normal">Nº</th>
              {temLevas && <th className="py-2 pr-3 font-normal">Leva</th>}
              <th className="py-2 pr-3 font-normal">Grupo</th>
              {colunas.map((c) => (
                <th key={c.key} className="py-2 pr-2 font-normal">
                  {c.label}
                </th>
              ))}
              <th className="py-2 pl-2 font-normal">
                Valor{config.unidadeResultado ? ` (${config.unidadeResultado})` : ""}
              </th>
            </tr>
          </thead>
          <tbody>
            {roster.map((r) => {
              const rato = String(r.numero);
              const valor = valorDoRato(rato);
              return (
                <tr key={rato} className="border-b border-rule/60">
                  <td className="py-1.5 pr-3 font-mono text-ink">{r.numero}</td>
                  {temLevas && (
                    <td className="py-1.5 pr-3 font-mono text-ink-soft">{r.leva}</td>
                  )}
                  <td className="py-1.5 pr-3 whitespace-nowrap text-ink-soft">
                    {r.grupoNome}
                  </td>
                  {colunas.map((c) => (
                    <td key={c.key} className="py-1.5 pr-2">
                      <input
                        type="number"
                        step="0.001"
                        inputMode="decimal"
                        value={linhas[rato]?.[c.key] ?? ""}
                        onChange={(e) => setCelula(rato, c.key, e.target.value)}
                        disabled={!podeRegistrar}
                        className={`${INPUT_SM} w-20`}
                      />
                    </td>
                  ))}
                  <td className="py-1.5 pl-2 font-mono tabular-nums text-ink">
                    {fmt(valor, config.familia === "curva" ? 3 : 4)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {config.familia === "simples" && (
        <p className="mt-3 max-w-2xl text-xs leading-relaxed text-ink-soft">
          Cálculo automático não disponível para este teste (a fórmula do
          manual depende de diluição e da concentração de proteína, feita na
          análise). Registre as absorbâncias brutas e informe o valor final
          que você calculou.
        </p>
      )}

      {podeRegistrar && (
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={salvar}
            disabled={salvando}
            className={`text-sm ${BOTAO_PRIMARIO}`}
          >
            {salvando ? "Salvando..." : "Salvar tabela"}
          </button>
          {mensagem && <span className="text-sm text-ink-soft">{mensagem}</span>}
        </div>
      )}

      {graficoGrupos.length >= 2 && (
        <div className="mt-10">
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
            Valores por grupo (visão geral)
          </p>
          <div className="h-64 w-full rounded border border-rule bg-paper-raised p-2">
            <ResponsiveContainer>
              <ComposedChart data={graficoGrupos}>
                <CartesianGrid stroke="var(--color-rule)" />
                <XAxis
                  dataKey="grupo"
                  type="category"
                  allowDuplicatedCategory={true}
                  stroke="var(--color-ink-soft)"
                  tick={{ fontSize: 11 }}
                />
                <YAxis dataKey="valor" type="number" stroke="var(--color-ink-soft)" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-paper-raised)",
                    border: "1px solid var(--color-rule)",
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                />
                <Scatter dataKey="valor" fill="var(--color-absorbance)" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function PainelSessao({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6 rounded border border-rule bg-paper-raised p-4">
      <p className="mb-2 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
        {titulo}
      </p>
      {children}
    </div>
  );
}

function AvisoQC({ ok, config }: { ok: boolean; config: ConfigTeste }) {
  if (!config.qc) return null;
  return (
    <p
      className={`mt-2 text-xs ${
        ok ? "text-green-700 dark:text-green-400" : "text-alerta"
      }`}
    >
      {ok
        ? "Dentro do padrão do manual."
        : `Fora do padrão (esperado ${config.qc.min}–${config.qc.max}). ${config.qc.dica}`}
    </p>
  );
}
