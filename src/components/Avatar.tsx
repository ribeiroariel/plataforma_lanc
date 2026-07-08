import Image from "next/image";

// Avatar circular: mostra a foto se houver, senão uma silhueta de pessoa
// (em vez de um círculo cinza vazio).
export function Avatar({
  fotoUrl,
  nome,
  tamanho = 44,
  className = "",
}: {
  fotoUrl: string | null;
  nome: string;
  tamanho?: number;
  className?: string;
}) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full border border-rule bg-paper-raised ${className}`}
      style={{ width: tamanho, height: tamanho }}
    >
      {fotoUrl ? (
        <Image
          src={fotoUrl}
          alt={nome}
          width={tamanho}
          height={tamanho}
          className="h-full w-full object-cover"
        />
      ) : (
        <svg
          viewBox="0 0 40 40"
          className="h-full w-full text-ink-soft/45"
          aria-hidden="true"
          fill="currentColor"
        >
          <circle cx="20" cy="15" r="7" />
          <path d="M6 38c0-8 6.5-13 14-13s14 5 14 13v2H6v-2Z" />
        </svg>
      )}
    </div>
  );
}
