"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type Grupo = {
  tecido: string;
  nome: string;
  itens: { slug: string; titulo: string }[];
};

function normalizar(t: string) {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// Lista de protocolos: busca por nome (sem acento), grupos por tecido que
// abrem/fecham (o do protocolo aberto já vem aberto). No celular fica
// recolhida num "Trocar de protocolo" para o texto do protocolo vir primeiro.
export function TestesNav({ grupos }: { grupos: Grupo[] }) {
  const caminho = usePathname();
  const [busca, setBusca] = useState("");
  const termo = normalizar(busca.trim());
  const tecidoAtual = grupos.find((g) =>
    g.itens.some((t) => caminho.startsWith(`/testes/${t.slug}`))
  )?.tecido;

  const filtrados = grupos
    .map((g) => ({
      ...g,
      itens: termo
        ? g.itens.filter((t) => normalizar(`${t.titulo} ${g.nome}`).includes(termo))
        : g.itens,
    }))
    .filter((g) => g.itens.length > 0);

  const lista = (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar ensaio ou tecido"
        aria-label="Buscar protocolo"
        className="w-full rounded border border-rule bg-paper-raised px-2.5 py-1.5 text-sm text-ink focus:border-absorbance"
      />
      {filtrados.length === 0 && <p className="text-xs text-ink-soft">Nada encontrado.</p>}
      {filtrados.map((grupo) => (
        <details
          key={grupo.tecido}
          open={Boolean(termo) || grupo.tecido === tecidoAtual || !tecidoAtual}
          className="group"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between py-1 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
            {grupo.nome}
            <span className="text-xs text-ink-soft">
              {grupo.itens.length}
              <span className="ml-1 inline-block transition-transform group-open:rotate-90">›</span>
            </span>
          </summary>
          <ul className="mt-1 mb-2 flex flex-col">
            {grupo.itens.map((teste) => {
              const ativo = caminho.startsWith(`/testes/${teste.slug}`);
              return (
                <li key={teste.slug}>
                  <Link
                    href={`/testes/${teste.slug}`}
                    aria-current={ativo ? "page" : undefined}
                    className={`block border-l-2 py-1 pl-3 text-sm transition-colors ${
                      ativo
                        ? "border-signal font-medium text-ink"
                        : "border-rule text-ink-soft hover:border-ink-soft hover:text-ink"
                    }`}
                  >
                    {teste.titulo}
                  </Link>
                </li>
              );
            })}
          </ul>
        </details>
      ))}
    </div>
  );

  return (
    <nav aria-label="Protocolos">
      <details className="rounded border border-rule px-3 py-2 lg:hidden" open={!tecidoAtual}>
        <summary className="cursor-pointer text-sm font-medium text-ink">
          {tecidoAtual ? "Trocar de protocolo" : "Protocolos"}
        </summary>
        <div className="mt-3">{lista}</div>
      </details>
      <div className="hidden lg:block">{lista}</div>
    </nav>
  );
}
