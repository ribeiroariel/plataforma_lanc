"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  protocoloDoSlug,
  type ReagenteConsumo,
} from "@/lib/protocoloEnsaio";
import { nomeRecipiente } from "@/lib/recipientes";
import { INPUT_SM } from "@/lib/estilos";

function fmtVol(ul: number): string {
  if (!Number.isFinite(ul)) return "—";
  if (ul >= 1000) {
    return `${(ul / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} mL`;
  }
  return `${ul.toLocaleString("pt-BR", { maximumFractionDigits: ul < 10 ? 2 : 0 })} µL`;
}

function LinhaReagente({ r, total }: { r: ReagenteConsumo; total: number }) {
  return (
    <tr className="border-b border-rule/60 align-top">
      <td className="py-1 pr-4 text-ink">
        {r.nome}
        {r.obs && <span className="block text-xs text-ink-soft">{r.obs}</span>}
      </td>
      <td className="whitespace-nowrap py-1 pr-4 font-mono text-xs text-ink-soft">
        {fmtVol(r.ulPorAmostra)}/amostra
      </td>
      <td className="whitespace-nowrap py-1 text-right font-mono tabular-nums text-ink">
        {fmtVol(total)}
      </td>
    </tr>
  );
}

export default function CalculadorasDoDia({
  slug,
  nRoster,
  recipiente,
}: {
  slug: string;
  nRoster: number;
  recipiente: string | null;
}) {
  const protocolo = protocoloDoSlug(slug);
  const [amostras, setAmostras] = useState(String(nRoster > 0 ? nRoster : 10));

  const n = useMemo(() => {
    const v = parseInt(amostras, 10);
    return Number.isFinite(v) && v > 0 ? v : NaN;
  }, [amostras]);

  if (!protocolo) {
    return (
      <div className="mt-6 rounded border border-rule bg-paper-raised p-4 text-sm text-ink-soft">
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.12em]">
          Reagentes do dia
        </p>
        <p>
          Os volumes deste ensaio ainda não foram catalogados do manual. Use a
          página de referência do protocolo em{" "}
          <Link href={`/testes/${slug}`} className="text-absorbance hover:text-ink">
            /testes/{slug}
          </Link>
          .
        </p>
      </div>
    );
  }

  const estoque = protocolo.reagentes.filter((r) => r.origem === "estoque");
  const dia = protocolo.reagentes.filter((r) => r.origem === "dia");
  // Margem de +10% (convenção do manual: dimensionar 10% a mais do necessário).
  const total = (r: ReagenteConsumo) => (Number.isFinite(n) ? r.ulPorAmostra * n * 1.1 : NaN);

  const modoAtual = recipiente
    ? protocolo.modos.find((m) => m.recipiente === recipiente)
    : undefined;

  return (
    <div className="mt-6 rounded border border-rule bg-paper-raised p-4">
      <p className="mb-1 font-mono text-xs uppercase tracking-[0.12em] text-absorbance">
        Reagentes do dia
      </p>
      <p className="mb-3 max-w-2xl text-xs leading-relaxed text-ink-soft">
        Volumes por amostra vindos do protocolo do manual (não de um fator), com
        +10% de margem. Ajuste o nº de amostras se incluir brancos/curva extras.
        {modoAtual
          ? ` Recipiente: ${nomeRecipiente(modoAtual.recipiente)} — ${fmtVol(modoAtual.volumeTotalUl)}/amostra.`
          : " Escolha o recipiente na preparação acima para fixar o modo de leitura."}
      </p>

      <label className="mb-4 flex w-fit flex-col gap-1 text-xs text-ink-soft">
        Nº de amostras
        <input
          type="text"
          inputMode="numeric"
          value={amostras}
          onChange={(e) => setAmostras(e.target.value)}
          className={`${INPUT_SM} w-24`}
        />
      </label>

      {!Number.isFinite(n) ? (
        <p className="text-xs text-alerta">
          Informe um número de amostras válido (inteiro maior que zero).
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {estoque.length > 0 && (
            <div>
              <p className="mb-1 font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                Estoque a consumir hoje (já prontos) — total p/ {n} amostra(s)
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <tbody>
                    {estoque.map((r, i) => (
                      <LinhaReagente key={i} r={r} total={total(r)} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {dia.length > 0 && (
            <div>
              <p className="mb-1 font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                Preparar no dia — total a consumir p/ {n} amostra(s)
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <tbody>
                    {dia.map((r, i) => (
                      <LinhaReagente key={i} r={r} total={total(r)} />
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-1 text-xs text-ink-soft">
                Como preparar cada um (receita/massa) está na página do protocolo:{" "}
                <Link
                  href={`/testes/${slug}`}
                  className="text-absorbance hover:text-ink"
                >
                  /testes/{slug}
                </Link>
                .
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
