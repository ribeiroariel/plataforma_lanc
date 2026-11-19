"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { pararCronometroTeste } from "@/lib/actions/cronometro";
import { testes as catalogoTestes, tituloSemTecido, nomeTecido } from "@/lib/tecidos";

// Evento que as telas disparam ao iniciar/parar algo, para o cronômetro
// atualizar na hora em vez de esperar a próxima consulta.
export const EVENTO_CRONOMETRO = "lanc:cronometro";
export function avisarCronometro() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO_CRONOMETRO));
}

type Sac = {
  id: string;
  projeto_id: string;
  leva: number | null;
  iniciado_em: string;
  duracao_estimada_min: number | null;
};
type Sessao = { id: string; inicio: string };
type Execucao = {
  id: string;
  inicio: string;
  projeto_teste_id: string;
  projeto_testes: { projeto_id: string; teste_slug: string } | null;
};

function formatar(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  const dois = (n: number) => String(n).padStart(2, "0");
  return `${dois(Math.floor(s / 3600))}:${dois(Math.floor((s % 3600) / 60))}:${dois(s % 60)}`;
}

function IconeRelogio() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="13.5" r="7" />
      <path d="M12 10v3.5l2.3 1.4M10 3.5h4M12 3.5v3" />
    </svg>
  );
}

const PILULA =
  "flex items-center gap-2 rounded-full border bg-paper-raised px-3 py-1.5 shadow-md transition-colors";

// Cronômetros flutuantes (canto inferior direito), em todas as telas da área
// logada: sacrifício em andamento, horas no lab e teste em execução. O teste
// conta dentro das horas no lab (ver iniciarCronometroTeste).
export default function Cronometros() {
  const router = useRouter();
  const [sac, setSac] = useState<Sac | null>(null);
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [exec, setExec] = useState<Execucao | null>(null);
  const [agora, setAgora] = useState(() => Date.now());
  const [pend, iniciar] = useTransition();

  useEffect(() => {
    let vivo = true;
    const supabase = createClient();
    async function buscar() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const [s, l, t] = await Promise.all([
        supabase
          .from("sacrificios")
          .select("id, projeto_id, leva, iniciado_em, duracao_estimada_min")
          .eq("status", "em_andamento")
          .not("iniciado_em", "is", null)
          .order("iniciado_em", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("sessoes_lab")
          .select("id, inicio")
          .eq("profile_id", user.id)
          .is("fim", null)
          .limit(1)
          .maybeSingle(),
        supabase
          .from("teste_execucoes")
          .select("id, inicio, projeto_teste_id, projeto_testes:projeto_teste_id(projeto_id, teste_slug)")
          .eq("profile_id", user.id)
          .is("fim", null)
          .limit(1)
          .maybeSingle(),
      ]);
      if (!vivo) return;
      setSac((s.data as Sac | null) ?? null);
      setSessao((l.data as Sessao | null) ?? null);
      setExec(t.error ? null : ((t.data as Execucao | null) ?? null));
    }
    buscar();
    const id = setInterval(buscar, 30000);
    window.addEventListener(EVENTO_CRONOMETRO, buscar);
    return () => {
      vivo = false;
      clearInterval(id);
      window.removeEventListener(EVENTO_CRONOMETRO, buscar);
    };
  }, []);

  const algum = sac || sessao || exec;
  useEffect(() => {
    if (!algum) return;
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [algum]);

  if (!algum) return null;
  const desde = (iso: string) => (agora - new Date(iso).getTime()) / 1000;

  const cat = exec?.projeto_testes
    ? catalogoTestes.find((c) => c.slug === exec.projeto_testes!.teste_slug)
    : undefined;
  const nomeTeste = cat ? `${tituloSemTecido(cat.titulo, cat.tecido)} — ${nomeTecido(cat.tecido)}` : "Teste";

  return (
    <div
      data-noprint
      className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 flex flex-col items-end gap-2 md:bottom-4"
    >
      {exec && exec.projeto_testes && (
        <div className={`${PILULA} border-absorbance/50`}>
          <Link
            href={`/projetos/${exec.projeto_testes.projeto_id}/testes/${exec.projeto_teste_id}`}
            className="flex items-center gap-2 text-absorbance"
            title="Teste em execução (conta dentro das horas no lab)"
          >
            <IconeRelogio />
            <span className="max-w-[10rem] truncate text-xs text-ink">{nomeTeste}</span>
            <span className="font-mono text-sm tabular-nums text-ink">{formatar(desde(exec.inicio))}</span>
          </Link>
          <button
            type="button"
            disabled={pend}
            onClick={() =>
              iniciar(async () => {
                await pararCronometroTeste(exec.id);
                setExec(null);
                avisarCronometro();
                router.refresh();
              })
            }
            className="rounded-full border border-rule px-2 py-0.5 text-xs text-ink-soft hover:border-alerta hover:text-alerta"
            aria-label="Parar o cronômetro do teste"
          >
            parar
          </button>
        </div>
      )}

      {sessao && (
        <Link
          href="/laboratorio"
          className={`${PILULA} border-sucesso/50 hover:border-sucesso`}
          title="Horas no laboratório — clique para encerrar e marcar o que foi feito"
        >
          <span className="text-sucesso">
            <IconeRelogio />
          </span>
          <span className="text-xs text-ink">No lab</span>
          <span className="font-mono text-sm tabular-nums text-ink">{formatar(desde(sessao.inicio))}</span>
        </Link>
      )}

      {sac && (
        <Link
          href={`/projetos/${sac.projeto_id}/sacrificio/${sac.id}`}
          className={`${PILULA} border-rule hover:border-signal`}
          title="Sacrifício em andamento"
        >
          <span className="text-pyrogallol">
            <IconeRelogio />
          </span>
          <span className="text-xs text-ink">Sacrifício{sac.leva != null ? ` · leva ${sac.leva}` : ""}</span>
          <span
            className={`font-mono text-sm tabular-nums ${
              sac.duracao_estimada_min != null && desde(sac.iniciado_em) > sac.duracao_estimada_min * 60
                ? "text-alerta"
                : "text-ink"
            }`}
          >
            {formatar(desde(sac.iniciado_em))}
          </span>
          {sac.duracao_estimada_min != null && (
            <span className="font-mono text-xs text-ink-soft">/ ~{sac.duracao_estimada_min} min</span>
          )}
        </Link>
      )}
    </div>
  );
}
