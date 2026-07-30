"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { salvarPreparacaoTeste } from "@/lib/actions/resultados";
import {
  APARELHOS,
  RECIPIENTES,
  RECIPIENTES_POR_APARELHO,
  nomeAparelho,
  nomeRecipiente,
  type Aparelho,
  type Recipiente,
} from "@/lib/recipientes";
import { INPUT_SM, BOTAO_SECUNDARIO_SM } from "@/lib/estilos";

export default function PreparacaoTeste({
  projetoId,
  projetoTesteId,
  aparelho,
  recipiente,
  podeEditar,
}: {
  projetoId: string;
  projetoTesteId: string;
  aparelho: Aparelho | null;
  recipiente: Recipiente | null;
  podeEditar: boolean;
}) {
  const router = useRouter();
  const [pend, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [ap, setAp] = useState<Aparelho | "">(aparelho ?? "");
  const [rec, setRec] = useState<Recipiente | "">(recipiente ?? "");

  const recipientesDisponiveis = ap ? RECIPIENTES_POR_APARELHO[ap] : [];

  function trocarAparelho(valor: Aparelho | "") {
    setAp(valor);
    // Se o recipiente atual não serve para o novo aparelho, zera.
    if (valor === "" || !RECIPIENTES_POR_APARELHO[valor].includes(rec as Recipiente)) {
      setRec("");
    }
  }

  function salvar() {
    setErro(null);
    setSalvo(false);
    iniciar(async () => {
      const res = await salvarPreparacaoTeste({
        projetoId,
        projetoTesteId,
        aparelho: ap || null,
        recipiente: rec || null,
      });
      if ("erro" in res) setErro(res.erro);
      else {
        setSalvo(true);
        router.refresh();
      }
    });
  }

  const definido = aparelho && recipiente;

  if (!podeEditar) {
    return (
      <div className="mt-6 rounded border border-rule bg-paper-raised p-3 text-sm text-ink-soft">
        <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em]">
          Preparação
        </p>
        <p>
          Aparelho: <span className="text-ink">{nomeAparelho(aparelho) || "—"}</span>
        </p>
        <p>
          Recipiente:{" "}
          <span className="text-ink">{nomeRecipiente(recipiente) || "—"}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded border border-dashed border-rule p-4">
      <p className="mb-1 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
        Preparação — antes de começar
      </p>
      <p className="mb-3 max-w-2xl text-xs leading-relaxed text-ink-soft">
        Escolha o aparelho de leitura e o recipiente. O recipiente muda o volume
        de reagente e de amostra por poço/tubo, então recalcula as quantidades do
        dia (microplaca 96 = base; 24 poços = 6×; microcubeta = 3×; cubeta padrão
        = 10×). O aparelho também entra no cabeçalho da planilha de transparência.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Aparelho de leitura
          <select
            value={ap}
            onChange={(e) => trocarAparelho(e.target.value as Aparelho | "")}
            className={`${INPUT_SM} w-72`}
          >
            <option value="">Selecione…</option>
            {APARELHOS.map((a) => (
              <option key={a.valor} value={a.valor}>
                {a.rotulo}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Recipiente
          <select
            value={rec}
            onChange={(e) => setRec(e.target.value as Recipiente | "")}
            disabled={!ap}
            className={`${INPUT_SM} w-56 disabled:opacity-50`}
          >
            <option value="">{ap ? "Selecione…" : "Escolha o aparelho antes"}</option>
            {RECIPIENTES.filter((r) => recipientesDisponiveis.includes(r.valor)).map(
              (r) => (
                <option key={r.valor} value={r.valor}>
                  {r.rotulo} ({r.fator}×)
                </option>
              )
            )}
          </select>
        </label>
        <button
          type="button"
          onClick={salvar}
          disabled={pend}
          className={BOTAO_SECUNDARIO_SM}
        >
          {pend ? "Salvando..." : "Salvar preparação"}
        </button>
      </div>
      {!definido && (
        <p className="mt-2 text-xs text-ink-soft">
          Enquanto o recipiente não estiver definido, as calculadoras de reagente
          usam a microplaca 96 (1×) como base.
        </p>
      )}
      {salvo && (
        <p className="mt-2 text-xs text-green-700 dark:text-green-400">Salvo.</p>
      )}
      {erro && <p className="mt-2 text-sm text-alerta">{erro}</p>}
    </div>
  );
}
