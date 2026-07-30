// Aparelho de leitura e recipiente escolhidos antes de começar um teste.
// A escolha do recipiente muda o volume de reagente e de amostra por poço/tubo
// (ver FATOR_RECIPIENTE), e por isso escala as calculadoras de reagente do dia.
// Cada aparelho só oferece os recipientes compatíveis (RECIPIENTES_POR_APARELHO):
//   - Leitor de microplaca Infinite 200 Pro → microplaca de 96 ou 24 poços;
//   - Espectrofotômetro UV-VIS → microcubeta ou cubeta padrão.
//
// FATORES (base = microplaca de 96 poços = 1×), informados pelo laboratório:
//   microplaca 96 = 1×; microplaca 24 = 6×; microcubeta = 3×; cubeta padrão = 10×.
// O fator multiplica o volume por amostra (reagente e amostra) nas calculadoras.

export type Aparelho = "infinite_200pro" | "uv_vis";

export type Recipiente =
  | "microplaca_96"
  | "microplaca_24"
  | "microcubeta"
  | "cubeta_padrao";

export const APARELHOS: { valor: Aparelho; rotulo: string }[] = [
  { valor: "infinite_200pro", rotulo: "Leitor de microplaca Infinite 200 Pro (TECAN)" },
  { valor: "uv_vis", rotulo: "Espectrofotômetro UV-VIS" },
];

export const RECIPIENTES: {
  valor: Recipiente;
  rotulo: string;
  fator: number;
}[] = [
  { valor: "microplaca_96", rotulo: "Microplaca 96 poços", fator: 1 },
  { valor: "microplaca_24", rotulo: "Microplaca 24 poços", fator: 6 },
  { valor: "microcubeta", rotulo: "Microcubeta", fator: 3 },
  { valor: "cubeta_padrao", rotulo: "Cubeta padrão", fator: 10 },
];

/** Recipientes compatíveis com cada aparelho (o UI filtra por aqui). */
export const RECIPIENTES_POR_APARELHO: Record<Aparelho, Recipiente[]> = {
  infinite_200pro: ["microplaca_96", "microplaca_24"],
  uv_vis: ["microcubeta", "cubeta_padrao"],
};

export function ehAparelho(v: string | null | undefined): v is Aparelho {
  return v === "infinite_200pro" || v === "uv_vis";
}

export function ehRecipiente(v: string | null | undefined): v is Recipiente {
  return (
    v === "microplaca_96" ||
    v === "microplaca_24" ||
    v === "microcubeta" ||
    v === "cubeta_padrao"
  );
}

export function nomeAparelho(v: Aparelho | null | undefined): string {
  return APARELHOS.find((a) => a.valor === v)?.rotulo ?? "";
}

export function nomeRecipiente(v: Recipiente | null | undefined): string {
  return RECIPIENTES.find((r) => r.valor === v)?.rotulo ?? "";
}

/** Fator de volume do recipiente (microplaca 96 = 1). Fora da lista → 1. */
export function fatorRecipiente(v: Recipiente | null | undefined): number {
  return RECIPIENTES.find((r) => r.valor === v)?.fator ?? 1;
}

/** Nome do aparelho em inglês, para o "Instrument" da planilha de transparência. */
export function nomeAparelhoEn(v: Aparelho | null | undefined): string {
  if (v === "infinite_200pro") return "TECAN Infinite 200 Pro microplate reader";
  if (v === "uv_vis") return "UV-Vis spectrophotometer";
  return "";
}
