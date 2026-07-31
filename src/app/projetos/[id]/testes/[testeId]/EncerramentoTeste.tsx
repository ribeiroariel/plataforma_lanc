"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { encerrarTeste } from "@/lib/actions/resultados";

type Props = {
  projetoId: string;
  projetoTesteId: string;
  encerrado: boolean;
  encerradoPorNome: string | null;
  encerradoEm: string | null;
  podeEncerrar: boolean;
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

export default function EncerramentoTeste({
  projetoId,
  projetoTesteId,
  encerrado,
  encerradoPorNome,
  encerradoEm,
  podeEncerrar,
}: Props) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [encerrando, iniciar] = useTransition();

  function confirmarEEncerrar() {
    const ok = window.confirm(
      "Encerrar o teste é DEFINITIVO e não pode ser desfeito.\n\n" +
        "Depois de encerrar, nada mais pode ser alterado: nem a preparação, " +
        "nem o checklist, nem a tabela de resultados, nem os horários. Só então " +
        "a tabela fica disponível para impressão (PDF), para colar no caderno de " +
        "experimentos.\n\n" +
        "Confira se está tudo certo antes de continuar. Deseja encerrar agora?"
    );
    if (!ok) return;
    setErro(null);
    iniciar(async () => {
      const r = await encerrarTeste(projetoId, projetoTesteId);
      if ("erro" in r) {
        setErro(r.erro);
        return;
      }
      router.refresh();
    });
  }

  const urlImpressao = `/projetos/${projetoId}/testes/${projetoTesteId}/impressao`;

  if (!encerrado) {
    // Antes de encerrar: só quem executa/coautoria vê o botão. Enquanto não
    // encerrado, não há impressão nem anexo de foto.
    if (!podeEncerrar) return null;
    return (
      <section className="mt-10 rounded border border-rule bg-paper-raised p-4">
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
          Encerrar teste
        </p>
        <p className="mb-3 max-w-2xl text-xs leading-relaxed text-ink-soft">
          Ao encerrar, o teste fica <strong>travado para sempre</strong> — nada
          mais pode ser modificado. Faça isso só quando toda a tabela estiver
          conferida. Depois de encerrado, aparece o botão para imprimir a tabela
          (PDF) e colar no caderno de experimentos, e o espaço para anexar a foto
          dessa tabela já colada.
        </p>
        <button
          type="button"
          onClick={confirmarEEncerrar}
          disabled={encerrando}
          className="rounded border border-alerta px-3 py-1.5 text-sm text-alerta transition-colors hover:bg-alerta hover:text-paper disabled:opacity-50"
        >
          {encerrando ? "Encerrando…" : "Encerrar teste"}
        </button>
        {erro && <p className="mt-2 text-sm text-alerta">{erro}</p>}
      </section>
    );
  }

  // Encerrado: banner travado + impressão.
  return (
    <section className="mt-10 rounded border border-rule bg-paper-raised p-4">
      <p className="mb-1 font-mono text-xs uppercase tracking-[0.12em] text-signal">
        🔒 Teste encerrado
      </p>
      <p className="mb-3 max-w-2xl text-xs leading-relaxed text-ink-soft">
        Encerrado por <strong>{encerradoPorNome ?? "—"}</strong> em{" "}
        {dataHora(encerradoEm)}. Os dados estão travados e não podem mais ser
        alterados. Imprima a tabela abaixo e cole no caderno de experimentos.
      </p>
      <a
        href={urlImpressao}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block rounded border border-signal px-3 py-1.5 text-sm text-signal transition-colors hover:bg-signal hover:text-paper"
      >
        Imprimir tabela (PDF) ↗
      </a>
    </section>
  );
}
