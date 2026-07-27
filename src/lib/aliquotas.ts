// Separação de alíquotas do homogeneizado em ependorfs, um por categoria de
// teste. Client+server safe.
import { categoriaAliquota, type CategoriaAliquota } from "@/lib/tiposTeste";
import { testes as catalogoTestes, type Tecido } from "@/lib/tecidos";

// Volume de amostra (homogenato/sobrenadante) por teste, em µL — extraído do
// campo "amostra" do procedimento do manual (leitura convencional).
// ⚠️ CALIBRÁVEL: revisar com o Ariel/manual antes de confiar. Onde o ensaio usa
// amostra + branco/duplicata, aqui está só a amostra principal (ver PR fatia 4).
export const VOLUME_AMOSTRA_UL: Record<string, number> = {
  cat: 10, // 10 µL da amostra diluída
  sod: 10, // 10 µL de sobrenadante na diluição
  tbars: 200, // 200 µL de sobrenadante
  carboniladas: 200, // 200 µL de homogenato (+ 200 do branco — não somado aqui)
  sulfidrilas: 50, // 50 µL (T-SH); NP-SH usa 200 µL — não somado aqui
  "tiois-dissulfetos": 200, // 200 µL (total); tióis livres +200 — não somado
  "acido-ascorbico": 600, // 600 µL (convencional); Infinite usa 125 µL
  lowry: 10, // 10 µL de homogenato
};

// CAT e SOD: multiplicar o volume por 5 (margem de réplicas), a pedido do Ariel.
const MULTIPLICADOR: Partial<Record<CategoriaAliquota, number>> = {
  cat: 5,
  sod: 5,
};

// Órgão dissecável → tecido de análise (define quais testes se aplicam ao
// órgão). ⚠️ CALIBRÁVEL. Pâncreas não tem teste bioquímico designável.
export const ORGAO_PARA_TECIDO: Record<string, Tecido | null> = {
  figado: "figado",
  rim: "cortex-rins",
  cortex: "cortex-rins",
  hipocampo: "cortex-rins",
  plasma: "eritrocitos-plasma",
  eritrocito: "eritrocitos-plasma",
  pancreas: null,
};

export const ROTULO_CATEGORIA: Record<CategoriaAliquota, string> = {
  cat: "Catalase (CAT)",
  sod: "Superóxido dismutase (SOD)",
  tbars: "TBARS",
  ponto_final: "Ponto final",
  lowry: "Proteína (Lowry)",
};

function volumeDoSlug(slug: string): number {
  const chave = Object.keys(VOLUME_AMOSTRA_UL).find((k) => slug.startsWith(k));
  return chave ? VOLUME_AMOSTRA_UL[chave] : 0;
}

function tecidoDoSlug(slug: string): string | null {
  return catalogoTestes.find((t) => t.slug === slug)?.tecido ?? null;
}

export type EpendorfCategoria = {
  categoria: CategoriaAliquota;
  volumeUl: number;
  testes: string[];
};

// Dado os testes designados no projeto e o órgão dissecado, devolve os ependorfs
// (um por categoria de teste que se aplica ao tecido daquele órgão), com o
// volume total de homogenato a separar em cada.
export function ependorfsParaOrgao(
  slugsDesignados: string[],
  orgao: string
): EpendorfCategoria[] {
  const tecido = ORGAO_PARA_TECIDO[orgao];
  if (!tecido) return [];

  const porCategoria = new Map<
    CategoriaAliquota,
    { volume: number; testes: string[] }
  >();
  for (const slug of slugsDesignados) {
    if (tecidoDoSlug(slug) !== tecido) continue;
    const cat = categoriaAliquota(slug);
    if (!cat) continue;
    const mult = MULTIPLICADOR[cat] ?? 1;
    const atual = porCategoria.get(cat) ?? { volume: 0, testes: [] };
    atual.volume += volumeDoSlug(slug) * mult;
    atual.testes.push(slug);
    porCategoria.set(cat, atual);
  }

  const ordem: CategoriaAliquota[] = [
    "cat",
    "sod",
    "tbars",
    "ponto_final",
    "lowry",
  ];
  return ordem
    .filter((c) => porCategoria.has(c))
    .map((c) => ({
      categoria: c,
      volumeUl: porCategoria.get(c)!.volume,
      testes: porCategoria.get(c)!.testes,
    }));
}
