"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarMetadadosLeitura } from "@/lib/actions/resultados";
import { INPUT_SM, BOTAO_SECUNDARIO_SM } from "@/lib/estilos";

export default function MetadadosLeitura({
  projetoId,
  projetoTesteId,
  aparelhoLabel,
  inicio,
  fim,
  podeEditar,
}: {
  projetoId: string;
  projetoTesteId: string;
  aparelhoLabel: string;
  inicio: string | null;
  fim: string | null;
  podeEditar: boolean;
}) {
  const router = useRouter();
  const [pend, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [ini, setIni] = useState(inicio ?? "");
  const [f, setF] = useState(fim ?? "");

  function salvar() {
    setErro(null);
    setSalvo(false);
    iniciar(async () => {
      const res = await salvarMetadadosLeitura({
        projetoId,
        projetoTesteId,
        inicio: ini,
        fim: f,
      });
      if ("erro" in res) setErro(res.erro);
      else {
        setSalvo(true);
        router.refresh();
      }
    });
  }

  if (!podeEditar) {
    return (
      <div className="mt-6 rounded border border-rule bg-paper-raised p-3 text-sm text-ink-soft">
        <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em]">
          Leitura
        </p>
        <p>
          Aparelho: <span className="text-ink">{aparelhoLabel || "—"}</span>
        </p>
        <p>
          Início: <span className="text-ink">{inicio || "—"}</span> · Término:{" "}
          <span className="text-ink">{fim || "—"}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded border border-dashed border-rule p-4">
      <p className="mb-1 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
        Leitura (para a planilha de transparência)
      </p>
      <p className="mb-3 max-w-2xl text-xs leading-relaxed text-ink-soft">
        Horário de início e término da leitura no equipamento. Entram no cabeçalho
        da planilha de dados brutos que se exporta na página do projeto. O aparelho
        vem da preparação acima
        {aparelhoLabel ? ` (${aparelhoLabel})` : ""}.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Início da leitura
          <input
            type="datetime-local"
            value={ini}
            onChange={(e) => setIni(e.target.value)}
            className={INPUT_SM}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Término da leitura
          <input
            type="datetime-local"
            value={f}
            onChange={(e) => setF(e.target.value)}
            className={INPUT_SM}
          />
        </label>
        <button
          type="button"
          onClick={salvar}
          disabled={pend}
          className={BOTAO_SECUNDARIO_SM}
        >
          {pend ? "Salvando..." : "Salvar"}
        </button>
      </div>
      {salvo && (
        <p className="mt-2 text-xs text-green-700 dark:text-green-400">Salvo.</p>
      )}
      {erro && <p className="mt-2 text-sm text-alerta">{erro}</p>}
    </div>
  );
}
