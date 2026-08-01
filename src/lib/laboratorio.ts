// Sessões de laboratório (transparência de horas): tópicos do que o bolsista faz
// numa ida ao lab. Usados na aba Laboratório e, depois, no painel da orientadora.

export const TOPICOS_SESSAO: { valor: string; rotulo: string }[] = [
  { valor: "teste_bioquimico", rotulo: "Teste bioquímico" },
  { valor: "preparo_teste", rotulo: "Preparo de teste bioquímico" },
  { valor: "producao_reagentes", rotulo: "Produção de reagentes" },
  { valor: "limpeza_vidrarias", rotulo: "Limpeza de vidrarias" },
  { valor: "manutencao_limpeza", rotulo: "Manutenção / limpeza geral" },
  { valor: "gavagem", rotulo: "Gavagem dos ratos" },
  { valor: "troca_caixas", rotulo: "Troca de caixas" },
];

const MAPA = new Map(TOPICOS_SESSAO.map((t) => [t.valor, t.rotulo]));

export function rotuloTopico(valor: string): string {
  return MAPA.get(valor) ?? valor;
}

/** Duração em minutos entre início e fim (ou até agora, se aberta). */
export function duracaoMin(inicio: string, fim: string | null): number {
  const ini = new Date(inicio).getTime();
  const fimMs = fim ? new Date(fim).getTime() : Date.now();
  if (Number.isNaN(ini) || Number.isNaN(fimMs) || fimMs < ini) return 0;
  return Math.round((fimMs - ini) / 60000);
}

/** Formata minutos como "2 h 15 min" / "45 min". */
export function fmtDuracao(min: number): string {
  if (!Number.isFinite(min) || min < 0) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}
