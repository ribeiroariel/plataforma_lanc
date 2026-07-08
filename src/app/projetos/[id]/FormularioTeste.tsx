"use client";

import { useActionState } from "react";
import { designarTeste } from "@/lib/actions/projetos";
import { nomeTecido, tituloCurto, type TesteResumo } from "@/lib/tecidos";
import { INPUT_SM, BOTAO_SECUNDARIO_SM } from "@/lib/estilos";
import type { Pessoa } from "./FormularioMembro";

export default function FormularioTeste({
  projetoId,
  testes,
  pessoas,
}: {
  projetoId: string;
  testes: TesteResumo[];
  pessoas: Pessoa[];
}) {
  const [estado, formAction, pendente] = useActionState(
    designarTeste,
    undefined
  );

  if (pessoas.length === 0) {
    return (
      <p className="mt-4 text-xs text-ink-soft">
        Adicione pessoas ao projeto antes de designar testes.
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
        Teste (tecido)
        <select name="testeSlug" required className={INPUT_SM} defaultValue="">
          <option value="" disabled>
            Selecione...
          </option>
          {testes.map((t) => (
            <option key={t.slug} value={t.slug}>
              {tituloCurto(t.titulo)} — {nomeTecido(t.tecido)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-ink-soft">
        Responsável
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
      <button type="submit" disabled={pendente} className={BOTAO_SECUNDARIO_SM}>
        {pendente ? "Designando..." : "Designar"}
      </button>
      {estado?.erro && (
        <p className="w-full text-sm text-alerta">{estado.erro}</p>
      )}
    </form>
  );
}
