// Checklist do procedimento de cada ensaio, transcrito passo a passo dos
// protocolos do site (content/testes/*.md), que refletem a bancada real do
// laboratório (RPM das centrífugas NT 805 / compacta, equipamentos). Cada passo
// é uma ação verificável, com um check que grava em projeto_teste_passos.
//
// `id` é ESTÁVEL — é a chave do estado no banco. Nunca renumerar um id já usado;
// para reordenar, mude a posição no array mantendo o id. `critico` destaca
// passos de segurança ou de controle de qualidade.
//
// Os volumes citados são os do formato de leitura maior (cubeta); os volumes
// reais por recipiente vêm da calculadora de consumo na mesma aba.
//
// PILOTO: por ora só carboniladas está catalogado (o mais longo), para validar o
// formato antes de transcrever os demais.

export type PassoProcedimento = {
  id: string;
  texto: string;
  obs?: string;
  critico?: boolean;
  /**
   * Nome de um reagente preparado no dia (em ENSAIOS_DIA de reagentesDia.ts) cuja
   * RECEITA (quanto pesar / como preparar, escalada por nº de amostras) é mostrada
   * dentro deste passo — para preparar a solução sem sair da aba e dar o check.
   */
  reagenteDia?: string;
  /**
   * Reagente usado tanto na amostra quanto no branco de cada amostra → a receita
   * é preparada para o DOBRO de tubos. Reagentes só da amostra (DNPH) ou só do
   * branco (HCl) ficam em 1×.
   */
  dobraBranco?: boolean;
};

// Centrifugação padrão do carboniladas (valores reais das centrífugas do LANC).
const CENTRIFUGA =
  "Centrifugar a 11.000 × g (NT 805 ≈ 10.900 rpm; centrífuga compacta ≈ 11.900 rpm) por 3 minutos";

// Monta os passos do carboniladas com a pipetagem inicial específica do tecido
// (o resto do procedimento é idêntico entre córtex/rins, fígado, eritrócitos e
// plasma — só a pipetagem muda, porque o plasma leva HCl 2 M também na amostra).
function carboniladas(pipetagem: PassoProcedimento): PassoProcedimento[] {
  return [
    {
      id: "carbonil-prep-dnph",
      texto: "Preparar o DNPH 10 mM em HCl 2 M (no escuro).",
      reagenteDia: "DNPH 10 mM em HCl 2 M",
      critico: true,
      obs: "Fotossensível e mutagênico — frasco âmbar/papel alumínio, capela, EPI. Só as amostras levam DNPH (não o branco).",
    },
    {
      id: "carbonil-prep-tca",
      texto: "Preparar o TCA 20% (m/v).",
      reagenteDia: "TCA 20% (m/v)",
      dobraBranco: true,
      obs: "Usado na amostra e no branco → preparar para o dobro de tubos. Dissolver e completar q.s.p. — nunca pesar no volume final.",
    },
    {
      id: "carbonil-prep-guanidina",
      texto: "Preparar a guanidina 6 M (em tampão fosfato de potássio pH 2,3).",
      reagenteDia: "Guanidina 6 M",
      dobraBranco: true,
      obs: "Usada na amostra e no branco → preparar para o dobro de tubos.",
    },
    {
      id: "carbonil-qc-dnph",
      texto:
        "Conferir o DNPH recém-preparado: deve estar amarelo claro. Precipitado ou coloração alaranjada = degradado → descartar e preparar novo lote.",
      critico: true,
    },
    pipetagem,
    {
      id: "carbonil-incuba-1h",
      texto:
        "Vortexar e manter no escuro por 1 hora, vortexando a cada 15 minutos (5 vezes).",
    },
    {
      id: "carbonil-tca",
      texto: `Adicionar 500 µL de TCA 20% a cada tubo (amostra e branco). Vortexar. ${CENTRIFUGA}. Descartar o sobrenadante.`,
    },
    {
      id: "carbonil-lavagem-1",
      texto: `1ª lavagem: ressuspender o pellet em 500 µL de etanol P.A. + 500 µL de acetato de etila. Vortexar. ${CENTRIFUGA}. Descartar o sobrenadante.`,
      obs: "Etanol e acetato de etila são inflamáveis — na capela/copa química, com EPI.",
    },
    {
      id: "carbonil-lavagem-2",
      texto: `2ª lavagem: ressuspender o pellet em 500 µL de etanol P.A. + 500 µL de acetato de etila. Vortexar. ${CENTRIFUGA}. Descartar o sobrenadante.`,
    },
    {
      id: "carbonil-lavagem-3",
      texto: `3ª lavagem: ressuspender o pellet em 500 µL de etanol P.A. + 500 µL de acetato de etila. Vortexar. ${CENTRIFUGA}. Descartar o sobrenadante.`,
    },
    {
      id: "carbonil-guanidina",
      texto:
        "Ressuspender o pellet em 600 µL de guanidina 6 M. Vortexar. Incubar a 60 °C por 15 minutos.",
    },
    {
      id: "carbonil-centrifuga-final",
      texto: `${CENTRIFUGA}.`,
    },
    {
      id: "carbonil-leitura",
      texto:
        "Leitura a 370 nm: zerar com HCl 2 M e ler o branco da amostra primeiro, depois as amostras (cubeta de plástico). No Infinite 200 Pro: microplaca UV-Star de 96 poços, com o branco (HCl 2 M) em poço adicional — subtrair depois.",
      critico: true,
      obs: "O branco da amostra (sem DNPH) deve ficar ≤ 0,050 Abs; acima disso, revisar o procedimento.",
    },
    {
      id: "carbonil-descarte",
      texto:
        "Descarte: material com DNPH na bombona CARBONILADAS-DNPH (FURB 40255); a fração etanol + acetato de etila na bombona SOLVENTES-NÃO-HALOGENADOS (FURB 40259).",
    },
  ];
}

