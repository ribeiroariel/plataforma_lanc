"use client";

import { useActionState } from "react";
import { adicionarMembro } from "@/lib/actions/projetos";

export default function FormularioMembro({ projetoId }: { projetoId: string }) {
  const [estado, formAction, pendente] = useActionState(
    adicionarMembro,
    undefined
  );

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-end gap-2">
      <input type="hidden" name="projetoId" value={projetoId} />
      <label className="flex flex-col gap-1 text-xs">
        E-mail do bolsista
        <input
          type="email"
          name="email"
          required
          className="rounded border border-black/15 px-2 py-1 text-sm dark:border-white/20"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        Papel
        <select
          name="papel"
          className="rounded border border-black/15 px-2 py-1 text-sm dark:border-white/20"
        >
          <option value="ajudante">Ajudante</option>
          <option value="coautor">Coautor</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={pendente}
        className="rounded border border-black/20 px-3 py-1 text-sm disabled:opacity-50 dark:border-white/20"
      >
        {pendente ? "Adicionando..." : "Adicionar"}
      </button>
      {estado?.erro && (
        <p className="w-full text-sm text-red-600">{estado.erro}</p>
      )}
    </form>
  );
}
