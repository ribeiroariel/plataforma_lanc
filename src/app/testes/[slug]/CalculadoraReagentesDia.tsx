"use client";

import { useMemo, useState } from "react";
import {
  ENSAIOS_DIA,
  escalarEnsaioDia,
  type ReagenteDiaEscalado,
} from "@/lib/reagentesDia";
import type { Componente } from "@/lib/reagentes";
import { INPUT_SM } from "@/lib/estilos";

function fmtQtd(v: number): string {
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 5 });
}

function fmtVol(ul: number): string {
  if (!Number.isFinite(ul)) return "—";
  if (ul >= 1000) {
    return `${(ul / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} mL`;
  }
  return `${ul.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} µL`;
}

function TabelaComponentes({ componentes }: { componentes: Componente[] }) {
  return (
    <table className="w-full border-collapse text-sm">
      <tbody>
        {componentes.map((c, i) => (
          <tr key={i} className="border-b border-rule/60">
            <td className="py-1 pr-4 text-ink">{c.nome}</td>
            <td className="py-1 whitespace-nowrap font-mono tabular-nums text-ink">
              {fmtQtd(c.quantidade)} {c.unidade}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Badge({ tipo }: { tipo: ReagenteDiaEscalado["tipo"] }) {
  if (tipo === "pendente") {
    return (
      <span className="rounded-full bg-alerta/12 px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-alerta">
        pendente
      </span>
    );
  }
  if (tipo === "loteMinimo") {
    return (
      <span className="rounded-full bg-ink/5 px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-ink-soft">
        lote mínimo
      </span>
    );
  }
  return (
    <span className="rounded-full bg-reagent/12 px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-reagent">
      preparar no dia
    </span>
  );
}

export default function CalculadoraReagentesDia() {
  const [nome, setNome] = useState(ENSAIOS_DIA[0].nome);
  const [amostras, setAmostras] = useState("10");

  const ensaio = ENSAIOS_DIA.find((e) => e.nome === nome) ?? ENSAIOS_DIA[0];

  const n = useMemo(() => {
    const v = parseInt(amostras, 10);
    return Number.isFinite(v) && v > 0 ? v : NaN;
  }, [amostras]);

  const reagentes = useMemo(
    () => (Number.isFinite(n) ? escalarEnsaioDia(ensaio, n) : null),
    [ensaio, n]
  );

  return (
    <div className="rounded border border-rule bg-paper-raised p-4">
      <p className="mb-1 font-mono text-xs font-medium uppercase tracking-[0.12em] text-absorbance">
        Reagentes do dia por nº de amostras
      </p>
      <p className="mb-4 text-xs leading-relaxed text-ink-soft">
        Escolha o ensaio e o número de amostras (ratos) que vai analisar. As
        receitas do manual são dimensionadas para 10 amostras com +10% de margem
        (brancos e controles já embutidos) — aqui são escaladas para o seu N.
        Sempre confira antes de pesar.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-xs text-ink-soft">
          Ensaio
          <select
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className={`${INPUT_SM} w-full`}
          >
            {ENSAIOS_DIA.map((e) => (
              <option key={e.nome} value={e.nome}>
                {e.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Nº de amostras
          <input
            type="text"
            inputMode="numeric"
            value={amostras}
            onChange={(e) => setAmostras(e.target.value)}
            className={`${INPUT_SM} w-24`}
          />
        </label>
      </div>

      {reagentes ? (
        <div className="mt-4 flex flex-col gap-4">
          {reagentes.map((r, i) => (
            <div key={i} className="rounded border border-rule/70 p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-medium text-ink">{r.nome}</span>
                <Badge tipo={r.tipo} />
              </div>

              {r.tipo === "escala" && r.componentesEscalados && (
                <>
                  <p className="mb-1 font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                    Para {n} amostra(s)
                  </p>
                  <div className="overflow-x-auto">
                    <TabelaComponentes componentes={r.componentesEscalados} />
                  </div>
                </>
              )}

              {r.tipo === "loteMinimo" && (
                <>
                  {r.componentesMinimo && r.componentesMinimo.length > 0 && (
                    <>
                      <p className="mb-1 font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                        Receita mínima (não escala pra baixo)
                      </p>
                      <div className="overflow-x-auto">
                        <TabelaComponentes componentes={r.componentesMinimo} />
                      </div>
                    </>
                  )}
                  {r.descricao && (
                    <p className="text-sm leading-relaxed text-ink">{r.descricao}</p>
                  )}
                  {r.necessarioUl != null && (
                    <p className="mt-1 text-xs text-ink-soft">
                      Necessário para {n} amostra(s) (+10%):{" "}
                      <span className="font-mono text-ink">
                        {fmtVol(r.necessarioUl)}
                      </span>{" "}
                      (~{r.consumoPorAmostraUl} µL/amostra) — prepare pelo menos a
                      receita mínima.
                    </p>
                  )}
                </>
              )}

              {r.tipo === "pendente" && r.obs && (
                <p className="rounded border-l-2 border-alerta bg-alerta/5 px-3 py-2 text-xs leading-relaxed text-ink">
                  {r.obs}
                </p>
              )}

              {r.solvente && (
                <p className="mt-2 text-xs text-ink-soft">Solvente: {r.solvente}</p>
              )}
              {r.obs && r.tipo !== "pendente" && (
                <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                  Obs.: {r.obs}
                </p>
              )}
              {r.tipo === "escala" && r.consumoPorAmostraUl != null && (
                <p className="mt-1 font-mono text-[11px] text-ink-soft">
                  Consumo aproximado: {r.consumoPorAmostraUl} µL/amostra.
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-xs text-alerta">
          Informe um número de amostras válido (inteiro maior que zero).
        </p>
      )}
    </div>
  );
}
