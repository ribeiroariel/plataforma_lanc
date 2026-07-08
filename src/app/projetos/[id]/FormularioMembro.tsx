"use client";

import { useActionState } from "react";
import { adicionarMembro } from "@/lib/actions/projetos";
import { INPUT_SM, BOTAO_SECUNDARIO_SM } from "@/lib/estilos";

export type Pessoa = { id: string; nome: string };

export default function FormularioMembro({
  projetoId,
  pessoas,
}: {
  projetoId: string;
  pessoas: Pessoa[];
}) {
  const [estado, formAction, pendente] = useActionState(
    adicionarMembro,
    undefined
  );

  if (pessoas.length === 0) {
    return (
      <p className="mt-4 text-xs text-ink-soft">
        Todos os bolsistas aprovados já estão no projeto.
      </p>
    );
  }

  return (
    <form
      action={formAction}
      className="mt-4 flex flex-wrap items-end gap-2 rounded border border-dashed border-rule p-3"
    >
      <input type="hidden" name="projetoId" value={projetoId} />
      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        Pessoa
        <select name="profileId" required className={INPUT_SM} defaultValue="">
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
      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        Papel
        <select name="papel" className={INPUT_SM}>
          <option value="ajudante">Ajudante</option>
          <option value="coautor">Coautor</option>
        </select>
      </label>
      <button type="submit" disabled={pendente} className={BOTAO_SECUNDARIO_SM}>
        {pendente ? "Adicionando..." : "Adicionar"}
      </button>
      {estado?.erro && (
        <p className="w-full text-sm text-alerta">{estado.erro}</p>
      )}
    </form>
  );
}
