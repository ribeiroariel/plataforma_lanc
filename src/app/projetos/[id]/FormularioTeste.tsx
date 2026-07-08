"use client";

import { useActionState } from "react";
import { designarTeste } from "@/lib/actions/projetos";
import type { TesteResumo } from "@/lib/testes";
import { INPUT_SM, BOTAO_SECUNDARIO_SM } from "@/lib/estilos";

export default function FormularioTeste({
  projetoId,
  testes,
}: {
  projetoId: string;
  testes: TesteResumo[];
}) {
  const [estado, formAction, pendente] = useActionState(
    designarTeste,
    undefined
  );

  return (
    <form
      action={formAction}
      className="mt-4 flex flex-wrap items-end gap-2 rounded border border-dashed border-rule p-3"
    >
      <input type="hidden" name="projetoId" value={projetoId} />
      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        Teste
        <select name="testeSlug" required className={INPUT_SM}>
          <option value="">Selecione...</option>
          {testes.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.titulo}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        E-mail do responsável
        <input type="email" name="email" required className={INPUT_SM} />
      </label>
      <button type="submit" disabled={pendente} className={BOTAO_SECUNDARIO_SM}>
        {pendente ? "Designando..." : "Designar"}
      </button>
      {estado?.erro && (
        <p className="w-full text-sm text-alerta">{estado.erro}</p>
      )}
    </form>
  );
}
