import Link from "next/link";
import { getUsuarioAtual } from "@/lib/supabase/profile";
import { PageHeader } from "@/components/ui/PageHeader";

const ATALHOS = [
  {
    href: "/meus-testes",
    titulo: "Meus testes",
    descricao:
      "Os testes designados a você — como responsável ou ajudante — em todos os projetos, com o andamento de cada um.",
  },
  {
    href: "/projetos",
    titulo: "Meus projetos",
    descricao:
      "Crie projetos, defina grupos experimentais, designe testes à equipe e registre os resultados dos ensaios.",
  },
  {
    href: "/testes",
    titulo: "Protocolos de ensaios",
    descricao:
      "Manual de técnicas do laboratório — princípio, reagentes, procedimento e controle de qualidade de cada teste bioquímico.",
  },
  {
    href: "/perfil",
    titulo: "Meu perfil",
    descricao:
      "Foto e apresentação que aparecem no carrossel público do laboratório na página inicial.",
  },
];

export default async function AreaBolsista() {
  const usuario = await getUsuarioAtual();

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <PageHeader eyebrow="Área do bolsista" titulo={`Olá, ${usuario?.nome ?? ""}`} />

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {ATALHOS.map((atalho) => (
          <Link
            key={atalho.href}
            href={atalho.href}
            className="group flex flex-col rounded border border-rule bg-paper-raised p-5 transition-colors hover:border-absorbance"
          >
            <span className="font-display text-lg text-ink transition-colors group-hover:text-absorbance">
              {atalho.titulo}
            </span>
            <span className="mt-2 text-sm leading-relaxed text-ink-soft">
              {atalho.descricao}
            </span>
            <span className="mt-4 inline-flex items-center gap-1 font-mono text-xs text-absorbance">
              Acessar
              <span
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-0.5"
              >
                →
              </span>
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
