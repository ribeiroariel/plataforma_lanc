"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { INPUT_SM } from "@/lib/estilos";

// Nº de amostras do dia, compartilhado pelas três telas que dependem dele:
// reagentes do dia (Preparar), receitas do procedimento (Procedimento) e
// consumo real (Fechamento). Antes cada uma tinha o próprio campo — mudar
// num não mudava nos outros. Começa no N efetivo do teste (roster menos os
// ratos mortos/excluídos), e o bolsista pode ajustar (ex.: rodar em duas
// sessões).
type Estado = {
  texto: string;
  setTexto: (v: string) => void;
  /** Número válido (> 0) ou NaN. */
  n: number;
  nEfetivo: number;
  previstos: number;
};

const Ctx = createContext<Estado | null>(null);

export function AmostrasDoDiaProvider({
  nEfetivo,
  previstos,
  children,
}: {
  nEfetivo: number;
  previstos: number;
  children: React.ReactNode;
}) {
  const [texto, setTexto] = useState(String(nEfetivo > 0 ? nEfetivo : 10));
  const n = useMemo(() => {
    const v = parseInt(texto, 10);
    return Number.isFinite(v) && v > 0 ? v : NaN;
  }, [texto]);
  return (
    <Ctx.Provider value={{ texto, setTexto, n, nEfetivo, previstos }}>{children}</Ctx.Provider>
  );
}

export function useAmostrasDoDia(): Estado {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAmostrasDoDia fora do AmostrasDoDiaProvider");
  return v;
}

/** Campo do nº de amostras — o mesmo valor em todas as abas. */
export function CampoAmostras({ rotulo }: { rotulo: string }) {
  const { texto, setTexto, n, nEfetivo, previstos } = useAmostrasDoDia();
  const ajustado = n !== nEfetivo;
  return (
    <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        {rotulo}
        <input
          type="text"
          inputMode="numeric"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className={`${INPUT_SM} w-24`}
        />
      </label>
      <p className="pb-1.5 text-xs text-ink-soft">
        {nEfetivo < previstos ? (
          <>
            {previstos} previstos − {previstos - nEfetivo} fora ={" "}
            <span className="font-medium text-ink">{nEfetivo} efetivos</span>
          </>
        ) : (
          <>{nEfetivo} ratos no teste</>
        )}
        {ajustado && nEfetivo > 0 && (
          <>
            {" · "}
            <button
              type="button"
              onClick={() => setTexto(String(nEfetivo))}
              className="text-absorbance hover:underline"
            >
              voltar para {nEfetivo}
            </button>
          </>
        )}
        <span className="block text-[11px] text-ink-soft/80">
          Vale para os reagentes, as receitas e o consumo real.
        </span>
      </p>
    </div>
  );
}
