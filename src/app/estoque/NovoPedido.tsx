"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { criarPedido } from "@/lib/actions/pedidos";
import { CATEGORIAS } from "@/lib/estoque";
import { INPUT_SM, BOTAO_SECUNDARIO_SM } from "@/lib/estilos";

export default function NovoPedido() {
  const router = useRouter();
  const [pend, iniciar] = useTransition();
  const [aberto, setAberto] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [item, setItem] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [categoria, setCategoria] = useState("");
  const [motivo, setMotivo] = useState("");
  const [obs, setObs] = useState("");

  function enviar() {
    setMsg(null);
    if (!item.trim()) {
      setMsg("Diga o que está faltando.");
      return;
    }
    iniciar(async () => {
      const r = await criarPedido({
        item,
        quantidade: quantidade || null,
        categoria: categoria || null,
        motivo: motivo || null,
        obs: obs || null,
      });
      if ("erro" in r) {
        setMsg(r.erro);
        return;
      }
      setItem("");
      setQuantidade("");
      setCategoria("");
      setMotivo("");
      setObs("");
      setAberto(false);
      setMsg("Pedido registrado — a coordenação vai ver na aba Pedidos.");
      router.refresh();
    });
  }

  return (
    <section className="mt-10 border-t border-rule pt-6">
      <p className="mb-1 font-mono text-xs uppercase tracking-[0.12em] text-signal">
        Pedidos
      </p>
      <p className="mb-3 max-w-2xl text-xs leading-relaxed text-ink-soft">
        Faltou algo ou precisa de algum reagente/material? Registre aqui — o
        pedido vai direto para a aba Pedidos da coordenação (Ariel e orientadora),
        com quem pediu e quando.
      </p>

      {!aberto ? (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className={`w-fit ${BOTAO_SECUNDARIO_SM}`}
        >
          + Fazer um pedido
        </button>
      ) : (
        <div className="rounded border border-rule bg-paper-raised p-4">
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-xs text-ink-soft">
              O que está faltando (produto/item)
              <input
                value={item}
                onChange={(e) => setItem(e.target.value)}
                placeholder="Ex.: Ponteiras de 1000 µL"
                className={`${INPUT_SM} w-full max-w-md`}
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <label className="flex flex-col gap-1 text-xs text-ink-soft">
                Quantidade
                <input
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  placeholder="Ex.: 2 caixas"
                  className={`${INPUT_SM} w-36`}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-ink-soft">
                Tópico
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className={INPUT_SM}
                >
                  <option value="">—</option>
                  {CATEGORIAS.map((c) => (
                    <option key={c.valor} value={c.valor}>
                      {c.rotulo}
                    </option>
                  ))}
                  <option value="outro">Outro</option>
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-1 text-xs text-ink-soft">
              Motivo / para quê
              <input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex.: acabaram as do laboratório"
                className={`${INPUT_SM} w-full max-w-md`}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-ink-soft">
              Detalhes adicionais (opcional)
              <input
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Marca, especificação, urgência..."
                className={`${INPUT_SM} w-full max-w-md`}
              />
            </label>
            {msg && <p className="text-sm text-alerta">{msg}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={enviar}
                disabled={pend}
                className={BOTAO_SECUNDARIO_SM}
              >
                {pend ? "Enviando..." : "Enviar pedido"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAberto(false);
                  setMsg(null);
                }}
                className="text-xs text-ink-soft underline-offset-2 hover:underline"
              >
                cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {!aberto && msg && <p className="mt-2 text-sm text-ink-soft">{msg}</p>}
    </section>
  );
}
