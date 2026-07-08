"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { criarProjeto } from "@/lib/actions/projetos";
import { INPUT, INPUT_SM, BOTAO_PRIMARIO, BOTAO_SECUNDARIO_SM } from "@/lib/estilos";

type LinhaGrupo = { nome: string; ratos: string };

export default function NovoProjeto() {
  const [estado, formAction, pendente] = useActionState(criarProjeto, undefined);
  const [grupos, setGrupos] = useState<LinhaGrupo[]>([{ nome: "", ratos: "" }]);

  function atualizarGrupo(i: number, campo: keyof LinhaGrupo, valor: string) {
    setGrupos((prev) =>
      prev.map((g, idx) => (idx === i ? { ...g, [campo]: valor } : g))
    );
  }

  function adicionarGrupo() {
    setGrupos((prev) => [...prev, { nome: "", ratos: "" }]);
  }

  function removerGrupo(i: number) {
    setGrupos((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link
        href="/projetos"
        className="text-sm text-ink-soft hover:text-absorbance"
      >
        ← Meus projetos
      </Link>
      <h1 className="mt-2 font-display text-3xl leading-tight text-ink">
        Novo projeto
      </h1>

      <form action={formAction} className="mt-8 flex flex-col gap-6">
        <label className="flex flex-col gap-1 text-sm text-ink">
          Nome do projeto
          <input name="nome" required className={INPUT} />
        </label>

        <label className="flex flex-col gap-1 text-sm text-ink">
          Descrição
          <textarea name="descricao" rows={3} className={INPUT} />
        </label>

        <label className="flex flex-col gap-1 text-sm text-ink">
          Quantas levas de sacrifício estão previstas? (opcional)
          <input
            type="number"
            name="numeroLevas"
            min={1}
            className={`${INPUT} w-32`}
          />
        </label>

        <div>
          <p className="text-sm font-medium text-ink">Grupos experimentais</p>
          <p className="mt-1 mb-3 text-xs leading-relaxed text-ink-soft">
            Ex.: Controle, DM1, Controle+EBH75... Os números dos ratos são
            gerados automaticamente e em sequência, na ordem dos grupos
            abaixo.
          </p>
          <div className="flex flex-col gap-2">
            {grupos.map((g, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  placeholder="Nome do grupo"
                  value={g.nome}
                  onChange={(e) => atualizarGrupo(i, "nome", e.target.value)}
                  name="grupoNome"
                  className={`${INPUT_SM} flex-1`}
                />
                <input
                  type="number"
                  min={0}
                  placeholder="Nº de ratos"
                  value={g.ratos}
                  onChange={(e) => atualizarGrupo(i, "ratos", e.target.value)}
                  name="grupoRatos"
                  className={`${INPUT_SM} w-28`}
                />
                <button
                  type="button"
                  onClick={() => removerGrupo(i)}
                  className="text-sm text-ink-soft hover:text-alerta"
                  aria-label="Remover grupo"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={adicionarGrupo}
            className={`mt-3 ${BOTAO_SECUNDARIO_SM}`}
          >
            + Adicionar grupo
          </button>
        </div>

        {estado?.erro && (
          <p className="text-sm text-alerta" role="alert">
            {estado.erro}
          </p>
        )}

        <button type="submit" disabled={pendente} className={`self-start ${BOTAO_PRIMARIO}`}>
          {pendente ? "Criando..." : "Criar projeto"}
        </button>
      </form>
    </main>
  );
}
