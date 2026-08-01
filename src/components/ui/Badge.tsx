// Pílula de status/papel, uniforme em todo o site. Presentacional e sem
// "use client" — pode ser usado tanto em componentes de servidor quanto de
// cliente. As classes de cada tom são literais (não interpoladas) para o
// scanner do Tailwind conseguir enxergá-las.

type Tom =
  | "sucesso" // concluído, aprovado
  | "atencao" // pendente, em andamento (âmbar do reagente)
  | "info" // coautor, informativo (azul de absorbância)
  | "roxo" // categorias secundárias (violeta do pirogalol)
  | "alerta" // erro, bloqueio
  | "neutro"; // ajudante, finalizado, rótulos discretos

const TONS: Record<Tom, string> = {
  sucesso: "bg-sucesso/12 text-sucesso",
  atencao: "bg-reagent/12 text-reagent",
  info: "bg-absorbance/12 text-absorbance",
  roxo: "bg-pyrogallol/12 text-pyrogallol",
  alerta: "bg-alerta/12 text-alerta",
  neutro: "bg-ink/5 text-ink-soft",
};

export function Badge({
  children,
  tom = "neutro",
  className = "",
}: {
  children: React.ReactNode;
  tom?: Tom;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide ${TONS[tom]} ${className}`}
    >
      {children}
    </span>
  );
}
