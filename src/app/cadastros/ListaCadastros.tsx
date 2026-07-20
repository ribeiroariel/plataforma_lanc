"use client";

import { useState, useTransition } from "react";
import { aprovarCadastro, rejeitarCadastro } from "@/lib/actions/cadastros";
import type { CadastroPendente } from "./tipos";

export function ListaCadastros({
  pendentes,
}: {
  pendentes: CadastroPendente[];
}) {
  return (
    <ul className="flex flex-col gap-2">
      {pendentes.map((p) => (
        <LinhaCadastro key={p.id} pendente={p} />
      ))}
    </ul>
  );
}

function LinhaCadastro({ pendente }: { pendente: CadastroPendente }) {
  const [pendente_, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [confirmandoRecusa, setConfirmandoRecusa] = useState(false);

  function aprovar() {
    setErro(null);
    startTransition(async () => {
      const r = await aprovarCadastro(pendente.id);
      if ("erro" in r) setErro(r.erro);
    });
  }

  function recusar() {
    setErro(null);
    startTransition(async () => {
      const r = await rejeitarCadastro(pendente.id);
      if ("erro" in r) setErro(r.erro);
    });
  }

  const dataPedido = new Date(pendente.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <li className="rounded border border-rule bg-paper-raised px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{pendente.nome}</p>
          <p className="truncate font-mono text-xs text-ink-soft">
            {pendente.email} · pediu em {dataPedido}
          </p>
        </div>

        {!confirmandoRecusa ? (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={aprovar}
              disabled={pendente_}
              className="rounded bg-signal px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-paper hover:bg-ink disabled:opacity-50"
            >
              {pendente_ ? "..." : "Aprovar"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmandoRecusa(true)}
              disabled={pendente_}
              className="rounded border border-rule px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-ink-soft hover:border-alerta hover:text-alerta disabled:opacity-50"
            >
              Recusar
            </button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-2">
            <span className="font-mono text-xs text-alerta">Apagar conta?</span>
            <button
              type="button"
              onClick={recusar}
              disabled={pendente_}
              className="rounded bg-alerta px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-paper hover:bg-ink disabled:opacity-50"
            >
              {pendente_ ? "..." : "Sim, recusar"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmandoRecusa(false)}
              disabled={pendente_}
              className="rounded border border-rule px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-ink-soft hover:text-ink disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {erro && (
        <p className="mt-2 text-xs text-alerta" role="alert">
          {erro}
        </p>
      )}
    </li>
  );
}
