"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { criarProjeto } from "@/lib/actions/projetos";
import { INPUT, INPUT_SM, BOTAO_PRIMARIO, BOTAO_SECUNDARIO_SM } from "@/lib/estilos";

type LinhaGrupo = { nome: string; ratos: string[] };

export default function NovoProjeto() {
  const [estado, formAction, pendente] = useActionState(criarProjeto, undefined);
  const [numeroLevas, setNumeroLevas] = useState(1);
  const [grupos, setGrupos] = useState<LinhaGrupo[]>([
    { nome: "", ratos: [""] },
  ]);

  function ajustarLevas(n: number) {
    const levas = Math.max(1, Math.min(20, n || 1));
    setNumeroLevas(levas);
    setGrupos((prev) =>
      prev.map((g) => {
        const ratos = [...g.ratos];
        while (ratos.length < levas) ratos.push("");
        ratos.length = levas;
        return { ...g, ratos };
      })
    );
  }

  function atualizarNome(i: number, valor: string) {
    setGrupos((prev) =>
      prev.map((g, idx) => (idx === i ? { ...g, nome: valor } : g))
    );
  }

  function atualizarRatos(i: number, leva: number, valor: string) {
    // Normaliza: tira zeros à esquerda ("022" → "22"), mantém vazio.
    const normalizado =
      valor === "" ? "" : String(Math.max(0, parseInt(valor, 10) || 0));
    setGrupos((prev) =>
      prev.map((g, idx) =>
        idx === i
          ? { ...g, ratos: g.ratos.map((r, l) => (l === leva ? normalizado : r)) }
          : g
      )
    );
  }

  function adicionarGrupo() {
    setGrupos((prev) => [
      ...prev,
      { nome: "", ratos: Array(numeroLevas).fill("") },
    ]);
  }

  function removerGrupo(i: number) {
    setGrupos((prev) => prev.filter((_, idx) => idx !== i));
  }

  const gruposJson = JSON.stringify(
    grupos.map((g) => ({
      nome: g.nome,
      ratosPorLeva: g.ratos.map((r) => Number(r) || 0),
    }))
  );

  const totalRatos = grupos.reduce(
    (soma, g) => soma + g.ratos.reduce((s, r) => s + (Number(r) || 0), 0),
    0
  );

  const gruposVazios = grupos
    .filter(
      (g) =>
        g.nome.trim() !== "" &&
        g.ratos.reduce((s, r) => s + (Number(r) || 0), 0) === 0
    )
    .map((g) => g.nome.trim());

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link href="/projetos" className="text-sm text-ink-soft hover:text-signal">
        ← Meus projetos
      </Link>
      <h1 className="mt-2 font-display text-3xl leading-tight text-ink">
        Novo projeto
      </h1>

      <form action={formAction} className="mt-8 flex flex-col gap-6">
        <input type="hidden" name="numeroLevas" value={numeroLevas} />
        <input type="hidden" name="gruposJson" value={gruposJson} />

        <label className="flex flex-col gap-1 text-sm text-ink">
          Nome do projeto
          <input name="nome" required className={INPUT} />
        </label>

        <label className="flex flex-col gap-1 text-sm text-ink">
          Descrição
          <textarea name="descricao" rows={3} className={INPUT} />
        </label>

        <label className="flex flex-col gap-1 text-sm text-ink">
          Número de levas de sacrifício
          <input
            type="number"
            min={1}
            max={20}
            required
            value={numeroLevas}
            onChange={(e) => ajustarLevas(parseInt(e.target.value, 10))}
            className={`${INPUT} w-28`}
          />
          <span className="text-xs text-ink-soft">
            Quantas vezes o experimento terá coleta/sacrifício. Você informa
            quantos ratos cada grupo tem em cada leva.
          </span>
        </label>

        <div>
          <p className="text-sm font-medium text-ink">Grupos experimentais</p>
          <p className="mt-1 mb-3 text-xs leading-relaxed text-ink-soft">
            Ex.: Controle, DM1, Controle+EBH75... Para cada grupo, informe a
            quantidade de ratos em cada leva. Os números dos ratos são
            gerados automaticamente, em sequência (leva 1 primeiro, depois
            leva 2, etc.).
          </p>

          <div className="overflow-x-auto">
            <table className="text-sm">
              <thead>
                <tr className="text-left font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                  <th className="pb-2 pr-3 font-normal">Grupo</th>
                  {Array.from({ length: numeroLevas }, (_, l) => (
                    <th key={l} className="pb-2 pr-2 font-normal">
                      Leva {l + 1}
                    </th>
                  ))}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {grupos.map((g, i) => (
                  <tr key={i}>
                    <td className="py-1 pr-3">
                      <input
                        placeholder="Nome do grupo"
                        value={g.nome}
                        onChange={(e) => atualizarNome(i, e.target.value)}
                        className={`${INPUT_SM} w-44`}
                      />
                    </td>
                    {Array.from({ length: numeroLevas }, (_, l) => (
                      <td key={l} className="py-1 pr-2">
                        <input
                          type="number"
                          min={0}
                          value={g.ratos[l] ?? ""}
                          onChange={(e) => atualizarRatos(i, l, e.target.value)}
                          className={`${INPUT_SM} w-16`}
                        />
                      </td>
                    ))}
                    <td className="py-1">
                      <button
                        type="button"
                        onClick={() => removerGrupo(i)}
                        className="text-ink-soft hover:text-alerta"
                        aria-label="Remover grupo"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center gap-4">
            <button
              type="button"
              onClick={adicionarGrupo}
              className={BOTAO_SECUNDARIO_SM}
            >
              + Adicionar grupo
            </button>
            <span className="font-mono text-xs text-ink-soft">
              Total: {totalRatos} rato(s)
            </span>
          </div>
          {gruposVazios.length > 0 && (
            <p className="mt-2 text-xs text-alerta">
              Sem ratos: {gruposVazios.join(", ")} — informe a quantidade ou
              remova o grupo.
            </p>
          )}
        </div>

        {estado?.erro && (
          <p className="text-sm text-alerta" role="alert">
            {estado.erro}
          </p>
        )}

        <button
          type="submit"
          disabled={pendente || gruposVazios.length > 0}
          className={`self-start text-sm ${BOTAO_PRIMARIO}`}
        >
          {pendente ? "Criando..." : "Criar projeto"}
        </button>
      </form>
    </main>
  );
}
