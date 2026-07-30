// Volumes de execução por ensaio, extraídos do Manual LANC revisado (2026-07-29,
// "Volumes por Tipo de Leitura" de cada seção). Modelo confirmado pelo manual:
//   - Só CAT, SOD, ácido ascórbico e H₂O₂ tecidual ESCALAM com o recipiente — a
//     reação acontece integralmente dentro da cubeta/poço, então os volumes
//     multiplicam pelo fator do recipiente (microplaca 96 = 1×, microcubeta = 3×,
//     microplaca 24 = 6×, cubeta normal = 10×; ver FATOR_RECIPIENTE).
//   - TBARS, carboniladas, sulfidrilas, tióis/dissulfetos e Lowry são reação em
//     TUBO de volume fixo (lavagens, banho-maria, precipitação) — o volume não
//     muda com o recipiente de leitura (`escala: false`).
//
// `ulBase` = volume por amostra na microplaca 96 (1×). Para ensaios que escalam,
// o volume no recipiente escolhido = ulBase × fatorRecipiente. Cada reagente é
// `estoque` (já pronto — a calculadora só soma o consumo) ou `dia` (preparado no
// dia; a receita de como preparar está na página do protocolo, /testes/[slug]).
// Insumos de um reagente do dia (ex.: o tampão que vira "meio de reação") NÃO
// entram como linha separada — ficam na receita do reagente do dia, para não
// contar volume duas vezes. Amostra/sobrenadante não é reagente.
//
// ⚠️ VOLUMES CALIBRÁVEIS: extraídos do manual revisado; conferir com o Ariel.

import type { Aparelho, Recipiente } from "./recipientes";

export type ReagenteConsumo = {
  nome: string;
  origem: "estoque" | "dia";
  /** Volume por amostra na microplaca 96 (1×), em µL. */
  ulBase: number;
  /**
   * Em quais tubos o reagente entra. Só importa quando o ensaio tem um branco
   * para cada amostra (`brancoParaCadaAmostra`): "ambos" (default) → consumo
   * dobra (amostra + branco); "amostra" ou "branco" → consumo em 1× o nº de
   * amostras.
   */
  escopo?: "amostra" | "branco" | "ambos";
  obs?: string;
};

export type ModoLeitura = {
  aparelho: Aparelho;
  recipiente: Recipiente;
};

export type ProtocoloEnsaio = {
  /** true = volumes multiplicam pelo fator do recipiente; false = tubo fixo. */
  escala: boolean;
  /**
   * Fator por recipiente específico deste ensaio, quando ele NÃO segue o fator
   * global de recipientes.ts. Ex.: carboniladas é feito em eppendorf e a leitura
   * em cubeta padrão usa só 2× a microplaca (não 10×). Ausente = usa o global.
   */
  fatores?: Partial<Record<Recipiente, number>>;
  /**
   * O ensaio processa um branco para CADA amostra (não um branco único da
   * sessão). Nesse caso, reagentes de escopo "ambos" são consumidos em 2× o nº
   * de amostras. Ex.: carboniladas, sulfidrilas.
   */
  brancoParaCadaAmostra?: boolean;
  modos: ModoLeitura[];
  reagentes: ReagenteConsumo[];
  obs?: string;
};

const INFINITE = "infinite_200pro" as const;
const UVVIS = "uv_vis" as const;

