"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { marcarPasso } from "@/lib/actions/resultados";
import { procedimentoDoSlug } from "@/lib/procedimentos";
import { ensaioDiaDoSlug, escalarEnsaioDia } from "@/lib/reagentesDia";
import { INPUT_SM } from "@/lib/estilos";

export type EstadoPasso = {
  feito: boolean;
  porNome: string | null;
  em: string | null;
};

function fmtQuando(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

// Receita de um reagente preparado no dia, escalada para n amostras — mostrada
// dentro do passo de preparo, para preparar sem sair da aba.
function ReceitaReagente({
  slug,
  nome,
  n,
}: {
  slug: string;
  nome: string;
  n: number;
}) {
  const reagente = useMemo(() => {
    const ensaio = ensaioDiaDoSlug(slug);
    if (!ensaio || !Number.isFinite(n)) return null;
    return escalarEnsaioDia(ensaio, n).find((r) => r.nome === nome) ?? null;
  }, [slug, nome, n]);

  if (!reagente) return null;

  return (
    <div className="mt-2 rounded border border-reagent/30 bg-reagent/[0.04] p-2">
      <p className="mb-1 font-mono text-[11px] uppercase tracking-wide text-reagent">
        Preparar para {n} amostra(s){reagente.tipo === "escala" ? " (+10%)" : ""}
      </p>
      {reagente.tipo === "escala" && reagente.componentesEscalados && (
        <table className="w-full border-collapse text-sm">
          <tbody>
            {reagente.componentesEscalados.map((c, i) => (
              <tr key={i} className="border-b border-rule/50 last:border-0">
                <td className="py-0.5 pr-3 text-ink">{c.nome}</td>
                <td className="py-0.5 whitespace-nowrap font-mono tabular-nums text-ink">
                  {fmtQtd(c.quantidade)} {c.unidade}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {reagente.tipo === "loteMinimo" && (
        <>
          {reagente.componentesMinimo && (
            <table className="w-full border-collapse text-sm">
              <tbody>
                {reagente.componentesMinimo.map((c, i) => (
                  <tr key={i} className="border-b border-rule/50 last:border-0">
                    <td className="py-0.5 pr-3 text-ink">{c.nome}</td>
                    <td className="py-0.5 whitespace-nowrap font-mono tabular-nums text-ink">
                      {fmtQtd(c.quantidade)} {c.unidade}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {reagente.solvente && (
            <p className="mt-1 text-xs text-ink-soft">Solvente: {reagente.solvente}</p>
          )}
          {reagente.necessarioUl != null && (
            <p className="mt-1 text-xs text-ink-soft">
              Necessário p/ {n} amostra(s): {fmtVol(reagente.necessarioUl)} — prepare
              ao menos a receita mínima (não escala pra baixo).
            </p>
          )}
        </>
      )}
      {reagente.obs && (
        <p className="mt-1 text-xs leading-relaxed text-ink-soft">{reagente.obs}</p>
      )}
    </div>
  );
}

export default function ChecklistProcedimento({
  projetoId,
  projetoTesteId,
  slug,
  nRoster,
  estado,
  podeMarcar,
}: {
  projetoId: string;
  projetoTesteId: string;
  slug: string;
  nRoster: number;
  estado: Record<string, EstadoPasso>;
  podeMarcar: boolean;
}) {
  const router = useRouter();
  const [pend, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [emAndamento, setEmAndamento] = useState<string | null>(null);
  const [amostras, setAmostras] = useState(String(nRoster > 0 ? nRoster : 10));

  const n = useMemo(() => {
    const v = parseInt(amostras, 10);
    return Number.isFinite(v) && v > 0 ? v : NaN;
  }, [amostras]);

  const passos = procedimentoDoSlug(slug);
  if (!passos) {
    return (
      <div className="mt-6 rounded border border-rule bg-paper-raised p-4 text-sm text-ink-soft">
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.12em]">
          Procedimento
        </p>
        <p>
          O passo a passo deste ensaio ainda não foi catalogado. Use o protocolo
          em{" "}
          <Link href={`/testes/${slug}`} className="text-absorbance hover:text-ink">
            /testes/{slug}
          </Link>
          .
        </p>
      </div>
    );
  }

  const temReceita = passos.some((p) => p.reagenteDia);
  const feitos = passos.filter((p) => estado[p.id]?.feito).length;

  function alternar(passoId: string, feito: boolean) {
    if (!podeMarcar) return;
    setErro(null);
    setEmAndamento(passoId);
    iniciar(async () => {
      const res = await marcarPasso({ projetoId, projetoTesteId, passoId, feito });
      setEmAndamento(null);
      if ("erro" in res) setErro(res.erro);
      else router.refresh();
    });
  }

  return (
    <div className="mt-6 rounded border border-rule bg-paper-raised p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-absorbance">
          Procedimento — passo a passo
        </p>
        <span className="font-mono text-xs text-ink-soft">
          {feitos}/{passos.length}
        </span>
      </div>

      {temReceita && (
        <label className="mb-3 flex w-fit flex-col gap-1 text-xs text-ink-soft">
          Nº de amostras (para as receitas de preparo abaixo)
          <input
            type="text"
            inputMode="numeric"
            value={amostras}
            onChange={(e) => setAmostras(e.target.value)}
            className={`${INPUT_SM} w-24`}
          />
        </label>
      )}

      <ol className="flex flex-col gap-2">
        {passos.map((p, i) => {
          const st = estado[p.id];
          const feito = st?.feito ?? false;
          return (
            <li
              key={p.id}
              className={`rounded border p-3 ${
                feito
                  ? "border-rule/60 bg-ink/[0.02]"
                  : p.critico
                    ? "border-alerta/40"
                    : "border-rule"
              }`}
            >
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={feito}
                  disabled={!podeMarcar || (pend && emAndamento === p.id)}
                  onChange={(e) => alternar(p.id, e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 accent-signal disabled:opacity-50"
                />
                <div className="min-w-0 flex-1">
                  <span
                    className={`text-sm ${feito ? "text-ink-soft line-through" : "text-ink"}`}
                  >
                    <span className="mr-1 font-mono text-xs text-ink-soft">
                      {i + 1}.
                    </span>
                    {p.critico && !feito && (
                      <span className="mr-1 font-mono text-[10px] uppercase tracking-wide text-alerta">
                        [atenção]
                      </span>
                    )}
                    {p.texto}
                  </span>
                  {p.obs && (
                    <span className="mt-0.5 block text-xs text-ink-soft">
                      {p.obs}
                    </span>
                  )}
                  {p.reagenteDia && (
                    <ReceitaReagente slug={slug} nome={p.reagenteDia} n={n} />
                  )}
                  {feito && (st?.porNome || st?.em) && (
                    <span className="mt-0.5 block font-mono text-[11px] text-ink-soft">
                      ✓ {st?.porNome ?? "confirmado"}
                      {st?.em ? ` · ${fmtQuando(st.em)}` : ""}
                    </span>
                  )}
                </div>
              </label>
            </li>
          );
        })}
      </ol>

      {!podeMarcar && (
        <p className="mt-2 text-xs text-ink-soft">
          Só quem executa o teste (responsável e ajudantes) ou coautor marca os
          passos.
        </p>
      )}
      {erro && <p className="mt-2 text-sm text-alerta">{erro}</p>}
    </div>
  );
}
