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
      <main className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-black/70 dark:text-white/70">
          Seu cadastro está aguardando aprovação da coordenação do
          laboratório.
        </p>
      </main>
    );
  }

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
                      href={`/testes/${teste.slug}`}
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
