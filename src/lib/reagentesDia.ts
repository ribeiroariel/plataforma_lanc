// Reagentes "preparar no dia" por ensaio (seções 9–17 do Manual_LANC),
// para a calculadora por número de amostras da página de tampões/reagentes.
//
// Convenção do manual (verificada em cada protocolo): a seção "PREPARAÇÃO DAS
// SOLUÇÕES" é dimensionada para "10 amostras (+10% de margem)". Portanto:
//   - tipo "escala": as quantidades em `componentesBase10` são a receita para
//     10 amostras (já com brancos/controles e +10% embutidos como o manual
//     dimensionou); a calculadora escala por N/10.
//   - tipo "loteMinimo": a receita é um lote mínimo fixo (limitado pela
//     pesagem/pipetagem), NÃO escala pra baixo; mostramos a receita como está e
//     o volume necessário estimado para N amostras.
//   - tipo "pendente": há inconsistência conhecida no manual e o número correto
//     ainda não foi confirmado (arsenito de sódio) — não entra no cálculo.
//
// N = número de ratos/amostras biológicas. Brancos e controles já estão
// contemplados no dimensionamento do manual para 10 amostras.

import type { Componente } from "@/lib/reagentes";

export type TipoReagenteDia = "escala" | "loteMinimo" | "pendente";

export type ReagenteDia = {
  nome: string;
  tipo: TipoReagenteDia;
  /** Receita para 10 amostras (+10%), escalada por N/10. Só em "escala". */
  componentesBase10?: Componente[];
  /** Receita mínima fixa. Só em "loteMinimo". */
  componentesMinimo?: Componente[];
  /** Receita descrita por texto (quando é concentração-alvo, sem massa fixa). */
  descricao?: string;
  /** Consumo aproximado por amostra, em µL (nota informativa). */
  consumoPorAmostraUl?: number;
  /** Solvente/diluente quando não é água ultrapura (milli-Q). */
  solvente?: string;
  obs?: string;
};

export type EnsaioDia = {
  /** Prefixos de slug (content/testes) que caem neste ensaio. */
  slugPrefixos: string[];
  nome: string;
  reagentes: ReagenteDia[];
};

