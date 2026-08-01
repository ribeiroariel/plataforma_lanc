"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { protocoloDoSlug, type ReagenteConsumo } from "@/lib/protocoloEnsaio";
import { ehRecipiente, fatorRecipiente } from "@/lib/recipientes";
import { registrarConsumoReal } from "@/lib/actions/estoque";
import { fmtQuantidade } from "@/lib/estoque";
import { INPUT_SM, BOTAO_SECUNDARIO_SM } from "@/lib/estilos";

type Props = {
  projetoId: string;
  projetoTesteId: string;
  slug: string;
  nRoster: number;
  recipiente: string | null;
  // reagente_nome -> volume real já registrado (µL)
  existentes: Record<string, number | null>;
  podeRegistrar: boolean;
};

function mlDeUl(ul: number | null): string {
  if (ul == null || !Number.isFinite(ul)) return "";
  return String(Math.round((ul / 1000) * 100) / 100);
}

export default function ConsumoReal({
  projetoId,
  projetoTesteId,
  slug,
  nRoster,
  recipiente,
  existentes,
  podeRegistrar,
}: Props) {
  const protocolo = protocoloDoSlug(slug);
  const router = useRouter();
  const [pend, iniciar] = useTransition();
  const [salvandoNome, setSalvandoNome] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Record<string, string>>({});
  const [reais, setReais] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const [nome, ul] of Object.entries(existentes)) init[nome] = mlDeUl(ul);
    return init;
  });

  if (!protocolo) return null;

  const rec = ehRecipiente(recipiente) ? recipiente : null;
  const recEfetivo = rec ?? "microplaca_96";
  const fator = !protocolo.escala
    ? 1
    : protocolo.fatores
      ? protocolo.fatores[recEfetivo] ?? 1
      : fatorRecipiente(recEfetivo);
  const n = nRoster > 0 ? nRoster : 10;

  const tubos = (r: ReagenteConsumo) =>
    protocolo.brancoParaCadaAmostra && (r.escopo ?? "ambos") === "ambos" ? 2 : 1;
  const estimadoUl = (r: ReagenteConsumo) => r.ulBase * fator * n * tubos(r) * 1.1;

  function registrar(r: ReagenteConsumo) {
    setMsgs((p) => ({ ...p, [r.nome]: "" }));
    setSalvandoNome(r.nome);
    const realMlStr = (reais[r.nome] ?? "").trim().replace(",", ".");
    const realMl = realMlStr === "" ? null : parseFloat(realMlStr);
    if (realMl != null && !Number.isFinite(realMl)) {
      setMsgs((p) => ({ ...p, [r.nome]: "Volume inválido." }));
      setSalvandoNome(null);
      return;
    }
    iniciar(async () => {
      const res = await registrarConsumoReal({
        projetoId,
        projetoTesteId,
        reagenteNome: r.nome,
        volumeEstimadoUl: Math.round(estimadoUl(r)),
        volumeRealUl: realMl != null ? realMl * 1000 : null,
      });
      setSalvandoNome(null);
      if ("erro" in res) {
        setMsgs((p) => ({ ...p, [r.nome]: res.erro }));
        return;
      }
      let msg = "✓ registrado";
      if (res.semItemNoEstoque) {
        msg += " — essa solução não está no estoque (sem baixa). Cadastre em Estoque.";
      } else if (res.estoqueBaixo != null) {
        msg += ` — estoque baixo: ${fmtQuantidade(res.estoqueBaixo.quantidade, res.estoqueBaixo.unidade)} restantes.`;
      } else {
        msg += " — estoque baixado.";
      }
      setMsgs((p) => ({ ...p, [r.nome]: msg }));
      router.refresh();
    });
  }

  return (
    <div className="mt-6 rounded border border-rule bg-paper-raised p-4">
      <p className="mb-1 font-mono text-xs uppercase tracking-[0.12em] text-absorbance">
        Consumo real (baixa do estoque)
      </p>
      <p className="mb-3 max-w-2xl text-xs leading-relaxed text-ink-soft">
        No fim do teste, registre quanto de cada reagente foi realmente usado (em
        mL). Se usou mais ou menos que o estimado, ajuste aqui — ao registrar, o
        estoque da solução correspondente é abatido automaticamente. Deixe em
        branco os reagentes de que não quer dar baixa.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-rule text-left font-mono text-[11px] uppercase tracking-wide text-ink-soft">
              <th className="py-1 pr-4 font-medium">Reagente</th>
              <th className="py-1 pr-4 font-medium">Estimado</th>
              <th className="py-1 pr-4 font-medium">Real usado (mL)</th>
              <th className="py-1 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {protocolo.reagentes.map((r) => (
              <tr key={r.nome} className="border-b border-rule/60 align-top">
                <td className="py-1.5 pr-4 text-ink">{r.nome}</td>
                <td className="whitespace-nowrap py-1.5 pr-4 font-mono text-xs text-ink-soft">
                  {fmtQuantidade(estimadoUl(r) / 1000, "mL")}
                </td>
                <td className="py-1.5 pr-4">
                  <input
                    inputMode="decimal"
                    value={reais[r.nome] ?? ""}
                    onChange={(e) =>
                      setReais((p) => ({ ...p, [r.nome]: e.target.value }))
                    }
                    disabled={!podeRegistrar}
                    placeholder={mlDeUl(estimadoUl(r))}
                    className={`${INPUT_SM} w-24`}
                  />
                </td>
                <td className="py-1.5">
                  {podeRegistrar && (
                    <button
                      type="button"
                      onClick={() => registrar(r)}
                      disabled={pend && salvandoNome === r.nome}
                      className={BOTAO_SECUNDARIO_SM}
                    >
                      {pend && salvandoNome === r.nome ? "..." : "Registrar"}
                    </button>
                  )}
                  {msgs[r.nome] && (
                    <span
                      className={`ml-2 block max-w-[16rem] text-[11px] leading-tight ${
                        msgs[r.nome].startsWith("✓")
                          ? "text-ink-soft"
                          : "text-alerta"
                      }`}
                    >
                      {msgs[r.nome]}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
