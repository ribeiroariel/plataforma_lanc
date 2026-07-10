"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { editarProjeto } from "@/lib/actions/projetos";
import { TECIDOS_ANALISAVEIS, nomeTecido } from "@/lib/tecidos";
import { INPUT, INPUT_SM, BOTAO_PRIMARIO, BOTAO_SECUNDARIO_SM } from "@/lib/estilos";

type LinhaGrupo = { id?: string; nome: string; ratos: string[] };

export default function EditarForm({
  projetoId,
  nomeInicial,
  descricaoInicial,
  levasInicial,
  gruposIniciais,
  tecidosIniciais,
}: {
  projetoId: string;
  nomeInicial: string;
  descricaoInicial: string;
  levasInicial: number;
  gruposIniciais: LinhaGrupo[];
  tecidosIniciais: string[];
}) {
  const [estado, formAction, pendente] = useActionState(editarProjeto, undefined);
  const [numeroLevas, setNumeroLevas] = useState(levasInicial);
  const [grupos, setGrupos] = useState<LinhaGrupo[]>(
    gruposIniciais.length > 0 ? gruposIniciais : [{ nome: "", ratos: [""] }]
  );

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
    setGrupos((p) => p.map((g, idx) => (idx === i ? { ...g, nome: valor } : g)));
  }
  function atualizarRatos(i: number, leva: number, valor: string) {
    const norm = valor === "" ? "" : String(Math.max(0, parseInt(valor, 10) || 0));
    setGrupos((p) =>
      p.map((g, idx) =>
        idx === i ? { ...g, ratos: g.ratos.map((r, l) => (l === leva ? norm : r)) } : g
      )
    );
  }
  function adicionarGrupo() {
    setGrupos((p) => [...p, { nome: "", ratos: Array(numeroLevas).fill("") }]);
  }
  function removerGrupo(i: number) {
    setGrupos((p) => p.filter((_, idx) => idx !== i));
  }

  const gruposJson = JSON.stringify(
    grupos.map((g) => ({
      id: g.id,
      nome: g.nome,
      ratosPorLeva: g.ratos.map((r) => Number(r) || 0),
    }))
  );
  const gruposVazios = grupos
    .filter(
      (g) => g.nome.trim() !== "" && g.ratos.reduce((s, r) => s + (Number(r) || 0), 0) === 0
    )
    .map((g) => g.nome.trim());

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-6">
      <input type="hidden" name="projetoId" value={projetoId} />
      <input type="hidden" name="numeroLevas" value={numeroLevas} />
      <input type="hidden" name="gruposJson" value={gruposJson} />

      <label className="flex flex-col gap-1 text-sm text-ink">
        Nome do projeto
        <input name="nome" required defaultValue={nomeInicial} className={INPUT} />
      </label>
      <label className="flex flex-col gap-1 text-sm text-ink">
        Descrição
        <textarea name="descricao" rows={3} defaultValue={descricaoInicial} className={INPUT} />
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
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-ink">
          Tecidos que serão analisados
        </legend>
        <p className="text-xs leading-relaxed text-ink-soft">
          Só os testes desses tecidos ficam disponíveis para designar. Deixe sem
          marcar para não restringir.
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {TECIDOS_ANALISAVEIS.map((t) => (
            <label key={t} className="flex items-center gap-1.5 text-sm text-ink">
              <input
                type="checkbox"
                name="tecidos"
                value={t}
                defaultChecked={tecidosIniciais.includes(t)}
              />
              {nomeTecido(t)}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <p className="text-sm font-medium text-ink">Grupos experimentais</p>
        <p className="mt-1 mb-3 text-xs leading-relaxed text-ink-soft">
          Ajuste as quantidades por leva. Ao adicionar uma leva imprevista,
          aumente o número de levas acima e preencha a coluna nova.
        </p>
        <div className="overflow-x-auto">
          <table className="text-sm">
            <thead>
              <tr className="text-left font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                <th className="pb-2 pr-3 font-normal">Grupo</th>
                {Array.from({ length: numeroLevas }, (_, l) => (
                  <th key={l} className="pb-2 pr-2 font-normal">Leva {l + 1}</th>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {grupos.map((g, i) => (
                <tr key={i}>
                  <td className="py-1 pr-3">
                    <input
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
        <button type="button" onClick={adicionarGrupo} className={`mt-3 ${BOTAO_SECUNDARIO_SM}`}>
          + Adicionar grupo
        </button>
        {gruposVazios.length > 0 && (
          <p className="mt-2 text-xs text-alerta">
            Sem ratos: {gruposVazios.join(", ")} — informe a quantidade ou remova.
          </p>
        )}
      </div>

      <label className="flex flex-col gap-1 text-sm text-ink">
        Nota da alteração (opcional)
        <input
          name="nota"
          placeholder="Ex.: leva 3 imprevista — 2 ratos morreram na indução"
          className={INPUT}
        />
      </label>

      {estado?.erro && (
        <p className="text-sm text-alerta" role="alert">
          {estado.erro}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pendente || gruposVazios.length > 0}
          className={`text-sm ${BOTAO_PRIMARIO}`}
        >
          {pendente ? "Salvando..." : "Salvar alterações"}
        </button>
        <Link href={`/projetos/${projetoId}`} className="text-sm text-ink-soft hover:text-ink">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
