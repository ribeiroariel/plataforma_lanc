// Receitas de tampões e reagentes gerais do laboratório (seção 37 do
// Manual_LANC), estruturadas para a calculadora de escala por volume da página
// /testes/tampoes-reagentes-gerais. Os números são transcritos LITERALMENTE do
// manual — a única lógica aqui é regra de três: cada quantidade escala linear
// com o volume final desejado (fator = volumeAlvo / volumeBase).
//
// Só entram aqui as soluções que escalam de forma linear e inequívoca (um
// volume final fixo, massas/volumes proporcionais). O tampão fosfato de
// potássio 10 mM pH 7,0 (37.8) não entra como produto final porque é feito por
// mistura por titulação de duas soluções até o pH — em vez disso, suas
// Soluções A e B entram separadamente (cada uma escala normal).

export type UnidadeComponente = "g" | "mg" | "mL" | "µL";

export type Componente = {
  nome: string;
  quantidade: number;
  unidade: UnidadeComponente;
};

export type Reagente = {
  id: string; // número da seção do manual, ex. "37.2"
  nome: string;
  /** Volume final da receita base, em mL. */
  volumeBaseMl: number;
  componentes: Componente[];
  /** Solvente/diluente quando não é água ultrapura (milli-Q). */
  solvente?: string;
  /** true = completar q.s.p. até o volume final; false = dissolver no volume. */
  qsp: boolean;
  /** pH alvo, quando houver ajuste. */
  ph?: string;
  /** Armazenamento e validade, como no manual. */
  armazenamento?: string;
  /** Precisa ser preparada no dia do experimento. */
  preparoNoDia?: boolean;
  /** Observações relevantes do manual (aquecimento, exotermia, etc.). */
  obs?: string;
};

