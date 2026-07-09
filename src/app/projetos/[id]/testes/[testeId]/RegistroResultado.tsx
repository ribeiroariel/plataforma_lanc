"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
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
import { INPUT_SM } from "@/lib/estilos";
import ImportarTecan from "./ImportarTecan";

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
  observacoes: string | null;
  confirmado: boolean;
};

type Coluna = { key: string; label: string; absorbancia: boolean };

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

/**
 * Converte o que o bolsista digita em absorbância real. Número inteiro
 * (sem vírgula/ponto) é dividido por 1000 — o bolsista digita "100" e vira
 * 0,100; digita "1240" e vira 1,240. Se já tiver vírgula/ponto, usa direto.
 */
function absReal(s: string): number {
  if (s === "" || s == null) return NaN;
  const t = String(s).trim().replace(",", ".");
  if (t === "") return NaN;
  if (t.includes(".")) return parseFloat(t);
  const n = parseFloat(t);
  return Number.isNaN(n) ? NaN : n / 1000;
}

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
      absorbancia: true,
    }));
  }
  if (config.familia === "curva") {
    return [
      { key: "abs", label: "Absorbância", absorbancia: true },
      { key: "dil", label: "Diluição", absorbancia: false },
    ];
  }
  return [
    ...(config.camposBrutos ?? []).map((c) => ({
      key: c.chave,
      label: c.rotulo,
      absorbancia: true,
    })),
    {
      key: "valor_final",
      label: `Valor final${
        config.unidadeResultado ? ` (${config.unidadeResultado})` : ""
      }`,
      absorbancia: false,
    },
  ];
}

