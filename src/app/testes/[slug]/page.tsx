import { notFound } from "next/navigation";
import Link from "next/link";
import { testes, nomeTecido, tituloSemTecido } from "@/lib/testes";
import { conteudoProtocolo } from "@/lib/protocolo";
import { ProtocoloTeste } from "@/components/ProtocoloTeste";
import CalculadoraReagentes from "./CalculadoraReagentes";
import CalculadoraReagentesDia from "./CalculadoraReagentesDia";

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

  const conteudo = conteudoProtocolo(slug);
  const ehLowry = slug.startsWith("lowry-");
  const ehTampoes = slug === "tampoes-reagentes-gerais";

  return (
    <article>
      <p className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-signal">
        {nomeTecido(teste.tecido)}
      </p>
      <h1 className="mt-1 font-display text-3xl leading-tight text-ink">
        {tituloSemTecido(teste.titulo, teste.tecido)}
      </h1>

      {ehLowry && (
        <Link
          href="/testes/lowry-cortex-rins/calculadora"
          className="mt-3 inline-block border-b border-absorbance text-sm text-absorbance hover:border-ink hover:text-ink"
        >
          Abrir calculadora da curva padrão →
        </Link>
      )}

      {ehTampoes && (
        <div className="mt-6 flex flex-col gap-4">
          <CalculadoraReagentes />
          <CalculadoraReagentesDia />
        </div>
      )}

      <div className="mt-6">
        <ProtocoloTeste conteudo={conteudo} />
      </div>
    </article>
  );
}
