"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  protocoloDoSlug,
  type ReagenteConsumo,
} from "@/lib/protocoloEnsaio";
import {
  ehRecipiente,
  fatorRecipiente,
  nomeRecipiente,
  type Recipiente,
} from "@/lib/recipientes";
import { INPUT_SM } from "@/lib/estilos";

function fmtVol(ul: number): string {
  if (!Number.isFinite(ul)) return "—";
  if (ul >= 1000) {
    return `${(ul / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} mL`;
  }
  return `${ul.toLocaleString("pt-BR", { maximumFractionDigits: ul < 10 ? 2 : 0 })} µL`;
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

  // Sem recipiente definido, mostra na base microplaca 96 (1×) para ensaios que
  // escalam; para os de tubo fixo o recipiente não muda os volumes. Ensaios com
  // fator próprio (ex.: carboniladas) usam esse; senão, o fator global.
  const rec: Recipiente | null = ehRecipiente(recipiente) ? recipiente : null;
  const recEfetivo = rec ?? "microplaca_96";
  const fator = !protocolo.escala
    ? 1
    : protocolo.fatores
      ? protocolo.fatores[recEfetivo] ?? 1
      : fatorRecipiente(recEfetivo);

  const volAmostra = (r: ReagenteConsumo) => r.ulBase * fator;
  // Quando há um branco para cada amostra, reagentes usados em amostra E branco
  // ("ambos") são consumidos em 2× o nº de amostras.
  const tubosPorAmostra = (r: ReagenteConsumo) =>
    protocolo.brancoParaCadaAmostra && (r.escopo ?? "ambos") === "ambos" ? 2 : 1;
  const totalUl = (r: ReagenteConsumo) =>
    Number.isFinite(n) ? volAmostra(r) * n * tubosPorAmostra(r) * 1.1 : NaN;

  const rotuloEscopo = (r: ReagenteConsumo) => {
    if (!protocolo.brancoParaCadaAmostra) return null;
    if (r.escopo === "amostra") return "só amostra";
    if (r.escopo === "branco") return "só branco";
    return "amostra + branco (2×)";
  };

  const temDia = protocolo.reagentes.some((r) => r.origem === "dia");

  return (
    <div className="mt-6 rounded border border-rule bg-paper-raised p-4">
      <p className="mb-1 font-mono text-xs uppercase tracking-[0.12em] text-absorbance">
        Consumo de reagentes
      </p>
      <p className="mb-3 max-w-2xl text-xs leading-relaxed text-ink-soft">
        Quanto de cada reagente o ensaio consome, por amostra e no total (com +10%
        de margem). Os volumes vêm do protocolo do manual. Ajuste o nº de amostras
        se incluir brancos ou curva-padrão.{" "}
        {protocolo.escala
          ? rec
            ? `Recipiente: ${nomeRecipiente(rec)} — os volumes já estão ajustados a ele (${fator}× a microplaca 96).`
            : "Defina o recipiente na preparação acima; por ora, os volumes estão na base microplaca 96 (1×)."
          : "Ensaio feito em tubo de volume fixo — o consumo não muda com o recipiente."}
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
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-rule text-left font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                <th className="py-1 pr-4 font-medium">Reagente</th>
                <th className="py-1 pr-4 font-medium">µL/amostra</th>
                <th className="py-1 text-right font-medium">
                  Total ({n} amostra{protocolo.brancoParaCadaAmostra ? " + branco" : ""} + 10%)
                </th>
              </tr>
            </thead>
            <tbody>
              {protocolo.reagentes.map((r, i) => (
                <tr key={i} className="border-b border-rule/60 align-top">
                  <td className="py-1 pr-4 text-ink">
                    <span className="inline-flex items-center gap-2">
                      {r.nome}
                      <span
                        className={
                          r.origem === "dia"
                            ? "rounded-full bg-reagent/12 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-reagent"
                            : "rounded-full bg-ink/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ink-soft"
                        }
                      >
                        {r.origem === "dia" ? "preparar no dia" : "estoque"}
                      </span>
                      {rotuloEscopo(r) && (
                        <span className="rounded-full bg-ink/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ink-soft">
                          {rotuloEscopo(r)}
                        </span>
                      )}
                    </span>
                    {r.obs && (
                      <span className="block text-xs text-ink-soft">{r.obs}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap py-1 pr-4 font-mono text-xs text-ink-soft">
                    {fmtVol(volAmostra(r))}
                  </td>
                  <td className="whitespace-nowrap py-1 text-right font-mono tabular-nums text-ink">
                    {fmtVol(totalUl(r))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {temDia && (
        <p className="mt-3 text-xs text-ink-soft">
          Esta tabela é só o consumo. Como preparar os reagentes marcados “preparar
          no dia” (quanto pesar, como fazer) aparece nos passos de preparo do
          checklist abaixo — ou no protocolo completo em{" "}
          <Link href={`/testes/${slug}`} className="text-absorbance hover:text-ink">
            /testes/{slug}
          </Link>
          .
        </p>
      )}
    </div>
  );
}
