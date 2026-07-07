"use client";

import { useActionState, useState } from "react";
import { criarProjeto } from "@/lib/actions/projetos";

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
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Novo projeto</h1>

      <form action={formAction} className="flex flex-col gap-6">
        <label className="flex flex-col gap-1 text-sm">
          Nome do projeto
          <input
            name="nome"
            required
            className="rounded border border-black/15 px-3 py-2 dark:border-white/20"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Descrição
          <textarea
            name="descricao"
            rows={3}
            className="rounded border border-black/15 px-3 py-2 dark:border-white/20"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Quantas levas de sacrifício estão previstas? (opcional)
          <input
            type="number"
            name="numeroLevas"
            min={1}
            className="w-32 rounded border border-black/15 px-3 py-2 dark:border-white/20"
          />
        </label>

        <div>
          <p className="mb-2 text-sm font-medium">Grupos experimentais</p>
          <p className="mb-3 text-xs text-black/60 dark:text-white/60">
            Ex.: Controle, DM1, Controle+EBH75... Os números dos ratos são
            gerados automaticamente e em sequência, na ordem dos grupos
            abaixo.
          </p>
          <div className="flex flex-col gap-2">
            {grupos.map((g, i) => (
              <div key={i} className="flex gap-2">
                <input
                  placeholder="Nome do grupo"
                  value={g.nome}
                  onChange={(e) => atualizarGrupo(i, "nome", e.target.value)}
                  name="grupoNome"
                  className="flex-1 rounded border border-black/15 px-3 py-2 text-sm dark:border-white/20"
                />
                <input
                  type="number"
                  min={0}
                  placeholder="Nº de ratos"
                  value={g.ratos}
                  onChange={(e) => atualizarGrupo(i, "ratos", e.target.value)}
                  name="grupoRatos"
                  className="w-32 rounded border border-black/15 px-3 py-2 text-sm dark:border-white/20"
                />
                <button
                  type="button"
                  onClick={() => removerGrupo(i)}
                  className="text-sm text-red-600 underline"
                >
                  remover
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={adicionarGrupo}
            className="mt-2 rounded border border-black/20 px-3 py-1 text-sm dark:border-white/20"
          >
            + Adicionar grupo
          </button>
        </div>

        {estado?.erro && (
          <p className="text-sm text-red-600" role="alert">
            {estado.erro}
          </p>
        )}

        <button
          type="submit"
          disabled={pendente}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {pendente ? "Criando..." : "Criar projeto"}
        </button>
      </form>
    </main>
  );
}
