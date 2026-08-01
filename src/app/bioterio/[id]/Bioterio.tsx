"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  criarCaixas,
  atualizarCaixa,
  removerCaixa,
  registrarMortesCaixa,
  reordenarCaixas,
  salvarProcedimento,
  removerProcedimento,
  salvarConfigTratamento,
} from "@/lib/actions/bioterio";
import {
  DOENCAS,
  VIAS,
  UNIDADES_DOSE,
  limiteCaixa,
  media,
  desvioPadrao,
  doseMlPorAnimal,
  diasRestantes,
  numeracaoCaixas,
  siglaVia,
  textoDose,
  type CaixaRow,
  type ProcedimentoRow,
  type ConfigRow,
} from "@/lib/bioterio";
import { INPUT_SM, BOTAO_SECUNDARIO_SM } from "@/lib/estilos";

type Grupo = { id: string; nome: string };

const int0 = (s: string) => {
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const num = (s: string): number | null => {
  const t = s.trim().replace(",", ".");
  if (t === "") return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
};
const fmt = (n: number | null, casas = 1) =>
  n == null ? "—" : n.toLocaleString("pt-BR", { maximumFractionDigits: casas });

type InfoCaixa = Map<string, { numero: string; grupo: string; pesoMedio: number | null; numRatos: number }>;

export default function Bioterio({
  projetoId,
  especie,
  numeroLevas,
  grupos,
  caixas,
  procedimentos,
  configs,
  podeEditar,
}: {
  projetoId: string;
  especie: string | null;
  numeroLevas: number;
  grupos: Grupo[];
  caixas: CaixaRow[];
  procedimentos: ProcedimentoRow[];
  configs: ConfigRow[];
  podeEditar: boolean;
}) {
  const nomeGrupo = useMemo(() => new Map(grupos.map((g) => [g.id, g.nome])), [grupos]);
  const limite = limiteCaixa(especie);
  const [leva, setLeva] = useState(1);
  const temLevas = numeroLevas > 1;

  // Caixas desta leva (na ordem), com numeração e info por caixa.
  const caixasLeva = caixas.filter((c) => (c.leva ?? 1) === leva);
  const numeros = numeracaoCaixas(caixasLeva);
  const idsLeva = new Set(caixasLeva.map((c) => c.id));
  const infoCaixa: InfoCaixa = new Map(
    caixasLeva.map((c, i) => [
      c.id,
      {
        numero: numeros[i],
        grupo: nomeGrupo.get(c.grupo_id) ?? "?",
        pesoMedio: media((c.pesos ?? []).map(Number)),
        numRatos: c.num_ratos,
      },
    ])
  );
  const procsLeva = procedimentos.filter((p) =>
    (p.caixa_ids ?? []).some((id) => idsLeva.has(id))
  );
  const config = configs.find((c) => c.leva === leva) ?? null;

  return (
    <div className="mt-8 flex flex-col gap-12">
      {temLevas && (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: numeroLevas }, (_, i) => i + 1).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLeva(l)}
              className={`rounded-full px-3 py-1 font-mono text-xs uppercase tracking-wide transition-colors ${
                l === leva
                  ? "bg-signal text-paper"
                  : "border border-rule text-ink-soft hover:border-signal hover:text-signal"
              }`}
            >
              Leva {l}
            </button>
          ))}
        </div>
      )}

      {caixasLeva.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded border border-signal/40 bg-signal/5 px-4 py-3">
          <span className="text-sm text-ink">
            {caixasLeva.length} caixa(s){temLevas ? ` na leva ${leva}` : ""}.
          </span>
          <Link
            href={`/bioterio/${projetoId}/etiquetas${temLevas ? `?leva=${leva}` : ""}`}
            target="_blank"
            className="ml-auto rounded border border-signal px-3 py-1.5 text-sm text-signal transition-colors hover:bg-signal hover:text-paper"
          >
            Gerar etiquetas (PDF) ↗
          </Link>
        </div>
      )}

      <CaixasSection
        key={`caixas-${leva}`}
        projetoId={projetoId}
        leva={leva}
        grupos={grupos}
        caixas={caixasLeva}
        numeros={numeros}
        nomeGrupo={nomeGrupo}
        limite={limite}
        especie={especie}
        podeEditar={podeEditar}
      />

      {caixasLeva.length > 0 && (
        <>
          <CronogramaTratamento
            key={`crono-${leva}`}
            projetoId={projetoId}
            leva={leva}
            config={config}
            podeEditar={podeEditar}
          />
          <ProcedimentosSection
            projetoId={projetoId}
            caixas={caixasLeva}
            infoCaixa={infoCaixa}
            procedimentos={procsLeva}
            config={config}
            podeEditar={podeEditar}
          />
        </>
      )}
    </div>
  );
}

