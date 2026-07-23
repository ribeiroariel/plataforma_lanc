"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  criarSacrificio,
  designarFuncao,
  removerFuncao,
} from "@/lib/actions/sacrificio";
import { FUNCOES_SACRIFICIO } from "@/lib/sacrificio";
import { INPUT_SM, BOTAO_SECUNDARIO_SM } from "@/lib/estilos";

type FuncaoAtrib = { id: string; funcao: string; pessoa: string };
type Sacrificio = {
  id: string;
  leva: number | null;
  data: string | null;
  duracaoMin: number | null;
  status: string;
  funcoes: FuncaoAtrib[];
};
type Membro = { id: string; nome: string };

type Props = {
  projetoId: string;
  podeGerenciar: boolean;
  levasDisponiveis: number[];
  membros: Membro[];
  sacrificios: Sacrificio[];
};

export default function PlanejarSacrificio({
  projetoId,
  podeGerenciar,
  levasDisponiveis,
  membros,
  sacrificios,
}: Props) {
  const [erro, setErro] = useState<string | null>(null);
  const [pend, iniciar] = useTransition();
  const [leva, setLeva] = useState(
    levasDisponiveis[0] ? String(levasDisponiveis[0]) : ""
  );
  const [data, setData] = useState("");
  const [duracao, setDuracao] = useState("");

  function criar() {
    setErro(null);
    if (!data) {
      setErro("Informe a data do sacrifício.");
      return;
    }
    const duracaoNum = parseInt(duracao, 10);
    if (!duracao || !Number.isFinite(duracaoNum) || duracaoNum <= 0) {
      setErro("Informe a duração estimada (min).");
      return;
    }
    iniciar(async () => {
      const r = await criarSacrificio({
        projetoId,
        leva: leva ? parseInt(leva, 10) : null,
        data,
        duracaoMin: duracaoNum,
      });
      if ("erro" in r) setErro(r.erro);
      else {
        setData("");
        setDuracao("");
      }
    });
  }

  return (
    <div className="mt-8 flex flex-col gap-8">
      {podeGerenciar && levasDisponiveis.length > 0 && (
        <div className="rounded border border-dashed border-rule p-4">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
            Novo sacrifício
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs text-ink-soft">
              Leva
              <select
                value={leva}
                onChange={(e) => setLeva(e.target.value)}
                className={INPUT_SM}
              >
                {levasDisponiveis.map((l) => (
                  <option key={l} value={l}>
                    Leva {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-ink-soft">
              Data <span className="text-signal">*</span>
              <input
                type="date"
                required
                value={data}
                onChange={(e) => setData(e.target.value)}
                className={INPUT_SM}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-ink-soft">
              Duração estimada (min) <span className="text-signal">*</span>
              <input
                type="number"
                min={1}
                required
                value={duracao}
                onChange={(e) => setDuracao(e.target.value)}
                className={`${INPUT_SM} w-28`}
              />
            </label>
            <button
              type="button"
              onClick={criar}
              disabled={pend || !data || !duracao}
              className={BOTAO_SECUNDARIO_SM}
            >
              {pend ? "Criando..." : "Criar sacrifício"}
            </button>
          </div>
          {erro && <p className="mt-2 text-sm text-alerta">{erro}</p>}
        </div>
      )}

      {sacrificios.length === 0 && (
        <p className="text-sm text-ink-soft">
          Nenhum sacrifício planejado ainda
          {podeGerenciar ? "." : " (peça a um coautor para criar)."}
        </p>
      )}

      {sacrificios.map((s) => (
        <PainelSacrificio
          key={s.id}
          projetoId={projetoId}
          sacrificio={s}
          membros={membros}
          podeGerenciar={podeGerenciar}
        />
      ))}
    </div>
  );
}

function PainelSacrificio({
  projetoId,
  sacrificio,
  membros,
  podeGerenciar,
}: {
  projetoId: string;
  sacrificio: Sacrificio;
  membros: Membro[];
  podeGerenciar: boolean;
}) {
  const [pend, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [funcaoSel, setFuncaoSel] = useState(FUNCOES_SACRIFICIO[0].valor);
  const [pessoaSel, setPessoaSel] = useState(membros[0]?.id ?? "");

  function adicionar() {
    if (!pessoaSel) return;
    setErro(null);
    iniciar(async () => {
      const r = await designarFuncao({
        projetoId,
        sacrificioId: sacrificio.id,
        funcao: funcaoSel,
        profileId: pessoaSel,
      });
      if ("erro" in r) setErro(r.erro);
    });
  }
  function remover(funcaoId: string) {
    setErro(null);
    iniciar(async () => {
      const r = await removerFuncao({ projetoId, funcaoId });
      if ("erro" in r) setErro(r.erro);
    });
  }

  const porFuncao = new Map<string, { id: string; pessoa: string }[]>();
  for (const f of sacrificio.funcoes) {
    const arr = porFuncao.get(f.funcao) ?? [];
    arr.push({ id: f.id, pessoa: f.pessoa });
    porFuncao.set(f.funcao, arr);
  }

  return (
    <section className="rounded border border-rule bg-paper-raised p-4">
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-ink-soft">
        <span className="rounded-full bg-signal/12 px-2 py-0.5 uppercase tracking-wide text-signal">
          {sacrificio.leva ? `Leva ${sacrificio.leva}` : "Sem leva"}
        </span>
        {sacrificio.data && (
          <span>
            ·{" "}
            {new Date(sacrificio.data + "T00:00:00").toLocaleDateString("pt-BR")}
          </span>
        )}
        {sacrificio.duracaoMin != null && <span>· ~{sacrificio.duracaoMin} min</span>}
        <span>· {sacrificio.status}</span>
        <Link
          href={`/projetos/${projetoId}/sacrificio/${sacrificio.id}`}
          className="ml-auto rounded border border-rule px-2 py-0.5 text-[11px] normal-case tracking-normal text-ink transition-colors hover:border-signal"
        >
          Abrir dia →
        </Link>
      </div>

      <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft">
        Funções do dia
      </p>
      <div className="flex flex-col gap-1.5">
        {FUNCOES_SACRIFICIO.map((f) => {
          const pessoas = porFuncao.get(f.valor) ?? [];
          const faltam = pessoas.length < f.minPessoas;
          return (
            <div key={f.valor} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="w-64 shrink-0 text-ink">
                {f.rotulo}
                {f.minPessoas > 1 && (
                  <span className="text-ink-soft"> (mín. {f.minPessoas})</span>
                )}
              </span>
              {pessoas.length === 0 ? (
                <span className="text-xs text-ink-soft">—</span>
              ) : (
                pessoas.map((p) => (
                  <span
                    key={p.id}
                    className="flex items-center gap-1 rounded-full bg-ink/5 px-2 py-0.5 text-xs text-ink"
                  >
                    {p.pessoa}
                    {podeGerenciar && (
                      <button
                        type="button"
                        onClick={() => remover(p.id)}
                        disabled={pend}
                        className="text-ink-soft hover:text-alerta"
                        aria-label="remover"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))
              )}
              {faltam && (
                <span className="text-[11px] text-alerta">faltam pessoas</span>
              )}
            </div>
          );
        })}
      </div>

      {podeGerenciar && (
        <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-rule/60 pt-3">
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Função
            <select
              value={funcaoSel}
              onChange={(e) => setFuncaoSel(e.target.value)}
              className={INPUT_SM}
            >
              {FUNCOES_SACRIFICIO.map((f) => (
                <option key={f.valor} value={f.valor}>
                  {f.rotulo}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Pessoa
            <select
              value={pessoaSel}
              onChange={(e) => setPessoaSel(e.target.value)}
              className={INPUT_SM}
            >
              {membros.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={adicionar}
            disabled={pend || !pessoaSel}
            className={BOTAO_SECUNDARIO_SM}
          >
            Designar
          </button>
          {erro && <p className="w-full text-sm text-alerta">{erro}</p>}
        </div>
      )}
    </section>
  );
}
