// Ilustração-marca do laboratório: um motivo de espécies reativas de
// oxigênio / equilíbrio redox (o eixo comum de toda a pesquisa do LANC).
// Usada como imagem-padrão de notícias que ainda não têm uma figura
// própria — dá identidade visual sem depender de fotos de terceiros.
// "variante" muda o acento conforme o tema da notícia.

type Variante = "redox" | "planta" | "cerebro";

export function IlustracaoRedox({
  className = "",
  variante = "redox",
}: {
  className?: string;
  variante?: Variante;
}) {
  const acento =
    variante === "planta"
      ? "var(--color-reagent)"
      : variante === "cerebro"
      ? "var(--color-pyrogallol)"
      : "var(--color-signal)";

  return (
    <svg
      viewBox="0 0 400 240"
      className={className}
      role="img"
      aria-label="Ilustração de equilíbrio redox"
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="400" height="240" fill="var(--color-paper)" />
      <g stroke="var(--color-ink-soft)" strokeOpacity="0.25" strokeWidth="1" fill="none">
        {/* rede de ligações moleculares ao fundo */}
        <path d="M40 200 L110 150 L90 80 L170 60 L240 100 L230 180 L310 190 L360 120" />
        <path d="M110 150 L170 60" />
        <path d="M240 100 L310 60 L360 120" />
        <path d="M90 80 L40 60" />
      </g>
      <g fill="var(--color-ink-soft)" fillOpacity="0.3">
        {[
          [40, 200], [110, 150], [90, 80], [170, 60],
          [240, 100], [230, 180], [310, 190], [360, 120],
          [310, 60], [40, 60],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="3.5" />
        ))}
      </g>
      {/* molécula em destaque: O–O com radical */}
      <g>
        <circle cx="200" cy="130" r="34" fill={acento} fillOpacity="0.12" />
        <circle cx="184" cy="130" r="15" fill="none" stroke={acento} strokeWidth="2.5" />
        <circle cx="216" cy="130" r="15" fill="none" stroke={acento} strokeWidth="2.5" />
        <line x1="199" y1="130" x2="201" y2="130" stroke={acento} strokeWidth="2.5" />
        <circle cx="230" cy="112" r="3" fill={acento} />
        <text
          x="200"
          y="185"
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize="13"
          fill="var(--color-ink-soft)"
          letterSpacing="1"
        >
          O₂•⁻
        </text>
      </g>
    </svg>
  );
}

// Escolhe a variante da ilustração a partir do texto da notícia.
export function varianteNoticia(titulo: string, resumo: string): Variante {
  const t = `${titulo} ${resumo}`.toLowerCase();
  if (/myrcia|planta|extrato|nativa|fenólic/.test(t)) return "planta";
  if (/depress|cerebr|neuro|hipocampo|córtex|cortex/.test(t)) return "cerebro";
  return "redox";
}
