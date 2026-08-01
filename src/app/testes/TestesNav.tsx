"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Grupo = {
  tecido: string;
  nome: string;
  itens: { slug: string; titulo: string }[];
};

// Barra lateral dos protocolos com destaque do ensaio aberto (a versão de
// servidor não sabia qual estava ativo). O item atual ganha uma régua signal
// à esquerda e texto cheio; os demais ficam suaves até o hover.
export function TestesNav({ grupos }: { grupos: Grupo[] }) {
  const caminho = usePathname();

  return (
    <nav className="flex flex-col gap-6 border-b border-rule pb-6 text-sm lg:border-r lg:border-b-0 lg:pr-6 lg:pb-0">
      {grupos.map((grupo) => (
        <div key={grupo.tecido}>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft">
            {grupo.nome}
          </p>
          <ul className="flex flex-col gap-0.5">
            {grupo.itens.map((teste) => {
              const ativo = caminho.startsWith(`/testes/${teste.slug}`);
              return (
                <li key={teste.slug}>
                  <Link
                    href={`/testes/${teste.slug}`}
                    aria-current={ativo ? "page" : undefined}
                    className={`-ml-3 flex border-l-2 py-1 pl-3 transition-colors ${
                      ativo
                        ? "border-signal font-medium text-ink"
                        : "border-transparent text-ink-soft hover:border-rule hover:text-signal"
                    }`}
                  >
                    {teste.titulo}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
