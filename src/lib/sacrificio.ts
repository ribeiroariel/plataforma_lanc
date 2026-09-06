// Constantes do módulo de sacrifício (ver docs/sacrificio-spec.md). Seguro
// para client E server (sem fs).

export type FuncaoSacrificio = {
  valor: string;
  rotulo: string;
  minPessoas: number;
};

// Funções designáveis no dia. Decapitação e deslocamento cervical exigem ≥2
// pessoas; as demais ≥1. Uma pessoa pode acumular funções.
export const FUNCOES_SACRIFICIO: FuncaoSacrificio[] = [
  { valor: "decapitacao", rotulo: "Decapitação", minPessoas: 2 },
  { valor: "deslocamento_cervical", rotulo: "Deslocamento cervical (camundongo)", minPessoas: 2 },
  { valor: "dissecacao_figado", rotulo: "Dissecação — fígado", minPessoas: 1 },
  { valor: "dissecacao_rim", rotulo: "Dissecação — rim", minPessoas: 1 },
  { valor: "dissecacao_pancreas", rotulo: "Dissecação — pâncreas", minPessoas: 1 },
  { valor: "dissecacao_cortex", rotulo: "Dissecação — córtex", minPessoas: 1 },
  { valor: "separacao_cortex_hipocampo", rotulo: "Separação córtex/hipocampo/cerebelo", minPessoas: 1 },
  { valor: "homogeneizacao", rotulo: "Homogeneização", minPessoas: 1 },
  { valor: "separacao_aliquotas", rotulo: "Separação de alíquotas", minPessoas: 1 },
  { valor: "separacao_sangue", rotulo: "Separação de sangue (plasma/eritrócito)", minPessoas: 1 },
  { valor: "organizacao_geral", rotulo: "Organização geral (limpeza/ordenamento)", minPessoas: 1 },
];

export function rotuloFuncao(valor: string): string {
  return FUNCOES_SACRIFICIO.find((f) => f.valor === valor)?.rotulo ?? valor;
}

// As etapas da tela do dia. A aba geral mostra todas; a aba de cada função
// mostra só as do seu escopo (abaixo).
export type SecaoSacrificio =
  | "sobrevivencia"
  | "contagem"
  | "coleta"
  | "homogeneizacao"
  | "sangue"
  | "aliquotas";

// Escopo de cada função: quais seções da tela do dia ela preenche e, quando
// aplicável, a quais órgãos ela se restringe (na coleta/homogeneização/sangue).
// "Organização geral" enxerga tudo — é quem coordena o dia.
export const FUNCAO_ESCOPO: Record<
  string,
  { secoes: SecaoSacrificio[]; orgaos?: string[] }
> = {
  decapitacao: { secoes: ["sobrevivencia", "contagem"] },
  deslocamento_cervical: { secoes: ["sobrevivencia", "contagem"] },
  dissecacao_figado: { secoes: ["coleta"], orgaos: ["figado"] },
  dissecacao_rim: {
    secoes: ["coleta"],
    orgaos: ["rim_esquerdo", "rim_direito"],
  },
  dissecacao_pancreas: { secoes: ["coleta"], orgaos: ["pancreas"] },
  dissecacao_cortex: { secoes: ["coleta"], orgaos: ["cortex"] },
  separacao_cortex_hipocampo: {
    secoes: ["coleta"],
    orgaos: ["cortex", "hipocampo", "cerebelo"],
  },
  // Plasma e eritrócito não passam pela homogeneização (peso → tampão) dos
  // órgãos sólidos — têm preparo próprio (ver seção "sangue").
  separacao_sangue: {
    secoes: ["coleta", "sangue"],
    orgaos: ["plasma", "eritrocito"],
  },
  homogeneizacao: { secoes: ["homogeneizacao"] },
  separacao_aliquotas: { secoes: ["aliquotas"] },
  organizacao_geral: {
    secoes: [
      "sobrevivencia",
      "contagem",
      "coleta",
      "homogeneizacao",
      "sangue",
      "aliquotas",
    ],
  },
};

