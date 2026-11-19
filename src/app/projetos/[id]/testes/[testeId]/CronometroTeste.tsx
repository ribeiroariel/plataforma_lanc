"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { iniciarCronometroTeste, pararCronometroTeste } from "@/lib/actions/cronometro";
import { avisarCronometro } from "@/components/Cronometros";

function formatar(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  const dois = (n: number) => String(n).padStart(2, "0");
  return `${dois(Math.floor(s / 3600))}:${dois(Math.floor((s % 3600) / 60))}:${dois(s % 60)}`;
}

function fmtMin(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

// Cronômetro do teste: conta o tempo de bancada deste teste. Roda dentro das
// horas no lab — se não houver horas abertas, elas abrem junto.
export default function CronometroTeste({
  projetoId,
  projetoTesteId,
  aberta,
  outroTesteAberto,
  labAberto,
  minutosAnteriores,
  podeIniciar,
}: {
  projetoId: string;
  projetoTesteId: string;
  /** Execução aberta deste teste (da pessoa logada). */
  aberta: { id: string; inicio: string } | null;
  /** Há outro teste contando para a pessoa (vai ser parado ao iniciar este). */
  outroTesteAberto: boolean;
  labAberto: boolean;
  /** Tempo já registrado neste teste (execuções fechadas, todas as pessoas). */
  minutosAnteriores: number;
  podeIniciar: boolean;
}) {
  const router = useRouter();
  const [pend, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    if (!aberta) return;
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [aberta]);

  if (!podeIniciar && !aberta) {
    return minutosAnteriores > 0 ? (
      <p className="text-xs text-ink-soft">Tempo de bancada registrado: {fmtMin(minutosAnteriores)}</p>
    ) : null;
  }

  function comecar() {
    setErro(null);
    iniciar(async () => {
      const r = await iniciarCronometroTeste({ projetoId, projetoTesteId });
      if ("erro" in r) {
        setErro(r.erro);
        return;
      }
      if (r.abriuLab) setAviso("Suas horas no lab também começaram a contar agora.");
      avisarCronometro();
      router.refresh();
    });
  }
  function parar() {
    if (!aberta) return;
    setErro(null);
    iniciar(async () => {
      const r = await pararCronometroTeste(aberta.id);
      if ("erro" in r) setErro(r.erro);
      else {
        setAviso("Cronômetro parado. As horas no lab continuam até você encerrar em Horas no lab.");
        avisarCronometro();
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      {aberta ? (
        <button
          type="button"
          onClick={parar}
          disabled={pend}
          className="inline-flex items-center gap-2 rounded-full border border-absorbance/50 bg-absorbance/[0.07] px-3 py-1.5 text-sm text-ink transition-colors hover:border-alerta"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-absorbance" aria-hidden />
          <span className="font-mono tabular-nums">
            {formatar((agora - new Date(aberta.inicio).getTime()) / 1000)}
          </span>
          <span className="text-ink-soft">· parar</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={comecar}
          disabled={pend}
          className="inline-flex items-center gap-2 rounded-full border border-rule px-3 py-1.5 text-sm text-ink transition-colors hover:border-absorbance hover:text-absorbance"
          title={
            labAberto
              ? "O tempo do teste conta dentro das suas horas no lab"
              : "Abre também as suas horas no lab"
          }
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="13.5" r="7" />
            <path d="M12 10v3.5l2.3 1.4M10 3.5h4M12 3.5v3" />
          </svg>
          {pend ? "Iniciando..." : "Iniciar cronômetro do teste"}
        </button>
      )}
      <span className="text-xs text-ink-soft">
        {minutosAnteriores > 0 && `${fmtMin(minutosAnteriores)} já registrados · `}
        {aberta
          ? "conta dentro das suas horas no lab"
          : outroTesteAberto
          ? "o outro teste que está contando vai parar"
          : labAberto
          ? "vai contar dentro das suas horas no lab"
          : "abre suas horas no lab junto"}
      </span>
      {aviso && <span className="text-xs text-sucesso">{aviso}</span>}
      {erro && <span className="text-xs text-alerta">{erro}</span>}
    </div>
  );
}
