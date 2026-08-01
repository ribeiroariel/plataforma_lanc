// Estado vazio consistente: moldura tracejada, mensagem em display e, quando
// há o que fazer, uma ação. Um estado vazio é um convite para agir — por isso
// aceita uma chamada opcional, não só um texto morto.

export function EmptyState({
  titulo,
  descricao,
  acao,
  className = "",
}: {
  titulo: React.ReactNode;
  descricao?: React.ReactNode;
  acao?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded border border-dashed border-rule px-6 py-12 text-center ${className}`}
    >
      <p className="font-display text-lg text-ink-soft">{titulo}</p>
      {descricao && (
        <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-ink-soft/80">
          {descricao}
        </p>
      )}
      {acao && <div className="mt-4 flex justify-center">{acao}</div>}
    </div>
  );
}
