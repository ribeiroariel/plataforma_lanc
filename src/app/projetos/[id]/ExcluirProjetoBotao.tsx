"use client";

import { useState } from "react";
import { excluirProjeto } from "@/lib/actions/projetos";

export default function ExcluirProjetoBotao({
  projetoId,
  nomeProjeto,
}: {
  projetoId: string;
  nomeProjeto: string;
}) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function excluir() {
    const ok = window.confirm(
      `Excluir o projeto "${nomeProjeto}"? Esta ação é permanente e apaga o ` +
        `projeto, seus grupos, membros e testes designados. Só é possível ` +
        `porque nenhum resultado ou sacrifício foi registrado ainda.`
    );
    if (!ok) return;
    setEnviando(true);
    setErro(null);
    const r = await excluirProjeto(projetoId);
    // Em caso de sucesso a action redireciona para /projetos e nada volta aqui.
    setEnviando(false);
    if (r && "erro" in r) setErro(r.erro);
  }

  return (
    <>
      <button
        type="button"
        onClick={excluir}
        disabled={enviando}
        className="text-xs text-ink-soft underline-offset-4 hover:text-alerta hover:underline disabled:opacity-50"
      >
        Excluir projeto
      </button>
      {erro && <p className="mt-1 text-xs text-alerta">{erro}</p>}
    </>
  );
}
