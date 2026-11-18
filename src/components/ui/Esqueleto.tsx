// Blocos de carregamento para os loading.tsx: mostram a forma da página
// enquanto o servidor busca os dados, em vez de a tela parecer travada.

export function Esqueleto({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`esqueleto ${className}`} />;
}

export function EsqueletoPagina({
  largura = "max-w-5xl",
  cartoes = 3,
  linhas = 5,
}: {
  largura?: string;
  cartoes?: number;
  linhas?: number;
}) {
  return (
    <main
      className={`mx-auto w-full ${largura} px-4 py-10 sm:px-6`}
      aria-busy="true"
      aria-label="Carregando"
    >
      <Esqueleto className="h-3 w-28" />
      <Esqueleto className="mt-3 h-9 w-2/3 max-w-md" />
      <Esqueleto className="mt-3 h-4 w-1/2 max-w-sm" />
      {cartoes > 0 && (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: cartoes }, (_, i) => (
            <Esqueleto key={i} className="h-24" />
          ))}
        </div>
      )}
      <div className="mt-8 flex flex-col gap-2">
        {Array.from({ length: linhas }, (_, i) => (
          <Esqueleto key={i} className="h-14" />
        ))}
      </div>
    </main>
  );
}
