import Link from "next/link";
import { testesPorTecido, nomeTecido } from "@/lib/testes";
import { getUsuarioAtual } from "@/lib/supabase/profile";

export default async function LayoutTestes({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await getUsuarioAtual();

  if (usuario && !usuario.aprovado) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <p className="text-ink-soft">
          Seu cadastro está aguardando aprovação da coordenação do
          laboratório.
        </p>
      </main>
    );
  }

  const grupos = testesPorTecido();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:gap-12">
      <aside className="shrink-0 lg:w-64">
        <nav className="flex flex-col gap-6 border-b border-rule pb-6 text-sm lg:border-b-0 lg:border-r lg:pr-6 lg:pb-0">
          {Array.from(grupos.entries()).map(([tecido, lista]) => (
            <div key={tecido}>
              <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft">
                {nomeTecido(tecido)}
              </p>
              <ul className="flex flex-col gap-1.5">
                {lista.map((teste) => (
                  <li key={teste.slug}>
                    <Link
                      href={`/testes/${teste.slug}`}
                      className="text-ink-soft transition-colors hover:text-absorbance"
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
