"use client";

import { useState } from "react";
import { Retrato } from "@/components/Retrato";
import { Revelar } from "@/components/ui/Revelar";
import { rotuloVinculo, type PessoaPublica, type Vinculo } from "@/lib/vinculo";

const FILTROS: { id: "todos" | Vinculo; rotulo: string }[] = [
  { id: "todos", rotulo: "Toda a equipe" },
  { id: "doutorado", rotulo: "Doutorado" },
  { id: "mestrado", rotulo: "Mestrado" },
  { id: "bolsista", rotulo: "Iniciação científica" },
  { id: "voluntario", rotulo: "Pesquisa voluntária" },
];

// Grade da equipe com filtro por vínculo. Cartão: retrato vertical, nome,
// vínculo e a apresentação (3 linhas; "ler mais" abre o resto).
export default function EquipeGrade({ pessoas }: { pessoas: PessoaPublica[] }) {
  const [filtro, setFiltro] = useState<"todos" | Vinculo>("todos");
  const [aberta, setAberta] = useState<string | null>(null);
  const contar = (v: "todos" | Vinculo) =>
    v === "todos" ? pessoas.length : pessoas.filter((p) => (p.vinculo ?? "voluntario") === v).length;
  const lista = filtro === "todos" ? pessoas : pessoas.filter((p) => (p.vinculo ?? "voluntario") === filtro);

  return (
    <div>
      <div role="tablist" aria-label="Filtrar equipe" className="flex flex-wrap gap-2">
        {FILTROS.filter((f) => contar(f.id) > 0).map((f) => {
          const on = filtro === f.id;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setFiltro(f.id)}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                on
                  ? "border-ink bg-ink text-paper"
                  : "border-rule text-ink-soft hover:border-ink-soft hover:text-ink"
              }`}
            >
              {f.rotulo}
              <span className={`ml-1.5 tabular-nums ${on ? "text-paper/60" : "text-ink-soft/60"}`}>
                {contar(f.id)}
              </span>
            </button>
          );
        })}
      </div>

      <ul key={filtro} className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
        {lista.map((p, i) => {
          const longa = (p.apresentacao?.length ?? 0) > 120;
          const expandida = aberta === p.id;
          return (
            <Revelar key={p.id} como="li" atraso={Math.min(i, 8) * 50}>
              <article className="group">
                <Retrato nome={p.nome} fotoUrl={p.foto_url} className="rounded-lg" />
                <h3 className="mt-3.5 font-display text-[17px] leading-snug text-ink">{p.nome}</h3>
                <p className="mt-0.5 text-xs font-medium tracking-wide text-signal">
                  {rotuloVinculo(p.vinculo)}
                </p>
                {p.apresentacao && (
                  <>
                    <p
                      className={`mt-2.5 text-sm leading-relaxed text-ink-soft ${
                        longa && !expandida ? "line-clamp-3" : ""
                      }`}
                    >
                      {p.apresentacao}
                    </p>
                    {longa && (
                      <button
                        type="button"
                        onClick={() => setAberta(expandida ? null : p.id)}
                        className="mt-1 text-xs text-ink-soft underline-offset-4 hover:text-ink hover:underline"
                      >
                        {expandida ? "ler menos" : "ler mais"}
                      </button>
                    )}
                  </>
                )}
              </article>
            </Revelar>
          );
        })}
      </ul>
    </div>
  );
}
