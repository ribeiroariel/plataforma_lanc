// Volumes de execução por ensaio, extraídos LITERALMENTE dos protocolos do
// manual (content/testes/*.md, seção PROCEDIMENTO). Diferente de um "fator de
// recipiente" global, cada ensaio tem no manual o seu volume por amostra e o(s)
// recipiente(s) em que é lido — e eles NÃO seguem um fator único (ex.: CAT usa
// 250 µL tanto na microcubeta de quartzo quanto na microplaca 96; SOD usa
// 1.500 µL na placa de 24 poços com a escala 6× já embutida). Por isso os
// números vêm do protocolo, não de multiplicação.
//
// Cada ensaio expõe:
//   - `modos`: os pares aparelho×recipiente que o manual descreve (restringe a
//     escolha da preparação a esses recipientes);
//   - `reagentes`: o consumo por AMOSTRA de cada reagente, marcado como
//     `estoque` (já pronto: tampões, ácidos, solventes — a calculadora de
//     estoque a consumir soma esses) ou `dia` (preparado no dia; a receita de
//     como preparar está em reagentesDia.ts, aqui fica só o volume gasto).
//
// ⚠️ VOLUMES CALIBRÁVEIS: conferir com o Ariel antes de usar de verdade. Por ora
// catalogados só CAT, SOD, TBARS e carboniladas (os demais caem no fallback
// livre por aparelho da Fatia 1). Amostra/sobrenadante não entra como reagente.

import type { Aparelho, Recipiente } from "./recipientes";

export type ReagenteConsumo = {
  nome: string;
  ulPorAmostra: number;
  origem: "estoque" | "dia";
  obs?: string;
};

export type ModoLeitura = {
  aparelho: Aparelho;
  recipiente: Recipiente;
  /** Volume final por amostra neste modo (µL). */
  volumeTotalUl: number;
};

export type ProtocoloEnsaio = {
  modos: ModoLeitura[];
  reagentes: ReagenteConsumo[];
};

const PROTOCOLOS: { prefixos: string[]; protocolo: ProtocoloEnsaio }[] = [
  {
    prefixos: ["cat-"],
    protocolo: {
      // 240 µL de meio + 10 µL de amostra = 250 µL, igual nos dois modos.
      modos: [
        { aparelho: "infinite_200pro", recipiente: "microplaca_96", volumeTotalUl: 250 },
        { aparelho: "uv_vis", recipiente: "microcubeta", volumeTotalUl: 250 },
      ],
      reagentes: [
        { nome: "Meio de reação", ulPorAmostra: 240, origem: "dia" },
        {
          nome: "Tampão fosfato de potássio 10 mM pH 7,0",
          ulPorAmostra: 240,
          origem: "estoque",
          obs: "insumo do meio de reação (o meio é preparado no dia a partir dele).",
        },
        {
          nome: "H₂O₂ 30%",
          ulPorAmostra: 0.54,
          origem: "estoque",
          obs: "insumo do meio de reação (5,4 µL para 10 amostras).",
        },
      ],
    },
  },
  {
    prefixos: ["sod-"],
    protocolo: {
      // Placa de 24 poços, 1.500 µL (escala 6× já no protocolo, pois não há
      // pipeta de 1 µL). Cubeta convencional usa o mesmo volume.
      modos: [
        { aparelho: "infinite_200pro", recipiente: "microplaca_24", volumeTotalUl: 1500 },
        { aparelho: "uv_vis", recipiente: "cubeta_padrao", volumeTotalUl: 1500 },
      ],
      reagentes: [
        { nome: "Tampão TRIS 50 mM + EDTA pH 8,2", ulPorAmostra: 1398, origem: "estoque" },
        { nome: "Catalase — solução de trabalho", ulPorAmostra: 6, origem: "dia" },
        { nome: "Pirogalol 24 mM em HCl 10 mM", ulPorAmostra: 24, origem: "dia" },
        {
          nome: "HCl 10 mM",
          ulPorAmostra: 24,
          origem: "estoque",
          obs: "solvente do pirogalol preparado no dia.",
        },
      ],
    },
  },
  {
    prefixos: ["tbars"],
    protocolo: {
      // Reação montada em tubo de vidro (1.700 µL) e incubada a 95 °C; só uma
      // alíquota vai à leitura. Os volumes não mudam com o recipiente de leitura.
      modos: [
        { aparelho: "infinite_200pro", recipiente: "microplaca_96", volumeTotalUl: 1700 },
        { aparelho: "uv_vis", recipiente: "cubeta_padrao", volumeTotalUl: 1700 },
      ],
      reagentes: [
        { nome: "SDS 8,1%", ulPorAmostra: 20, origem: "estoque" },
        { nome: "Ácido acético 20% pH 3,5", ulPorAmostra: 600, origem: "estoque" },
        { nome: "TBA 0,8%", ulPorAmostra: 600, origem: "estoque" },
        {
          nome: "KCl 1,15%",
          ulPorAmostra: 200,
          origem: "estoque",
          obs: "só no branco (no lugar da amostra).",
        },
        { nome: "Água ultrapura (milli-Q)", ulPorAmostra: 280, origem: "estoque" },
      ],
    },
  },
  {
    prefixos: ["carboniladas"],
    protocolo: {
      // Reação em eppendorf; 3 lavagens com etanol + acetato de etila; leitura
      // final em 600 µL de guanidina (cubeta de plástico ou microplaca UV-Star).
      modos: [
        { aparelho: "infinite_200pro", recipiente: "microplaca_96", volumeTotalUl: 600 },
        { aparelho: "uv_vis", recipiente: "cubeta_padrao", volumeTotalUl: 600 },
      ],
      reagentes: [
        {
          nome: "HCl 2 M",
          ulPorAmostra: 400,
          origem: "estoque",
          obs: "no branco (no lugar do DNPH) e para zerar a leitura.",
        },
        { nome: "DNPH 10 mM", ulPorAmostra: 400, origem: "dia" },
        { nome: "TCA 20%", ulPorAmostra: 500, origem: "dia" },
        {
          nome: "Etanol P.A.",
          ulPorAmostra: 1500,
          origem: "estoque",
          obs: "3 lavagens de 500 µL.",
        },
        {
          nome: "Acetato de etila",
          ulPorAmostra: 1500,
          origem: "estoque",
          obs: "3 lavagens de 500 µL.",
        },
        { nome: "Guanidina 6 M", ulPorAmostra: 600, origem: "dia" },
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
  return p ? p.modos.map((m) => m.recipiente) : [];
}

/** Aparelhos que o manual descreve para este ensaio. */
export function aparelhosDoSlug(slug: string): Aparelho[] {
  const p = protocoloDoSlug(slug);
  return p ? Array.from(new Set(p.modos.map((m) => m.aparelho))) : [];
}