const PROTOCOLOS: { prefixos: string[]; protocolo: ProtocoloEnsaio }[] = [
  {
    prefixos: ["cat-"],
    protocolo: {
      escala: true,
      // 240 µL de meio + 10 µL de amostra (microplaca 96). Só microplaca 96 e
      // microcubeta de quartzo (240 nm exige quartzo; não há cubeta normal de quartzo).
      modos: [
        { aparelho: INFINITE, recipiente: "microplaca_96" },
        { aparelho: UVVIS, recipiente: "microcubeta" },
      ],
      reagentes: [
        {
          nome: "Meio de reação",
          origem: "dia",
          ulBase: 240,
          obs: "tampão fosfato de potássio 10 mM + H₂O₂ 30% (receita na página do protocolo).",
        },
      ],
    },
  },
  {
    prefixos: ["sod-"],
    protocolo: {
      escala: true,
      // Formato padrão = microplaca de 24 poços (não há pipeta de 1 µL para 96p).
      modos: [
        { aparelho: INFINITE, recipiente: "microplaca_96" },
        { aparelho: INFINITE, recipiente: "microplaca_24" },
        { aparelho: UVVIS, recipiente: "cubeta_padrao" },
      ],
      reagentes: [
        { nome: "Tampão TRIS 50 mM + EDTA pH 8,2", origem: "estoque", ulBase: 233 },
        { nome: "Catalase — solução de trabalho", origem: "dia", ulBase: 1 },
        { nome: "Pirogalol 24 mM em HCl 10 mM", origem: "dia", ulBase: 4 },
      ],
    },
  },
  {
    prefixos: ["acido-ascorbico"],
    protocolo: {
      escala: true,
      modos: [
        { aparelho: INFINITE, recipiente: "microplaca_96" },
        { aparelho: UVVIS, recipiente: "microcubeta" },
        { aparelho: UVVIS, recipiente: "cubeta_padrao" },
      ],
      reagentes: [
        { nome: "Tampão citrato/acetato pH 4,15 com pHMB", origem: "estoque", ulBase: 62 },
        { nome: "Solução de DCIP", origem: "estoque", ulBase: 63 },
      ],
      obs: "Reagentes preparados em lote fixo reaproveitável (não recalculados por nº de amostras); aqui só o consumo por amostra.",
    },
  },
  {
    prefixos: ["h2o2"],
    protocolo: {
      escala: true,
      modos: [
        { aparelho: INFINITE, recipiente: "microplaca_96" },
        { aparelho: UVVIS, recipiente: "microcubeta" },
        { aparelho: UVVIS, recipiente: "cubeta_padrao" },
      ],
      reagentes: [
        {
          nome: "Meio de reação",
          origem: "dia",
          ulBase: 195,
          obs: "tampão fosfato de sódio 50 mM + HRP + vermelho de fenol.",
        },
        { nome: "NaOH 1 N", origem: "estoque", ulBase: 5 },
      ],
    },
  },
  {
    prefixos: ["tbars"],
    protocolo: {
      escala: false,
      // Reação em tubo de vidro (1.700 µL), incubação a 95 °C; só a alíquota vai à leitura.
      modos: [
        { aparelho: INFINITE, recipiente: "microplaca_96" },
        { aparelho: UVVIS, recipiente: "cubeta_padrao" },
      ],
      reagentes: [
        { nome: "SDS 8,1%", origem: "estoque", ulBase: 20 },
        { nome: "Ácido acético 20% pH 3,5", origem: "estoque", ulBase: 600 },
        { nome: "TBA 0,8%", origem: "estoque", ulBase: 600 },
        { nome: "KCl 1,15%", origem: "estoque", ulBase: 200, escopo: "branco" },
        { nome: "Água ultrapura (milli-Q)", origem: "estoque", ulBase: 280 },
      ],
    },
  },
  {
    prefixos: ["carboniladas"],
    protocolo: {
      // Ensaio feito inteiro em eppendorf (1,5–2,0 mL); o Ariel reduz os volumes
      // conforme a leitura. Base = microplaca 96; cubeta padrão usa o DOBRO
      // (não o 10× global). Números da cubeta padrão vêm do manual; a microplaca
      // é metade deles.
      escala: true,
      fatores: { microplaca_96: 1, cubeta_padrao: 2 },
      brancoParaCadaAmostra: true,
      modos: [
        { aparelho: INFINITE, recipiente: "microplaca_96" },
        { aparelho: UVVIS, recipiente: "cubeta_padrao" },
      ],
      reagentes: [
        {
          nome: "HCl 2 M",
          origem: "estoque",
          ulBase: 200,
          escopo: "branco",
          obs: "no branco (no lugar do DNPH) e para zerar a leitura.",
        },
        { nome: "DNPH 10 mM", origem: "dia", ulBase: 200, escopo: "amostra" },
        { nome: "TCA 20%", origem: "dia", ulBase: 250, escopo: "ambos" },
        {
          nome: "Etanol P.A.",
          origem: "estoque",
          ulBase: 750,
          escopo: "ambos",
          obs: "3 lavagens.",
        },
        {
          nome: "Acetato de etila",
          origem: "estoque",
          ulBase: 750,
          escopo: "ambos",
          obs: "3 lavagens.",
        },
        { nome: "Guanidina 6 M", origem: "dia", ulBase: 300, escopo: "ambos" },
      ],
    },
  },
  {
    prefixos: ["sulfidrilas"],
    protocolo: {
      escala: false,
      modos: [
        { aparelho: INFINITE, recipiente: "microplaca_96" },
        { aparelho: UVVIS, recipiente: "cubeta_padrao" },
      ],
      reagentes: [
        { nome: "PBS pH 7,4", origem: "estoque", ulBase: 980 },
        { nome: "DTNB 10 mM", origem: "dia", ulBase: 30 },
        {
          nome: "Ácido sulfossalicílico (ASS) 5%",
          origem: "estoque",
          ulBase: 200,
          obs: "só na fração não-proteica (NP-SH).",
        },
      ],
    },
  },
  {
    prefixos: ["tiois-dissulfetos"],
    protocolo: {
      escala: false,
      modos: [
        { aparelho: INFINITE, recipiente: "microplaca_96" },
        { aparelho: UVVIS, recipiente: "cubeta_padrao" },
      ],
      reagentes: [
        { nome: "Tampão TRIS 50 mM pH 9,0", origem: "estoque", ulBase: 100 },
        { nome: "DTT 3 mM", origem: "dia", ulBase: 100 },
        { nome: "Tampão TRIS 1,0 M pH 8,1", origem: "estoque", ulBase: 200 },
        {
          nome: "Arsenito de sódio",
          origem: "dia",
          ulBase: 1500,
          obs: "ALTAMENTE TÓXICO / cancerígeno — capela e EPI. Só na determinação total.",
        },
        { nome: "DTNB 3 mM em tampão acetato pH 5,0", origem: "dia", ulBase: 100 },
      ],
      obs: "Volumes da determinação total (tióis + dissulfetos); a de tióis livres omite DTT e arsenito.",
    },
  },
  {
    prefixos: ["lowry"],
    protocolo: {
      escala: false,
      modos: [
        { aparelho: INFINITE, recipiente: "microplaca_96" },
        { aparelho: UVVIS, recipiente: "cubeta_padrao" },
      ],
      reagentes: [
        { nome: "Água ultrapura (milli-Q)", origem: "estoque", ulBase: 190 },
        { nome: "Reativo C", origem: "dia", ulBase: 1000 },
        { nome: "Reagente de Folin", origem: "estoque", ulBase: 100 },
      ],
    },
  },
];

export function protocoloDoSlug(slug: string): ProtocoloEnsaio | null {
  return (
    PROTOCOLOS.find((p) => p.prefixos.some((pref) => slug.startsWith(pref)))
      ?.protocolo ?? null
  );
}

/** Recipientes que o manual descreve para este ensaio (vazio = não catalogado). */
export function recipientesDoSlug(slug: string): Recipiente[] {
  const p = protocoloDoSlug(slug);
  return p ? Array.from(new Set(p.modos.map((m) => m.recipiente))) : [];
}

/** Aparelhos que o manual descreve para este ensaio. */
export function aparelhosDoSlug(slug: string): Aparelho[] {
  const p = protocoloDoSlug(slug);
  return p ? Array.from(new Set(p.modos.map((m) => m.aparelho))) : [];
}
