"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { definirStatusPedido, removerPedido } from "@/lib/actions/pedidos";
import { nomeCategoria } from "@/lib/estoque";

export type PedidoRow = {
  id: string;
  item: string;
  quantidade: string | null;
  categoria: string | null;
  motivo: string | null;
  obs: string | null;
  status: "aberto" | "atendido";
  solicitado_por: string;
  criado_em: string;
  atendido_em: string | null;
  solicitanteNome: string;
};

function dataHora(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function GestaoPedidos({ pedidos }: { pedidos: PedidoRow[] }) {
  const abertos = pedidos.filter((p) => p.status === "aberto");
  const atendidos = pedidos.filter((p) => p.status === "atendido");

  return (
    <div className="mt-8 flex flex-col gap-8">
      <Secao titulo={`Abertos (${abertos.length})`} vazio="Nenhum pedido em aberto." itens={abertos} />
      {atendidos.length > 0 && (
        <Secao titulo={`Atendidos (${atendidos.length})`} vazio="" itens={atendidos} />
      )}
    </div>
  );
}

function Secao({
  titulo,
  vazio,
  itens,
}: {
  titulo: string;
  vazio: string;
  itens: PedidoRow[];
}) {
  return (
    <section>
      <p className="mb-2 font-mono text-xs uppercase tracking-[0.12em] text-signal">
        {titulo}
      </p>
      {itens.length === 0 ? (
        <p className="text-sm text-ink-soft">{vazio}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {itens.map((p) => (
            <LinhaPedido key={p.id} pedido={p} />
          ))}
        </div>
      )}
    </section>
  );
}

function LinhaPedido({ pedido }: { pedido: PedidoRow }) {
  const router = useRouter();
  const [pend, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const atendido = pedido.status === "atendido";

  function alternar() {
    setErro(null);
    iniciar(async () => {
      const r = await definirStatusPedido(pedido.id, !atendido);
      if ("erro" in r) setErro(r.erro);
      else router.refresh();
    });
  }
  function remover() {
    setErro(null);
    iniciar(async () => {
      const r = await removerPedido(pedido.id);
      if ("erro" in r) setErro(r.erro);
      else router.refresh();
    });
  }

  return (
    <div
      className={`rounded border px-3 py-2 text-sm ${
        atendido ? "border-rule/60 bg-paper opacity-70" : "border-rule bg-paper-raised"
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-medium text-ink">{pedido.item}</span>
        {pedido.quantidade && (
          <span className="font-mono text-xs text-ink-soft">· {pedido.quantidade}</span>
        )}
        {pedido.categoria && (
          <span className="rounded-full bg-ink/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ink-soft">
            {pedido.categoria === "outro" ? "Outro" : nomeCategoria(pedido.categoria)}
          </span>
        )}
        <span className="ml-auto text-xs text-ink-soft">
          {pedido.solicitanteNome} · {dataHora(pedido.criado_em)}
        </span>
      </div>
      {(pedido.motivo || pedido.obs) && (
        <p className="mt-1 text-xs text-ink-soft">
          {[pedido.motivo, pedido.obs].filter(Boolean).join(" — ")}
        </p>
      )}
      {atendido && pedido.atendido_em && (
        <p className="mt-1 text-[11px] text-sucesso">
          Atendido em {dataHora(pedido.atendido_em)}
        </p>
      )}
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={alternar}
          disabled={pend}
          className="text-xs text-signal underline-offset-2 hover:underline disabled:opacity-50"
        >
          {atendido ? "reabrir" : "marcar como atendido"}
        </button>
        <button
          type="button"
          onClick={remover}
          disabled={pend}
          className="text-xs text-alerta underline-offset-2 hover:underline disabled:opacity-50"
        >
          remover
        </button>
        {erro && <span className="text-xs text-alerta">{erro}</span>}
      </div>
    </div>
  );
}
