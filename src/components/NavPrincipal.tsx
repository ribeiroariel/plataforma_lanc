"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; rotulo: string };

export function NavPrincipal({ itens }: { itens: Item[] }) {
  const caminho = usePathname();

  return (
    <nav className="border-t border-rule">
      <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 sm:px-6">
        {itens.map((item) => {
          const ativo =
            item.href === "/"
              ? caminho === "/"
              : caminho.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={ativo ? "page" : undefined}
              className={`border-b-2 px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors ${
                ativo
                  ? "border-signal text-ink"
                  : "border-transparent text-ink-soft hover:border-rule hover:text-ink"
              }`}
            >
              {item.rotulo}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
