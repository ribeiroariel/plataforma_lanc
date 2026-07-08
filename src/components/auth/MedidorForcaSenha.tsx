function calcularForca(senha: string): { nivel: 0 | 1 | 2 | 3; rotulo: string; cor: string } {
  if (!senha) return { nivel: 0, rotulo: "", cor: "transparent" };

  let pontos = 0;
  if (senha.length >= 8) pontos++;
  if (senha.length >= 12) pontos++;
  if (/[a-z]/.test(senha) && /[A-Z]/.test(senha)) pontos++;
  if (/\d/.test(senha)) pontos++;
  if (/[^A-Za-z0-9]/.test(senha)) pontos++;

  if (pontos <= 1) return { nivel: 1, rotulo: "Fraca", cor: "var(--color-alerta)" };
  if (pontos <= 3) return { nivel: 2, rotulo: "Média", cor: "var(--color-reagent)" };
  return { nivel: 3, rotulo: "Forte", cor: "var(--color-absorbance)" };
}

export function MedidorForcaSenha({ senha }: { senha: string }) {
  const { nivel, rotulo, cor } = calcularForca(senha);

  if (!senha) return null;

  return (
    <div className="flex items-center gap-2 text-xs">
      <div
        className="flex flex-1 gap-1"
        role="meter"
        aria-valuenow={nivel}
        aria-valuemin={0}
        aria-valuemax={3}
        aria-label="Força da senha"
      >
        {[1, 2, 3].map((passo) => (
          <span
            key={passo}
            className="h-1.5 flex-1 rounded-full transition-colors"
            style={{ backgroundColor: passo <= nivel ? cor : "var(--color-rule)" }}
          />
        ))}
      </div>
      <span style={{ color: cor }} className="font-mono font-medium">
        {rotulo}
      </span>
    </div>
  );
}
