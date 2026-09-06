"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type SacAtivo = {
  id: string;
  projeto_id: string;
  leva: number | null;
  iniciado_em: string;
  duracao_estimada_min: number | null;
  projetos: { nome: string } | null;
};

function formatar(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const dois = (n: number) => String(n).padStart(2, "0");
  return `${dois(h)}:${dois(m)}:${dois(ss)}`;
}

// Cronômetro flutuante (canto inferior direito) que mostra a duração corrente
// do sacrifício em andamento do usuário. Aparece em todas as telas (montado no
// layout). Some quando não há sacrifício em andamento.
export default function CronometroSacrificio() {
  const [sac, setSac] = useState<SacAtivo | null>(null);
  const [agora, setAgora] = useState<number>(() => Date.now());

  // Busca o sacrifício em andamento (RLS restringe aos do usuário). Refaz a
  // cada 30 s para pegar início/encerramento feitos em outra tela.
  useEffect(() => {
    let vivo = true;
    const supabase = createClient();
    async function buscar() {
      const { data } = await supabase
        .from("sacrificios")
        .select(
          "id, projeto_id, leva, iniciado_em, duracao_estimada_min, status, projetos:projeto_id(nome)"
        )
        .eq("status", "em_andamento")
        .not("iniciado_em", "is", null)
        .order("iniciado_em", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (vivo) setSac((data as SacAtivo | null) ?? null);
    }
    buscar();
    const id = setInterval(buscar, 30000);
    return () => {
      vivo = false;
      clearInterval(id);
    };
  }, []);

  // Tique de 1 s.
  useEffect(() => {
    if (!sac) return;
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [sac]);

  if (!sac) return null;

  const decorridoS = (agora - new Date(sac.iniciado_em).getTime()) / 1000;
  const estimadaMin = sac.duracao_estimada_min ?? null;
  const passouDoEstimado =
    estimadaMin != null && decorridoS > estimadaMin * 60;

  return (
    <Link
      href={`/projetos/${sac.projeto_id}/sacrificio/${sac.id}`}
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-rule bg-paper-raised px-3 py-1.5 shadow-md transition-colors hover:border-signal"
      title={`Sacrifício em andamento${sac.projetos?.nome ? " — " + sac.projetos.nome : ""}`}
    >
      <span aria-hidden className="text-sm">
        ⏱
      </span>
      <span
        className={`font-mono text-sm tabular-nums ${
          passouDoEstimado ? "text-alerta" : "text-ink"
        }`}
      >
        {formatar(decorridoS)}
      </span>
      {estimadaMin != null && (
        <span className="font-mono text-[11px] text-ink-soft">
          / ~{estimadaMin} min
        </span>
      )}
      {sac.leva != null && (
        <span className="font-mono text-[11px] text-ink-soft">
          Leva {sac.leva}
        </span>
      )}
    </Link>
  );
}