const PIPETAGEM_GERAL: PassoProcedimento = {
  id: "carbonil-pipeta",
  texto:
    "Em eppendorfs, por amostra — Amostra: 200 µL da amostra + 400 µL de DNPH 10 mM. Branco da amostra: 200 µL da amostra + 400 µL de HCl 2 M (sem DNPH).",
  critico: true,
  obs: "Pipetar o DNPH sempre no escuro. Volumes conforme a calculadora de consumo acima.",
};

const PIPETAGEM_PLASMA: PassoProcedimento = {
  id: "carbonil-pipeta",
  texto:
    "Em eppendorfs, por amostra — Amostra: 200 µL de plasma + 400 µL de HCl 2 M + 400 µL de DNPH 10 mM. Branco da amostra: 200 µL de plasma + 400 µL de HCl 2 M + 400 µL de HCl 2 M (sem DNPH). Volume total: 1.000 µL em cada tubo.",
  critico: true,
  obs: "O plasma leva HCl 2 M também na amostra — o branco individual subtrai a absorção intrínseca do plasma. Pipetar o DNPH no escuro.",
};

// Ordem importa: prefixos mais específicos primeiro (o plasma tem pipetagem
// própria; os demais tecidos usam a geral).
const PROCEDIMENTOS: { prefixos: string[]; passos: PassoProcedimento[] }[] = [
  { prefixos: ["carboniladas-plasma"], passos: carboniladas(PIPETAGEM_PLASMA) },
  { prefixos: ["carboniladas"], passos: carboniladas(PIPETAGEM_GERAL) },
];

/** Passos do procedimento deste ensaio, ou null se ainda não catalogado. */
export function procedimentoDoSlug(slug: string): PassoProcedimento[] | null {
  // Pega o match de prefixo mais LONGO (mais específico), ex.: "carboniladas-plasma"
  // ganha de "carboniladas".
  let melhor: { prefixo: string; passos: PassoProcedimento[] } | null = null;
  for (const p of PROCEDIMENTOS) {
    for (const pref of p.prefixos) {
      if (slug.startsWith(pref) && (!melhor || pref.length > melhor.prefixo.length)) {
        melhor = { prefixo: pref, passos: p.passos };
      }
    }
  }
  return melhor?.passos ?? null;
}
