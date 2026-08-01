// Agrega as métricas por bolsista para o painel da orientadora e calcula a
// pontuação do ranking. Tudo derivado dos dados que já existem (testes, sessões
// de laboratório, funções de sacrifício). Sem tabela nova.

export type TesteBruto = {
  responsavel_id: string;
  teste_slug: string;
  status: "pendente" | "concluido";
  created_at: string | null;
  encerrado_em: string | null;
  leitura_inicio: string | null;
  leitura_fim: string | null;
};
export type SessaoBruta = {
  profile_id: string;
  inicio: string;
  fim: string | null;
  topicos: string[] | null;
};
export type MembroBruto = { profile_id: string; projeto_id: string };
export type FuncaoBruta = { profile_id: string; sacrificio_id: string };

export type MetricasBolsista = {
  id: string;
  nome: string;
  projetos: number;
  testesConcluidos: number;
  testesPendentes: number;
  testes3Meses: number;
  horasLab: number;
  sacrificios: number;
  reagentesPreparados: number;
  tempoMedioExecMin: number | null;
};

// Famílias de ensaio (para o gráfico de tempo médio por tipo).
const FAMILIAS: { pref: string; nome: string }[] = [
  { pref: "cat-", nome: "Catalase" },
  { pref: "sod-", nome: "SOD" },
  { pref: "tbars", nome: "TBARS" },
  { pref: "sulfidrilas", nome: "Sulfidrilas" },
  { pref: "carboniladas", nome: "Carboniladas" },
  { pref: "tiois-dissulfetos", nome: "Tióis/dissulf." },
  { pref: "acido-ascorbico", nome: "Ác. ascórbico" },
  { pref: "h2o2", nome: "H₂O₂" },
  { pref: "lowry", nome: "Lowry" },
];

function familiaDoSlug(slug: string): string {
  return FAMILIAS.find((f) => slug.startsWith(f.pref))?.nome ?? slug;
}

// Duração da leitura (execução) de um teste em minutos, se início e fim válidos.
function duracaoExecMin(t: TesteBruto): number | null {
  if (!t.leitura_inicio || !t.leitura_fim) return null;
  const ini = new Date(t.leitura_inicio).getTime();
  const fim = new Date(t.leitura_fim).getTime();
  if (Number.isNaN(ini) || Number.isNaN(fim) || fim <= ini) return null;
  return (fim - ini) / 60000;
}

function duracaoSessaoMin(s: SessaoBruta): number {
  const ini = new Date(s.inicio).getTime();
  const fim = s.fim ? new Date(s.fim).getTime() : Date.now();
  if (Number.isNaN(ini) || Number.isNaN(fim) || fim < ini) return 0;
  return (fim - ini) / 60000;
}

/** Média dos tempos de execução por tipo de ensaio (para o gráfico). */
export function temposPorTipo(
  testes: TesteBruto[]
): { tipo: string; mediaMin: number; n: number }[] {
  const acc = new Map<string, { soma: number; n: number }>();
  for (const t of testes) {
    const d = duracaoExecMin(t);
    if (d == null) continue;
    const fam = familiaDoSlug(t.teste_slug);
    const a = acc.get(fam) ?? { soma: 0, n: 0 };
    a.soma += d;
    a.n += 1;
    acc.set(fam, a);
  }
  return Array.from(acc.entries())
    .map(([tipo, a]) => ({ tipo, mediaMin: Math.round(a.soma / a.n), n: a.n }))
    .sort((x, y) => y.mediaMin - x.mediaMin);
}

const DIAS_90 = 90 * 24 * 3600 * 1000;

/** Calcula as métricas por bolsista (para a tabela e os gráficos comparativos). */
export function calcularMetricas(dados: {
  bolsistas: { id: string; nome: string }[];
  membros: MembroBruto[];
  testes: TesteBruto[];
  sessoes: SessaoBruta[];
  funcoes: FuncaoBruta[];
}): MetricasBolsista[] {
  const agora = Date.now();

  const base = dados.bolsistas.map((b) => {
    const projetos = new Set(
      dados.membros.filter((m) => m.profile_id === b.id).map((m) => m.projeto_id)
    ).size;

    const meus = dados.testes.filter((t) => t.responsavel_id === b.id);
    const concluidos = meus.filter((t) => t.status === "concluido");
    const pendentes = meus.length - concluidos.length;

    const testes3Meses = concluidos.filter((t) => {
      const quando = t.encerrado_em ?? t.created_at;
      if (!quando) return false;
      const ms = new Date(quando).getTime();
      return !Number.isNaN(ms) && agora - ms <= DIAS_90;
    }).length;

    const minhasSessoes = dados.sessoes.filter((s) => s.profile_id === b.id);
    const horasLab =
      minhasSessoes.reduce((soma, s) => soma + duracaoSessaoMin(s), 0) / 60;
    const reagentesPreparados = minhasSessoes.filter((s) =>
      (s.topicos ?? []).includes("producao_reagentes")
    ).length;

    const sacrificios = new Set(
      dados.funcoes.filter((f) => f.profile_id === b.id).map((f) => f.sacrificio_id)
    ).size;

    const temposExec = meus
      .map(duracaoExecMin)
      .filter((d): d is number => d != null);
    const tempoMedioExecMin =
      temposExec.length > 0
        ? temposExec.reduce((a, c) => a + c, 0) / temposExec.length
        : null;

    return {
      id: b.id,
      nome: b.nome,
      projetos,
      testesConcluidos: concluidos.length,
      testesPendentes: pendentes,
      testes3Meses,
      horasLab: Math.round(horasLab * 10) / 10,
      sacrificios,
      reagentesPreparados,
      tempoMedioExecMin,
    };
  });

  // Ordena por testes concluídos (mais ativo primeiro) — sem ranking pontuado.
  return base.sort((a, b) => b.testesConcluidos - a.testesConcluidos);
}
