// Separação de alíquotas do homogeneizado em ependorfs, um por categoria de
// teste. Client+server safe.
import { categoriaAliquota, type CategoriaAliquota } from "@/lib/tiposTeste";
import { testes as catalogoTestes, type Tecido } from "@/lib/tecidos";

// Volume de amostra (homogenato/sobrenadante) a separar por teste, em µL.
// Calibrado com a prática de bancada do Ariel (sacrifício 09/2026): o volume
// depende do TIPO de tecido, não só do teste.
//   • tecidos sólidos (fígado, córtex, rim, hipocampo, cerebelo): 100 µL por
//     teste, exceto carboniladas (200 µL).
//   • plasma: 300 µL por teste.
//   • eritrócitos: AINDA NÃO calibrado (a prática usa diluição 1:50 → 1 mL, que
//     é outra lógica, não peso→tampão); por ora cai no fallback do manual
//     abaixo. Modelar a diluição num passo posterior.
// CAT e SOD ainda multiplicam por 5 (ver MULTIPLICADOR) — os valores aqui são
// por réplica única.
const VOLUME_SOLIDO_PADRAO_UL = 100;
const VOLUME_SOLIDO_CARBONILADAS_UL = 200;
const VOLUME_PLASMA_UL = 300;

// Tecidos sólidos homogeneizados (peso → tampão). Plasma e eritrócitos são
// frações de sangue e seguem regra própria (ver acima).
const TECIDOS_SOLIDOS: ReadonlySet<Tecido> = new Set<Tecido>([
  "figado",
  "cortex",
  "hipocampo",
  "cerebelo",
  "rins",
]);

// Fallback (valores por teste do manual) para tecidos ainda não recalibrados —
// hoje só eritrócitos. ⚠️ CALIBRÁVEL enquanto a diluição não for modelada.
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
// órgão). Cada órgão mapeia para o seu próprio tecido de designação — antes
// rim/córtex/hipocampo caíam todos em "cortex-rins" e o sistema de alíquotas
// não conseguia separar os testes designados para cada um. ⚠️ CALIBRÁVEL.
// Pâncreas não tem teste bioquímico designável.
export const ORGAO_PARA_TECIDO: Record<string, Tecido | null> = {
  figado: "figado",
  rim_esquerdo: "rins",
  rim_direito: "rins",
  cortex: "cortex",
  hipocampo: "hipocampo",
  cerebelo: "cerebelo",
  plasma: "plasma",
  eritrocito: "eritrocitos",
  pancreas: null,
};

export const ROTULO_CATEGORIA: Record<CategoriaAliquota, string> = {
  cat: "Catalase (CAT)",
  sod: "Superóxido dismutase (SOD)",
  tbars: "TBARS",
  ponto_final: "Ponto final",
  lowry: "Proteína (Lowry)",
};

// Volume de amostra por teste (µL), calibrado por tecido. Ver comentário no
// topo do arquivo. O `tecido` é o do órgão dissecado (ORGAO_PARA_TECIDO).
function volumeDoSlug(slug: string, tecido: Tecido): number {
  if (TECIDOS_SOLIDOS.has(tecido)) {
    return slug.startsWith("carboniladas")
      ? VOLUME_SOLIDO_CARBONILADAS_UL
      : VOLUME_SOLIDO_PADRAO_UL;
  }
  if (tecido === "plasma") return VOLUME_PLASMA_UL;
  // Eritrócitos e qualquer tecido ainda não calibrado: valores do manual.
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
    atual.volume += volumeDoSlug(slug, tecido) * mult;
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
