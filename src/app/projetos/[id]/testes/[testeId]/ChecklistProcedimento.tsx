"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { marcarPasso } from "@/lib/actions/resultados";
import { procedimentoDoSlug } from "@/lib/procedimentos";

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

export default function ChecklistProcedimento({
  projetoId,
  projetoTesteId,
  slug,
  estado,
  podeMarcar,
}: {
  projetoId: string;
  projetoTesteId: string;
  slug: string;
  estado: Record<string, EstadoPasso>;
  podeMarcar: boolean;
}) {
  const router = useRouter();
  const [pend, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [emAndamento, setEmAndamento] = useState<string | null>(null);

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

  const feitos = passos.filter((p) => estado[p.id]?.feito).length;

  function alternar(passoId: string, feito: boolean) {
    if (!podeMarcar) return;
    setErro(null);
    setEmAndamento(passoId);
    iniciar(async () => {
      const res = await marcarPasso({
        projetoId,
        projetoTesteId,
        passoId,
        feito,
      });
      setEmAndamento(null);
      if ("erro" in res) setErro(res.erro);
      else router.refresh();
    });
  }

  return (
    <div className="mt-6 rounded border border-rule bg-paper-raised p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-absorbance">
          Procedimento — passo a passo
        </p>
        <span className="font-mono text-xs text-ink-soft">
          {feitos}/{passos.length}
        </span>
      </div>

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
                <div className="min-w-0">
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
