import Image from "next/image";

// Retrato vertical (4:5) para páginas públicas. Sem foto, mostra as iniciais
// sobre um tom da paleta do laboratório — sempre o mesmo tom para a mesma
// pessoa — em vez da silhueta cinza genérica.

const TONS = [
  { fundo: "color-mix(in srgb, var(--color-signal) 16%, var(--color-paper))", tinta: "var(--color-signal)" },
  { fundo: "color-mix(in srgb, var(--color-absorbance) 14%, var(--color-paper))", tinta: "var(--color-absorbance)" },
  { fundo: "color-mix(in srgb, var(--color-reagent) 16%, var(--color-paper))", tinta: "var(--color-reagent)" },
  { fundo: "color-mix(in srgb, var(--color-pyrogallol) 14%, var(--color-paper))", tinta: "var(--color-pyrogallol)" },
];

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter((p) => !/^(de|da|do|dos|das|e)$/i.test(p));
  const a = partes[0]?.[0] ?? "";
  const b = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (a + b).toUpperCase();
}

function tomDe(nome: string) {
  let h = 0;
  for (const c of nome) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TONS[h % TONS.length];
}

export function Retrato({
  nome,
  fotoUrl,
  sizes = "(min-width: 1024px) 22vw, (min-width: 640px) 30vw, 45vw",
  className = "",
  prioridade = false,
}: {
  nome: string;
  fotoUrl: string | null;
  sizes?: string;
  className?: string;
  prioridade?: boolean;
}) {
  const tom = tomDe(nome);
  return (
    <div className={`relative aspect-[4/5] overflow-hidden ${className}`} style={fotoUrl ? undefined : { background: tom.fundo }}>
      {fotoUrl ? (
        <Image
          src={fotoUrl}
          alt={nome}
          fill
          sizes={sizes}
          priority={prioridade}
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
      ) : (
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center font-display text-4xl tracking-tight select-none"
          style={{ color: tom.tinta }}
        >
          {iniciais(nome)}
        </span>
      )}
    </div>
  );
}
