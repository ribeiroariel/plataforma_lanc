"use client";

import { useMemo, useState } from "react";
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
import { regressaoLinear } from "@/lib/estatistica";
import type { RatoDoRoster } from "@/lib/roster";
import type { ConfigTeste } from "@/lib/tiposTeste";
import { salvarResultado, definirStatusTeste } from "@/lib/actions/resultados";

const TEMPOS_CAT = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const TEMPOS_SOD = [0, 30, 60, 90, 120];
const PONTOS_CURVA_LOWRY = [0, 10, 20, 40, 60, 80];
const VOLUME_AMOSTRA_LOWRY_UL = 10;

const VOLUME_TOTAL_CAT_ML = 0.25;
const VOLUME_AMOSTRA_CAT_ML = 0.01;
const EPSILON_CAT = 43.6;

type Resultado = {
  rato: string;
  grupo_id: string;
  leituras: Record<string, unknown>;
  valor_calculado: number | null;
  dentro_do_padrao: boolean | null;
};

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

function formatarNumero(v: number | null, casas = 3) {
  if (v === null || Number.isNaN(v)) return "—";
  return v.toFixed(casas);
}

function usarPontosValidos(tempos: number[], valores: string[]) {
  return tempos
    .map((t, i) => ({ x: t, y: parseFloat(valores[i]) }))
    .filter((p) => !Number.isNaN(p.y));
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
  const [resultados, setResultados] = useState<Map<string, Resultado>>(
    () => new Map(resultadosExistentes.map((r) => [r.rato, r]))
  );
  const [ratoSelecionado, setRatoSelecionado] = useState<number | null>(null);
  const [status, setStatus] = useState(statusAtual);
  const [alterandoStatus, setAlterandoStatus] = useState(false);

  // QC de sessão (compartilhado por todos os ratos desta rodada de leitura).
  const [absQcCat, setAbsQcCat] = useState("");
  const [controleSod, setControleSod] = useState<string[]>(
    TEMPOS_SOD.map(() => "")
  );
  const [curvaLowry, setCurvaLowry] = useState<string[]>(
    PONTOS_CURVA_LOWRY.map(() => "")
  );

  const qcCatOk = useMemo(() => {
    if (!config.qc || config.familia !== "cat") return null;
    const v = parseFloat(absQcCat);
    if (Number.isNaN(v)) return null;
    return v >= config.qc.min && v <= config.qc.max;
  }, [absQcCat, config]);

  const regressaoControleSod = useMemo(() => {
    if (config.familia !== "sod") return null;
    const pontos = usarPontosValidos(TEMPOS_SOD, controleSod);
    if (pontos.length < 2) return null;
    return regressaoLinear(pontos);
  }, [controleSod, config.familia]);

  const controleSodSlopeMin = regressaoControleSod
    ? regressaoControleSod.inclinacao * 60
    : null;

  const qcSodOk = useMemo(() => {
    if (!config.qc || controleSodSlopeMin === null) return null;
    return controleSodSlopeMin >= config.qc.min && controleSodSlopeMin <= config.qc.max;
  }, [controleSodSlopeMin, config.qc]);

  const regressaoCurvaLowry = useMemo(() => {
    if (config.familia !== "curva") return null;
    const pontos = usarPontosValidos(PONTOS_CURVA_LOWRY, curvaLowry);
    if (pontos.length < 2) return null;
    return regressaoLinear(pontos);
  }, [curvaLowry, config.familia]);

  const qcCurvaOk = useMemo(() => {
    if (!config.qc || !regressaoCurvaLowry) return null;
    return (
      regressaoCurvaLowry.rQuadrado >= config.qc.min &&
      regressaoCurvaLowry.rQuadrado <= config.qc.max
    );
  }, [regressaoCurvaLowry, config.qc]);

  const grafico = useMemo(() => {
    const dados = roster
      .map((r) => {
        const resultado = resultados.get(String(r.numero));
        return resultado?.valor_calculado != null
          ? { grupo: r.grupoNome, valor: resultado.valor_calculado }
          : null;
      })
      .filter((d): d is { grupo: string; valor: number } => d !== null);
    return dados;
  }, [roster, resultados]);

  async function alternarStatus() {
    const novo = status === "concluido" ? "pendente" : "concluido";
    setAlterandoStatus(true);
    const r = await definirStatusTeste(projetoId, projetoTesteId, novo);
    setAlterandoStatus(false);
    if (!("erro" in r)) setStatus(novo);
  }

  function aoSalvar(rato: string, resultado: Resultado) {
    setResultados((prev) => new Map(prev).set(rato, resultado));
    setRatoSelecionado(null);
  }

  return (
    <div className="mt-6">
      <div className="mb-6 flex items-center gap-3">
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            status === "concluido"
              ? "bg-green-500/15 text-green-700 dark:text-green-400"
              : "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400"
          }`}
        >
          {status === "concluido" ? "concluído" : "pendente"}
        </span>
        {podeAlterarStatus && (
          <button
            type="button"
            onClick={alternarStatus}
            disabled={alterandoStatus}
            className="text-xs underline disabled:opacity-50"
          >
            {status === "concluido" ? "Reabrir" : "Marcar como concluído"}
          </button>
        )}
      </div>

      {config.familia === "cat" && config.qc && (
        <div className="mb-6 rounded border border-black/10 p-4 dark:border-white/10">
          <p className="mb-2 text-sm font-medium">
            Controle de qualidade da sessão
          </p>
          <label className="flex max-w-xs flex-col gap-1 text-xs">
            {config.qc.rotulo} ({config.qc.unidade})
            <input
              type="number"
              step="0.001"
              value={absQcCat}
              onChange={(e) => setAbsQcCat(e.target.value)}
              disabled={!podeRegistrar}
              className="rounded border border-black/15 px-2 py-1 dark:border-white/20"
            />
          </label>
          {qcCatOk !== null && (
            <p
              className={`mt-2 text-xs ${
                qcCatOk
                  ? "text-green-700 dark:text-green-400"
                  : "text-red-700 dark:text-red-400"
              }`}
            >
              {qcCatOk
                ? "Dentro do padrão do manual."
                : `Fora do padrão (esperado ${config.qc.min}–${config.qc.max}). ${config.qc.dica}`}
            </p>
          )}
        </div>
      )}

      {config.familia === "sod" && config.qc && (
        <div className="mb-6 rounded border border-black/10 p-4 dark:border-white/10">
          <p className="mb-2 text-sm font-medium">
            Controle de qualidade da sessão — {config.qc.rotulo}
          </p>
          <div className="flex flex-wrap gap-2">
            {TEMPOS_SOD.map((t, i) => (
              <label key={t} className="flex flex-col gap-1 text-xs">
                {t}s
                <input
                  type="number"
                  step="0.001"
                  value={controleSod[i]}
                  onChange={(e) =>
                    setControleSod((prev) =>
                      prev.map((v, idx) => (idx === i ? e.target.value : v))
                    )
                  }
                  disabled={!podeRegistrar}
                  className="w-20 rounded border border-black/15 px-2 py-1 dark:border-white/20"
                />
              </label>
            ))}
          </div>
          {controleSodSlopeMin !== null && (
            <p
              className={`mt-2 text-xs ${
                qcSodOk
                  ? "text-green-700 dark:text-green-400"
                  : "text-red-700 dark:text-red-400"
              }`}
            >
              Taxa: {controleSodSlopeMin.toFixed(4)} {config.qc.unidade}
              {qcSodOk === false &&
                ` — fora do padrão (esperado ${config.qc.min}–${config.qc.max}). ${config.qc.dica}`}
              {qcSodOk === true && " — dentro do padrão do manual."}
            </p>
          )}
        </div>
      )}

      {config.familia === "curva" && config.qc && (
        <div className="mb-6 rounded border border-black/10 p-4 dark:border-white/10">
          <p className="mb-2 text-sm font-medium">
            Curva padrão da sessão — {config.qc.rotulo}
          </p>
          <div className="flex flex-wrap gap-2">
            {PONTOS_CURVA_LOWRY.map((p, i) => (
              <label key={p} className="flex flex-col gap-1 text-xs">
                {p === 0 ? "Branco" : `${p} µg`}
                <input
                  type="number"
                  step="0.001"
                  value={curvaLowry[i]}
                  onChange={(e) =>
                    setCurvaLowry((prev) =>
                      prev.map((v, idx) => (idx === i ? e.target.value : v))
                    )
                  }
                  disabled={!podeRegistrar}
                  className="w-20 rounded border border-black/15 px-2 py-1 dark:border-white/20"
                />
              </label>
            ))}
          </div>
          {regressaoCurvaLowry && (
            <p
              className={`mt-2 text-xs ${
                qcCurvaOk
                  ? "text-green-700 dark:text-green-400"
                  : "text-red-700 dark:text-red-400"
              }`}
            >
              R² = {regressaoCurvaLowry.rQuadrado.toFixed(4)}
              {qcCurvaOk === false &&
                ` — abaixo do exigido pelo manual (≥ ${config.qc.min}). ${config.qc.dica}`}
              {qcCurvaOk === true && " — dentro do padrão do manual."}
            </p>
          )}
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-black/60 dark:text-white/60">
            <th className="pb-2">Nº</th>
            <th className="pb-2">Grupo</th>
            <th className="pb-2">Valor{config.unidadeResultado ? ` (${config.unidadeResultado})` : ""}</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {roster.map((r) => {
            const resultado = resultados.get(String(r.numero));
            const preenchido = resultado?.valor_calculado != null;
            return (
              <tr key={r.numero} className="border-t border-black/5 dark:border-white/5">
                <td className="py-2">{r.numero}</td>
                <td className="py-2">{r.grupoNome}</td>
                <td className="py-2">
                  {preenchido ? formatarNumero(resultado!.valor_calculado) : "—"}
                  {resultado?.dentro_do_padrao === false && (
                    <span className="ml-2 text-xs text-red-600">QC fora do padrão</span>
                  )}
                </td>
                <td className="py-2 text-right">
                  {podeRegistrar ? (
                    <button
                      type="button"
                      onClick={() => setRatoSelecionado(r.numero)}
                      className="rounded border border-black/20 px-2 py-1 text-xs dark:border-white/20"
                    >
                      {preenchido ? "Editar" : "Registrar"}
                    </button>
                  ) : (
                    preenchido ? "" : "pendente"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {ratoSelecionado !== null && podeRegistrar && (
        <FormularioRato
          rato={roster.find((r) => r.numero === ratoSelecionado)!}
          config={config}
          projetoId={projetoId}
          projetoTesteId={projetoTesteId}
          resultadoExistente={resultados.get(String(ratoSelecionado)) ?? null}
          qcSessaoCat={absQcCat}
          qcSessaoCatOk={qcCatOk}
          controleSodSlopeMin={controleSodSlopeMin}
          qcSessaoSodOk={qcSodOk}
          controleSodBruto={controleSod}
          regressaoCurvaLowry={regressaoCurvaLowry}
          curvaLowryBruta={curvaLowry}
          qcSessaoCurvaOk={qcCurvaOk}
          onCancelar={() => setRatoSelecionado(null)}
          onSalvar={aoSalvar}
        />
      )}

      {grafico.length >= 2 && (
        <div className="mt-10">
          <p className="mb-2 text-sm font-medium">Valores por grupo (visão geral)</p>
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <ComposedChart data={grafico}>
                <CartesianGrid strokeOpacity={0.15} />
                <XAxis dataKey="grupo" type="category" allowDuplicatedCategory={true} />
                <YAxis dataKey="valor" type="number" />
                <Tooltip />
                <Scatter dataKey="valor" fill="#2563eb" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function FormularioRato({
  rato,
  config,
  projetoId,
  projetoTesteId,
  resultadoExistente,
  qcSessaoCat,
  qcSessaoCatOk,
  controleSodSlopeMin,
  qcSessaoSodOk,
  controleSodBruto,
  regressaoCurvaLowry,
  curvaLowryBruta,
  qcSessaoCurvaOk,
  onCancelar,
  onSalvar,
}: {
  rato: RatoDoRoster;
  config: ConfigTeste;
  projetoId: string;
  projetoTesteId: string;
  resultadoExistente: Resultado | null;
  qcSessaoCat: string;
  qcSessaoCatOk: boolean | null;
  controleSodSlopeMin: number | null;
  qcSessaoSodOk: boolean | null;
  controleSodBruto: string[];
  regressaoCurvaLowry: ReturnType<typeof regressaoLinear> | null;
  curvaLowryBruta: string[];
  qcSessaoCurvaOk: boolean | null;
  onCancelar: () => void;
  onSalvar: (rato: string, resultado: Resultado) => void;
}) {
  const leiturasExistentes = resultadoExistente?.leituras ?? {};

  const [absorbancias, setAbsorbancias] = useState<string[]>(() => {
    const tempos = config.familia === "cat" ? TEMPOS_CAT : TEMPOS_SOD;
    const salvas = leiturasExistentes.absorbancias as number[] | undefined;
    return tempos.map((_, i) => (salvas?.[i] != null ? String(salvas[i]) : ""));
  });
  const [proteina, setProteina] = useState(
    leiturasExistentes.proteina_mg_ml != null
      ? String(leiturasExistentes.proteina_mg_ml)
      : ""
  );
  const [camposSimples, setCamposSimples] = useState<Record<string, string>>(
    () => {
      const inicial: Record<string, string> = {};
      for (const campo of config.camposBrutos ?? []) {
        inicial[campo.chave] =
          leiturasExistentes[campo.chave] != null
            ? String(leiturasExistentes[campo.chave])
            : "";
      }
      return inicial;
    }
  );
  const [valorFinal, setValorFinal] = useState(
    resultadoExistente?.valor_calculado != null
      ? String(resultadoExistente.valor_calculado)
      : ""
  );
  const [absorbanciaCurva, setAbsorbanciaCurva] = useState(
    leiturasExistentes.abs_amostra != null
      ? String(leiturasExistentes.abs_amostra)
      : ""
  );
  const [fatorDiluicaoCurva, setFatorDiluicaoCurva] = useState(
    leiturasExistentes.fator_diluicao != null
      ? String(leiturasExistentes.fator_diluicao)
      : "1"
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const tempos = config.familia === "cat" ? TEMPOS_CAT : TEMPOS_SOD;

  const regressaoAmostra = useMemo(() => {
    if (config.familia !== "cat" && config.familia !== "sod") return null;
    const pontos = usarPontosValidos(tempos, absorbancias);
    if (pontos.length < 2) return null;
    return regressaoLinear(pontos);
  }, [absorbancias, tempos, config.familia]);

  const proteinaNum = parseFloat(proteina);

  const valorCalculadoCat = useMemo(() => {
    if (config.familia !== "cat" || !regressaoAmostra || !(proteinaNum > 0)) {
      return null;
    }
    const deltaAbsMin = Math.abs(regressaoAmostra.inclinacao) * 60;
    return (
      (deltaAbsMin * VOLUME_TOTAL_CAT_ML) /
      (EPSILON_CAT * VOLUME_AMOSTRA_CAT_ML * proteinaNum) *
      1000
    );
  }, [config.familia, regressaoAmostra, proteinaNum]);

  const valorCalculadoSod = useMemo(() => {
    if (
      config.familia !== "sod" ||
      !regressaoAmostra ||
      !controleSodSlopeMin ||
      controleSodSlopeMin <= 0 ||
      !(proteinaNum > 0)
    ) {
      return null;
    }
    const amostraSlopeMin = regressaoAmostra.inclinacao * 60;
    const percentInibicao = (1 - amostraSlopeMin / controleSodSlopeMin) * 100;
    const unidades = percentInibicao / 50;
    return unidades / proteinaNum;
  }, [config.familia, regressaoAmostra, controleSodSlopeMin, proteinaNum]);

  const valorCalculadoCurva = useMemo(() => {
    if (config.familia !== "curva" || !regressaoCurvaLowry) return null;
    const abs = parseFloat(absorbanciaCurva);
    const fator = parseFloat(fatorDiluicaoCurva) || 1;
    if (Number.isNaN(abs) || regressaoCurvaLowry.inclinacao === 0) return null;
    const microgramas = (abs - regressaoCurvaLowry.intercepto) / regressaoCurvaLowry.inclinacao;
    return (microgramas / VOLUME_AMOSTRA_LOWRY_UL) * fator;
  }, [config.familia, regressaoCurvaLowry, absorbanciaCurva, fatorDiluicaoCurva]);

  const valorCalculadoAtual =
    config.familia === "cat"
      ? valorCalculadoCat
      : config.familia === "sod"
      ? valorCalculadoSod
      : config.familia === "curva"
      ? valorCalculadoCurva
      : parseFloat(valorFinal);

  const dadosGraficoAmostra = tempos.map((t, i) => {
    const y = parseFloat(absorbancias[i]);
    return {
      x: t,
      y: Number.isNaN(y) ? null : y,
      yAjustado: regressaoAmostra
        ? regressaoAmostra.inclinacao * t + regressaoAmostra.intercepto
        : null,
    };
  });

  async function salvar() {
    setErro(null);

    let leituras: Record<string, unknown> = {};
    let valor: number | null = null;
    let dentroDoPadrao: boolean | null = null;

    if (config.familia === "cat") {
      if (valorCalculadoCat === null) {
        setErro("Preencha ao menos 2 leituras e a concentração de proteína.");
        return;
      }
      leituras = {
        tipo: "cat",
        tempos,
        absorbancias: absorbancias.map((v) => (v === "" ? null : parseFloat(v))),
        proteina_mg_ml: proteinaNum,
        qc_h2o2: qcSessaoCat === "" ? null : parseFloat(qcSessaoCat),
      };
      valor = valorCalculadoCat;
      dentroDoPadrao = qcSessaoCatOk;
    } else if (config.familia === "sod") {
      if (valorCalculadoSod === null) {
        setErro(
          "Preencha o controle da sessão, ao menos 2 leituras da amostra e a proteína."
        );
        return;
      }
      leituras = {
        tipo: "sod",
        tempos,
        absorbancias: absorbancias.map((v) => (v === "" ? null : parseFloat(v))),
        proteina_mg_ml: proteinaNum,
        controle_absorbancias: controleSodBruto.map((v) =>
          v === "" ? null : parseFloat(v)
        ),
        controle_slope_min: controleSodSlopeMin,
      };
      valor = valorCalculadoSod;
      dentroDoPadrao = qcSessaoSodOk;
    } else if (config.familia === "curva") {
      if (valorCalculadoCurva === null) {
        setErro("Preencha a curva padrão da sessão e a absorbância da amostra.");
        return;
      }
      leituras = {
        tipo: "curva",
        abs_amostra: parseFloat(absorbanciaCurva),
        fator_diluicao: parseFloat(fatorDiluicaoCurva) || 1,
        curva_pontos: PONTOS_CURVA_LOWRY,
        curva_absorbancias: curvaLowryBruta.map((v) => (v === "" ? null : parseFloat(v))),
        curva_inclinacao: regressaoCurvaLowry?.inclinacao ?? null,
        curva_intercepto: regressaoCurvaLowry?.intercepto ?? null,
        curva_r2: regressaoCurvaLowry?.rQuadrado ?? null,
      };
      valor = valorCalculadoCurva;
      dentroDoPadrao = qcSessaoCurvaOk;
    } else {
      if (valorFinal === "" || Number.isNaN(parseFloat(valorFinal))) {
        setErro("Informe o valor final calculado.");
        return;
      }
      leituras = Object.fromEntries(
        Object.entries(camposSimples).map(([k, v]) => [
          k,
          v === "" ? null : parseFloat(v),
        ])
      );
      valor = parseFloat(valorFinal);
    }

    setSalvando(true);
    const resultado = await salvarResultado({
      projetoId,
      projetoTesteId,
      rato: String(rato.numero),
      grupoId: rato.grupoId,
      leituras,
      valorCalculado: valor,
      dentroDoPadrao,
    });
    setSalvando(false);

    if ("erro" in resultado) {
      setErro(resultado.erro);
      return;
    }

    onSalvar(String(rato.numero), {
      rato: String(rato.numero),
      grupo_id: rato.grupoId,
      leituras,
      valor_calculado: valor,
      dentro_do_padrao: dentroDoPadrao,
    });
  }

  return (
    <div className="mt-6 rounded border border-black/15 p-4 dark:border-white/20">
      <p className="mb-3 font-medium">
        Rato {rato.numero} — {rato.grupoNome}
      </p>

      {(config.familia === "cat" || config.familia === "sod") && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            {tempos.map((t, i) => (
              <label key={t} className="flex flex-col gap-1 text-xs">
                {t}s
                <input
                  type="number"
                  step="0.001"
                  value={absorbancias[i]}
                  onChange={(e) =>
                    setAbsorbancias((prev) =>
                      prev.map((v, idx) => (idx === i ? e.target.value : v))
                    )
                  }
                  className="w-20 rounded border border-black/15 px-2 py-1 dark:border-white/20"
                />
              </label>
            ))}
          </div>

          <label className="mb-3 flex max-w-xs flex-col gap-1 text-xs">
            Concentração de proteína da amostra (mg/mL — do ensaio de Lowry)
            <input
              type="number"
              step="0.001"
              value={proteina}
              onChange={(e) => setProteina(e.target.value)}
              className="rounded border border-black/15 px-2 py-1 dark:border-white/20"
            />
          </label>

          {regressaoAmostra && (
            <div className="mb-3 h-48 w-full">
              <ResponsiveContainer>
                <ComposedChart data={dadosGraficoAmostra}>
                  <CartesianGrid strokeOpacity={0.15} />
                  <XAxis dataKey="x" type="number" label={{ value: "segundos", position: "insideBottom", offset: -5 }} />
                  <YAxis dataKey="y" type="number" />
                  <Tooltip />
                  <Scatter dataKey="y" fill="#2563eb" />
                  <Line type="linear" dataKey="yAjustado" stroke="#dc2626" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {config.familia === "curva" && (
        <div className="mb-3 flex flex-wrap gap-3">
          <label className="flex flex-col gap-1 text-xs">
            Absorbância da amostra
            <input
              type="number"
              step="0.001"
              value={absorbanciaCurva}
              onChange={(e) => setAbsorbanciaCurva(e.target.value)}
              className="w-32 rounded border border-black/15 px-2 py-1 dark:border-white/20"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Fator de diluição
            <input
              type="number"
              step="0.1"
              value={fatorDiluicaoCurva}
              onChange={(e) => setFatorDiluicaoCurva(e.target.value)}
              className="w-32 rounded border border-black/15 px-2 py-1 dark:border-white/20"
            />
          </label>
          {!regressaoCurvaLowry && (
            <p className="w-full text-xs text-black/50 dark:text-white/50">
              Preencha a curva padrão da sessão (acima da tabela) antes de
              registrar a amostra.
            </p>
          )}
        </div>
      )}

      {config.familia === "simples" && (
        <div className="mb-3 flex flex-col gap-3">
          {config.camposBrutos?.map((campo) => (
            <label key={campo.chave} className="flex max-w-sm flex-col gap-1 text-xs">
              {campo.rotulo}
              <input
                type="number"
                step="0.001"
                value={camposSimples[campo.chave] ?? ""}
                onChange={(e) =>
                  setCamposSimples((prev) => ({ ...prev, [campo.chave]: e.target.value }))
                }
                className="rounded border border-black/15 px-2 py-1 dark:border-white/20"
              />
            </label>
          ))}
          <label className="flex max-w-sm flex-col gap-1 text-xs">
            Valor final já calculado{config.unidadeResultado ? ` (${config.unidadeResultado})` : ""}
            <input
              type="number"
              step="0.0001"
              value={valorFinal}
              onChange={(e) => setValorFinal(e.target.value)}
              className="rounded border border-black/15 px-2 py-1 dark:border-white/20"
            />
          </label>
          <p className="text-xs text-black/50 dark:text-white/50">
            Cálculo automático ainda não disponível pra esse teste — os
            valores brutos ficam registrados, e o valor final é o que você
            já calculou.
          </p>
        </div>
      )}

      {valorCalculadoAtual !== null && !Number.isNaN(valorCalculadoAtual) && (
        <p className="mb-3 text-sm font-medium">
          Valor calculado: {formatarNumero(valorCalculadoAtual)}{" "}
          {config.unidadeResultado}
        </p>
      )}

      {erro && <p className="mb-3 text-sm text-red-600">{erro}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={salvar}
          disabled={salvando}
          className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {salvando ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="rounded border border-black/20 px-4 py-2 text-sm dark:border-white/20"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
