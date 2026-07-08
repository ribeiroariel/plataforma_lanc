"use client";

import { useState } from "react";
import { finalizarProjeto } from "@/lib/actions/projetos";

export default function FinalizarBotao({ projetoId }: { projetoId: string }) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function finalizar() {
    const ok = window.confirm(
      "Finalizar torna o projeto somente-leitura (não dá mais pra editar grupos/levas). Continuar?"
    );
    if (!ok) return;
    setEnviando(true);
    const r = await finalizarProjeto(projetoId);
    setEnviando(false);
    if (r && "erro" in r) setErro(r.erro);
  }

  return (
    <>
      <button
        type="button"
        onClick={finalizar}
        disabled={enviando}
        className="text-xs text-ink-soft underline-offset-4 hover:text-alerta hover:underline disabled:opacity-50"
      >
        Finalizar projeto
      </button>
      {erro && <p className="text-xs text-alerta">{erro}</p>}
    </>
  );
}
