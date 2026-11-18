// Classifica cada slug de teste (ver content/testes/_indice.json) numa
// "família" que define como a tela de registro de resultado se comporta.
// Fórmula automática só existe onde o manual dá uma fórmula completa e sem
// ambiguidade (Lowry, CAT e SOD). Para os demais, a plataforma registra os
// valores brutos exatamente como no protocolo e o bolsista informa o valor
// final já calculado — evita inventar uma fórmula de conversão que o
// manual não fecha (dependeria de fator de diluição e concentração de
// proteína de outro ensaio).

export type Familia =
  | "curva"
  | "cat"
  | "sod"
  | "simples";

export type CampoBruto = {
  chave: string;
  rotulo: string;
};

/**
 * Branco do reagente: tubo/poço com todos os reagentes e SEM amostra. É um
 * valor da sessão (uma leitura por rodada — mesmo quando a bancada faz
 * duplicata, só uma é registrada no site), não por
 * rato — por isso fica fora da tabela de ratos. O branco DA AMOSTRA, ao
 * contrário, é um por rato e entra como coluna em `camposBrutos`
 * (chave `abs_branco_amostra`).
 */
export type BrancoReagenteConfig = {
  rotulo: string;
  /** Limite superior aceitável do manual (Abs), quando existe. */
  max?: number;
  dica?: string;
};

export type ConfigTeste = {
  familia: Familia;
  unidadeResultado: string;
  /** true = a plataforma calcula o valor final sozinha; false = o bolsista informa. */
  calculoAutomatico: boolean;
  /** Campos brutos por rato, só usado na família "simples". */
  camposBrutos?: CampoBruto[];
  /** Branco do reagente da sessão (sem amostra), quando o ensaio usa. */
  brancoReagente?: BrancoReagenteConfig;
  /** Controle de qualidade da sessão (checado uma vez, não por rato). */
  qc?: {
    rotulo: string;
    min: number;
    max: number;
    unidade: string;
    dica: string;
  };
};

const CONFIG_POR_FAMILIA: Record<Familia, Omit<ConfigTeste, "familia">> = {
  curva: {
    unidadeResultado: "mg proteína/mL",
    calculoAutomatico: true,
    qc: {
      rotulo: "R² da curva padrão (6 pontos de BSA)",
      min: 0.99,
      max: 1,
      unidade: "R²",
      dica:
        "Verificar a solução estoque de BSA, o Reagente de Folin e o tempo de incubação; refazer a curva.",
    },
  },
  cat: {
    // Registro só de absorbância: a plataforma computa a taxa de decaimento
    // (ΔAbs/min). A normalização por proteína fica pra análise no R.
    unidadeResultado: "ΔAbs/min (240 nm)",
    calculoAutomatico: true,
    qc: {
      rotulo: "Absorbância do meio de reação (H₂O₂), sem amostra",
      min: 0.7,
      max: 0.85,
      unidade: "Abs (240 nm)",
      dica: "Se < 0,55: H₂O₂ degradado, descartar e preparar novo meio.",
    },
  },
  sod: {
    // Registro só de absorbância: a plataforma computa a % de inibição em
    // relação ao controle sem amostra. U/mg proteína fica pro R.
    unidadeResultado: "% inibição",
    calculoAutomatico: true,
    qc: {
      rotulo: "Taxa de autooxidação do controle (sem amostra)",
      min: 0.03,
      max: 0.07,
      unidade: "ΔAbs/min (420 nm)",
      dica: "< 0,020: pirogalol degradado. > 0,080: checar pH do TRIS e temperatura.",
    },
  },
  simples: {
    unidadeResultado: "",
    calculoAutomatico: false,
  },
};

// Ensaios da família "simples", por prefixo do slug. O match é pelo prefixo
// mais LONGO (ver `ensaioSimplesDoSlug`). Brancos conferidos contra o manual:
//  - Sulfidrilas (T-SH e NP-SH): branco do reagente (PBS + DTNB; a duplicata
//    é só conferida na bancada, registra-se uma leitura)
//    + branco da amostra por rato (amostra + PBS, sem DTNB).
//  - Carboniladas: branco da amostra por rato (HCl sem DNPH) + branco do
//    reagente (HCl 2 M) — no Infinite o equipamento não zera, subtrai depois.
//  - TBARS: branco do reagente (KCl no lugar da amostra), QC ≤ 0,050.
//  - H₂O₂: branco sem H₂O₂ (tampão dextrose no lugar do sobrenadante), QC ≤ 0,050.
//  - Ácido ascórbico: branco do reagente (tampão citrato/acetato, sem DCIP).
//  - Tióis/dissulfetos: o manual não define branco (só controle positivo de
//    cisteína) — sem branco aqui.
// CAT/SOD/Lowry não estão aqui: CAT e SOD são taxas (o branco não muda a
// inclinação) e no Lowry o branco já é o ponto 0 da curva.
const BRANCO_REAGENTE_DTNB: BrancoReagenteConfig = {
  rotulo: "Branco do reagente (PBS + DTNB, sem amostra)",
  max: 0.1,
  dica: "DTNB contaminado com tióis ou degradado — descartar e preparar nova solução no dia.",
};

