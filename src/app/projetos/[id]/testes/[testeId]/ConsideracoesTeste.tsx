"use client";

import { useState, useTransition } from "react";
import { salvarConsideracoesTeste } from "@/lib/actions/resultados";
import { INPUT } from "@/lib/estilos";

export default function ConsideracoesTeste({
  projetoId,
  projetoTesteId,
  inicial,
  podeEditar,
}: {
  projetoId: string;
  projetoTesteId: string;
  inicial: string;
  podeEditar: boolean;
}) {
  const [texto, setTexto] = useState(inicial);
  const [pend, iniciar] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  // Quem só lê e não há nada escrito: não mostra a seção.
  if (!podeEditar && !inicial.trim()) return null;

  function salvar() {
    setMsg(null);
    iniciar(async () => {
      const r = await salvarConsideracoesTeste({
        projetoId,
        projetoTesteId,
        consideracoes: texto,
      });
      setMsg("erro" in r ? r.erro : "Considerações salvas.");
    });
  }

  return (
    <section className="mt-6">
      <p className="mb-1 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
        Considerações sobre o teste
      </p>
      <p className="mb-2 max-w-2xl text-xs leading-relaxed text-ink-soft">
        Espaço livre para registrar como foi o ensaio: imprevistos, se deu tudo
        certo, algo que valha anotar para quem for analisar depois.
      </p>
      {podeEditar ? (
        <>
          <textarea
            rows={4}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ex.: leituras estáveis; o rato 7 teve pouca amostra; refizemos a curva-padrão."
            className={`${INPUT} w-full max-w-2xl`}
          />
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={salvar}
              disabled={pend}
              className="rounded border border-rule px-3 py-1.5 text-sm text-ink transition-colors hover:border-signal disabled:opacity-50"
            >
              {pend ? "Salvando..." : "Salvar considerações"}
            </button>
            {msg && (
              <span
                className={`text-xs ${
                  msg.startsWith("Considerações") ? "text-ink-soft" : "text-alerta"
                }`}
              >
                {msg}
              </span>
            )}
          </div>
        </>
      ) : (
        <p className="max-w-2xl whitespace-pre-wrap text-sm text-ink">{inicial}</p>
      )}
    </section>
  );
}