export const ENSAIOS_DIA: EnsaioDia[] = [
  {
    slugPrefixos: ["cat-"],
    nome: "Catalase (CAT)",
    reagentes: [
      {
        nome: "Meio de reação",
        tipo: "escala",
        componentesBase10: [
          { nome: "Tampão fosfato de potássio 10 mM pH 7,0", quantidade: 2.7, unidade: "mL" },
          { nome: "H₂O₂ 30%", quantidade: 5.4, unidade: "µL" },
        ],
        consumoPorAmostraUl: 240,
        obs: "Frasco fechado com papel alumínio; preparar imediatamente antes do uso.",
      },
    ],
  },
  {
    slugPrefixos: ["sod-"],
    nome: "Superóxido dismutase (SOD)",
    reagentes: [
      {
        nome: "Pirogalol 24 mM em HCl 10 mM",
        tipo: "loteMinimo",
        componentesMinimo: [
          { nome: "Pirogalol", quantidade: 0.00303, unidade: "g" },
          { nome: "HCl 10 mM", quantidade: 1.0, unidade: "mL" },
        ],
        consumoPorAmostraUl: 4,
        obs: "Preparar imediatamente antes do uso e descartar a sobra — oxida rápido. Para 10 amostras usam-se só ~44 µL.",
      },
      {
        nome: "Catalase — solução de trabalho",
        tipo: "loteMinimo",
        componentesMinimo: [
          { nome: "Catalase", quantidade: 0.0062, unidade: "g" },
          { nome: "Tampão TRIS 50 mM + EDTA pH 8,2", quantidade: 650, unidade: "µL" },
        ],
        consumoPorAmostraUl: 6,
        obs: "Manter no gelo, frasco com papel alumínio. Para 10 amostras usam-se ~66 µL.",
      },
    ],
  },
  {
    slugPrefixos: ["carboniladas"],
    nome: "Proteínas carboniladas",
    reagentes: [
      {
        nome: "DNPH 10 mM em HCl 2 M",
        tipo: "escala",
        componentesBase10: [
          { nome: "DNPH", quantidade: 0.0087, unidade: "g" },
          { nome: "HCl 2 M (q.s.p.)", quantidade: 4.4, unidade: "mL" },
        ],
        consumoPorAmostraUl: 400,
        obs: "Fotossensível — pesar e pipetar no escuro (frasco âmbar/papel alumínio). Só as amostras levam DNPH; os brancos levam HCl 2 M.",
      },
      {
        nome: "TCA 20% (m/v)",
        tipo: "escala",
        componentesBase10: [
          { nome: "TCA", quantidade: 2.0, unidade: "g" },
          { nome: "Água ultrapura (q.s.p.)", quantidade: 10, unidade: "mL" },
        ],
        consumoPorAmostraUl: 500,
        obs: "Amostra e branco levam TCA. Dissolver e completar q.s.p. — nunca pesar no volume final.",
      },
      {
        nome: "Guanidina 6 M",
        tipo: "loteMinimo",
        componentesMinimo: [
          { nome: "Cloridrato de guanidina", quantidade: 14.33, unidade: "g" },
        ],
        solvente: "Tampão fosfato de potássio 20 mM pH 2,3 (q.s.p. 25 mL)",
        consumoPorAmostraUl: 600,
        obs: "Preparar no dia. A receita mínima (25 mL) cobre ~40 tubos; para mais, preparar múltiplos lotes.",
      },
    ],
  },
  {
    slugPrefixos: ["sulfidrilas"],
    nome: "Sulfidrilas totais e não-proteicas",
    reagentes: [
      {
        nome: "DTNB 10 mM",
        tipo: "escala",
        componentesBase10: [
          { nome: "DTNB", quantidade: 0.0016, unidade: "g" },
          { nome: "Tampão fosfato de potássio 0,2 M pH 8 (q.s.p.)", quantidade: 400, unidade: "µL" },
        ],
        consumoPorAmostraUl: 30,
        obs: "Frasco com papel alumínio; sensível à luz e à temperatura. Para N pequeno, preparar a receita mínima (a massa fica abaixo do peso prático).",
      },
      {
        nome: "Ácido sulfossalicílico (ASS) 5%",
        tipo: "escala",
        componentesBase10: [
          { nome: "Ácido 5-sulfossalicílico", quantidade: 0.11, unidade: "g" },
          { nome: "Água ultrapura (q.s.p.)", quantidade: 2.2, unidade: "mL" },
        ],
        consumoPorAmostraUl: 200,
        obs: "Só para a fração não-proteica (NP-SH) — precipita as proteínas. Manter em gelo. NÃO usar na determinação de tióis totais.",
      },
    ],
  },
  {
    slugPrefixos: ["tiois-dissulfetos"],
    nome: "Tióis e dissulfetos",
    reagentes: [
      {
        nome: "DTT 3 mM",
        tipo: "escala",
        componentesBase10: [
          { nome: "DTT", quantidade: 0.00046, unidade: "g" },
          { nome: "Tampão TRIS 50 mM pH 9,0 (q.s.p.)", quantidade: 1.0, unidade: "mL" },
        ],
        consumoPorAmostraUl: 100,
        obs: "Oxida rápido no ar — preparar imediatamente antes do uso e manter em gelo.",
      },
      {
        nome: "DTNB 3 mM em tampão acetato pH 5,0",
        tipo: "escala",
        componentesBase10: [
          { nome: "DTNB", quantidade: 0.00119, unidade: "g" },
          { nome: "Tampão acetato 50 mM pH 5,0 (q.s.p.)", quantidade: 1.0, unidade: "mL" },
        ],
        consumoPorAmostraUl: 100,
        obs: "Frasco com papel alumínio.",
      },
      {
        nome: "Arsenito de sódio",
        tipo: "pendente",
        obs: "⚠️ Inconsistência no manual: a receita (0,130 g em 1,0 mL = 1 M) não cobre os 1.500 µL/amostra que o procedimento manda adicionar. Confirme o volume correto por amostra antes de usar — não incluído no cálculo por segurança (reagente ALTAMENTE TÓXICO / cancerígeno Classe 1A, manipular em capela).",
      },
    ],
  },
  {
    slugPrefixos: ["h2o2"],
    nome: "Peróxido de hidrogênio (H₂O₂)",
    reagentes: [
      {
        nome: "Meio de reação",
        tipo: "escala",
        componentesBase10: [
          { nome: "Tampão fosfato de sódio 50 mM pH 7,4", quantidade: 2585, unidade: "µL" },
          { nome: "Peroxidase de rábano (HRP) 8,5 U/mL", quantidade: 55, unidade: "µL" },
          { nome: "Vermelho de fenol 1 mg/mL", quantidade: 55, unidade: "µL" },
        ],
        consumoPorAmostraUl: 245,
        obs: "Proteger da luz; HRP no gelo. Por amostra: 235 µL fosfato + 5 µL HRP + 5 µL vermelho de fenol.",
      },
      {
        nome: "Tampão dextrose 5,5 mM pH 7,0",
        tipo: "loteMinimo",
        componentesMinimo: [
          { nome: "Dextrose (D-glicose)", quantidade: 0.099, unidade: "g" },
          { nome: "Água ultrapura (q.s.p.)", quantidade: 100, unidade: "mL" },
        ],
        obs: "Preparar no dia; usado na incubação das fatias de tecido (não é consumo por amostra simples). Ajustar pH 7,0.",
      },
    ],
  },
  {
    slugPrefixos: ["lowry"],
    nome: "Dosagem de proteínas (Lowry)",
    reagentes: [
      {
        nome: "Reativo C",
        tipo: "escala",
        componentesBase10: [
          { nome: "Reativo A (NaOH + Na₂CO₃)", quantidade: 18.6, unidade: "mL" },
          { nome: "Reativo B1 (CuSO₄·5H₂O 1%)", quantidade: 190, unidade: "µL" },
          { nome: "Reativo B2 (tartarato Na-K 2%)", quantidade: 190, unidade: "µL" },
        ],
        consumoPorAmostraUl: 1000,
        obs: "Dimensionado para 10 amostras + curva-padrão (6 tubos) + 10%. Preparar imediatamente antes do uso.",
      },
    ],
  },
  {
    slugPrefixos: ["acido-ascorbico"],
    nome: "Ácido ascórbico (vitamina C)",
    reagentes: [
      {
        nome: "Tampão citrato/acetato 50 mM pH 4,15 com pHMB",
        tipo: "loteMinimo",
        componentesMinimo: [
          { nome: "Ácido cítrico 0,1 M", quantidade: 63, unidade: "mL" },
          { nome: "Acetato de sódio 0,1 M", quantidade: 37, unidade: "mL" },
        ],
        consumoPorAmostraUl: 300,
        obs: "Lote de 100 mL. Misturar até pH 4,15; adicionar pHMB à concentração final de 0,5 mM (TÓXICO, mercúrio-orgânico — capela, EPI completo). Geladeira, protegido da luz.",
      },
      {
        nome: "Solução de DCIP",
        tipo: "loteMinimo",
        descricao: "Dissolver DCIP no tampão citrato/acetato pH 4,15 até ~0,1 mM (A₅₂₀ 0,50–0,80).",
        consumoPorAmostraUl: 300,
        obs: "Frasco âmbar, geladeira. Validade: 7 dias. Calibrar a absorbância inicial a 520 nm antes de cada experimento.",
      },
      {
        nome: "Padrão de ácido ascórbico 1 mg/mL",
        tipo: "loteMinimo",
        componentesMinimo: [
          { nome: "Ácido ascórbico", quantidade: 1.0, unidade: "mg" },
          { nome: "Tampão citrato/acetato pH 4,15", quantidade: 1.0, unidade: "mL" },
        ],
        obs: "Para a curva-padrão (diluições 0,05–1,0 µg/µL). Oxida em minutos — preparar imediatamente antes do uso, manter em gelo com frasco fechado.",
      },
    ],
  },
];

