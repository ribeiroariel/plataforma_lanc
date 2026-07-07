"use client";

import { useActionState } from "react";
import { designarTeste } from "@/lib/actions/projetos";
import type { TesteResumo } from "@/lib/testes";

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
    <form action={formAction} className="mt-3 flex flex-wrap items-end gap-2">
      <input type="hidden" name="projetoId" value={projetoId} />
      <label className="flex flex-col gap-1 text-xs">
        Teste
        <select
          name="testeSlug"
          required
          className="rounded border border-black/15 px-2 py-1 text-sm dark:border-white/20"
        >
          <option value="">Selecione...</option>
          {testes.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.titulo}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs">
        E-mail do responsável
        <input
          type="email"
          name="email"
          required
          className="rounded border border-black/15 px-2 py-1 text-sm dark:border-white/20"
        />
      </label>
      <button
        type="submit"
        disabled={pendente}
        className="rounded border border-black/20 px-3 py-1 text-sm disabled:opacity-50 dark:border-white/20"
      >
        {pendente ? "Designando..." : "Designar"}
      </button>
      {estado?.erro && (
        <p className="w-full text-sm text-red-600">{estado.erro}</p>
      )}
    </form>
  );
}
