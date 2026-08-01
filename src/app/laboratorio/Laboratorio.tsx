"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  iniciarSessao,
  encerrarSessao,
  registrarSessaoRetroativa,
  removerSessao,
} from "@/lib/actions/laboratorio";
import { TOPICOS_SESSAO, rotuloTopico, duracaoMin, fmtDuracao } from "@/lib/laboratorio";
import { INPUT_SM, BOTAO_SECUNDARIO_SM } from "@/lib/estilos";

export type SessaoRow = {
  id: string;
  inicio: string;
  fim: string | null;
  topicos: string[] | null;
  descricao: string | null;
};

function dataHora(iso: string): string {
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

function TopicosSelector({
  selecionados,
  onToggle,
}: {
  selecionados: Set<string>;
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {TOPICOS_SESSAO.map((t) => (
        <label key={t.valor} className="flex items-center gap-1.5 text-sm text-ink">
          <input
            type="checkbox"
            checked={selecionados.has(t.valor)}
            onChange={() => onToggle(t.valor)}
          />
          {t.rotulo}
        </label>
      ))}
    </div>
  );
}

export default function Laboratorio({
  aberta,
  fechadas,
  totalMin,
}: {
  aberta: SessaoRow | null;
  fechadas: SessaoRow[];
  totalMin: number;
}) {
  return (
    <div className="mt-8 flex flex-col gap-8">
      {aberta ? (
        <SessaoAberta sessao={aberta} />
      ) : (
        <SessaoParada />
      )}

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-signal">
            Minhas sessões
          </p>
          <p className="font-mono text-xs text-ink-soft">
            Total: {fmtDuracao(totalMin)}
          </p>
        </div>
        {fechadas.length === 0 ? (
          <p className="text-sm text-ink-soft">Nenhuma sessão registrada ainda.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {fechadas.map((s) => (
              <LinhaSessao key={s.id} sessao={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SessaoAberta({ sessao }: { sessao: SessaoRow }) {
  const router = useRouter();
  const [pend, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [encerrando, setEncerrando] = useState(false);
  const [topicos, setTopicos] = useState<Set<string>>(new Set());
  const [descricao, setDescricao] = useState("");
  // Relógio ao vivo: re-renderiza a cada 30 s para atualizar o tempo decorrido.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  function toggle(v: string) {
    setTopicos((prev) => {
      const nova = new Set(prev);
      if (nova.has(v)) nova.delete(v);
      else nova.add(v);
      return nova;
    });
  }

  function encerrar() {
    setErro(null);
    iniciar(async () => {
      const r = await encerrarSessao({
        id: sessao.id,
        topicos: Array.from(topicos),
        descricao: descricao || null,
      });
      if ("erro" in r) setErro(r.erro);
      else router.refresh();
    });
  }

  const decorrido = fmtDuracao(duracaoMin(sessao.inicio, null));

  return (
    <div className="rounded border border-signal/50 bg-signal/5 p-4">
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-signal">
        ● Sessão em andamento
      </p>
      <p className="mt-1 text-sm text-ink">
        Começou às <span className="font-mono">{dataHora(sessao.inicio)}</span> ·
        já são <span className="font-mono">{decorrido}</span>.
      </p>

      {!encerrando ? (
        <button
          type="button"
          onClick={() => setEncerrando(true)}
          className={`mt-3 ${BOTAO_SECUNDARIO_SM}`}
        >
          Encerrar sessão
        </button>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <div>
            <p className="mb-1.5 text-sm font-medium text-ink">O que você fez?</p>
            <TopicosSelector selecionados={topicos} onToggle={toggle} />
          </div>
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Descrição (se algo não se encaixa acima)
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: ajudei na organização das amostras"
              className={`${INPUT_SM} w-full max-w-md`}
            />
          </label>
          {erro && <p className="text-sm text-alerta">{erro}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={encerrar}
              disabled={pend}
              className={BOTAO_SECUNDARIO_SM}
            >
              {pend ? "Encerrando..." : "Confirmar encerramento"}
            </button>
            <button
              type="button"
              onClick={() => setEncerrando(false)}
              className="text-xs text-ink-soft underline-offset-2 hover:underline"
            >
              cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SessaoParada() {
  const router = useRouter();
  const [pend, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [retro, setRetro] = useState(false);

  const [dia, setDia] = useState("");
  const [horaIni, setHoraIni] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [topicos, setTopicos] = useState<Set<string>>(new Set());
  const [descricao, setDescricao] = useState("");

  function iniciarAoVivo() {
    setErro(null);
    iniciar(async () => {
      const r = await iniciarSessao();
      if ("erro" in r) setErro(r.erro);
      else router.refresh();
    });
  }

  function toggle(v: string) {
    setTopicos((prev) => {
      const nova = new Set(prev);
      if (nova.has(v)) nova.delete(v);
      else nova.add(v);
      return nova;
    });
  }

  function enviarRetro() {
    setErro(null);
    if (!dia || !horaIni || !horaFim) {
      setErro("Informe o dia e os horários de início e fim.");
      return;
    }
    iniciar(async () => {
      const r = await registrarSessaoRetroativa({
        inicioISO: new Date(`${dia}T${horaIni}`).toISOString(),
        fimISO: new Date(`${dia}T${horaFim}`).toISOString(),
        topicos: Array.from(topicos),
        descricao: descricao || null,
      });
      if ("erro" in r) {
        setErro(r.erro);
        return;
      }
      setRetro(false);
      setDia("");
      setHoraIni("");
      setHoraFim("");
      setTopicos(new Set());
      setDescricao("");
      router.refresh();
    });
  }

  return (
    <div className="rounded border border-rule bg-paper-raised p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={iniciarAoVivo}
          disabled={pend}
          className="rounded border border-signal px-3 py-1.5 text-sm text-signal transition-colors hover:bg-signal hover:text-paper disabled:opacity-50"
        >
          ● Iniciar sessão agora
        </button>
        <button
          type="button"
          onClick={() => setRetro((v) => !v)}
          className="text-xs text-signal underline-offset-2 hover:underline"
        >
          {retro ? "cancelar" : "registrar uma sessão passada"}
        </button>
      </div>

      {retro && (
        <div className="mt-4 flex flex-col gap-3 border-t border-rule pt-4">
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-xs text-ink-soft">
              Dia
              <input
                type="date"
                value={dia}
                onChange={(e) => setDia(e.target.value)}
                className={INPUT_SM}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-ink-soft">
              Início
              <input
                type="time"
                value={horaIni}
                onChange={(e) => setHoraIni(e.target.value)}
                className={INPUT_SM}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-ink-soft">
              Fim
              <input
                type="time"
                value={horaFim}
                onChange={(e) => setHoraFim(e.target.value)}
                className={INPUT_SM}
              />
            </label>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium text-ink">O que você fez?</p>
            <TopicosSelector selecionados={topicos} onToggle={toggle} />
          </div>
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Descrição (opcional)
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className={`${INPUT_SM} w-full max-w-md`}
            />
          </label>
          <div>
            <button
              type="button"
              onClick={enviarRetro}
              disabled={pend}
              className={BOTAO_SECUNDARIO_SM}
            >
              {pend ? "Registrando..." : "Registrar sessão"}
            </button>
          </div>
        </div>
      )}

      {erro && <p className="mt-2 text-sm text-alerta">{erro}</p>}
    </div>
  );
}

function LinhaSessao({ sessao }: { sessao: SessaoRow }) {
  const router = useRouter();
  const [pend, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function remover() {
    setErro(null);
    iniciar(async () => {
      const r = await removerSessao(sessao.id);
      if ("erro" in r) setErro(r.erro);
      else router.refresh();
    });
  }

  const topicos = (sessao.topicos ?? []).map(rotuloTopico);

  return (
    <div className="rounded border border-rule bg-paper-raised px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono text-ink">{dataHora(sessao.inicio)}</span>
        <span className="rounded-full bg-signal/12 px-2 py-0.5 font-mono text-[11px] text-signal">
          {fmtDuracao(duracaoMin(sessao.inicio, sessao.fim))}
        </span>
        {topicos.length > 0 && (
          <span className="text-xs text-ink-soft">{topicos.join(" · ")}</span>
        )}
        <button
          type="button"
          onClick={remover}
          disabled={pend}
          className="ml-auto text-xs text-alerta underline-offset-2 hover:underline disabled:opacity-50"
        >
          remover
        </button>
      </div>
      {sessao.descricao && (
        <p className="mt-1 text-xs text-ink-soft">{sessao.descricao}</p>
      )}
      {erro && <p className="mt-1 text-xs text-alerta">{erro}</p>}
    </div>
  );
}
