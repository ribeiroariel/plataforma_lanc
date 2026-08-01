// Título de seção interna — o rótulo mono maiúsculo que separa blocos dentro
// de uma página (Grupos experimentais, Membros, Testes designados...). Aceita
// uma contagem opcional à direita e uma ação (ex.: link "editar").

export function SectionTitle({
  children,
  contagem,
  acao,
  className = "",
}: {
  children: React.ReactNode;
  contagem?: number | string;
  acao?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-3 flex items-baseline justify-between gap-3 ${className}`}>
      <h2 className="font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
        {children}
        {contagem !== undefined && (
          <span className="ml-2 text-ink-soft/60">{contagem}</span>
        )}
      </h2>
      {acao && <div className="shrink-0">{acao}</div>}
    </div>
  );
}
