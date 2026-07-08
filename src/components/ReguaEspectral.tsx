// Assinatura visual do site: uma régua com os comprimentos de onda reais
// que os ensaios do LANC usam (ver content/testes/*.md), posicionados em
// escala real dentro da faixa 240–650 nm. Não é decoração genérica — é o
// espectro de leitura do próprio laboratório.
const COMPRIMENTOS_ONDA = [240, 370, 412, 420, 520, 535, 610, 650];
const MIN_NM = 240;
const MAX_NM = 650;

export function ReguaEspectral({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative h-7 ${className}`}
      role="img"
      aria-label="Régua com os comprimentos de onda usados nos ensaios do LANC, de 240 a 650 nanômetros"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-rule" />
      {COMPRIMENTOS_ONDA.map((nm) => {
        const posicao = ((nm - MIN_NM) / (MAX_NM - MIN_NM)) * 100;
        return (
          <div
            key={nm}
            className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${posicao}%` }}
          >
            <div className="h-1.5 w-px bg-ink-soft/50" />
            <span className="mt-1 font-mono text-[10px] tabular-nums text-ink-soft/70">
              {nm}
            </span>
          </div>
        );
      })}
      <span className="absolute -top-3.5 right-0 font-mono text-[9px] uppercase tracking-wider text-ink-soft/50">
        nm
      </span>
    </div>
  );
}
