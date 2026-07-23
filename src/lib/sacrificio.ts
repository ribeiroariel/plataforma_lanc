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
  { valor: "separacao_cortex_hipocampo", rotulo: "Separação córtex/hipocampo", minPessoas: 1 },
  { valor: "homogeneizacao", rotulo: "Homogeneização", minPessoas: 1 },
  { valor: "separacao_sangue", rotulo: "Separação de sangue (plasma/eritrócito)", minPessoas: 1 },
  { valor: "organizacao_geral", rotulo: "Organização geral (limpeza/ordenamento)", minPessoas: 1 },
];

export function rotuloFuncao(valor: string): string {
  return FUNCOES_SACRIFICIO.find((f) => f.valor === valor)?.rotulo ?? valor;
}

// Órgãos/tecidos dissecáveis (mais granular que os tecidos de análise).
export const ORGAOS_DISSECAVEIS: { valor: string; rotulo: string }[] = [
  { valor: "figado", rotulo: "Fígado" },
  { valor: "rim", rotulo: "Rim" },
  { valor: "pancreas", rotulo: "Pâncreas" },
  { valor: "cortex", rotulo: "Córtex" },
  { valor: "hipocampo", rotulo: "Hipocampo" },
  { valor: "plasma", rotulo: "Plasma" },
  { valor: "eritrocito", rotulo: "Eritrócito" },
];

// Homogenato 10% (1:9): peso em gramas × 9000 = volume de tampão em µL.
export const FATOR_TAMPAO_UL_POR_G = 9000;

export function volumeTampaoUl(pesoG: number): number {
  return pesoG * FATOR_TAMPAO_UL_POR_G;
}