export type ReagenteDiaEscalado = ReagenteDia & {
  /** Componentes com quantidade recalculada (só em "escala"). */
  componentesEscalados?: Componente[];
  /** Volume total necessário estimado para N amostras (+10%), em µL. */
  necessarioUl?: number;
};

/** Escala os reagentes de um ensaio para N amostras (base do manual = 10). */
export function escalarEnsaioDia(
  ensaio: EnsaioDia,
  nAmostras: number
): ReagenteDiaEscalado[] {
  const fator = nAmostras / 10;
  return ensaio.reagentes.map((r) => {
    const out: ReagenteDiaEscalado = { ...r };
    if (r.tipo === "escala" && r.componentesBase10) {
      out.componentesEscalados = r.componentesBase10.map((c) => ({
        ...c,
        quantidade: c.quantidade * fator,
      }));
    }
    if (r.consumoPorAmostraUl != null) {
      // +10% de margem, igual à convenção do manual.
      out.necessarioUl = r.consumoPorAmostraUl * nAmostras * 1.1;
    }
    return out;
  });
}

/** Ensaio cujos slugPrefixos casam com o slug de um teste, se houver. */
export function ensaioDiaDoSlug(slug: string): EnsaioDia | null {
  return (
    ENSAIOS_DIA.find((e) => e.slugPrefixos.some((p) => slug.startsWith(p))) ??
    null
  );
}