/* ── Cronograma de tratamento (único por leva) ── */
function CronogramaTratamento({
  projetoId,
  leva,
  config,
  podeEditar,
}: {
  projetoId: string;
  leva: number;
  config: ConfigRow | null;
  podeEditar: boolean;
}) {
  const router = useRouter();
  const [pend, iniciar] = useTransition();
  const [inicio, setInicio] = useState(config?.tratamento_inicio ?? "");
  const [dias, setDias] = useState(config?.tratamento_dias != null ? String(config.tratamento_dias) : "");
  const [msg, setMsg] = useState<string | null>(null);

  const rest = diasRestantes(config?.tratamento_inicio ?? null, config?.tratamento_dias ?? null);

  function salvar() {
    setMsg(null);
    iniciar(async () => {
      const r = await salvarConfigTratamento({
        projetoId,
        leva,
        inicio: inicio || null,
        dias: int0(dias) || null,
      });
      setMsg("erro" in r ? r.erro : "Cronograma salvo.");
      if (!("erro" in r)) router.refresh();
    });
  }

  return (
    <section>
      <p className="mb-1 font-mono text-xs uppercase tracking-[0.12em] text-signal">
        Cronograma do tratamento
      </p>
      <p className="mb-3 max-w-2xl text-xs leading-relaxed text-ink-soft">
        O tratamento de todas as caixas começa no mesmo dia e dura o mesmo tanto —
        defina uma vez aqui.
        {rest != null && (
          <span className="text-ink"> Faltam {rest === 0 ? "0 dias (concluído)" : `${rest} dia(s)`}.</span>
        )}
      </p>
      {podeEditar ? (
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Início
            <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className={INPUT_SM} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Duração (dias)
            <input inputMode="numeric" value={dias} onChange={(e) => setDias(e.target.value)} placeholder="Ex.: 15" className={`${INPUT_SM} w-20`} />
          </label>
          <button type="button" onClick={salvar} disabled={pend} className={BOTAO_SECUNDARIO_SM}>
            {pend ? "Salvando..." : "Salvar"}
          </button>
          {msg && <span className={`text-xs ${msg === "Cronograma salvo." ? "text-ink-soft" : "text-alerta"}`}>{msg}</span>}
        </div>
      ) : (
        <p className="text-sm text-ink">
          {config?.tratamento_inicio ? `Início ${config.tratamento_inicio}` : "Início não definido"}
          {config?.tratamento_dias ? ` · ${config.tratamento_dias} dias` : ""}
        </p>
      )}
    </section>
  );
}

/* ─────────────────────────── Caixas ─────────────────────────── */

