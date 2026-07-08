import { notFound } from "next/navigation";
import Link from "next/link";
import { testes, conteudoTeste } from "@/lib/testes";

export function generateStaticParams() {
  return testes.map((teste) => ({ slug: teste.slug }));
}

export default async function PaginaTeste({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const teste = testes.find((t) => t.slug === slug);
  if (!teste) notFound();

  const conteudo = conteudoTeste(slug);
  const ehLowry = slug.startsWith("lowry-");

  return (
    <article>
      <h1 className="mb-1 text-2xl font-semibold">{teste.titulo}</h1>
      {ehLowry && (
        <p className="mb-4 text-sm">
          <Link
            href="/testes/lowry-cortex-rins/calculadora"
            className="underline"
          >
            Abrir calculadora da curva padrão →
          </Link>
        </p>
      )}
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-black/80 dark:text-white/80">
        {conteudo}
      </div>
    </article>
  );
}
