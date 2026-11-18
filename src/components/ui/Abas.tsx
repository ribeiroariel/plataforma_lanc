"use client";

import { useEffect, useId, useRef, useState } from "react";

export type Aba = {
  id: string;
  rotulo: string;
  /** Número da etapa, quando as abas são passos de um fluxo. */
  passo?: number;
  /** Indicador à direita do rótulo (ex.: "12/24", "✓"). */
  indicador?: React.ReactNode;
  /** Etapa concluída — pinta o número de verde. */
  feita?: boolean;
  conteudo: React.ReactNode;
};

// Abas acessíveis (tablist ↔ tabpanel, setas do teclado) que guardam a aba
// aberta em ?aba= na URL — recarregar ou compartilhar o link volta pra mesma
// aba. Todos os painéis ficam MONTADOS (só escondidos): trocar de aba não
// perde o que foi digitado e ainda não confirmado na tabela de registro.
export function Abas({
  abas,
  inicial,
  parametro = "aba",
  className = "",
}: {
  abas: Aba[];
  inicial?: string;
  parametro?: string;
  className?: string;
}) {
  const base = useId();
  const [ativa, setAtiva] = useState(
    inicial && abas.some((a) => a.id === inicial) ? inicial : abas[0]?.id
  );
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function abrir(id: string, focar = false) {
    setAtiva(id);
    const url = new URL(window.location.href);
    url.searchParams.set(parametro, id);
    window.history.replaceState(null, "", url);
    if (focar) refs.current[id]?.focus();
  }

  // Link interno "#aba-registro" etc. também troca de aba.
  const ids = abas.map((a) => a.id).join(",");
  useEffect(() => {
    const validos = ids.split(",");
    function porHash() {
      const id = window.location.hash.replace("#aba-", "");
      if (validos.includes(id)) setAtiva(id);
    }
    porHash();
    window.addEventListener("hashchange", porHash);
    return () => window.removeEventListener("hashchange", porHash);
  }, [ids]);

  function teclado(e: React.KeyboardEvent, i: number) {
    let alvo = -1;
    if (e.key === "ArrowRight") alvo = (i + 1) % abas.length;
    if (e.key === "ArrowLeft") alvo = (i - 1 + abas.length) % abas.length;
    if (e.key === "Home") alvo = 0;
    if (e.key === "End") alvo = abas.length - 1;
    if (alvo >= 0) {
      e.preventDefault();
      abrir(abas[alvo].id, true);
    }
  }

  const iAtiva = abas.findIndex((a) => a.id === ativa);

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label="Etapas"
        data-noprint
        className="sticky top-[52px] z-20 -mx-4 flex gap-1 overflow-x-auto border-b border-rule bg-paper/95 px-4 backdrop-blur sm:-mx-6 sm:px-6 md:top-0"
      >
        {abas.map((a, i) => {
          const on = a.id === ativa;
          return (
            <button
              key={a.id}
              ref={(el) => {
                refs.current[a.id] = el;
              }}
              role="tab"
              type="button"
              id={`${base}-tab-${a.id}`}
              aria-selected={on}
              aria-controls={`${base}-painel-${a.id}`}
              tabIndex={on ? 0 : -1}
              onClick={() => abrir(a.id)}
              onKeyDown={(e) => teclado(e, i)}
              className={`group relative flex shrink-0 items-center gap-2 px-3 py-3 text-sm transition-colors ${
                on ? "font-medium text-ink" : "text-ink-soft hover:text-ink"
              }`}
            >
              {a.passo !== undefined && (
                <span
                  aria-hidden
                  className={`flex h-5 w-5 items-center justify-center rounded-full font-mono text-[10px] transition-colors ${
                    a.feita
                      ? "bg-sucesso text-white"
                      : on
                      ? "bg-signal text-white"
                      : "bg-ink/8 text-ink-soft group-hover:bg-ink/12"
                  }`}
                >
                  {a.feita ? "✓" : a.passo}
                </span>
              )}
              {a.rotulo}
              {a.indicador !== undefined && (
                <span className="rounded-full bg-ink/5 px-1.5 py-0.5 font-mono text-[10px] text-ink-soft">
                  {a.indicador}
                </span>
              )}
              <span
                aria-hidden
                className={`absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-signal transition-transform duration-200 ${
                  on ? "scale-x-100" : "scale-x-0"
                }`}
              />
            </button>
          );
        })}
      </div>

      {abas.map((a) => (
        <div
          key={a.id}
          role="tabpanel"
          id={`${base}-painel-${a.id}`}
          aria-labelledby={`${base}-tab-${a.id}`}
          hidden={a.id !== ativa}
          className={a.id === ativa ? "anim-fade" : undefined}
        >
          {a.conteudo}
        </div>
      ))}

      {/* Navegação de etapa: avançar/voltar sem subir até as abas. */}
      {abas.some((a) => a.passo !== undefined) && (
        <div data-noprint className="mt-10 flex items-center justify-between border-t border-rule pt-4">
          {iAtiva > 0 ? (
            <button
              type="button"
              onClick={() => {
                abrir(abas[iAtiva - 1].id);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="text-sm text-ink-soft transition-colors hover:text-ink"
            >
              ← {abas[iAtiva - 1].rotulo}
            </button>
          ) : (
            <span />
          )}
          {iAtiva < abas.length - 1 && (
            <button
              type="button"
              onClick={() => {
                abrir(abas[iAtiva + 1].id);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="inline-flex items-center gap-1.5 rounded bg-signal px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
            >
              {abas[iAtiva + 1].rotulo} →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
