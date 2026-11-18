// Remonta a cada troca de seção (ver docs de template.js): o conteúdo novo
// entra com um fade curto em vez de "piscar" no lugar do anterior.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="anim-entrada">{children}</div>;
}
