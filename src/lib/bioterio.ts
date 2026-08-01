// Procedimentos de biotério: constantes e helpers para caixas dos ratos,
// procedimentos (indução/tratamento), cálculo de dose e etiquetas das gaiolas.

export const DOENCAS: { valor: string; rotulo: string }[] = [
  { valor: "dm1", rotulo: "DM1" },
  { valor: "dm2", rotulo: "DM2" },
  { valor: "depressao", rotulo: "Depressão" },
];

export const VIAS: { valor: string; rotulo: string; sigla: string }[] = [
  { valor: "ip", rotulo: "Intraperitoneal", sigla: "i.p." },
  { valor: "sc", rotulo: "Subcutânea", sigla: "s.c." },
  { valor: "gavagem", rotulo: "Gavagem", sigla: "gavagem" },
];

// Unidades de dose. mg/kg usa a concentração (mg/mL) para chegar ao volume;
// mL/kg é direto; mL/animal é volume fixo (não usa peso).
export const UNIDADES_DOSE: { valor: string; rotulo: string; usaConcentracao: boolean; usaPeso: boolean }[] = [
  { valor: "mg/kg", rotulo: "mg/kg", usaConcentracao: true, usaPeso: true },
  { valor: "mL/kg", rotulo: "mL/kg", usaConcentracao: false, usaPeso: true },
  { valor: "mL/animal", rotulo: "mL/animal", usaConcentracao: false, usaPeso: false },
];

export function rotuloDoenca(v: string | null | undefined): string {
  return DOENCAS.find((d) => d.valor === v)?.rotulo ?? "";
}
export function rotuloVia(v: string | null | undefined): string {
  return VIAS.find((x) => x.valor === v)?.rotulo ?? "";
}
export function siglaVia(v: string | null | undefined): string {
  return VIAS.find((x) => x.valor === v)?.sigla ?? "";
}

/** Limite recomendado de animais por caixa (acima disso, alerta). */
export function limiteCaixa(especie: string | null | undefined): number {
  return especie === "camundongo" ? 8 : 5; // rato (ou não definido) = 5
}

export function media(pesos: number[]): number | null {
  const v = pesos.filter((p) => Number.isFinite(p) && p > 0);
  if (v.length === 0) return null;
  return v.reduce((a, c) => a + c, 0) / v.length;
}

/** Desvio-padrão amostral (n−1). Null se menos de 2 valores. */
export function desvioPadrao(pesos: number[]): number | null {
  const v = pesos.filter((p) => Number.isFinite(p) && p > 0);
  if (v.length < 2) return null;
  const m = v.reduce((a, c) => a + c, 0) / v.length;
  const s2 = v.reduce((a, c) => a + (c - m) ** 2, 0) / (v.length - 1);
  return Math.sqrt(s2);
}

/**
 * Volume (mL) por animal a partir do peso médio da caixa, dose, unidade e
 * concentração. Retorna null se faltar dado.
 */
export function doseMlPorAnimal(
  pesoMedioG: number | null,
  doseValor: number | null,
  unidade: string | null,
  concentracao: number | null
): number | null {
  if (doseValor == null) return null;
  if (unidade === "mL/animal") return doseValor;
  if (pesoMedioG == null || pesoMedioG <= 0) return null;
  const kg = pesoMedioG / 1000;
  if (unidade === "mL/kg") return doseValor * kg;
  if (unidade === "mg/kg") {
    if (concentracao == null || concentracao <= 0) return null;
    return (doseValor * kg) / concentracao;
  }
  return null;
}

/** Descrição textual da dose (para etiqueta/resumo), ex.: "150 mg/kg". */
export function textoDose(
  doseValor: number | null,
  unidade: string | null
): string {
  if (doseValor == null || !unidade) return "";
  return `${doseValor.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} ${unidade}`;
}

/**
 * Numeração de exibição das caixas (na ordem dada). Caixas do mesmo grupo em
 * sequência recebem sufixo: 3, 3.1, 3.2. Um grupo novo incrementa a base.
 */
export function numeracaoCaixas(caixas: { grupo_id: string }[]): string[] {
  const out: string[] = [];
  let base = 0;
  let sub = 0;
  let prev: string | null = null;
  for (const c of caixas) {
    if (prev === null || c.grupo_id !== prev) {
      base += 1;
      sub = 0;
      out.push(String(base));
    } else {
      sub += 1;
      out.push(`${base}.${sub}`);
    }
    prev = c.grupo_id;
  }
  return out;
}

export type CaixaRow = {
  id: string;
  grupo_id: string;
  num_ratos: number;
  ordem: number | null;
  pesos: number[] | null;
  mortos: number;
  leva: number | null;
};

/** Cronograma de tratamento de uma leva (início + duração, únicos p/ todas). */
export type ConfigRow = {
  leva: number;
  tratamento_inicio: string | null;
  tratamento_dias: number | null;
};

export type ProcedimentoRow = {
  id: string;
  tipo: "inducao" | "tratamento";
  doenca: string | null;
  substancia: string | null;
  dose_valor: number | null;
  dose_unidade: string | null;
  concentracao: number | null;
  via: string | null;
  dias: number | null;
  inicio: string | null;
  caixa_ids: string[] | null;
  ordem: number | null;
};

/** Dias restantes de tratamento a partir de hoje (do cronograma da leva). */
export function diasRestantes(
  inicio: string | null,
  dias: number | null
): number | null {
  if (!inicio || !dias) return null;
  const ini = new Date(inicio).getTime();
  if (Number.isNaN(ini)) return null;
  const fim = ini + dias * 24 * 3600 * 1000;
  return Math.max(0, Math.ceil((fim - Date.now()) / (24 * 3600 * 1000)));
}
