// Procedimentos de biotério: constantes e helpers para caixas dos ratos,
// tratamentos/induções e a montagem das etiquetas das gaiolas.

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

/**
 * Dose em mL por animal = (dose em mg/kg × peso em kg) ÷ concentração em mg/mL.
 * Retorna null se faltar dado ou a concentração for zero.
 */
export function doseMlPorAnimal(
  pesoG: number | null,
  doseMgKg: number | null,
  concentracaoMgMl: number | null
): number | null {
  if (pesoG == null || doseMgKg == null || concentracaoMgMl == null) return null;
  if (concentracaoMgMl <= 0 || pesoG <= 0) return null;
  const pesoKg = pesoG / 1000;
  return (doseMgKg * pesoKg) / concentracaoMgMl;
}

// Tipos partilhados entre server e client.
export type CaixaRow = {
  id: string;
  numero: number;
  grupo_id: string;
  num_ratos: number;
  peso_medio_g: number | null;
  mortos: number;
};
export type TratamentoRow = {
  id: string;
  grupo_id: string;
  inducao_ativa: boolean;
  inducao_doenca: string | null;
  inducao_substancia: string | null;
  inducao_via: string | null;
  inducao_dose: string | null;
  tratamento_ativa: boolean;
  tratamento_substancia: string | null;
  tratamento_via: string | null;
  tratamento_dose: string | null;
  tratamento_dias: number | null;
  tratamento_inicio: string | null;
};

/** Dias restantes de tratamento (a partir de hoje), ou null se sem dados. */
export function diasRestantes(t: TratamentoRow): number | null {
  if (!t.tratamento_ativa || !t.tratamento_dias || !t.tratamento_inicio) return null;
  const inicio = new Date(t.tratamento_inicio).getTime();
  if (Number.isNaN(inicio)) return null;
  const fim = inicio + t.tratamento_dias * 24 * 3600 * 1000;
  const rest = Math.ceil((fim - Date.now()) / (24 * 3600 * 1000));
  return Math.max(0, rest);
}
