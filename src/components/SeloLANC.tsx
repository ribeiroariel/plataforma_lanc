// Selo do cabeçalho, inspirado no brasão do NEJM (referência visual pedida
// pelo Ariel) — mas com um motivo de sinapse/rede neural, não um símbolo
// médico genérico, mantendo a identidade do próprio laboratório.
export function SeloLANC({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
    >
      <circle cx="20" cy="20" r="18" strokeWidth="1.2" />
      <circle cx="20" cy="20" r="14.5" strokeWidth="0.6" opacity="0.5" />
      <g strokeWidth="1.1" strokeLinecap="round">
        <path d="M13 26 L18 15 L27 13" />
        <path d="M18 15 L23 24" />
        <path d="M23 24 L27 13" />
      </g>
      <g fill="currentColor" stroke="none">
        <circle cx="13" cy="26" r="1.6" />
        <circle cx="18" cy="15" r="1.6" />
        <circle cx="27" cy="13" r="1.6" />
        <circle cx="23" cy="24" r="1.6" />
      </g>
    </svg>
  );
}
