"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  criarCaixas,
  atualizarCaixa,
  removerCaixa,
  registrarMortesCaixa,
  salvarTratamento,
} from "@/lib/actions/bioterio";
import {
  DOENCAS,
  VIAS,
  limiteCaixa,
  doseMlPorAnimal,
  diasRestantes,
  rotuloDoenca,
  siglaVia,
  type CaixaRow,
  type TratamentoRow,
} from "@/lib/bioterio";
import { INPUT_SM, BOTAO_SECUNDARIO_SM } from "@/lib/estilos";

type Grupo = { id: string; nome: string };

function parseInt0(s: string): number {
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
function parseNum(s: string): number | null {
  const t = s.trim().replace(",", ".");
  if (t === "") return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

export default function Bioterio({
  projetoId,
  especie,
  grupos,
  caixas,
  tratamentos,
  podeEditar,
}: {
  projetoId: string;
  especie: string | null;
  grupos: Grupo[];
  caixas: CaixaRow[];
  tratamentos: TratamentoRow[];
  podeEditar: boolean;
}) {
  const nomeGrupo = useMemo(
    () => new Map(grupos.map((g) => [g.id, g.nome])),
    [grupos]
  );
  const limite = limiteCaixa(especie);
  const tratPorGrupo = new Map(tratamentos.map((t) => [t.grupo_id, t]));
  // Grupos que já têm caixas — são os que precisam de tratamento.
  const gruposComCaixa = grupos.filter((g) =>
    caixas.some((c) => c.grupo_id === g.id)
  );

  return (
    <div className="mt-8 flex flex-col gap-12">
      {caixas.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded border border-signal/40 bg-signal/5 px-4 py-3">
          <span className="text-sm text-ink">
            {caixas.length} caixa(s) criada(s).
          </span>
          <Link
            href={`/bioterio/${projetoId}/etiquetas`}
            target="_blank"
            className="ml-auto rounded border border-signal px-3 py-1.5 text-sm text-signal transition-colors hover:bg-signal hover:text-paper"
          >
            Gerar etiquetas (PDF) ↗
          </Link>
        </div>
      )}

      {/* ── Caixas ── */}
      <section>
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.12em] text-signal">
          Caixas dos animais
        </p>
        <p className="mb-3 max-w-2xl text-xs leading-relaxed text-ink-soft">
          Cada caixa recebe um grupo e um número de animais. Um mesmo grupo pode
          ocupar várias caixas. Limite recomendado: {limite}{" "}
          {especie === "camundongo" ? "camundongos" : "ratos"} por caixa.
        </p>

        <CaixasExistentes
          projetoId={projetoId}
          caixas={caixas}
          grupos={grupos}
          nomeGrupo={nomeGrupo}
          limite={limite}
          podeEditar={podeEditar}
        />

        {podeEditar && grupos.length > 0 && (
          <CriarCaixas projetoId={projetoId} grupos={grupos} limite={limite} />
        )}
        {grupos.length === 0 && (
          <p className="text-sm text-ink-soft">
            Este projeto ainda não tem grupos experimentais definidos.
          </p>
        )}
      </section>

      {/* ── Tratamentos por grupo ── */}
      {gruposComCaixa.length > 0 && (
        <section>
          <p className="mb-1 font-mono text-xs uppercase tracking-[0.12em] text-signal">
            Tratamentos por grupo
          </p>
          <p className="mb-3 max-w-2xl text-xs leading-relaxed text-ink-soft">
            Defina a indução (opcional) e o tratamento de cada grupo. Vale para
            todas as caixas do grupo e vai para as etiquetas.
          </p>
          <div className="flex flex-col gap-4">
            {gruposComCaixa.map((g) => (
              <TratamentoGrupo
                key={g.id}
                projetoId={projetoId}
                grupo={g}
                inicial={tratPorGrupo.get(g.id) ?? null}
                podeEditar={podeEditar}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CaixasExistentes({
  projetoId,
  caixas,
  grupos,
  nomeGrupo,
  limite,
  podeEditar,
}: {
  projetoId: string;
  caixas: CaixaRow[];
  grupos: Grupo[];
  nomeGrupo: Map<string, string>;
  limite: number;
  podeEditar: boolean;
}) {
  if (caixas.length === 0) {
    return (
      <p className="mb-4 text-sm text-ink-soft">
        Nenhuma caixa criada ainda.
      </p>
    );
  }
  return (
    <div className="mb-4 flex flex-col gap-2">
      {caixas.map((c) => (
        <CaixaLinha
          key={c.id}
          projetoId={projetoId}
          caixa={c}
          grupos={grupos}
          nomeGrupo={nomeGrupo}
          limite={limite}
          podeEditar={podeEditar}
        />
      ))}
    </div>
  );
}

function CaixaLinha({
  projetoId,
  caixa,
  grupos,
  nomeGrupo,
  limite,
  podeEditar,
}: {
  projetoId: string;
  caixa: CaixaRow;
  grupos: Grupo[];
  nomeGrupo: Map<string, string>;
  limite: number;
  podeEditar: boolean;
}) {
  const router = useRouter();
  const [pend, iniciar] = useTransition();
  const [editando, setEditando] = useState(false);
  const [grupoId, setGrupoId] = useState(caixa.grupo_id);
  const [numRatos, setNumRatos] = useState(String(caixa.num_ratos));
  const [peso, setPeso] = useState(caixa.peso_medio_g != null ? String(caixa.peso_medio_g) : "");
  const [mortos, setMortos] = useState(String(caixa.mortos));
  const [erro, setErro] = useState<string | null>(null);

  const acima = parseInt0(numRatos) > limite;

  function salvar() {
    setErro(null);
    iniciar(async () => {
      const r = await atualizarCaixa({
        projetoId,
        id: caixa.id,
        grupoId,
        numRatos: parseInt0(numRatos),
        pesoMedioG: parseNum(peso),
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
      await registrarMortesCaixa({ projetoId, id: caixa.id, mortos: parseInt0(v) });
      router.refresh();
    });
  }

  if (!editando) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded border border-rule bg-paper-raised px-3 py-2 text-sm">
        <span className="font-mono text-ink">Caixa {caixa.numero}</span>
        <span className="text-ink">{nomeGrupo.get(caixa.grupo_id) ?? "?"}</span>
        <span className="font-mono text-ink-soft">{caixa.num_ratos} animais</span>
        {caixa.peso_medio_g != null && (
          <span className="font-mono text-xs text-ink-soft">· {caixa.peso_medio_g} g méd.</span>
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
              <input
                inputMode="numeric"
                value={mortos}
                onChange={(e) => salvarMortos(e.target.value)}
                className={`${INPUT_SM} w-12`}
              />
            </label>
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="text-xs text-signal underline-offset-2 hover:underline"
            >
              editar
            </button>
          </span>
        )}
        {erro && <p className="w-full text-xs text-alerta">{erro}</p>}
      </div>
    );
  }

  return (
    <div className="rounded border border-signal/40 bg-paper-raised px-3 py-2">
      <p className="mb-2 font-mono text-sm text-ink">Caixa {caixa.numero}</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Grupo
          <select value={grupoId} onChange={(e) => setGrupoId(e.target.value)} className={INPUT_SM}>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>{g.nome}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Nº de animais
          <input inputMode="numeric" value={numRatos} onChange={(e) => setNumRatos(e.target.value)} className={`${INPUT_SM} w-20`} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Peso médio (g)
          <input inputMode="decimal" value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="opcional" className={`${INPUT_SM} w-24`} />
        </label>
      </div>
      {acima && (
        <p className="mt-1 text-xs text-alerta">
          Acima do limite recomendado ({limite}/caixa).
        </p>
      )}
      {erro && <p className="mt-1 text-sm text-alerta">{erro}</p>}
      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={salvar} disabled={pend} className={BOTAO_SECUNDARIO_SM}>
          {pend ? "Salvando..." : "Salvar"}
        </button>
        <button type="button" onClick={() => setEditando(false)} className="text-xs text-ink-soft hover:underline">
          cancelar
        </button>
        <button type="button" onClick={remover} disabled={pend} className="ml-auto text-xs text-alerta hover:underline">
          remover
        </button>
      </div>
    </div>
  );
}

function CriarCaixas({
  projetoId,
  grupos,
  limite,
}: {
  projetoId: string;
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
      .map((l) => ({ grupoId: l.grupoId, numRatos: parseInt0(l.num) }))
      .filter((c) => c.grupoId && c.numRatos > 0);
    if (caixas.length === 0) {
      setErro("Adicione ao menos uma caixa com grupo e nº de animais.");
      return;
    }
    iniciar(async () => {
      const r = await criarCaixas({ projetoId, caixas });
      if ("erro" in r) setErro(r.erro);
      else {
        setLinhas([{ grupoId: grupos[0]?.id ?? "", num: "" }]);
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded border border-rule bg-paper-raised p-4">
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
        Adicionar caixas
      </p>
      <div className="flex flex-col gap-2">
        {linhas.map((l, i) => {
          const acima = parseInt0(l.num) > limite;
          return (
            <div key={i} className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-xs text-ink-soft">
                Grupo
                <select value={l.grupoId} onChange={(e) => set(i, { grupoId: e.target.value })} className={INPUT_SM}>
                  {grupos.map((g) => (
                    <option key={g.id} value={g.id}>{g.nome}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-ink-soft">
                Nº de animais
                <input inputMode="numeric" value={l.num} onChange={(e) => set(i, { num: e.target.value })} className={`${INPUT_SM} w-20`} />
              </label>
              {acima && <span className="pb-1.5 text-xs text-alerta">acima de {limite}/caixa</span>}
              {linhas.length > 1 && (
                <button type="button" onClick={() => setLinhas((p) => p.filter((_, idx) => idx !== i))} className="pb-1.5 text-ink-soft hover:text-alerta" aria-label="Remover linha">✕</button>
              )}
            </div>
          );
        })}
      </div>
      {erro && <p className="mt-2 text-sm text-alerta">{erro}</p>}
      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={() => setLinhas((p) => [...p, { grupoId: grupos[0]?.id ?? "", num: "" }])} className="text-xs text-signal hover:underline">
          + outra caixa
        </button>
        <button type="button" onClick={criar} disabled={pend} className={`ml-auto ${BOTAO_SECUNDARIO_SM}`}>
          {pend ? "Criando..." : "Criar caixas"}
        </button>
      </div>
    </div>
  );
}

function TratamentoGrupo({
  projetoId,
  grupo,
  inicial,
  podeEditar,
}: {
  projetoId: string;
  grupo: Grupo;
  inicial: TratamentoRow | null;
  podeEditar: boolean;
}) {
  const router = useRouter();
  const [pend, iniciar] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const [indAtiva, setIndAtiva] = useState(inicial?.inducao_ativa ?? false);
  const [indDoenca, setIndDoenca] = useState(inicial?.inducao_doenca ?? "");
  const [indSub, setIndSub] = useState(inicial?.inducao_substancia ?? "");
  const [indVia, setIndVia] = useState(inicial?.inducao_via ?? "ip");
  const [indDose, setIndDose] = useState(inicial?.inducao_dose ?? "");

  const [trAtiva, setTrAtiva] = useState(inicial?.tratamento_ativa ?? false);
  const [trSub, setTrSub] = useState(inicial?.tratamento_substancia ?? "");
  const [trVia, setTrVia] = useState(inicial?.tratamento_via ?? "gavagem");
  const [trDose, setTrDose] = useState(inicial?.tratamento_dose ?? "");
  const [trDias, setTrDias] = useState(inicial?.tratamento_dias != null ? String(inicial.tratamento_dias) : "");
  const [trInicio, setTrInicio] = useState(inicial?.tratamento_inicio ?? "");

  // Calculadora de dose (helper): peso, dose mg/kg, concentração mg/mL → mL.
  const [calcPeso, setCalcPeso] = useState("");
  const [calcDose, setCalcDose] = useState("");
  const [calcConc, setCalcConc] = useState("");
  const ml = doseMlPorAnimal(parseNum(calcPeso), parseNum(calcDose), parseNum(calcConc));

  const rest = inicial ? diasRestantes(inicial) : null;

  function salvar() {
    setMsg(null);
    iniciar(async () => {
      const r = await salvarTratamento({
        projetoId,
        grupoId: grupo.id,
        inducaoAtiva: indAtiva,
        inducaoDoenca: indDoenca || null,
        inducaoSubstancia: indSub || null,
        inducaoVia: indVia || null,
        inducaoDose: indDose || null,
        tratamentoAtiva: trAtiva,
        tratamentoSubstancia: trSub || null,
        tratamentoVia: trVia || null,
        tratamentoDose: trDose || null,
        tratamentoDias: trDias ? parseInt0(trDias) : null,
        tratamentoInicio: trInicio || null,
      });
      setMsg("erro" in r ? r.erro : "Tratamento salvo.");
      if (!("erro" in r)) router.refresh();
    });
  }

  return (
    <div className="rounded border border-rule bg-paper-raised p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-medium text-ink">{grupo.nome}</p>
        {rest != null && (
          <span className="font-mono text-xs text-ink-soft">
            {rest === 0 ? "tratamento concluído" : `faltam ${rest} dia(s)`}
          </span>
        )}
      </div>

      {!podeEditar ? (
        <ResumoTratamento inicial={inicial} />
      ) : (
        <div className="flex flex-col gap-4">
          {/* Indução */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-ink">
              <input type="checkbox" checked={indAtiva} onChange={(e) => setIndAtiva(e.target.checked)} />
              Tratamento 1 — indução
            </label>
            {indAtiva && (
              <div className="mt-2 flex flex-col gap-2">
                <div className="flex flex-wrap gap-3">
                  <label className="flex flex-col gap-1 text-xs text-ink-soft">
                    Doença (opcional)
                    <select value={indDoenca} onChange={(e) => setIndDoenca(e.target.value)} className={INPUT_SM}>
                      <option value="">—</option>
                      {DOENCAS.map((d) => (
                        <option key={d.valor} value={d.valor}>{d.rotulo}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-ink-soft">
                    Via
                    <select value={indVia} onChange={(e) => setIndVia(e.target.value)} className={INPUT_SM}>
                      {VIAS.map((v) => (
                        <option key={v.valor} value={v.valor}>{v.rotulo}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-ink-soft">
                    Dose
                    <input value={indDose} onChange={(e) => setIndDose(e.target.value)} placeholder="Ex.: 150 mg/kg" className={`${INPUT_SM} w-32`} />
                  </label>
                </div>
                <label className="flex flex-col gap-1 text-xs text-ink-soft">
                  Substância / descrição
                  <input value={indSub} onChange={(e) => setIndSub(e.target.value)} placeholder="Ex.: aloxana (diluída a 2% em citrato 0,05 M, pH 4,5)" className={`${INPUT_SM} w-full max-w-lg`} />
                </label>
              </div>
            )}
          </div>

          {/* Tratamento */}
          <div className="border-t border-rule pt-3">
            <label className="flex items-center gap-2 text-sm font-medium text-ink">
              <input type="checkbox" checked={trAtiva} onChange={(e) => setTrAtiva(e.target.checked)} />
              Tratamento 2 — tratamento
            </label>
            {trAtiva && (
              <div className="mt-2 flex flex-col gap-2">
                <div className="flex flex-wrap gap-3">
                  <label className="flex flex-col gap-1 text-xs text-ink-soft">
                    Via
                    <select value={trVia} onChange={(e) => setTrVia(e.target.value)} className={INPUT_SM}>
                      {VIAS.map((v) => (
                        <option key={v.valor} value={v.valor}>{v.rotulo}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-ink-soft">
                    Dose
                    <input value={trDose} onChange={(e) => setTrDose(e.target.value)} placeholder="Ex.: 1 mL/kg" className={`${INPUT_SM} w-28`} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-ink-soft">
                    Dias
                    <input inputMode="numeric" value={trDias} onChange={(e) => setTrDias(e.target.value)} placeholder="Ex.: 15" className={`${INPUT_SM} w-16`} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-ink-soft">
                    Início
                    <input type="date" value={trInicio} onChange={(e) => setTrInicio(e.target.value)} className={INPUT_SM} />
                  </label>
                </div>
                <label className="flex flex-col gap-1 text-xs text-ink-soft">
                  Substância / descrição
                  <input value={trSub} onChange={(e) => setTrSub(e.target.value)} placeholder="Ex.: extrato hidroalcoólico / água destilada" className={`${INPUT_SM} w-full max-w-lg`} />
                </label>
              </div>
            )}
          </div>

          {/* Calculadora de dose (mL) */}
          <details className="border-t border-rule pt-3">
            <summary className="cursor-pointer text-xs text-signal">Calculadora de dose (mL por animal)</summary>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-xs text-ink-soft">
                Peso (g)
                <input inputMode="decimal" value={calcPeso} onChange={(e) => setCalcPeso(e.target.value)} className={`${INPUT_SM} w-20`} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-ink-soft">
                Dose (mg/kg)
                <input inputMode="decimal" value={calcDose} onChange={(e) => setCalcDose(e.target.value)} className={`${INPUT_SM} w-24`} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-ink-soft">
                Concentração (mg/mL)
                <input inputMode="decimal" value={calcConc} onChange={(e) => setCalcConc(e.target.value)} className={`${INPUT_SM} w-28`} />
              </label>
              <span className="pb-1.5 font-mono text-sm text-ink">
                {ml != null ? `≈ ${ml.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} mL/animal` : "—"}
              </span>
            </div>
          </details>

          <div className="flex items-center gap-3">
            <button type="button" onClick={salvar} disabled={pend} className={BOTAO_SECUNDARIO_SM}>
              {pend ? "Salvando..." : "Salvar tratamento"}
            </button>
            {msg && (
              <span className={`text-xs ${msg === "Tratamento salvo." ? "text-ink-soft" : "text-alerta"}`}>{msg}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ResumoTratamento({ inicial }: { inicial: TratamentoRow | null }) {
  if (!inicial || (!inicial.inducao_ativa && !inicial.tratamento_ativa)) {
    return <p className="text-sm text-ink-soft">Tratamento ainda não definido.</p>;
  }
  return (
    <div className="flex flex-col gap-2 text-sm text-ink">
      {inicial.inducao_ativa && (
        <p>
          <span className="font-medium">Indução:</span>{" "}
          {inicial.inducao_doenca ? `${rotuloDoenca(inicial.inducao_doenca)} — ` : ""}
          {inicial.inducao_substancia} {inicial.inducao_dose ? `(${inicial.inducao_dose})` : ""}{" "}
          {inicial.inducao_via ? `via ${siglaVia(inicial.inducao_via)}` : ""}
        </p>
      )}
      {inicial.tratamento_ativa && (
        <p>
          <span className="font-medium">Tratamento ({inicial.tratamento_dias ?? "?"} dias):</span>{" "}
          {inicial.tratamento_substancia} {inicial.tratamento_dose ? `(${inicial.tratamento_dose})` : ""}{" "}
          {inicial.tratamento_via ? `via ${siglaVia(inicial.tratamento_via)}` : ""}
        </p>
      )}
    </div>
  );
}
