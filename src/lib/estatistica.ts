export type Ponto = { x: number; y: number };

export type Regressao = {
  inclinacao: number;
  intercepto: number;
  rQuadrado: number;
};

/** Regressão linear simples (mínimos quadrados) + R². */
export function regressaoLinear(pontos: Ponto[]): Regressao {
  const n = pontos.length;
  const somaX = pontos.reduce((s, p) => s + p.x, 0);
  const somaY = pontos.reduce((s, p) => s + p.y, 0);
  const mediaX = somaX / n;
  const mediaY = somaY / n;

  let numerador = 0;
  let denominador = 0;
  for (const p of pontos) {
    numerador += (p.x - mediaX) * (p.y - mediaY);
    denominador += (p.x - mediaX) ** 2;
  }
  const inclinacao = denominador === 0 ? 0 : numerador / denominador;
  const intercepto = mediaY - inclinacao * mediaX;

  let ssRes = 0;
  let ssTot = 0;
  for (const p of pontos) {
    const previsto = inclinacao * p.x + intercepto;
    ssRes += (p.y - previsto) ** 2;
    ssTot += (p.y - mediaY) ** 2;
  }
  const rQuadrado = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { inclinacao, intercepto, rQuadrado };
}