function CaixasSection({
  projetoId,
  leva,
  grupos,
  caixas,
  numeros,
  nomeGrupo,
  limite,
  especie,
  podeEditar,
}: {
  projetoId: string;
  leva: number;
  grupos: Grupo[];
  caixas: CaixaRow[];
  numeros: string[];
  nomeGrupo: Map<string, string>;
  limite: number;
  especie: string | null;
  podeEditar: boolean;
}) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [ordem, setOrdem] = useState<CaixaRow[]>(caixas);
  const arrastando = useRef<number | null>(null);

  const idsProps = caixas.map((c) => c.id).join(",");
  const [idsVistos, setIdsVistos] = useState(idsProps);
  if (idsProps !== idsVistos) {
    setIdsVistos(idsProps);
    setOrdem(caixas);
  }

  function soltar(destino: number) {
    const origem = arrastando.current;
    arrastando.current = null;
    if (origem == null || origem === destino) return;
    const nova = [...ordem];
    const [item] = nova.splice(origem, 1);
    nova.splice(destino, 0, item);
    setOrdem(nova);
    iniciar(async () => {
      await reordenarCaixas({ projetoId, idsOrdenados: nova.map((c) => c.id) });
      router.refresh();
    });
  }

  const numerosLocais = numeracaoCaixas(ordem);

  return (
    <section>
      <p className="mb-1 font-mono text-xs uppercase tracking-[0.12em] text-signal">
        Caixas dos animais
      </p>
      <p className="mb-3 max-w-2xl text-xs leading-relaxed text-ink-soft">
        Cada caixa tem um grupo e um número de animais. Caixas do mesmo grupo em
        sequência são numeradas 3, 3.1, 3.2… Arraste para reordenar. Registre o
        peso de cada rato para calcular a média (usada nas doses). Limite: {limite}{" "}
        {especie === "camundongo" ? "camundongos" : "ratos"} por caixa.
      </p>

      {ordem.length > 0 && (
        <div className="mb-4 flex flex-col gap-2">
          {ordem.map((c, i) => (
            <CaixaItem
              key={c.id}
              projetoId={projetoId}
              caixa={c}
              numero={numerosLocais[i] ?? String(numeros[i] ?? i + 1)}
              grupos={grupos}
              nomeGrupo={nomeGrupo}
              limite={limite}
              podeEditar={podeEditar}
              onDragStart={() => (arrastando.current = i)}
              onDrop={() => soltar(i)}
            />
          ))}
        </div>
      )}

      {podeEditar && grupos.length > 0 && (
        <CriarCaixas projetoId={projetoId} leva={leva} grupos={grupos} limite={limite} />
      )}
      {grupos.length === 0 && (
        <p className="text-sm text-ink-soft">
          Este projeto ainda não tem grupos experimentais definidos.
        </p>
      )}
    </section>
  );
}