export const REAGENTES: Reagente[] = [
  {
    id: "37.1",
    nome: "Tampão fosfato de sódio 20 mM com KCl 140 mM pH 7,4",
    volumeBaseMl: 250,
    componentes: [
      { nome: "Fosfato de sódio monobásico anidro", quantidade: 0.6, unidade: "g" },
      { nome: "Fosfato de sódio dibásico anidro (Na₂HPO₄)", quantidade: 0.71, unidade: "g" },
      { nome: "KCl", quantidade: 2.61, unidade: "g" },
    ],
    qsp: true,
    ph: "7,4 (HCl 1 M ou NaOH 1 M)",
    armazenamento: "Geladeira. Validade: 30 dias.",
  },
  {
    id: "37.1b",
    nome: "Tampão fosfato de sódio 50 mM pH 7,4 (meio de reação do H₂O₂)",
    volumeBaseMl: 100,
    componentes: [
      { nome: "NaH₂PO₄ anidro (monobásico)", quantidade: 0.233, unidade: "g" },
      { nome: "Na₂HPO₄ anidro (dibásico)", quantidade: 0.434, unidade: "g" },
    ],
    qsp: true,
    ph: "7,4 (HCl 1 M ou NaOH 1 M)",
    armazenamento: "Geladeira. Validade: 30 dias.",
  },
  {
    id: "37.2",
    nome: "KCl 1,15% (m/v)",
    volumeBaseMl: 50,
    componentes: [{ nome: "KCl", quantidade: 0.575, unidade: "g" }],
    qsp: true,
    armazenamento: "Geladeira. Validade: 30 dias.",
  },
  {
    id: "37.3",
    nome: "SDS 8,1% (m/v)",
    volumeBaseMl: 5,
    componentes: [{ nome: "SDS", quantidade: 0.405, unidade: "g" }],
    qsp: true,
    armazenamento: "Temperatura ambiente. Validade: 6 meses.",
    obs: "Não armazenar em geladeira — cristaliza.",
  },
  {
    id: "37.4",
    nome: "Ácido acético 20% (v/v) pH 3,5",
    volumeBaseMl: 50,
    componentes: [{ nome: "Ácido acético glacial", quantidade: 10, unidade: "mL" }],
    qsp: true,
    ph: "3,5 (NaOH 1 M)",
    armazenamento: "Temperatura ambiente. Validade: 6 meses.",
  },
  {
    id: "37.5",
    nome: "TBA 0,8% (m/v)",
    volumeBaseMl: 50,
    componentes: [{ nome: "TBA", quantidade: 0.4, unidade: "g" }],
    qsp: true,
    armazenamento: "Temperatura ambiente, protegido da luz. Validade: 30 dias.",
    obs: "Dissolver com aquecimento suave (~60 °C). Sinais de degradação: coloração amarelada intensa ou precipitado — descartar.",
  },
  {
    id: "37.6",
    nome: "Tampão Tris 50 mM com EDTA 1 mM pH 8,2",
    volumeBaseMl: 500,
    componentes: [
      { nome: "Trizma base", quantidade: 3.027, unidade: "g" },
      { nome: "EDTA", quantidade: 0.1861, unidade: "g" },
    ],
    qsp: true,
    ph: "8,2 (HCl concentrado)",
    armazenamento: "Geladeira. Estável por 1 mês. Durante o uso, manter a 25 °C.",
  },
  {
    id: "37.7",
    nome: "HCl 10 mM",
    volumeBaseMl: 100,
    componentes: [
      { nome: "HCl concentrado (37%, 12,1 M)", quantidade: 82.8, unidade: "µL" },
    ],
    qsp: true,
    armazenamento: "Temperatura ambiente. Validade: 6 meses.",
  },
  {
    id: "37.8a",
    nome: "Fosfato de potássio 20 mM — Solução A (monobásica), p/ tampão 10 mM pH 7,0",
    volumeBaseMl: 100,
    componentes: [{ nome: "KH₂PO₄", quantidade: 0.272, unidade: "g" }],
    qsp: true,
    armazenamento: "Geladeira. Validade: 30 dias.",
    obs: "Solução A do tampão fosfato de potássio 10 mM pH 7,0: adicionar a Solução A à B até pH 7,0, medir o volume e adicionar igual volume de água (→ 10 mM).",
  },
  {
    id: "37.8b",
    nome: "Fosfato de potássio 20 mM — Solução B (dibásica), p/ tampão 10 mM pH 7,0",
    volumeBaseMl: 100,
    componentes: [{ nome: "K₂HPO₄", quantidade: 0.348, unidade: "g" }],
    qsp: true,
    armazenamento: "Geladeira. Validade: 30 dias.",
    obs: "Solução B do tampão fosfato de potássio 10 mM pH 7,0 (ver Solução A).",
  },
  {
    id: "37.9",
    nome: "NaCl 0,9% (m/v)",
    volumeBaseMl: 100,
    componentes: [{ nome: "NaCl", quantidade: 0.9, unidade: "g" }],
    qsp: true,
    armazenamento: "Geladeira. Validade: 30 dias.",
  },
  {
    id: "37.10",
    nome: "Tampão PBS com EDTA 1 mM pH 7,4",
    volumeBaseMl: 500,
    componentes: [
      { nome: "NaCl", quantidade: 4.0, unidade: "g" },
      { nome: "KCl", quantidade: 0.1, unidade: "g" },
      { nome: "Na₂HPO₄ (dibásico anidro)", quantidade: 0.71, unidade: "g" },
      { nome: "KH₂PO₄ (monobásico anidro)", quantidade: 0.136, unidade: "g" },
      { nome: "EDTA dissódico (Na₂-EDTA)", quantidade: 0.186, unidade: "g" },
    ],
    qsp: true,
    ph: "7,4 (HCl 1 M ou NaOH 1 M)",
    armazenamento: "Geladeira. Validade: 30 dias.",
    obs: "O EDTA quela Cu²⁺ e Fe²⁺/Fe³⁺, evitando oxidação espontânea dos grupos –SH antes da reação com o DTNB.",
  },
  {
    id: "37.11",
    nome: "Tampão acetato 50 mM pH 5,0 (para solução de DTNB — tióis e dissulfetos)",
    volumeBaseMl: 100,
    componentes: [
      { nome: "Ácido acético glacial", quantidade: 0.29, unidade: "mL" },
    ],
    qsp: true,
    ph: "5,0 (NaOH 1 M)",
    armazenamento: "Temperatura ambiente. Validade: 30 dias.",
  },
  {
    id: "37.12",
    nome: "Tampão fosfato de potássio dibásico 0,2 M pH 8",
    volumeBaseMl: 100,
    componentes: [
      { nome: "K₂HPO₄ (dibásico anidro)", quantidade: 3.484, unidade: "g" },
    ],
    qsp: true,
    ph: "8,0 (HCl 1 M)",
    armazenamento: "Geladeira. Validade: 30 dias.",
  },
  {
    id: "37.13",
    nome: "Guanidina 6 M (proteínas carboniladas)",
    volumeBaseMl: 25,
    componentes: [
      { nome: "Cloridrato de guanidina", quantidade: 14.33, unidade: "g" },
    ],
    solvente: "Tampão fosfato de potássio 20 mM pH 2,3 (item 37.14)",
    qsp: true,
    preparoNoDia: true,
  },
  {
    id: "37.14",
    nome: "Tampão fosfato de potássio 20 mM pH 2,3 (para guanidina 6 M)",
    volumeBaseMl: 25,
    componentes: [{ nome: "KH₂PO₄", quantidade: 0.068, unidade: "g" }],
    qsp: true,
    ph: "2,3 (H₃PO₄ concentrado 85%, gota a gota sob pHmetro)",
    preparoNoDia: true,
    obs: "pH 2,3 suprime a absorção de fundo da guanidina a 370 nm e estabiliza as hidrazonas do DNPH. Ajustar o pH devagar — pequenas adições mudam muito o pH nesta faixa.",
  },
  {
    id: "37.15",
    nome: "Aloxana — solução estoque (20 mg/mL)",
    volumeBaseMl: 50,
    componentes: [{ nome: "Aloxana", quantidade: 1, unidade: "g" }],
    qsp: true,
    obs: "Estoque 20 mg/mL. Dose de indução: 150 mg/kg → mg = (peso em g × 150) ÷ 1000; converter para volume pela concentração do estoque. Animais em jejum de 24 h.",
  },
  {
    id: "37.16",
    nome: "Solução de glicose 10% (m/v)",
    volumeBaseMl: 1000,
    componentes: [{ nome: "Glicose anidra", quantidade: 100, unidade: "g" }],
    qsp: true,
    obs: "Administrar aos animais tratados com aloxana, 6 h após a indução, por 24 h. No manual, preparar em lotes de 1 L.",
  },
  {
    id: "37.17a",
    nome: "HCl 1 M (ajuste de pH)",
    volumeBaseMl: 100,
    componentes: [
      { nome: "HCl concentrado (37%)", quantidade: 8.3, unidade: "mL" },
    ],
    qsp: true,
    armazenamento: "Temperatura ambiente. Validade: 6 meses.",
    obs: "Reação exotérmica: adicionar o ácido a ~80% do volume de água já no balão, aguardar esfriar e completar.",
  },
  {
    id: "37.17b",
    nome: "NaOH 1 M (ajuste de pH)",
    volumeBaseMl: 100,
    componentes: [{ nome: "NaOH", quantidade: 4, unidade: "g" }],
    qsp: false,
    solvente: "Água ultrapura fervida e esfriada",
    armazenamento: "Temperatura ambiente.",
  },
];

export type ComponenteEscalado = Componente & { base: number };

/**
 * Escala uma receita para o volume final desejado (mL), por regra de três.
 * Retorna os componentes com a quantidade recalculada, mantendo a unidade.
 */
export function escalarReagente(
  reagente: Reagente,
  volumeAlvoMl: number
): { fator: number; componentes: ComponenteEscalado[] } {
  const fator = volumeAlvoMl / reagente.volumeBaseMl;
  return {
    fator,
    componentes: reagente.componentes.map((c) => ({
      ...c,
      base: c.quantidade,
      quantidade: c.quantidade * fator,
    })),
  };
}
