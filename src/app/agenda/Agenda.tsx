"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  SALAS,
  TIPOS,
  corDaSala,
  ehSala,
  partesLocais,
  somarDias,
  tiposDaSala,
  type Sala,
  type TipoReserva,
} from "@/lib/agenda";
import { cancelarReserva, salvarReserva } from "@/lib/actions/agenda";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO_SM, INPUT_SM } from "@/lib/estilos";

export type ReservaVista = {
  id: string;
  sala: string;
  inicio: string;
  fim: string;
  tipo: TipoReserva;
  titulo: string | null;
  observacao: string | null;
  projetoId: string | null;
  projetoNome: string | null;
  projetoTesteId: string | null;
  testeNome: string | null;
  criadoPor: string;
  pessoas: string[];
};

type Pessoa = { id: string; nome: string };
type Projeto = { id: string; nome: string };
type MeuTesteOpcao = { id: string; projetoId: string; nome: string; projetoNome: string };

type Prefill = {
  sala?: Sala;
  tipo?: string;
  projetoId?: string;
  projetoTesteId?: string;
  data?: string;
} | null;

const HORA_INICIO = 7;
const HORA_FIM = 22;
const PX_HORA = 52;
const DIAS_CURTOS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

function fmtDia(data: string, opts: Intl.DateTimeFormatOptions) {
  return new Date(`${data}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC", ...opts });
}

function rotuloReserva(r: ReservaVista) {
  if (r.tipo === "teste") return r.testeNome ?? r.titulo ?? "Teste";
  if (r.tipo === "outro") return r.titulo ?? "Outro";
  return r.titulo ? `${TIPOS[r.tipo]} · ${r.titulo}` : TIPOS[r.tipo];
}

// Distribui reservas que se sobrepõem lado a lado dentro do dia.
function emColunas(lista: ReservaVista[]) {
  const ordenadas = [...lista].sort((a, b) => a.inicio.localeCompare(b.inicio));
  const saida: { r: ReservaVista; col: number; cols: number }[] = [];
  let grupo: { r: ReservaVista; col: number }[] = [];
  let fimGrupo = "";
  const fechar = () => {
    const cols = Math.max(1, ...grupo.map((g) => g.col + 1));
    grupo.forEach((g) => saida.push({ ...g, cols }));
    grupo = [];
  };
  for (const r of ordenadas) {
    if (grupo.length > 0 && r.inicio >= fimGrupo) fechar();
    const ocupadas = grupo.filter((g) => g.r.fim > r.inicio).map((g) => g.col);
    let col = 0;
    while (ocupadas.includes(col)) col++;
    grupo.push({ r, col });
    if (r.fim > fimGrupo) fimGrupo = r.fim;
  }
  if (grupo.length) fechar();
  return saida;
}

export default function Agenda({
  semana,
  dias,
  hoje,
  reservas,
  erroCarregar,
  usuarioId,
  ehOrientadora,
  pessoas,
  projetos,
  meusTestes,
  prefill,
}: {
  semana: string;
  dias: string[];
  hoje: string;
  reservas: ReservaVista[];
  erroCarregar: string | null;
  usuarioId: string;
  ehOrientadora: boolean;
  pessoas: Pessoa[];
  projetos: Projeto[];
  meusTestes: MeuTesteOpcao[];
  prefill: Prefill;
}) {
  const [salasVisiveis, setSalasVisiveis] = useState<Set<string>>(
    () => new Set(SALAS.map((s) => s.id))
  );
  const [aberta, setAberta] = useState<ReservaVista | null>(null);
  const [form, setForm] = useState<
    { reserva?: ReservaVista; data?: string; hora?: number; prefill?: Prefill } | null
  >(prefill ? { prefill, data: prefill.data } : null);

  const nomeDe = useMemo(() => new Map(pessoas.map((p) => [p.id, p.nome])), [pessoas]);
  const visiveis = reservas.filter((r) => salasVisiveis.has(r.sala));
  const porDia = useMemo(() => {
    const m = new Map<string, ReservaVista[]>();
    for (const r of visiveis) {
      const d = partesLocais(r.inicio).data;
      m.set(d, [...(m.get(d) ?? []), r]);
    }
    return m;
  }, [visiveis]);

  const intervalo = `${fmtDia(dias[0], { day: "numeric", month: "short" })} a ${fmtDia(dias[6], {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
  const minhas = reservas.filter(
    (r) => r.criadoPor === usuarioId || r.pessoas.includes(usuarioId)
  ).length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl leading-tight text-ink">Agenda das salas</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {intervalo}
            {minhas > 0 && ` · você está em ${minhas} ${minhas === 1 ? "reserva" : "reservas"} nesta semana`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded border border-rule text-sm">
            <Link
              href={`/agenda?semana=${somarDias(semana, -7)}`}
              className="px-3 py-1.5 text-ink-soft hover:bg-ink/5 hover:text-ink"
              aria-label="Semana anterior"
            >
              ‹
            </Link>
            <Link
              href="/agenda"
              className="border-x border-rule px-3 py-1.5 text-ink hover:bg-ink/5"
            >
              Hoje
            </Link>
            <Link
              href={`/agenda?semana=${somarDias(semana, 7)}`}
              className="px-3 py-1.5 text-ink-soft hover:bg-ink/5 hover:text-ink"
              aria-label="Próxima semana"
            >
              ›
            </Link>
          </div>
          <button type="button" onClick={() => setForm({ data: dias.includes(hoje) ? hoje : dias[0] })} className={BOTAO_PRIMARIO}>
            Reservar sala
          </button>
        </div>
      </div>

      {/* Salas: legenda que também filtra */}
      <div className="mt-5 flex flex-wrap gap-2">
        {SALAS.map((s) => {
          const on = salasVisiveis.has(s.id);
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={on}
              onClick={() =>
                setSalasVisiveis((prev) => {
                  const n = new Set(prev);
                  if (n.has(s.id)) n.delete(s.id);
                  else n.add(s.id);
                  return n;
                })
              }
              className={`flex items-center gap-2 rounded border px-2.5 py-1 text-sm transition-colors ${
                on ? "border-rule bg-paper-raised text-ink" : "border-dashed border-rule text-ink-soft/60"
              }`}
            >
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ background: on ? s.cor : "transparent", border: `1.5px solid ${s.cor}` }}
              />
              <span className="font-medium">{s.nome}</span>
              <span className="hidden text-ink-soft sm:inline">{s.local}</span>
            </button>
          );
        })}
      </div>

      {erroCarregar && (
        <p className="mt-4 rounded border border-alerta/40 bg-alerta/5 p-3 text-sm text-alerta">
          Não consegui carregar a agenda ({erroCarregar}). Se for a primeira vez,
          falta rodar a migração da agenda no Supabase.
        </p>
      )}

      {/* Grade semanal — computador */}
      <div className="mt-5 hidden overflow-x-auto rounded border border-rule md:block">
        <div className="grid min-w-[760px]" style={{ gridTemplateColumns: "52px repeat(7, minmax(0, 1fr))" }}>
          <div className="border-b border-rule bg-paper-raised" />
          {dias.map((d, i) => (
            <div
              key={d}
              className={`border-b border-l border-rule px-2 py-2 text-center text-sm ${
                d === hoje ? "bg-signal/8" : "bg-paper-raised"
              }`}
            >
              <span className="text-ink-soft">{DIAS_CURTOS[i]}</span>{" "}
              <span className={d === hoje ? "font-semibold text-signal" : "text-ink"}>
                {fmtDia(d, { day: "numeric" })}
              </span>
            </div>
          ))}

          {/* coluna de horas */}
          <div className="relative" style={{ height: (HORA_FIM - HORA_INICIO) * PX_HORA }}>
            {Array.from({ length: HORA_FIM - HORA_INICIO }, (_, h) => (
              <span
                key={h}
                className="absolute right-2 -translate-y-1/2 font-mono text-[11px] text-ink-soft"
                style={{ top: h * PX_HORA }}
              >
                {h > 0 ? `${HORA_INICIO + h}h` : ""}
              </span>
            ))}
          </div>

          {dias.map((d) => (
            <div
              key={d}
              className={`relative border-l border-rule ${d === hoje ? "bg-signal/[0.03]" : ""}`}
              style={{ height: (HORA_FIM - HORA_INICIO) * PX_HORA }}
            >
              {Array.from({ length: HORA_FIM - HORA_INICIO }, (_, h) => (
                <button
                  key={h}
                  type="button"
                  aria-label={`Reservar ${fmtDia(d, { day: "numeric", month: "long" })} às ${HORA_INICIO + h}h`}
                  onClick={() => setForm({ data: d, hora: HORA_INICIO + h })}
                  className="absolute inset-x-0 border-t border-rule/60 transition-colors hover:bg-ink/[0.03]"
                  style={{ top: h * PX_HORA, height: PX_HORA }}
                />
              ))}
              {d === hoje && <LinhaAgora />}
              {emColunas(porDia.get(d) ?? []).map(({ r, col, cols }) => {
                const ini = partesLocais(r.inicio);
                const fim = partesLocais(r.fim);
                const top = ((ini.minutos - HORA_INICIO * 60) / 60) * PX_HORA;
                const alt = Math.max(22, ((fim.minutos - ini.minutos) / 60) * PX_HORA - 2);
                const minha = r.pessoas.includes(usuarioId) || r.criadoPor === usuarioId;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setAberta(r)}
                    className="absolute overflow-hidden rounded-sm border-l-[3px] px-1.5 py-0.5 text-left text-xs leading-tight text-ink shadow-[0_1px_0_rgba(0,0,0,0.04)] hover:brightness-95"
                    style={{
                      top: Math.max(0, top),
                      height: alt,
                      left: `calc(${(col / cols) * 100}% + 2px)`,
                      width: `calc(${100 / cols}% - 4px)`,
                      borderColor: corDaSala(r.sala),
                      background: `color-mix(in srgb, ${corDaSala(r.sala)} ${minha ? 22 : 12}%, var(--color-paper))`,
                    }}
                  >
                    <span className="font-medium">{rotuloReserva(r)}</span>
                    <span className="block text-ink-soft">
                      {ini.hora}–{fim.hora} · {r.sala}
                    </span>
                    {alt > 50 && (
                      <span className="block truncate text-ink-soft">
                        {r.pessoas.map((p) => (nomeDe.get(p) ?? "?").split(" ")[0]).join(", ")}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Lista por dia — celular */}
      <div className="mt-5 flex flex-col gap-5 md:hidden">
        {dias.map((d, i) => {
          const lista = (porDia.get(d) ?? []).sort((a, b) => a.inicio.localeCompare(b.inicio));
          return (
            <section key={d}>
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className={`text-sm ${d === hoje ? "font-semibold text-signal" : "font-medium text-ink"}`}>
                  {DIAS_CURTOS[i]}, {fmtDia(d, { day: "numeric", month: "long" })}
                  {d === hoje && " · hoje"}
                </h2>
                <button
                  type="button"
                  onClick={() => setForm({ data: d })}
                  className="text-xs text-absorbance"
                >
                  reservar
                </button>
              </div>
              {lista.length === 0 ? (
                <p className="text-xs text-ink-soft/70">Livre</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {lista.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setAberta(r)}
                      className="flex gap-3 rounded border border-rule bg-paper-raised p-2.5 text-left"
                    >
                      <span className="w-1 shrink-0 rounded-full" style={{ background: corDaSala(r.sala) }} />
                      <span className="min-w-0 text-sm">
                        <span className="font-medium text-ink">{rotuloReserva(r)}</span>
                        <span className="block text-xs text-ink-soft">
                          {partesLocais(r.inicio).hora}–{partesLocais(r.fim).hora} · {r.sala} ·{" "}
                          {r.pessoas.map((p) => (nomeDe.get(p) ?? "?").split(" ")[0]).join(", ")}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {aberta && (
        <Detalhes
          r={aberta}
          nomeDe={nomeDe}
          podeEditar={aberta.criadoPor === usuarioId || ehOrientadora}
          onFechar={() => setAberta(null)}
          onEditar={() => {
            setForm({ reserva: aberta });
            setAberta(null);
          }}
        />
      )}

      {form && (
        <FormReserva
          inicial={form}
          reservas={reservas}
          usuarioId={usuarioId}
          pessoas={pessoas}
          projetos={projetos}
          meusTestes={meusTestes}
          onFechar={() => setForm(null)}
        />
      )}
    </div>
  );
}

function LinhaAgora() {
  const [min, setMin] = useState<number | null>(null);
  useEffect(() => {
    const atualizar = () => setMin(partesLocais(new Date().toISOString()).minutos);
    atualizar();
    const t = setInterval(atualizar, 60_000);
    return () => clearInterval(t);
  }, []);
  if (min === null || min < HORA_INICIO * 60 || min > HORA_FIM * 60) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 z-10 h-px bg-alerta"
      style={{ top: ((min - HORA_INICIO * 60) / 60) * PX_HORA }}
    >
      <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-alerta" />
    </div>
  );
}

function Modal({ titulo, onFechar, children }: { titulo: string; onFechar: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onFechar]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={titulo}>
      <button type="button" aria-label="Fechar" onClick={onFechar} className="anim-fade absolute inset-0 bg-ink/35" />
      <div className="anim-entrada relative max-h-[92vh] w-full overflow-y-auto rounded-t-xl bg-paper p-5 shadow-xl sm:max-w-lg sm:rounded-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="font-display text-xl text-ink">{titulo}</h2>
          <button type="button" onClick={onFechar} className="text-sm text-ink-soft hover:text-ink">
            Fechar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Detalhes({
  r,
  nomeDe,
  podeEditar,
  onFechar,
  onEditar,
}: {
  r: ReservaVista;
  nomeDe: Map<string, string>;
  podeEditar: boolean;
  onFechar: () => void;
  onEditar: () => void;
}) {
  const router = useRouter();
  const [pend, iniciar] = useTransition();
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const ini = partesLocais(r.inicio);
  const fim = partesLocais(r.fim);
  const sala = SALAS.find((s) => s.id === r.sala);

  return (
    <Modal titulo={rotuloReserva(r)} onFechar={onFechar}>
      <dl className="grid grid-cols-[7rem_1fr] gap-y-2 text-sm">
        <dt className="text-ink-soft">Quando</dt>
        <dd className="text-ink">
          {fmtDia(ini.data, { weekday: "long", day: "numeric", month: "long" })}, {ini.hora}–{fim.hora}
        </dd>
        <dt className="text-ink-soft">Sala</dt>
        <dd className="text-ink">
          {r.sala} · {sala?.local}
        </dd>
        <dt className="text-ink-soft">Atividade</dt>
        <dd className="text-ink">{TIPOS[r.tipo]}</dd>
        {r.testeNome && (
          <>
            <dt className="text-ink-soft">Teste</dt>
            <dd className="text-ink">{r.testeNome}</dd>
          </>
        )}
        {r.projetoNome && (
          <>
            <dt className="text-ink-soft">Projeto</dt>
            <dd className="text-ink">{r.projetoNome}</dd>
          </>
        )}
        <dt className="text-ink-soft">Quem vai</dt>
        <dd className="text-ink">{r.pessoas.map((p) => nomeDe.get(p) ?? "?").join(", ") || "—"}</dd>
        {r.observacao && (
          <>
            <dt className="text-ink-soft">Observação</dt>
            <dd className="whitespace-pre-line text-ink">{r.observacao}</dd>
          </>
        )}
      </dl>
      {r.projetoId && r.projetoTesteId && (
        <Link
          href={`/projetos/${r.projetoId}/testes/${r.projetoTesteId}`}
          className="mt-4 inline-block text-sm text-absorbance hover:underline"
        >
          Abrir o teste
        </Link>
      )}
      {erro && <p className="mt-3 text-sm text-alerta">{erro}</p>}
      {podeEditar && (
        <div className="mt-5 flex items-center gap-3 border-t border-rule pt-4">
          <button type="button" onClick={onEditar} className={BOTAO_SECUNDARIO_SM}>
            Editar
          </button>
          {confirmando ? (
            <span className="flex items-center gap-2 text-sm">
              Cancelar a reserva?
              <button
                type="button"
                disabled={pend}
                onClick={() =>
                  iniciar(async () => {
                    const res = await cancelarReserva(r.id);
                    if ("erro" in res) setErro(res.erro);
                    else {
                      onFechar();
                      router.refresh();
                    }
                  })
                }
                className="font-medium text-alerta hover:underline"
              >
                {pend ? "Cancelando..." : "Sim, cancelar"}
              </button>
              <button type="button" onClick={() => setConfirmando(false)} className="text-ink-soft hover:underline">
                Não
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmando(true)} className="ml-auto text-sm text-alerta hover:underline">
              Cancelar reserva
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}

function FormReserva({
  inicial,
  reservas,
  usuarioId,
  pessoas,
  projetos,
  meusTestes,
  onFechar,
}: {
  inicial: { reserva?: ReservaVista; data?: string; hora?: number; prefill?: Prefill };
  reservas: ReservaVista[];
  usuarioId: string;
  pessoas: Pessoa[];
  projetos: Projeto[];
  meusTestes: MeuTesteOpcao[];
  onFechar: () => void;
}) {
  const router = useRouter();
  const [pend, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const r = inicial.reserva;
  const p = inicial.prefill ?? null;

  const [sala, setSala] = useState<Sala>(() =>
    r && ehSala(r.sala) ? r.sala : p?.sala ?? "T-129"
  );
  const [tipo, setTipo] = useState<TipoReserva>(() => {
    const t = (r?.tipo ?? p?.tipo) as TipoReserva | undefined;
    return t && tiposDaSala(r && ehSala(r.sala) ? r.sala : p?.sala ?? "T-129").includes(t)
      ? t
      : tiposDaSala(r && ehSala(r.sala) ? r.sala : p?.sala ?? "T-129")[0];
  });
  const [data, setData] = useState(r ? partesLocais(r.inicio).data : inicial.data ?? "");
  const [horaInicio, setHoraInicio] = useState(
    r ? partesLocais(r.inicio).hora : `${String(inicial.hora ?? 8).padStart(2, "0")}:00`
  );
  const [horaFim, setHoraFim] = useState(
    r ? partesLocais(r.fim).hora : `${String((inicial.hora ?? 8) + 2).padStart(2, "0")}:00`
  );
  const [testeId, setTesteId] = useState(r?.projetoTesteId ?? p?.projetoTesteId ?? "");
  const [projetoId, setProjetoId] = useState(r?.projetoId ?? p?.projetoId ?? "");
  const [titulo, setTitulo] = useState(r?.titulo ?? "");
  const [observacao, setObservacao] = useState(r?.observacao ?? "");
  const [quem, setQuem] = useState<Set<string>>(() => new Set(r ? r.pessoas : [usuarioId]));
  const [busca, setBusca] = useState("");

  function trocarSala(s: Sala) {
    setSala(s);
    if (!tiposDaSala(s).includes(tipo)) setTipo(tiposDaSala(s)[0]);
  }

  // Choque de horário na mesma sala (aviso, não bloqueio).
  const choques = useMemo(() => {
    if (!data || horaFim <= horaInicio) return [];
    return reservas.filter((x) => {
      if (x.id === r?.id || x.sala !== sala) return false;
      const a = partesLocais(x.inicio);
      const b = partesLocais(x.fim);
      return a.data === data && a.hora < horaFim && b.hora > horaInicio;
    });
  }, [reservas, sala, data, horaInicio, horaFim, r?.id]);

  const fimAntes = horaFim <= horaInicio;
  const pessoasFiltradas = pessoas.filter((x) =>
    x.nome.toLowerCase().includes(busca.trim().toLowerCase())
  );

  function salvar() {
    setErro(null);
    const teste = meusTestes.find((t) => t.id === testeId);
    iniciar(async () => {
      const res = await salvarReserva({
        id: r?.id,
        sala,
        data,
        horaInicio,
        horaFim,
        tipo,
        titulo,
        observacao,
        projetoId: tipo === "teste" ? teste?.projetoId ?? null : projetoId || null,
        projetoTesteId: tipo === "teste" ? testeId || null : null,
        pessoas: Array.from(quem),
      });
      if ("erro" in res) setErro(res.erro);
      else {
        onFechar();
        router.refresh();
      }
    });
  }

  return (
    <Modal titulo={r ? "Editar reserva" : "Reservar sala"} onFechar={onFechar}>
      <div className="flex flex-col gap-4 text-sm">
        <fieldset>
          <legend className="mb-1.5 text-xs text-ink-soft">Sala</legend>
          <div className="grid grid-cols-3 gap-2">
            {SALAS.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={sala === s.id}
                onClick={() => trocarSala(s.id)}
                className={`rounded border px-2 py-2 text-left transition-colors ${
                  sala === s.id ? "border-ink bg-paper-raised" : "border-rule hover:border-ink-soft"
                }`}
              >
                <span className="flex items-center gap-1.5 font-medium text-ink">
                  <span className="h-2 w-2 rounded-sm" style={{ background: s.cor }} />
                  {s.nome}
                </span>
                <span className="mt-0.5 block text-xs leading-tight text-ink-soft">{s.local}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          {sala === "T-206" ? "Intervenção" : "Atividade"}
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoReserva)} className={INPUT_SM}>
            {tiposDaSala(sala).map((t) => (
              <option key={t} value={t}>
                {TIPOS[t]}
              </option>
            ))}
          </select>
        </label>

        {tipo === "teste" ? (
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Qual teste
            <select value={testeId} onChange={(e) => setTesteId(e.target.value)} className={INPUT_SM}>
              <option value="">— escolha um dos seus testes —</option>
              {meusTestes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} ({t.projetoNome})
                </option>
              ))}
            </select>
            {meusTestes.length === 0 && (
              <span className="text-ink-soft/80">Você não tem testes em aberto; descreva abaixo.</span>
            )}
          </label>
        ) : (
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Projeto {tipo === "outro" ? "(opcional)" : ""}
            <select value={projetoId} onChange={(e) => setProjetoId(e.target.value)} className={INPUT_SM}>
              <option value="">— nenhum —</option>
              {projetos.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.nome}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          {tipo === "outro" ? "O que vai ser feito" : "Detalhe (opcional)"}
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder={sala === "T-206" ? "Ex.: grupo DM, caixas 3 a 5" : "Ex.: leitura no Infinite"}
            className={INPUT_SM}
          />
        </label>

        <div className="grid grid-cols-3 gap-2">
          <label className="col-span-3 flex flex-col gap-1 text-xs text-ink-soft sm:col-span-1">
            Dia
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={INPUT_SM} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Das
            <input type="time" step={900} value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className={INPUT_SM} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Até
            <input type="time" step={900} value={horaFim} onChange={(e) => setHoraFim(e.target.value)} className={INPUT_SM} />
          </label>
        </div>
        {fimAntes && <p className="-mt-2 text-xs text-alerta">O fim tem que ser depois do início.</p>}
        {choques.length > 0 && (
          <div className="-mt-1 rounded border border-reagent/40 bg-reagent/[0.07] p-2.5 text-xs text-ink">
            A {sala} já tem {choques.length === 1 ? "uma reserva" : `${choques.length} reservas`} nesse horário:
            <ul className="mt-1 text-ink-soft">
              {choques.map((c) => (
                <li key={c.id}>
                  {partesLocais(c.inicio).hora}–{partesLocais(c.fim).hora} · {rotuloReserva(c)}
                </li>
              ))}
            </ul>
            Dá para reservar mesmo assim, se couber todo mundo.
          </div>
        )}

        <fieldset>
          <legend className="mb-1.5 text-xs text-ink-soft">
            Quem vai estar lá ({quem.size})
          </legend>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar pessoa"
            className={`${INPUT_SM} mb-2 w-full`}
          />
          <div className="max-h-40 overflow-y-auto rounded border border-rule">
            {pessoasFiltradas.map((x) => (
              <label key={x.id} className="flex cursor-pointer items-center gap-2 border-b border-rule/60 px-2.5 py-1.5 last:border-0 hover:bg-ink/[0.03]">
                <input
                  type="checkbox"
                  checked={quem.has(x.id)}
                  onChange={(e) =>
                    setQuem((prev) => {
                      const n = new Set(prev);
                      if (e.target.checked) n.add(x.id);
                      else n.delete(x.id);
                      return n;
                    })
                  }
                />
                <span className="text-ink">{x.nome}</span>
                {x.id === usuarioId && <span className="text-xs text-ink-soft">(você)</span>}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Observação (opcional)
          <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={2} className={INPUT_SM} />
        </label>

        {erro && <p className="text-sm text-alerta">{erro}</p>}
        <div className="flex items-center justify-end gap-3 border-t border-rule pt-4">
          <button type="button" onClick={onFechar} className="text-sm text-ink-soft hover:text-ink">
            Cancelar
          </button>
          <button
            type="button"
            onClick={salvar}
            disabled={pend || fimAntes || !data || quem.size === 0}
            className={BOTAO_PRIMARIO}
          >
            {pend ? "Salvando..." : r ? "Salvar" : "Reservar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