function CaixaItem({
  projetoId,
  caixa,
  numero,
  grupos,
  nomeGrupo,
  limite,
  podeEditar,
  onDragStart,
  onDrop,
}: {
  projetoId: string;
  caixa: CaixaRow;
  numero: string;
  grupos: Grupo[];
  nomeGrupo: Map<string, string>;
  limite: number;
  podeEditar: boolean;
  onDragStart: () => void;
  onDrop: () => void;
}) {
  const router = useRouter();
  const [pend, iniciar] = useTransition();
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [grupoId, setGrupoId] = useState(caixa.grupo_id);
  const [numRatos, setNumRatos] = useState(String(caixa.num_ratos));
  const [pesos, setPesos] = useState<string[]>(() => {
    const base = (caixa.pesos ?? []).map((p) => String(p));
    while (base.length < caixa.num_ratos) base.push("");
    return base;
  });
  const [mortos, setMortos] = useState(String(caixa.mortos));

  const pesosNum = pesos.map((s) => num(s)).filter((n): n is number => n != null);
  const m = media(pesosNum);
  const dp = desvioPadrao(pesosNum);
  const acima = int0(numRatos) > limite;

  function ajustarQtd(v: string) {
    setNumRatos(v);
    const q = int0(v);
    setPesos((prev) => {
      const nova = [...prev];
      while (nova.length < q) nova.push("");
      nova.length = q;
      return nova;
    });
  }
  function salvar() {
    setErro(null);
    iniciar(async () => {
      const r = await atualizarCaixa({
        projetoId,
        id: caixa.id,
        grupoId,
        numRatos: int0(numRatos),
        pesos: pesosNum,
      });
      if ("erro" in r) setErro(r.erro);
      else {
        setEditando(false);
        router.refresh();
      }
    });
  }
  function remover() {
    iniciar(async () => {
      const r = await removerCaixa({ projetoId, id: caixa.id });
      if ("erro" in r) setErro(r.erro);
      else router.refresh();
    });
  }
  function salvarMortos(v: string) {
    setMortos(v);
    iniciar(async () => {
      await registrarMortesCaixa({ projetoId, id: caixa.id, mortos: int0(v) });
      router.refresh();
    });
  }

  if (!editando) {
    return (
      <div
        draggable={podeEditar}
        onDragStart={onDragStart}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded border border-rule bg-paper-raised px-3 py-2 text-sm"
      >
        {podeEditar && (
          <span className="cursor-grab select-none text-ink-soft" title="arraste para reordenar">⠿</span>
        )}
        <span className="font-mono text-ink">Caixa {numero}</span>
        <span className="text-ink">{nomeGrupo.get(caixa.grupo_id) ?? "?"}</span>
        <span className="font-mono text-ink-soft">{caixa.num_ratos} animais</span>
        {m != null && (
          <span className="font-mono text-xs text-ink-soft">· {fmt(m)}{dp != null ? ` ± ${fmt(dp)}` : ""} g</span>
        )}
        {caixa.mortos > 0 && (
          <span className="rounded-full bg-alerta/12 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-alerta">
            {caixa.mortos} morto(s)
          </span>
        )}
        {podeEditar && (
          <span className="ml-auto flex items-center gap-3">
            <label className="flex items-center gap-1 text-xs text-ink-soft">
              mortos
              <input inputMode="numeric" value={mortos} onChange={(e) => salvarMortos(e.target.value)} className={`${INPUT_SM} w-12`} />
            </label>
            <button type="button" onClick={() => setEditando(true)} className="text-xs text-signal underline-offset-2 hover:underline">
              editar / pesos
            </button>
          </span>
        )}
        {erro && <p className="w-full text-xs text-alerta">{erro}</p>}
      </div>
    );
  }

  return (
    <div className="rounded border border-signal/40 bg-paper-raised px-3 py-2">
      <p className="mb-2 font-mono text-sm text-ink">Caixa {numero}</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Grupo
          <select value={grupoId} onChange={(e) => setGrupoId(e.target.value)} className={INPUT_SM}>
            {grupos.map((g) => (<option key={g.id} value={g.id}>{g.nome}</option>))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Nº de animais
          <input inputMode="numeric" value={numRatos} onChange={(e) => ajustarQtd(e.target.value)} className={`${INPUT_SM} w-20`} />
        </label>
      </div>
      {acima && <p className="mt-1 text-xs text-alerta">Acima do limite ({limite}/caixa).</p>}
      <div className="mt-3">
        <p className="mb-1 font-mono text-[11px] uppercase tracking-wide text-ink-soft">Peso de cada rato (g)</p>
        <div className="flex flex-wrap gap-2">
          {pesos.map((p, i) => (
            <input key={i} inputMode="decimal" value={p} onChange={(e) => setPesos((prev) => prev.map((x, idx) => (idx === i ? e.target.value : x)))} placeholder={`#${i + 1}`} className={`${INPUT_SM} w-16`} />
          ))}
        </div>
        <p className="mt-1.5 font-mono text-xs text-ink">
          Média: {fmt(m)} g{dp != null ? ` · DP: ${fmt(dp)} g` : ""}{m != null ? ` (n=${pesosNum.length})` : ""}
        </p>
      </div>
      {erro && <p className="mt-1 text-sm text-alerta">{erro}</p>}
      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={salvar} disabled={pend} className={BOTAO_SECUNDARIO_SM}>{pend ? "Salvando..." : "Salvar"}</button>
        <button type="button" onClick={() => setEditando(false)} className="text-xs text-ink-soft hover:underline">cancelar</button>
        <button type="button" onClick={remover} disabled={pend} className="ml-auto text-xs text-alerta hover:underline">remover</button>
      </div>
    </div>
  );
}

function CriarCaixas({
  projetoId,
  leva,
  grupos,
  limite,
}: {
  projetoId: string;
  leva: number;
  grupos: Grupo[];
  limite: number;
}) {
  const router = useRouter();
  const [pend, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [linhas, setLinhas] = useState<{ grupoId: string; num: string }[]>([
    { grupoId: grupos[0]?.id ?? "", num: "" },
  ]);

  function set(i: number, patch: Partial<{ grupoId: string; num: string }>) {
    setLinhas((p) => p.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function criar() {
    setErro(null);
    const caixas = linhas
      .map((l) => ({ grupoId: l.grupoId, numRatos: int0(l.num) }))
      .filter((c) => c.grupoId && c.numRatos > 0);
    if (caixas.length === 0) {
      setErro("Informe grupo e nº de animais.");
      return;
    }
    iniciar(async () => {
      const r = await criarCaixas({ projetoId, leva, caixas });
      if ("erro" in r) setErro(r.erro);
      else {
        setLinhas([{ grupoId: grupos[0]?.id ?? "", num: "" }]);
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded border border-rule bg-paper-raised p-4">
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">Adicionar caixas</p>
      <div className="flex flex-col gap-2">
        {linhas.map((l, i) => {
          const acima = int0(l.num) > limite;
          return (
            <div key={i} className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-xs text-ink-soft">
                Grupo
                <select value={l.grupoId} onChange={(e) => set(i, { grupoId: e.target.value })} className={INPUT_SM}>
                  {grupos.map((g) => (<option key={g.id} value={g.id}>{g.nome}</option>))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-ink-soft">
                Nº de animais
                <input inputMode="numeric" value={l.num} onChange={(e) => set(i, { num: e.target.value })} className={`${INPUT_SM} w-20`} />
              </label>
              {acima && <span className="pb-1.5 text-xs text-alerta">acima de {limite}</span>}
              {linhas.length > 1 && (
                <button type="button" onClick={() => setLinhas((p) => p.filter((_, idx) => idx !== i))} className="pb-1.5 text-ink-soft hover:text-alerta">✕</button>
              )}
            </div>
          );
        })}
      </div>
      {erro && <p className="mt-2 text-sm text-alerta">{erro}</p>}
      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={() => setLinhas((p) => [...p, { grupoId: grupos[0]?.id ?? "", num: "" }])} className="text-xs text-signal hover:underline">+ outra caixa</button>
        <button type="button" onClick={criar} disabled={pend} className={`ml-auto ${BOTAO_SECUNDARIO_SM}`}>{pend ? "Criando..." : "Criar caixas"}</button>
      </div>
    </div>
  );
}

/* ─────────────────────── Procedimentos ─────────────────────── */

function ProcedimentosSection({
  projetoId,
  caixas,
  infoCaixa,
  procedimentos,
  config,
  podeEditar,
}: {
  projetoId: string;
  caixas: CaixaRow[];
  infoCaixa: InfoCaixa;
  procedimentos: ProcedimentoRow[];
  config: ConfigRow | null;
  podeEditar: boolean;
}) {
  const [criando, setCriando] = useState(false);
  return (
    <section>
      <p className="mb-1 font-mono text-xs uppercase tracking-[0.12em] text-signal">Procedimentos</p>
      <p className="mb-3 max-w-2xl text-xs leading-relaxed text-ink-soft">
        Cadastre uma indução ou um tratamento com a substância e a dose, e marque
        quais caixas o recebem — o volume em mL sai automático do peso médio de
        cada caixa. Caixas com doença têm indução; controle, não.
      </p>

      <div className="flex flex-col gap-3">
        {procedimentos.map((p) => (
          <ProcedimentoItem key={p.id} projetoId={projetoId} proc={p} infoCaixa={infoCaixa} caixas={caixas} config={config} podeEditar={podeEditar} />
        ))}
      </div>

      {podeEditar &&
        (criando ? (
          <div className="mt-3">
            <ProcedimentoForm projetoId={projetoId} caixas={caixas} infoCaixa={infoCaixa} aoFechar={() => setCriando(false)} />
          </div>
        ) : (
          <button type="button" onClick={() => setCriando(true)} className={`mt-3 ${BOTAO_SECUNDARIO_SM}`}>+ Adicionar procedimento</button>
        ))}
    </section>
  );
}

function ProcedimentoItem({
  projetoId,
  proc,
  infoCaixa,
  caixas,
  config,
  podeEditar,
}: {
  projetoId: string;
  proc: ProcedimentoRow;
  infoCaixa: InfoCaixa;
  caixas: CaixaRow[];
  config: ConfigRow | null;
  podeEditar: boolean;
}) {
  const router = useRouter();
  const [pend, iniciar] = useTransition();
  const [editando, setEditando] = useState(false);

  if (editando) {
    return <ProcedimentoForm projetoId={projetoId} caixas={caixas} infoCaixa={infoCaixa} inicial={proc} aoFechar={() => setEditando(false)} />;
  }

  const ids = proc.caixa_ids ?? [];
  const ehTrat = proc.tipo === "tratamento";
  return (
    <div className="rounded border border-rule bg-paper-raised p-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="rounded-full bg-signal/12 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-signal">
          {ehTrat ? "Tratamento" : "Indução"}
        </span>
        <span className="font-medium text-ink">{proc.substancia ?? "—"}</span>
        {proc.dose_valor != null && (
          <span className="font-mono text-xs text-ink-soft">
            {textoDose(proc.dose_valor, proc.dose_unidade)}
            {proc.dose_unidade === "mg/kg" && proc.concentracao ? ` · ${fmt(proc.concentracao, 2)} mg/mL` : ""}
          </span>
        )}
        {proc.via && <span className="text-xs text-ink-soft">via {siglaVia(proc.via)}</span>}
        {ehTrat && config?.tratamento_dias && (
          <span className="text-xs text-ink-soft">· {config.tratamento_dias} dias</span>
        )}
        {podeEditar && (
          <span className="ml-auto flex gap-3">
            <button type="button" onClick={() => setEditando(true)} className="text-xs text-signal hover:underline">editar</button>
            <button type="button" disabled={pend} onClick={() => iniciar(async () => { await removerProcedimento({ projetoId, id: proc.id }); router.refresh(); })} className="text-xs text-alerta hover:underline">remover</button>
          </span>
        )}
      </div>
      <div className="mt-2 overflow-x-auto">
        <table className="text-xs">
          <tbody>
            {ids.map((cid) => {
              const info = infoCaixa.get(cid);
              if (!info) return null;
              const mlAnimal = doseMlPorAnimal(info.pesoMedio, proc.dose_valor, proc.dose_unidade, proc.concentracao);
              const total = mlAnimal != null ? mlAnimal * info.numRatos : null;
              return (
                <tr key={cid} className="text-ink-soft">
                  <td className="py-0.5 pr-3 font-mono text-ink">Caixa {info.numero}</td>
                  <td className="py-0.5 pr-3">{info.grupo}</td>
                  <td className="py-0.5 pr-3 font-mono">peso méd. {fmt(info.pesoMedio)} g</td>
                  <td className="py-0.5 font-mono text-ink">
                    {mlAnimal != null ? `${fmt(mlAnimal, 3)} mL/animal · ${fmt(total, 2)} mL total` : "informe o peso"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProcedimentoForm({
  projetoId,
  caixas,
  infoCaixa,
  inicial,
  aoFechar,
}: {
  projetoId: string;
  caixas: CaixaRow[];
  infoCaixa: InfoCaixa;
  inicial?: ProcedimentoRow;
  aoFechar: () => void;
}) {
  const router = useRouter();
  const [pend, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const [tipo, setTipo] = useState<"inducao" | "tratamento">(inicial?.tipo ?? "inducao");
  const [doenca, setDoenca] = useState(inicial?.doenca ?? "");
  const [substancia, setSubstancia] = useState(inicial?.substancia ?? "");
  const [doseValor, setDoseValor] = useState(inicial?.dose_valor != null ? String(inicial.dose_valor) : "");
  const [doseUnidade, setDoseUnidade] = useState(inicial?.dose_unidade ?? "mg/kg");
  const [concentracao, setConcentracao] = useState(inicial?.concentracao != null ? String(inicial.concentracao) : "");
  const [via, setVia] = useState(inicial?.via ?? (inicial?.tipo === "tratamento" ? "gavagem" : "ip"));
  const [sel, setSel] = useState<Set<string>>(new Set(inicial?.caixa_ids ?? []));

  const uni = UNIDADES_DOSE.find((u) => u.valor === doseUnidade);

  function toggle(id: string) {
    setSel((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function salvar() {
    setErro(null);
    iniciar(async () => {
      const r = await salvarProcedimento({
        projetoId,
        id: inicial?.id,
        tipo,
        doenca: tipo === "inducao" ? doenca || null : null,
        substancia: substancia || null,
        doseValor: num(doseValor),
        doseUnidade,
        concentracao: uni?.usaConcentracao ? num(concentracao) : null,
        via: via || null,
        caixaIds: Array.from(sel).filter((id) => infoCaixa.has(id)),
      });
      if ("erro" in r) {
        setErro(r.erro);
        return;
      }
      aoFechar();
      router.refresh();
    });
  }

  return (
    <div className="rounded border border-signal/40 bg-paper-raised p-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Tipo
            <select value={tipo} onChange={(e) => setTipo(e.target.value as "inducao" | "tratamento")} className={INPUT_SM}>
              <option value="inducao">Indução</option>
              <option value="tratamento">Tratamento</option>
            </select>
          </label>
          {tipo === "inducao" && (
            <label className="flex flex-col gap-1 text-xs text-ink-soft">
              Doença
              <select value={doenca} onChange={(e) => setDoenca(e.target.value)} className={INPUT_SM}>
                <option value="">—</option>
                {DOENCAS.map((d) => (<option key={d.valor} value={d.valor}>{d.rotulo}</option>))}
              </select>
            </label>
          )}
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Via
            <select value={via} onChange={(e) => setVia(e.target.value)} className={INPUT_SM}>
              {VIAS.map((v) => (<option key={v.valor} value={v.valor}>{v.rotulo}</option>))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Substância
          <input value={substancia} onChange={(e) => setSubstancia(e.target.value)} placeholder={tipo === "inducao" ? "Ex.: aloxana (2% em citrato 0,05 M, pH 4,5)" : "Ex.: extrato hidroalcoólico (EBH) / água"} className={`${INPUT_SM} w-full max-w-lg`} />
        </label>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Dose
            <input inputMode="decimal" value={doseValor} onChange={(e) => setDoseValor(e.target.value)} placeholder="Ex.: 150" className={`${INPUT_SM} w-24`} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Unidade
            <select value={doseUnidade} onChange={(e) => setDoseUnidade(e.target.value)} className={INPUT_SM}>
              {UNIDADES_DOSE.map((u) => (<option key={u.valor} value={u.valor}>{u.rotulo}</option>))}
            </select>
          </label>
          {uni?.usaConcentracao && (
            <label className="flex flex-col gap-1 text-xs text-ink-soft">
              Concentração (mg/mL)
              <input inputMode="decimal" value={concentracao} onChange={(e) => setConcentracao(e.target.value)} placeholder="Ex.: 20" className={`${INPUT_SM} w-28`} />
            </label>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-ink">Caixas que recebem</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {caixas.map((c) => {
              const info = infoCaixa.get(c.id);
              return (
                <label key={c.id} className="flex items-center gap-1.5 text-sm text-ink">
                  <input type="checkbox" checked={sel.has(c.id)} onChange={() => toggle(c.id)} />
                  Caixa {info?.numero} ({info?.grupo})
                </label>
              );
            })}
          </div>
        </div>

        {erro && <p className="text-sm text-alerta">{erro}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={salvar} disabled={pend} className={BOTAO_SECUNDARIO_SM}>{pend ? "Salvando..." : "Salvar procedimento"}</button>
          <button type="button" onClick={aoFechar} className="text-xs text-ink-soft hover:underline">cancelar</button>
        </div>
      </div>
    </div>
  );
}
