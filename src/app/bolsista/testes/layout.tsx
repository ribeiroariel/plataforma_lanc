import Link from "next/link";
import { testesPorTecido, nomeTecido } from "@/lib/testes";

export default function LayoutTestes({
  children,
}: {
  children: React.ReactNode;
}) {
  const grupos = testesPorTecido();

  return (
    <div className="mx-auto flex max-w-5xl gap-8 px-4 py-10">
      <aside className="w-64 shrink-0">
        <nav className="flex flex-col gap-6 text-sm">
          {Array.from(grupos.entries()).map(([tecido, lista]) => (
            <div key={tecido}>
              <p className="mb-2 font-semibold text-black/60 dark:text-white/60">
                {nomeTecido(tecido)}
              </p>
              <ul className="flex flex-col gap-1">
                {lista.map((teste) => (
                  <li key={teste.slug}>
                    <Link
                      href={`/bolsista/testes/${teste.slug}`}
                      className="hover:underline"
                    >
                      {teste.titulo}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
