// Cabeçalho de página padrão da área logada: sobrancelha (eyebrow) em mono
// maiúsculo + título em display, com espaço opcional para uma ação à direita
// (ex.: "Novo projeto", "Exportar"). Mesma gramática visual do hall público,
// para as telas internas não parecerem de outro produto.

export function PageHeader({
  eyebrow,
  titulo,
  descricao,
  acao,
}: {
  eyebrow?: string;
  titulo: React.ReactNode;
  descricao?: React.ReactNode;
  acao?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-soft">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-1 font-display text-3xl leading-tight text-ink">
          {titulo}
        </h1>
        {descricao && (
          <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">
            {descricao}
          </p>
        )}
      </div>
      {acao && <div className="shrink-0">{acao}</div>}
    </div>
  );
}