const ENSAIOS_SIMPLES: Record<
  string,
  { campos: CampoBruto[]; brancoReagente?: BrancoReagenteConfig }
> = {
  tbars: {
    campos: [{ chave: "abs_amostra", rotulo: "Absorbância da amostra (já zerada pelo branco)" }],
    brancoReagente: {
      rotulo: "Branco (KCl no lugar da amostra)",
      max: 0.05,
      dica: "Se > 0,080: TBA degradado (amarelado) ou contaminado — preparar novo estoque.",
    },
  },
  "sulfidrilas-totais": {
    campos: [
      { chave: "abs_amostra", rotulo: "Absorbância da amostra (T-SH, com DTNB)" },
      { chave: "abs_branco_amostra", rotulo: "Branco da amostra (sem DTNB)" },
    ],
    brancoReagente: BRANCO_REAGENTE_DTNB,
  },
  "sulfidrilas-np": {
    campos: [
      { chave: "abs_amostra", rotulo: "Absorbância da amostra (NP-SH, sobrenadante do ASS + DTNB)" },
      { chave: "abs_branco_amostra", rotulo: "Branco da amostra (sobrenadante do ASS, sem DTNB)" },
    ],
    brancoReagente: BRANCO_REAGENTE_DTNB,
  },
  carboniladas: {
    campos: [
      { chave: "abs_amostra", rotulo: "Absorbância da amostra (com DNPH)" },
      { chave: "abs_branco_amostra", rotulo: "Absorbância do branco da amostra (com HCl)" },
    ],
    brancoReagente: {
      rotulo: "Branco do reagente (HCl 2 M, sem amostra)",
    },
  },
  "tiois-dissulfetos": {
    campos: [
      { chave: "abs_total", rotulo: "Absorbância — determinação total (tióis + dissulfetos)" },
      { chave: "abs_tiois_livres", rotulo: "Absorbância — tióis livres" },
    ],
  },
  "acido-ascorbico": {
    campos: [{ chave: "abs_amostra", rotulo: "Absorbância da amostra (520 nm)" }],
    brancoReagente: {
      rotulo: "Branco do reagente (tampão citrato/acetato, sem DCIP)",
    },
  },
  h2o2: {
    campos: [{ chave: "abs_amostra", rotulo: "Absorbância da amostra (610 nm)" }],
    brancoReagente: {
      rotulo: "Branco sem H₂O₂ (tampão dextrose no lugar do sobrenadante)",
      max: 0.05,
      dica: "Se > 0,080: vermelho de fenol degradado ou solução contaminada.",
    },
  },
};

function ensaioSimplesDoSlug(slug: string) {
  const prefixo = Object.keys(ENSAIOS_SIMPLES)
    .filter((p) => slug.startsWith(p))
    .sort((a, b) => b.length - a.length)[0];
  return prefixo ? ENSAIOS_SIMPLES[prefixo] : null;
}

function familiaDoSlug(slug: string): Familia | null {
  if (slug.startsWith("lowry")) return "curva";
  if (slug.startsWith("cat-")) return "cat";
  if (slug.startsWith("sod-")) return "sod";
  if (ensaioSimplesDoSlug(slug)) return "simples";
  return null; // preparo-amostras-*, valores-referencia-*, tampoes, referências
}

/** Slugs que podem ser designados como teste dentro de um projeto. */
export function ehTesteDesignavel(slug: string): boolean {
  return familiaDoSlug(slug) !== null;
}

// --- Categorias de alíquota (separação em ependorfs por tipo de teste) ---
// O homogeneizado é dividido em um ependorf por categoria de teste em que aquele
// tecido é usado no projeto. Lowry (proteína) é categoria à parte. H₂O₂ usa
// fatias de tecido (não homogenato) → não sai da alíquota do homogeneizado.
export type CategoriaAliquota = "cat" | "sod" | "tbars" | "ponto_final" | "lowry";

export function categoriaAliquota(slug: string): CategoriaAliquota | null {
  const familia = familiaDoSlug(slug);
  if (!familia) return null;
  if (familia === "cat") return "cat";
  if (familia === "sod") return "sod";
  if (familia === "curva") return "lowry"; // Lowry / proteína
  if (slug.startsWith("tbars")) return "tbars";
  if (slug.startsWith("h2o2")) return null; // fatias de tecido, não homogenato
  return "ponto_final"; // carboniladas, sulfidrilas, tióis-dissulfetos, ác. ascórbico
}

export function configDoTeste(slug: string): ConfigTeste | null {
  const familia = familiaDoSlug(slug);
  if (!familia) return null;

  const base = CONFIG_POR_FAMILIA[familia];
  if (familia !== "simples") {
    return { familia, ...base };
  }

  const ensaio = ensaioSimplesDoSlug(slug);
  return {
    familia,
    ...base,
    camposBrutos: ensaio?.campos ?? [],
    brancoReagente: ensaio?.brancoReagente,
  };
}
