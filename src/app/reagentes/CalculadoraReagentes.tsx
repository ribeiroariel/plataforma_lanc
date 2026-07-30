"use client";

import { useMemo, useState } from "react";
import { REAGENTES, escalarReagente } from "@/lib/reagentes";
import { INPUT_SM } from "@/lib/estilos";

function fmtQtd(v: number): string {
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
}

function fmtVol(ml: number): string {
  if (!Number.isFinite(ml)) return "—";
  if (ml >= 1000 && ml % 1000 === 0) return `${ml / 1000} L`;
  return `${ml.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} mL`;
}

export default function CalculadoraReagentes() {
  const [id, setId] = useState(REAGENTES[0].id);
  const [volume, setVolume] = useState(String(REAGENTES[0].volumeBaseMl));
  const [unidadeVol, setUnidadeVol] = useState<"mL" | "L">("mL");

  const reagente = REAGENTES.find((r) => r.id === id) ?? REAGENTES[0];

  const volumeMl = useMemo(() => {
    const n = parseFloat(volume.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return NaN;
    return unidadeVol === "L" ? n * 1000 : n;
  }, [volume, unidadeVol]);

  const escala = useMemo(
    () => (Number.isFinite(volumeMl) ? escalarReagente(reagente, volumeMl) : null),
    [reagente, volumeMl]
  );

  function trocarReagente(novoId: string) {
    const r = REAGENTES.find((x) => x.id === novoId) ?? REAGENTES[0];
    setId(novoId);
    setVolume(String(r.volumeBaseMl));
    setUnidadeVol("mL");
  }

  const solvente = reagente.solvente ?? "água ultrapura (milli-Q)";

  return (
    <div className="rounded border border-rule bg-paper-raised p-4">
      <p className="mb-1 font-mono text-xs font-medium uppercase tracking-[0.12em] text-absorbance">
        Calculadora de preparo
      </p>
      <p className="mb-4 text-xs leading-relaxed text-ink-soft">
        Escolha a solução e o volume que você quer preparar — as quantidades são
        recalculadas por regra de três a partir da receita do manual. Sempre
        confira o resultado antes de pesar.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-xs text-ink-soft">
          Solução / reagente
          <select
            value={id}
            onChange={(e) => trocarReagente(e.target.value)}
            className={`${INPUT_SM} w-full`}
          >
            {REAGENTES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Volume desejado
          <div className="flex items-center gap-1">
            <input
              type="text"
              inputMode="decimal"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              className={`${INPUT_SM} w-24`}
            />
            <select
              value={unidadeVol}
              onChange={(e) => setUnidadeVol(e.target.value as "mL" | "L")}
              className={INPUT_SM}
            >
              <option value="mL">mL</option>
              <option value="L">L</option>
            </select>
          </div>
        </label>
      </div>

      <p className="mt-2 font-mono text-[11px] text-ink-soft">
        Receita base do manual (item {reagente.id}): {fmtVol(reagente.volumeBaseMl)}
      </p>

      {escala ? (
        <>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-rule text-left font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                  <th className="py-2 pr-4 font-normal">Reagente</th>
                  <th className="py-2 font-normal">
                    Quantidade para {fmtVol(volumeMl)}
                  </th>
                </tr>
              </thead>
              <tbody>
                {escala.componentes.map((c, i) => (
                  <tr key={i} className="border-b border-rule/60">
                    <td className="py-1.5 pr-4 text-ink">{c.nome}</td>
                    <td className="py-1.5 font-mono tabular-nums text-ink">
                      {fmtQtd(c.quantidade)} {c.unidade}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-ink">
            {reagente.qsp
              ? `Dissolver em um volume menor de ${solvente} e completar q.s.p. até ${fmtVol(
                  volumeMl
                )} em balão volumétrico.`
              : `Dissolver em ${fmtVol(volumeMl)} de ${solvente}.`}
            {reagente.ph && ` Ajustar pH ${reagente.ph}.`}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {reagente.preparoNoDia && (
              <span className="rounded-full bg-reagent/12 px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-reagent">
                preparar no dia
              </span>
            )}
            {reagente.armazenamento && (
              <span className="text-xs text-ink-soft">
                {reagente.armazenamento}
              </span>
            )}
          </div>

          {reagente.obs && (
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              Obs.: {reagente.obs}
            </p>
          )}
        </>
      ) : (
        <p className="mt-4 text-xs text-alerta">
          Informe um volume válido (maior que zero).
        </p>
      )}
    </div>
  );
}
