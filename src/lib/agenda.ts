// Agenda compartilhada das salas do LANC: T-129 (Lab. de Substâncias
// Bioativas), T-201 (Lab. de Biofísica) e T-206 (Biotério). Client + server safe.

export type Sala = "T-201" | "T-129" | "T-206";

export const SALAS: { id: Sala; nome: string; local: string; cor: string }[] = [
  { id: "T-129", nome: "T-129", local: "Laboratório de Substâncias Bioativas", cor: "var(--color-absorbance)" },
  { id: "T-201", nome: "T-201", local: "Laboratório de Biofísica", cor: "var(--color-reagent)" },
  { id: "T-206", nome: "T-206", local: "Biotério", cor: "var(--color-pyrogallol)" },
];

export type TipoReserva =
  | "teste"
  | "sacrificio"
  | "gavagem"
  | "inducao"
  | "subcutanea"
  | "intraperitoneal"
  | "tratamento"
  | "pesagem"
  | "outro";

export const TIPOS: Record<TipoReserva, string> = {
  teste: "Teste",
  sacrificio: "Sacrifício",
  gavagem: "Gavagem",
  inducao: "Indução",
  subcutanea: "Subcutânea",
  intraperitoneal: "Intraperitoneal",
  tratamento: "Tratamento",
  pesagem: "Pesagem",
  outro: "Outro",
};

/** O que dá pra marcar em cada sala (espelha o check do banco). */
export function tiposDaSala(sala: Sala): TipoReserva[] {
  return sala === "T-206"
    ? ["gavagem", "inducao", "subcutanea", "intraperitoneal", "tratamento", "pesagem", "outro"]
    : ["teste", "sacrificio", "outro"];
}

export function ehSala(v: unknown): v is Sala {
  return v === "T-201" || v === "T-129" || v === "T-206";
}

export function corDaSala(sala: string): string {
  return SALAS.find((s) => s.id === sala)?.cor ?? "var(--color-ink-soft)";
}

// --- Datas: o laboratório é em Blumenau (UTC−3, sem horário de verão). ---
export const FUSO = "America/Sao_Paulo";
const OFFSET = "-03:00";

/** "2026-11-18" + "14:30" → ISO com o fuso do laboratório. */
export function paraIso(data: string, hora: string): string {
  return `${data}T${hora}:00${OFFSET}`;
}

/** Data (AAAA-MM-DD) e hora (HH:MM) locais de um ISO. */
export function partesLocais(iso: string): { data: string; hora: string; minutos: number } {
  const d = new Date(iso);
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const v = (t: string) => f.find((p) => p.type === t)?.value ?? "00";
  const hh = v("hour") === "24" ? "00" : v("hour");
  return {
    data: `${v("year")}-${v("month")}-${v("day")}`,
    hora: `${hh}:${v("minute")}`,
    minutos: Number(hh) * 60 + Number(v("minute")),
  };
}

/** Hoje (AAAA-MM-DD) no fuso do laboratório. */
export function hojeLocal(): string {
  return partesLocais(new Date().toISOString()).data;
}

function somarDias(data: string, dias: number): string {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Segunda-feira da semana da data. */
export function inicioSemana(data: string): string {
  const d = new Date(`${data}T12:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = segunda
  return somarDias(data, -dow);
}

export function diasDaSemana(segunda: string): string[] {
  return Array.from({ length: 7 }, (_, i) => somarDias(segunda, i));
}

export { somarDias };

export function ehData(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

export function ehHora(v: unknown): v is string {
  return typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}