/** slope (ΔAbs/min) a partir dos tempos de uma linha, já em absorbância real. */
function slopeMinLinha(tempos: number[], linha: Record<string, string>) {
  const pontos = tempos
    .map((t) => ({ x: t, y: absReal(linha[`t${t}`] ?? "") }))
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
  const tempos = temposDaFamilia(config.familia);
  const temLevas = roster.some((r) => r.leva > 1);
  const ehCinetico = config.familia === "cat" || config.familia === "sod";

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
  const [obs, setObs] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      resultadosExistentes.map((r) => [r.rato, r.observacoes ?? ""])
    )
  );
  const [confirmados, setConfirmados] = useState<Set<string>>(
    () => new Set(resultadosExistentes.filter((r) => r.confirmado).map((r) => r.rato))
  );

  const [qcCat, setQcCat] = useState("");
  const [controleSod, setControleSod] = useState<Record<string, string>>({});
  const [curva, setCurva] = useState<Record<string, string>>({});

  const [status, setStatus] = useState(statusAtual);
  const [salvandoRato, setSalvandoRato] = useState<string | null>(null);
  const [alterandoStatus, setAlterandoStatus] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erroRato, setErroRato] = useState<Record<string, string>>({});

  const editavel = (rato: string) => podeRegistrar && !confirmados.has(rato);

  // Mescla o que a planilha do Tecan preencheu na tabela, sem tocar em ratos
  // já confirmados (esses estão travados). O bolsista ainda confere e confirma.
  function aplicarImportacaoTecan(
    preenchimento: Record<string, Record<string, string>>
  ) {
    setLinhas((prev) => {
      const novo = { ...prev };
      for (const [rato, cols] of Object.entries(preenchimento)) {
        if (confirmados.has(rato)) continue;
        novo[rato] = { ...(novo[rato] ?? {}), ...cols };
      }
      return novo;
    });
    setMensagem(null);
  }

  function setCelula(rato: string, col: string, valor: string) {
    setLinhas((prev) => ({
      ...prev,
      [rato]: { ...(prev[rato] ?? {}), [col]: valor },
    }));
  }

  // Ao sair da célula, normaliza a absorbância digitada (100 → 0.100).
  function normalizarCelula(rato: string, col: Coluna) {
    if (!col.absorbancia) return;
    const bruto = linhas[rato]?.[col.key] ?? "";
    const v = absReal(bruto);
    if (!Number.isNaN(v)) setCelula(rato, col.key, v.toFixed(3));
  }

  function normalizarSessao(
    mapa: Record<string, string>,
    setMapa: (f: (p: Record<string, string>) => Record<string, string>) => void,
    key: string
  ) {
    const v = absReal(mapa[key] ?? "");
    if (!Number.isNaN(v)) setMapa((p) => ({ ...p, [key]: v.toFixed(3) }));
  }

  // --- QC de sessão ---
  const qcCatOk = useMemo(() => {
    if (config.familia !== "cat" || !config.qc) return null;
    const v = absReal(qcCat);
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
      y: absReal(curva[`p${p}`] ?? ""),
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
      const abs = absReal(linha.abs ?? "");
      const dil = parseFloat((linha.dil ?? "").replace(",", ".")) || 1;
      if (Number.isNaN(abs) || !regressaoCurva || regressaoCurva.inclinacao === 0)
        return null;
      const ug = (abs - regressaoCurva.intercepto) / regressaoCurva.inclinacao;
      return (ug / VOLUME_AMOSTRA_LOWRY_UL) * dil;
    }
    const v = parseFloat((linha.valor_final ?? "").replace(",", "."));
    return Number.isNaN(v) ? null : v;
  }

  // Dados da curva cinética (uma linha por rato) — só CAT/SOD.
  const dadosCinetica = useMemo(() => {
    if (!ehCinetico) return [];
    return tempos.map((t) => {
      const ponto: Record<string, number | null> = { tempo: t };
      for (const r of roster) {
        const v = absReal(linhas[String(r.numero)]?.[`t${t}`] ?? "");
        ponto[`r${r.numero}`] = Number.isNaN(v) ? null : v;
      }
      return ponto;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linhas, ehCinetico, roster]);

  const ratosComCurva = roster.filter((r) =>
    tempos.some((t) => !Number.isNaN(absReal(linhas[String(r.numero)]?.[`t${t}`] ?? "")))
  );

  function montarSessao(): Record<string, unknown> {
    const sessao: Record<string, unknown> = {};
    if (config.familia === "cat")
      sessao.qc_h2o2 = Number.isNaN(absReal(qcCat)) ? null : absReal(qcCat);
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
    return sessao;
  }

  // Monta a linha de UM rato para salvar. Retorna null se ainda não há dado
  // suficiente (nenhuma leitura preenchida) para confirmar.
  function montarLinhaRato(rato: string): LinhaResultado | null {
    const r = roster.find((x) => String(x.numero) === rato);
    if (!r) return null;
    const dados = linhas[rato] ?? {};
    const temLeitura = Object.values(dados).some((v) => v !== "" && v != null);
    if (!temLeitura) return null;
    return {
      rato,
      grupoId: r.grupoId,
      leituras: { tipo: config.familia, colunas: dados, sessao: montarSessao() },
      valorCalculado: valorDoRato(rato),
      dentroDoPadrao: qcSessaoOk,
      observacoes: obs[rato] ?? null,
    };
  }

  // Confirma um rato por vez: salva imediatamente no banco e trava a linha.
  // Não há rascunho nem autosave — só o que é confirmado fica persistido, e
  // um resultado confirmado não pode mais ter o valor alterado (trigger no
  // banco garante isso mesmo fora do site).
  async function confirmarRato(rato: string) {
    setErroRato((p) => ({ ...p, [rato]: "" }));
    setMensagem(null);
    const linha = montarLinhaRato(rato);
    if (!linha) {
      setErroRato((p) => ({ ...p, [rato]: "Preencha as leituras antes de confirmar." }));
      return;
    }
    if (linha.valorCalculado === null && config.familia !== "simples") {
      setErroRato((p) => ({
        ...p,
        [rato]: "Faltam dados da sessão (curva/controle) para calcular o valor.",
      }));
      return;
    }
    setSalvandoRato(rato);
    const r = await salvarResultadosLote({
      projetoId,
      projetoTesteId,
      linhas: [linha],
      confirmar: true,
    });
    setSalvandoRato(null);
    if ("erro" in r) {
      setErroRato((p) => ({ ...p, [rato]: r.erro }));
      return;
    }
    setConfirmados((prev) => new Set(prev).add(rato));
  }

  async function alternarStatus() {
    const novo = status === "concluido" ? "pendente" : "concluido";
    setAlterandoStatus(true);
    const r = await definirStatusTeste(projetoId, projetoTesteId, novo);
    setAlterandoStatus(false);
    if (!("erro" in r)) setStatus(novo);
  }

  if (roster.length === 0) {
    return (
      <div className="mt-6 rounded border border-dashed border-rule p-6 text-sm text-ink-soft">
        Este projeto ainda não tem ratos cadastrados nos grupos. Peça a um
        coautor para definir a quantidade de ratos por grupo/leva no projeto.
      </div>
    );
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
        <span className="ml-auto text-xs text-ink-soft">
          Digite a absorbância como número inteiro — 100 vira 0,100; 1240 vira
          1,240.
        </span>
      </div>

      {podeRegistrar && (
        <ImportarTecan
          familia={config.familia}
          tempos={tempos}
          camposBrutos={config.camposBrutos ?? []}
          roster={roster}
          onAplicar={aplicarImportacaoTecan}
        />
      )}

      {config.familia === "cat" && config.qc && (
        <PainelSessao titulo="Controle de qualidade da sessão">
          <label className="flex max-w-xs flex-col gap-1 text-xs text-ink-soft">
            {config.qc.rotulo} ({config.qc.unidade})
            <input
              type="text"
              inputMode="decimal"
              value={qcCat}
              onChange={(e) => setQcCat(e.target.value)}
              onBlur={() => {
                const v = absReal(qcCat);
                if (!Number.isNaN(v)) setQcCat(v.toFixed(3));
              }}
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
                  type="text"
                  inputMode="decimal"
                  value={controleSod[`t${t}`] ?? ""}
                  onChange={(e) =>
                    setControleSod((p) => ({ ...p, [`t${t}`]: e.target.value }))
                  }
                  onBlur={() => normalizarSessao(controleSod, setControleSod, `t${t}`)}
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
                  type="text"
                  inputMode="decimal"
                  value={curva[`p${p}`] ?? ""}
                  onChange={(e) =>
                    setCurva((prev) => ({ ...prev, [`p${p}`]: e.target.value }))
                  }
                  onBlur={() => normalizarSessao(curva, setCurva, `p${p}`)}
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
              <th className="py-2 pr-2 font-normal">
                Valor{config.unidadeResultado ? ` (${config.unidadeResultado})` : ""}
              </th>
              <th className="py-2 pl-2 font-normal">Observação</th>
              {podeRegistrar && <th className="py-2 pl-2 font-normal">Confirmar</th>}
            </tr>
          </thead>
          <tbody>
            {roster.map((r) => {
              const rato = String(r.numero);
              const valor = valorDoRato(rato);
              const travado = confirmados.has(rato);
              return (
                <tr key={rato} className="border-b border-rule/60">
                  <td className="py-1.5 pr-3 font-mono text-ink">
                    {r.numero}
                    {travado && <span title="confirmado"> 🔒</span>}
                  </td>
                  {temLevas && (
                    <td className="py-1.5 pr-3 font-mono text-ink-soft">{r.leva}</td>
                  )}
                  <td className="py-1.5 pr-3 whitespace-nowrap text-ink-soft">
                    {r.grupoNome}
                  </td>
                  {colunas.map((c) => (
                    <td key={c.key} className="py-1.5 pr-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={linhas[rato]?.[c.key] ?? ""}
                        onChange={(e) => setCelula(rato, c.key, e.target.value)}
                        onBlur={() => normalizarCelula(rato, c)}
                        disabled={!editavel(rato)}
                        className={`${INPUT_SM} w-20`}
                      />
                    </td>
                  ))}
                  <td className="py-1.5 pr-2 font-mono tabular-nums text-ink">
                    {fmt(valor, config.familia === "curva" ? 3 : 4)}
                  </td>
                  <td className="py-1.5 pl-2">
                    <input
                      type="text"
                      value={obs[rato] ?? ""}
                      onChange={(e) =>
                        setObs((p) => ({ ...p, [rato]: e.target.value }))
                      }
                      disabled={!editavel(rato)}
                      placeholder="—"
                      className={`${INPUT_SM} w-40`}
                    />
                  </td>
                  {podeRegistrar && (
                    <td className="py-1.5 pl-2">
                      {travado ? (
                        <span className="font-mono text-[11px] uppercase tracking-wide text-green-700 dark:text-green-400">
                          🔒 confirmado
                        </span>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => confirmarRato(rato)}
                            disabled={salvandoRato === rato}
                            className="rounded bg-signal px-3 py-1 text-xs font-medium text-white transition hover:brightness-110 disabled:opacity-50"
                          >
                            {salvandoRato === rato ? "Salvando..." : "Confirmar"}
                          </button>
                          {erroRato[rato] && (
                            <span className="max-w-[10rem] text-[11px] leading-tight text-alerta">
                              {erroRato[rato]}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  )}
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
        <div className="mt-4 space-y-1">
          <p className="max-w-2xl text-xs leading-relaxed text-ink-soft">
            Confirme um rato por vez. Ao confirmar, aquela linha é salva na hora
            e travada — não precisa salvar rascunho, e o que foi confirmado
            continua salvo mesmo se a internet ou o site cair. Um resultado
            confirmado não pode mais ser alterado.
          </p>
          {mensagem && <p className="text-sm text-alerta">{mensagem}</p>}
        </div>
      )}

      {/* Curva cinética por rato (CAT/SOD) — pra ver o decaimento */}
      {ehCinetico && ratosComCurva.length > 0 && (
        <div className="mt-10">
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
            Curva cinética por rato (absorbância × tempo)
          </p>
          <p className="mb-3 text-xs text-ink-soft">
            Cada linha é um rato. Serve para ver se a reação está{" "}
            {config.familia === "cat" ? "decaindo" : "variando"} de forma
            consistente — uma linha muito fora do padrão indica amostra a
            refazer.
          </p>
          <div className="h-72 w-full rounded border border-rule bg-paper-raised p-2">
            <ResponsiveContainer>
              <LineChart data={dadosCinetica}>
                <CartesianGrid stroke="var(--color-rule)" />
                <XAxis
                  dataKey="tempo"
                  type="number"
                  stroke="var(--color-ink-soft)"
                  tick={{ fontSize: 11 }}
                  label={{ value: "segundos", position: "insideBottom", offset: -4, fontSize: 11 }}
                />
                <YAxis stroke="var(--color-ink-soft)" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-paper-raised)",
                    border: "1px solid var(--color-rule)",
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                />
                {ratosComCurva.map((r) => (
                  <Line
                    key={r.numero}
                    type="monotone"
                    dataKey={`r${r.numero}`}
                    name={`Rato ${r.numero}`}
                    stroke="var(--color-absorbance)"
                    strokeOpacity={0.5}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Visão geral por grupo */}
      <GraficoGrupos roster={roster} valorDoRato={valorDoRato} />
    </div>
  );
}

function GraficoGrupos({
  roster,
  valorDoRato,
}: {
  roster: RatoDoRoster[];
  valorDoRato: (rato: string) => number | null;
}) {
  const dados = roster
    .map((r) => {
      const v = valorDoRato(String(r.numero));
      return v === null ? null : { grupo: r.grupoNome, valor: v };
    })
    .filter((d): d is { grupo: string; valor: number } => d !== null);

  if (dados.length < 2) return null;

  return (
    <div className="mt-10">
      <p className="mb-2 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
        Valores por grupo (visão geral)
      </p>
      <div className="h-64 w-full rounded border border-rule bg-paper-raised p-2">
        <ResponsiveContainer>
          <ComposedChart data={dados}>
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
