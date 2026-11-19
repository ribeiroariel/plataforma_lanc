"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logout } from "@/lib/actions/auth";
import { Avatar } from "@/components/Avatar";
import { IconeFechar, IconeMais, IconeSair } from "./icones";

export type ItemNav = {
  href: string;
  rotulo: string;
  icone: React.ReactNode;
  /** Acende só na rota exata (ex.: "/" não pode acender em tudo). */
  exato?: boolean;
  /** Outros prefixos que também acendem o item. */
  tambem?: string[];
};

export type GrupoNav = { titulo?: string; itens: ItemNav[] };

function estaAtivo(item: ItemNav, caminho: string) {
  if (item.tambem?.some((p) => caminho.startsWith(p))) return true;
  return item.exato ? caminho === item.href : caminho.startsWith(item.href);
}

export function Marca({ claro = false }: { claro?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <Image
        src="/logo-lanc.jpg"
        alt=""
        width={36}
        height={36}
        className="h-9 w-9 shrink-0 rounded-full border border-white/30 object-cover"
        priority
      />
      <span className="leading-none">
        <span
          className={`block font-display text-xl font-medium tracking-tight ${
            claro ? "text-white" : "text-ink"
          }`}
        >
          LANC
        </span>
        <span
          className={`mt-0.5 block text-xs font-medium ${
            claro ? "text-white/70" : "text-ink-soft"
          }`}
        >
          Neurociências · FURB
        </span>
      </span>
    </span>
  );
}

// Navegação da área logada. No computador: menu lateral fixo, agrupado por
// tipo de tarefa (bancada, pesquisa, consulta, gestão). No celular: barra de
// abas embaixo com os atalhos principais + "Mais", que abre a lista completa.
export function Sidebar({
  grupos,
  abasCelular,
  nome,
  papelRotulo,
  fotoUrl,
}: {
  grupos: GrupoNav[];
  /** hrefs que viram aba fixa no celular (máx. 4; a 5ª é sempre "Mais"). */
  abasCelular: string[];
  nome: string;
  papelRotulo: string;
  fotoUrl: string | null;
}) {
  const caminho = usePathname();
  const [maisAberto, setMaisAberto] = useState(false);
  const todos = grupos.flatMap((g) => g.itens);
  const abas = abasCelular
    .map((h) => todos.find((i) => i.href === h))
    .filter((i): i is ItemNav => Boolean(i));
  const maisAtivo =
    !abas.some((a) => estaAtivo(a, caminho)) &&
    todos.some((i) => estaAtivo(i, caminho));

  // Fecha a gaveta com Esc (e ao tocar num link — ver listaGrupos).
  useEffect(() => {
    if (!maisAberto) return;
    const fechar = (e: KeyboardEvent) => e.key === "Escape" && setMaisAberto(false);
    window.addEventListener("keydown", fechar);
    return () => window.removeEventListener("keydown", fechar);
  }, [maisAberto]);

  const perfil = (
    <div className="flex items-center gap-3">
      <Link href="/perfil" onClick={() => setMaisAberto(false)} className="flex min-w-0 flex-1 items-center gap-3 rounded-md p-1 -m-1 transition-colors hover:bg-ink/5">
        <Avatar fotoUrl={fotoUrl} nome={nome} tamanho={34} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-ink">{nome}</span>
          <span className="block text-xs text-signal font-medium">
            {papelRotulo}
          </span>
        </span>
      </Link>
      <form action={logout}>
        <button
          type="submit"
          aria-label="Sair da conta"
          title="Sair"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-alerta/10 hover:text-alerta"
        >
          {IconeSair}
        </button>
      </form>
    </div>
  );

  function listaGrupos(compacta = false) {
    return (
      <>
        {grupos.map((g, gi) => (
          <div key={g.titulo ?? gi} className={gi > 0 ? "mt-5" : ""}>
            {g.titulo && (
              <p className="mb-1.5 px-3 text-xs text-ink-soft/70 font-medium">
                {g.titulo}
              </p>
            )}
            <ul className="flex flex-col gap-0.5">
              {g.itens.map((item) => {
                const on = estaAtivo(item, caminho);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMaisAberto(false)}
                      aria-current={on ? "page" : undefined}
                      className={`group relative flex items-center gap-3 rounded-md px-3 text-sm transition-colors ${
                        compacta ? "py-2.5" : "py-2"
                      } ${
                        on
                          ? "bg-signal/10 font-medium text-signal"
                          : "text-ink-soft hover:bg-ink/5 hover:text-ink"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-r-full bg-signal transition-opacity ${
                          on ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      <span className={on ? "text-signal" : "text-ink-soft/80 group-hover:text-ink"}>
                        {item.icone}
                      </span>
                      {item.rotulo}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </>
    );
  }

  return (
    <>
      {/* Topo — celular */}
      <header
        data-noprint
        className="sticky top-0 z-40 flex items-center justify-between bg-signal px-4 py-2 md:hidden"
      >
        <Link href="/">
          <Marca claro />
        </Link>
        <Link href="/perfil" aria-label="Meu perfil">
          <Avatar fotoUrl={fotoUrl} nome={nome} tamanho={32} className="border-white/40" />
        </Link>
      </header>

      {/* Abas — celular */}
      <nav
        data-noprint
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-rule bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {abas.map((item) => {
          const on = estaAtivo(item, caminho);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={on ? "page" : undefined}
              className={`relative flex min-h-[58px] flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium transition-colors ${
                on ? "text-signal" : "text-ink-soft"
              }`}
            >
              <span
                aria-hidden
                className={`absolute top-0 h-[3px] w-8 rounded-b-full bg-signal transition-opacity ${
                  on ? "opacity-100" : "opacity-0"
                }`}
              />
              {item.icone}
              {item.rotulo}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMaisAberto(true)}
          aria-expanded={maisAberto}
          className={`relative flex min-h-[58px] flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium ${
            maisAtivo ? "text-signal" : "text-ink-soft"
          }`}
        >
          <span
            aria-hidden
            className={`absolute top-0 h-[3px] w-8 rounded-b-full bg-signal transition-opacity ${
              maisAtivo ? "opacity-100" : "opacity-0"
            }`}
          />
          {IconeMais}
          Mais
        </button>
      </nav>

      {/* Gaveta "Mais" — celular */}
      {maisAberto && (
        <div data-noprint className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Todas as seções">
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setMaisAberto(false)}
            className="anim-fade absolute inset-0 bg-ink/40"
          />
          <div className="anim-gaveta absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-paper px-4 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <span aria-hidden className="mx-auto h-1 w-10 rounded-full bg-rule" />
              <button
                type="button"
                onClick={() => setMaisAberto(false)}
                aria-label="Fechar"
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-ink/5"
              >
                {IconeFechar}
              </button>
            </div>
            {listaGrupos(true)}
            <div className="mt-6 border-t border-rule pt-4">{perfil}</div>
          </div>
        </div>
      )}

      {/* Lateral — computador */}
      <aside
        data-noprint
        className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-rule bg-paper-raised md:flex"
      >
        <Link href="/" className="block bg-signal px-5 py-4">
          <Marca claro />
        </Link>
        <nav aria-label="Navegação principal" className="flex-1 overflow-y-auto px-3 py-5">
          {listaGrupos()}
        </nav>
        <div className="border-t border-rule p-4">{perfil}</div>
      </aside>
    </>
  );
}
