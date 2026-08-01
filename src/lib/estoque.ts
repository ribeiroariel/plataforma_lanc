// Constantes do estoque de reagentes/materiais do laboratório: categorias
// (tópicos), locais físicos e unidades. Usadas na aba de estoque e no abate por
// consumo.

export type Localizacao = "geladeira" | "freezer" | "armario_uso" | "armario_pa";

export const LOCALIZACOES: { valor: Localizacao; rotulo: string }[] = [
  { valor: "geladeira", rotulo: "Geladeira" },
  { valor: "freezer", rotulo: "Freezer" },
  { valor: "armario_uso", rotulo: "Armário de uso" },
  { valor: "armario_pa", rotulo: "Armário de reagentes P.A." },
];

// Tópicos do estoque. 'solucao' são os reagentes prontos que o consumo abate.
export type Categoria = "solucao" | "pa" | "ponteira" | "material";

export const CATEGORIAS: {
  valor: Categoria;
  rotulo: string;
  descricao: string;
  unidadePadrao: Unidade;
}[] = [
  {
    valor: "solucao",
    rotulo: "Reagentes de estoque",
    descricao: "Soluções e tampões prontos. São os que o consumo dos testes abate.",
    unidadePadrao: "mL",
  },
  {
    valor: "pa",
    rotulo: "Reagentes P.A. (puros)",
    descricao: "Reagentes puros — mL, L, g ou kg.",
    unidadePadrao: "g",
  },
  {
    valor: "ponteira",
    rotulo: "Ponteiras e eppendorfs",
    descricao: "Cada tipo de ponteira e eppendorf, por contagem.",
    unidadePadrao: "un",
  },
  {
    valor: "material",
    rotulo: "Materiais de uso",
    descricao: "Tubos de ensaio, béqueres, erlenmeyers e afins, por contagem.",
    unidadePadrao: "un",
  },
];

export type Unidade = "mL" | "L" | "g" | "kg" | "un";
export const UNIDADES: Unidade[] = ["mL", "L", "g", "kg", "un"];

export function ehLocalizacao(v: string | null | undefined): v is Localizacao {
  return (
    v === "geladeira" || v === "freezer" || v === "armario_uso" || v === "armario_pa"
  );
}

export function ehCategoria(v: string | null | undefined): v is Categoria {
  return v === "solucao" || v === "pa" || v === "ponteira" || v === "material";
}

export function ehUnidade(v: string | null | undefined): v is Unidade {
  return v === "mL" || v === "L" || v === "g" || v === "kg" || v === "un";
}

export function nomeLocalizacao(v: string | null | undefined): string {
  return LOCALIZACOES.find((l) => l.valor === v)?.rotulo ?? "—";
}

export function nomeCategoria(v: string | null | undefined): string {
  return CATEGORIAS.find((c) => c.valor === v)?.rotulo ?? "Outros";
}

/** Formata quantidade + unidade de forma legível. */
export function fmtQuantidade(
  q: number | null | undefined,
  unidade: string | null | undefined
): string {
  if (q == null || !Number.isFinite(q)) return "—";
  const u = unidade || "";
  const casas = Math.abs(q) < 10 && u !== "un" ? 2 : q % 1 === 0 ? 0 : 1;
  return `${q.toLocaleString("pt-BR", { maximumFractionDigits: casas })} ${u}`.trim();
}

/** Converte µL para a unidade de volume do item (mL ou L). Fora disso, null. */
export function ulParaUnidade(ul: number, unidade: string | null | undefined): number | null {
  if (unidade === "mL") return ul / 1000;
  if (unidade === "L") return ul / 1_000_000;
  return null; // massa/contagem não é abatível por volume consumido.
}
