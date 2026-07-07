// Classifica cada slug de teste (ver content/testes/_indice.json) numa
// "família" que define como a tela de registro de resultado se comporta.
// Fórmula automática só existe onde o manual dá uma fórmula completa e sem
// ambiguidade (Lowry — já tem calculadora própria —, CAT e SOD). Para os
// demais, a plataforma registra os valores brutos exatamente como no
// protocolo e o bolsista informa o valor final já calculado — evita
// inventar uma fórmula de conversão que o manual não fecha (dependeria de
// fator de diluição e concentração de proteína de outro ensaio).

export type Familia =
  | "cat"
  | "sod"
  | "simples";

export type CampoBruto = {
  chave: string;
  rotulo: string;
};

export type ConfigTeste = {
  familia: Familia;
  unidadeResultado: string;
  /** true = a plataforma calcula o valor final sozinha; false = o bolsista informa. */
  calculoAutomatico: boolean;
  /** Campos brutos por rato, só usado na família "simples". */
  camposBrutos?: CampoBruto[];
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
  cat: {
    unidadeResultado: "µmol H₂O₂·min⁻¹·mg proteína⁻¹",
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
    unidadeResultado: "U·mg proteína⁻¹",
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

const CAMPOS_BRUTOS_POR_SLUG_PREFIXO: Record<string, CampoBruto[]> = {
  tbars: [{ chave: "abs_amostra", rotulo: "Absorbância da amostra (já zerada pelo branco)" }],
  sulfidrilas: [{ chave: "abs_amostra", rotulo: "Absorbância da amostra (T-SH)" }],
  carboniladas: [
    { chave: "abs_amostra", rotulo: "Absorbância da amostra (com DNPH)" },
    { chave: "abs_branco_amostra", rotulo: "Absorbância do branco da amostra (com HCl)" },
  ],
  "tiois-dissulfetos": [
    { chave: "abs_total", rotulo: "Absorbância — determinação total (tióis + dissulfetos)" },
    { chave: "abs_tiois_livres", rotulo: "Absorbância — tióis livres" },
  ],
  "acido-ascorbico": [{ chave: "abs_amostra", rotulo: "Absorbância da amostra (520 nm)" }],
  h2o2: [{ chave: "abs_amostra", rotulo: "Absorbância da amostra (610 nm)" }],
};

function familiaDoSlug(slug: string): Familia | null {
  if (slug.startsWith("lowry")) return null; // tem calculadora própria, fora deste fluxo
  if (slug.startsWith("cat-")) return "cat";
  if (slug.startsWith("sod-")) return "sod";
  for (const prefixo of Object.keys(CAMPOS_BRUTOS_POR_SLUG_PREFIXO)) {
    if (slug.startsWith(prefixo)) return "simples";
  }
  return null; // preparo-amostras-*, valores-referencia-*, tampoes, referências
}

/**
 * Slugs que podem ser designados como teste dentro de um projeto.
 * Lowry fica de fora por enquanto: a calculadora dele salva em
 * curvas_lowry (por bolsista, sem rato/grupo/projeto) e ainda não foi
 * migrada pro esquema de resultados_teste por rato — integrar isso é um
 * próximo passo, não redesenhar às pressas agora.
 */
export function ehTesteDesignavel(slug: string): boolean {
  return familiaDoSlug(slug) !== null;
}

export function configDoTeste(slug: string): ConfigTeste | null {
  const familia = familiaDoSlug(slug);
  if (!familia) return null;

  const base = CONFIG_POR_FAMILIA[familia];
  if (familia !== "simples") {
    return { familia, ...base };
  }

  const prefixo = Object.keys(CAMPOS_BRUTOS_POR_SLUG_PREFIXO).find((p) =>
    slug.startsWith(p)
  );
  const camposBrutos = prefixo ? CAMPOS_BRUTOS_POR_SLUG_PREFIXO[prefixo] : [];

  return { familia, ...base, camposBrutos };
}
