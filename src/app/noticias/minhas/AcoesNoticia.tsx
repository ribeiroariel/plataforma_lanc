"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { alternarPublicacao, apagarNoticia } from "@/lib/actions/noticias";

export default function AcoesNoticia({
  id,
  publicado,
  podeEditar,
}: {
  id: string;
  publicado: boolean;
  podeEditar: boolean;
}) {
  const router = useRouter();
  const [pend, iniciar] = useTransition();
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!podeEditar) return null;

  function rodar(acao: () => Promise<{ erro: string } | { sucesso: true }>) {
    setErro(null);
    iniciar(async () => {
      const r = await acao();
      if ("erro" in r) setErro(r.erro);
      else router.refresh();
    });
  }

  return (
    <span className="flex flex-wrap items-center gap-3 text-sm">
      <Link href={`/noticias/minhas/${id}`} className="text-absorbance hover:underline">
        Editar
      </Link>
      <button
        type="button"
        disabled={pend}
        onClick={() => rodar(() => alternarPublicacao(id, !publicado))}
        className="text-ink-soft hover:text-ink disabled:opacity-50"
      >
        {publicado ? "Tirar do ar" : "Publicar"}
      </button>
      {confirmando ? (
        <span className="flex items-center gap-2">
          Apagar de vez?
          <button
            type="button"
            disabled={pend}
            onClick={() => rodar(() => apagarNoticia(id))}
            className="font-medium text-alerta hover:underline"
          >
            Sim, apagar
          </button>
          <button type="button" onClick={() => setConfirmando(false)} className="text-ink-soft hover:underline">
            Não
          </button>
        </span>
      ) : (
        <button type="button" onClick={() => setConfirmando(true)} className="text-alerta hover:underline">
          Apagar
        </button>
      )}
      {erro && <span className="w-full text-xs text-alerta">{erro}</span>}
    </span>
  );
}
