"use client";

import { useActionState } from "react";
import { adicionarMembro } from "@/lib/actions/projetos";
import { INPUT_SM, BOTAO_SECUNDARIO_SM } from "@/lib/estilos";

export default function FormularioMembro({ projetoId }: { projetoId: string }) {
  const [estado, formAction, pendente] = useActionState(
    adicionarMembro,
    undefined
  );

  return (
    <form
      action={formAction}
      className="mt-4 flex flex-wrap items-end gap-2 rounded border border-dashed border-rule p-3"
    >
      <input type="hidden" name="projetoId" value={projetoId} />
      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        E-mail do bolsista
        <input type="email" name="email" required className={INPUT_SM} />
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
