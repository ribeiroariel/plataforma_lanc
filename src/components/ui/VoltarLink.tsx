import Link from "next/link";

// Link de retorno padrão (seta + rótulo) no topo das telas de detalhe. A seta
// é decorativa e fica escondida de leitores de tela; o rótulo já diz o destino.

export function VoltarLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-absorbance"
    >
      <span aria-hidden="true">←</span>
      {children}
    </Link>
  );
}
