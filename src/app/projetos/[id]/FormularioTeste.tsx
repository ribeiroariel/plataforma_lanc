"use client";

import { useActionState, useState } from "react";
import { designarTeste } from "@/lib/actions/projetos";
import { type TesteResumo } from "@/lib/tecidos";
import { INPUT_SM, BOTAO_SECUNDARIO_SM } from "@/lib/estilos";
import type { Pessoa } from "./FormularioMembro";

export default function FormularioTeste({
  projetoId,
  testes,
  pessoas,
  numeroLevas,
}: {
  projetoId: string;
  testes: TesteResumo[];
  pessoas: Pessoa[];
  numeroLevas: number;
}) {
  const [estado, formAction, pendente] = useActionState(
    designarTeste,
    undefined
  );
  const [responsavel, setResponsavel] = useState("");

  if (pessoas.length === 0) {
    return (
      <p className="mt-4 text-xs text-ink-soft">
        Adicione pessoas ao projeto antes de designar testes.
      </p>
    );
  }

  const ajudantesPossiveis = pessoas.filter((p) => p.id !== responsavel);

  return (
    <form
      action={formAction}
      className="mt-4 flex flex-col gap-3 rounded border border-dashed border-rule p-3"
    >
      <input type="hidden" name="projetoId" value={projetoId} />
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Teste (tecido)
          <select name="testeSlug" required className={INPUT_SM} defaultValue="">
            <option value="" disabled>
              Selecione...
            </option>
            {testes.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.titulo}
              </option>
            ))}
          </select>
        </label>
        {numeroLevas > 1 && (
          <label className="flex flex-col gap-1 text-xs text-ink-soft">
            Leva
            <select name="leva" className={INPUT_SM} defaultValue="">
              <option value="">Todas</option>
              {Array.from({ length: numeroLevas }, (_, i) => (
                <option key={i} value={i + 1}>
                  Leva {i + 1}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1 text-xs text-ink-soft">
          Responsável (registra os dados)
          <select
            name="profileId"
            required
            className={INPUT_SM}
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
          >
            <option value="" disabled>
              Selecione...
            </option>
            {pessoas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      {ajudantesPossiveis.length > 0 && (
        <fieldset className="text-xs text-ink-soft">
          <legend className="mb-1">Ajudantes (fazem o teste junto, opcional)</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {ajudantesPossiveis.map((p) => (
              <label key={p.id} className="flex items-center gap-1.5 text-ink">
                <input type="checkbox" name="ajudantes" value={p.id} />
                {p.nome}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pendente} className={BOTAO_SECUNDARIO_SM}>
          {pendente ? "Designando..." : "Designar teste"}
        </button>
        {estado?.erro && <p className="text-sm text-alerta">{estado.erro}</p>}
      </div>
    </form>
  );
}