// Órgãos/tecidos dissecáveis (mais granular que os tecidos de análise). Rim
// vira dois itens (esquerdo/direito) porque um pode ir pra histologia e o
// outro pra bioquímica — mesmo padrão já usado pra córtex/hipocampo/cerebelo.
export const ORGAOS_DISSECAVEIS: { valor: string; rotulo: string }[] = [
  { valor: "figado", rotulo: "Fígado" },
  { valor: "rim_esquerdo", rotulo: "Rim esquerdo" },
  { valor: "rim_direito", rotulo: "Rim direito" },
  { valor: "pancreas", rotulo: "Pâncreas" },
  { valor: "cortex", rotulo: "Córtex" },
  { valor: "hipocampo", rotulo: "Hipocampo" },
  { valor: "cerebelo", rotulo: "Cerebelo" },
  { valor: "plasma", rotulo: "Plasma" },
  { valor: "eritrocito", rotulo: "Eritrócito" },
];

// Órgãos sólidos: homogenato 10% (1:9), peso em gramas × 9000 = volume de
// tampão em µL. Plasma/eritrócito não usam essa conta (ver FATOR_...ERITROCITO
// abaixo) — não têm peso, e plasma nem precisa de diluição.
export const FATOR_TAMPAO_UL_POR_G = 9000;

export function volumeTampaoUl(pesoG: number): number {
  return pesoG * FATOR_TAMPAO_UL_POR_G;
}

// Tecidos de sangue: não passam pela homogeneização (peso → tampão) dos
// órgãos sólidos — têm seção própria ("Preparo de plasma/eritrócito").
export const TECIDOS_SANGUE = ["plasma", "eritrocito"] as const;

// Eritrócito: lisado diluído 1:50 (volume de eritrócitos em µL × 50 = volume
// final do lisado em µL). Plasma sai pronto da centrifugação do sangue total
// — não tem diluição nenhuma, só a marcação de que o sobrenadante foi
// separado (ver seção "sangue" em DiaSacrificio.tsx).
export const FATOR_DILUICAO_ERITROCITO = 50;

export function volumeLisadoEritrocitoUl(volumeEritrocitoUl: number): number {
  return volumeEritrocitoUl * FATOR_DILUICAO_ERITROCITO;
}

// Órgão dissecável → tecidos de análise a que ele pertence. Cobre tanto os
// tecidos atuais (cortex, rins, ...) quanto os slugs legados compostos
// ("cortex-rins", "eritrocitos-plasma") de projetos antigos. Pâncreas não tem
// tecido analisável designável.
const ORGAO_TECIDOS: Record<string, string[]> = {
  figado: ["figado"],
  rim_esquerdo: ["rins", "cortex-rins"],
  rim_direito: ["rins", "cortex-rins"],
  cortex: ["cortex", "cortex-rins"],
  hipocampo: ["hipocampo"],
  cerebelo: ["cerebelo"],
  plasma: ["plasma", "eritrocitos-plasma"],
  eritrocito: ["eritrocitos", "eritrocitos-plasma"],
  pancreas: [],
};

// Dado os tecidos que o projeto analisa, devolve a lista de órgãos dissecáveis
// relevantes (para esconder os que não serão usados na visão geral do dia).
// Projeto sem tecidos definidos (antigos) = undefined = mostra todos.
export function orgaosDoProjeto(
  tecidosProjeto: string[] | null | undefined
): string[] | undefined {
  if (!tecidosProjeto || tecidosProjeto.length === 0) return undefined;
  const set = new Set(tecidosProjeto);
  return ORGAOS_DISSECAVEIS.filter((o) =>
    (ORGAO_TECIDOS[o.valor] ?? []).some((t) => set.has(t))
  ).map((o) => o.valor);
}
