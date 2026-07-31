// Checklist do procedimento de cada ensaio, transcrito passo a passo dos
// protocolos do site (content/testes/*.md), que refletem a bancada real do
// laboratório (RPM das centrífugas NT 805 / compacta, equipamentos). Cada passo
// é uma ação verificável, com um check que grava em projeto_teste_passos.
//
// `id` é ESTÁVEL — é a chave do estado no banco. Nunca renumerar um id já usado;
// para reordenar, mude a posição no array mantendo o id. `critico` destaca
// passos de segurança ou de controle de qualidade.
//
// Os volumes citados são referência (formato córtex/rins ou o maior); os volumes
// reais por recipiente e por nº de amostras vêm da calculadora de consumo na
// mesma aba. Passos marcados `critico` são de segurança ou de controle de
// qualidade (leituras, QC, reagentes tóxicos).

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

// ── Catalase (CAT) ───────────────────────────────────────────────────────────
const CAT: PassoProcedimento[] = [
  {
    id: "cat-qc-h2o2",
    texto:
      "Controle de qualidade do H₂O₂: pipetar 240 µL do meio de reação (sem amostra) e ler a 240 nm. Esperado 0,70–0,85 Abs. Se A₂₄₀ < 0,55, o H₂O₂ está degradado — preparar meio novo com H₂O₂ fresco e descartar leituras feitas com meio velho.",
    critico: true,
  },
  {
    id: "cat-prep-meio",
    texto: "Preparar o meio de reação (tampão fosfato de potássio 10 mM pH 7,0 + H₂O₂ 30%).",
    reagenteDia: "Meio de reação",
    obs: "Frasco fechado coberto com papel alumínio; preparar imediatamente antes do uso.",
  },
  {
    id: "cat-descongela",
    texto: "Descongelar e recongelar as amostras 3 vezes.",
  },
  {
    id: "cat-centrifuga",
    texto:
      "Centrifugar a 3.500 × g por 10 minutos (NT 805 ≈ 6.100 rpm; centrífuga compacta ≈ 6.700 rpm). Manter no gelo.",
  },
  {
    id: "cat-zera",
    texto:
      "Zerar a 240 nm com tampão fosfato de potássio 10 mM pH 7,0 (cubeta de quartzo), a 25 °C. No Infinite 200 Pro: microplaca UV-Star de 96 poços, com um poço de tampão como branco (subtrair depois).",
    critico: true,
    obs: "A 240 nm (UV) só serve quartzo ou placa UV-Star — placa comum de poliestireno absorve e não pode ser usada.",
  },
  {
    id: "cat-pipeta",
    texto:
      "Por amostra: 240 µL do meio de reação + 10 µL do sobrenadante (volume total 250 µL na microplaca 96). Misturar bem.",
    obs: "Volumes por recipiente conforme a calculadora de consumo acima.",
  },
  {
    id: "cat-leitura",
    texto:
      "Registrar a absorbância a 240 nm a cada 10 segundos por 100 segundos (11 leituras), a 25 °C.",
    critico: true,
  },
  {
    id: "cat-descarte",
    texto: "Descarte: bombona CAT-H₂O₂ (FURB 40255).",
  },
];

// ── Superóxido dismutase (SOD) ───────────────────────────────────────────────
const SOD: PassoProcedimento[] = [
  {
    id: "sod-qc-pirogalol",
    texto:
      "Controle negativo (sem amostra): substituir os 72 µL de sobrenadante por tampão TRIS. A taxa de autooxidação do pirogalol (ΔAbs/min a 420 nm) deve ficar entre 0,030–0,070. Se < 0,020: pirogalol degradado — preparar novo. Se > 0,080: conferir pH do TRIS (8,2 ± 0,05) e temperatura (25 °C).",
    critico: true,
  },
  {
    id: "sod-prep-catalase",
    texto: "Preparar a solução de trabalho de catalase (em tampão TRIS pH 8,2).",
    reagenteDia: "Catalase — solução de trabalho",
    obs: "Manter no gelo, frasco com papel alumínio.",
  },
  {
    id: "sod-prep-pirogalol",
    texto: "Preparar o pirogalol 24 mM em HCl 10 mM imediatamente antes do uso.",
    reagenteDia: "Pirogalol 24 mM em HCl 10 mM",
    critico: true,
    obs: "Frasco com papel alumínio — oxida rápido; preparar só o necessário e nunca reutilizar.",
  },
  {
    id: "sod-descongela",
    texto: "Descongelar e recongelar as amostras 3 vezes.",
  },
  {
    id: "sod-centrifuga",
    texto:
      "Centrifugar a 3.000 × g por 10 minutos (NT 805 ≈ 5.700 rpm; centrífuga compacta ≈ 6.200 rpm). Manter no gelo.",
  },
  {
    id: "sod-mistura",
    texto:
      "Mistura de reação (placa de 24 poços, escala 6×): 1.398 µL de tampão TRIS pH 8,2 + 6 µL de catalase + 72 µL do sobrenadante. Misturar.",
    obs: "Volumes por recipiente conforme a calculadora de consumo acima.",
  },
  {
    id: "sod-zera",
    texto:
      "Zerar a 420 nm com água, a 25 °C (cubeta). No Infinite 200 Pro: poço com água como branco (subtrair depois).",
  },
  {
    id: "sod-pirogalol-add",
    texto: "Adicionar 24 µL de pirogalol e misturar imediatamente. Volume total final 1.500 µL.",
    critico: true,
    obs: "O pirogalol dispara a reação — só adicionar quando estiver pronto para ler.",
  },
  {
    id: "sod-leitura",
    texto:
      "Registrar a absorbância a 420 nm a cada 30 segundos por 120 segundos (5 leituras), a 25 °C.",
    critico: true,
  },
  {
    id: "sod-descarte",
    texto: "Descarte: bombona SOD-TRIS (FURB 40255).",
  },
];

// ── TBARS (peroxidação lipídica) ─────────────────────────────────────────────
// Reagentes todos de estoque (SDS, ácido acético, TBA, KCl) — sem reagente do dia.
const TBARS: PassoProcedimento[] = [
  {
    id: "tbars-qc",
    texto:
      "Controle de qualidade — branco (KCl no lugar da amostra): após incubação e centrifugação, A₅₃₅ do branco deve ser ≤ 0,050. Se > 0,080: o TBA está degradado (coloração amarelada) ou contaminado — preparar novo estoque.",
    critico: true,
  },
  {
    id: "tbars-centrifuga-1",
    texto:
      "Centrifugar as amostras a 3.000 × g por 10 minutos (NT 805 ≈ 5.700 rpm; centrífuga compacta ≈ 6.200 rpm); usar o sobrenadante.",
  },
  {
    id: "tbars-pipeta",
    texto:
      "Em tubos de vidro, por amostra — Amostra: 200 µL de sobrenadante + 20 µL de SDS 8,1% + 600 µL de ácido acético 20% pH 3,5 + 600 µL de TBA 0,8% + 280 µL de água. Branco: 200 µL de KCl 1,15% no lugar do sobrenadante, com os mesmos volumes dos demais reagentes.",
    critico: true,
  },
  {
    id: "tbars-banho",
    texto: "Tampar os tubos e incubar em banho-maria fervente (95 °C) por 60 minutos.",
    obs: "A incubação a 95 °C é sempre em banho-maria — nunca no Infinite 200 Pro.",
  },
  {
    id: "tbars-centrifuga-2",
    texto:
      "Deixar esfriar. Transferir para eppendorfs e centrifugar a 3.000 × g por 10 minutos (NT 805 ≈ 5.700 rpm; centrífuga compacta ≈ 6.200 rpm).",
  },
  {
    id: "tbars-leitura",
    texto:
      "Zerar com o branco a 535 nm e ler a absorbância do sobrenadante. No Infinite 200 Pro: microplaca de 96 poços, com o branco em poço adicional (subtrair depois).",
    critico: true,
  },
  {
    id: "tbars-descarte",
    texto: "Descarte: bombona TBARS (FURB 40255).",
  },
];

// ── Sulfidrilas (tióis totais e não-proteicos) ───────────────────────────────
const SULFIDRILAS: PassoProcedimento[] = [
  {
    id: "sulf-qc",
    texto:
      "Controle de qualidade — branco do reagente (PBS + DTNB, sem amostra, em duplicata): A₄₁₂ estável e < 0,100 após 30 min no escuro. Se > 0,100: DTNB contaminado/degradado — preparar novo. Coloração amarela intensa antes da reação = oxidação, descartar.",
    critico: true,
  },
  {
    id: "sulf-prep-dtnb",
    texto: "Preparar o DTNB 10 mM (em tampão fosfato de potássio 0,2 M pH 8).",
    reagenteDia: "DTNB 10 mM",
    obs: "Frasco com papel alumínio — sensível à luz e à temperatura.",
  },
  {
    id: "sulf-centrifuga",
    texto:
      "Centrifugar as amostras a 1.000 × g por 10 minutos (NT 805 ≈ 3.300 rpm; centrífuga compacta ≈ 3.600 rpm). Manter no gelo.",
  },
  {
    id: "sulf-tsh",
    texto:
      "Tióis totais (T-SH), por amostra — Amostra: 50 µL de sobrenadante + 980 µL de PBS pH 7,4 + 30 µL de DTNB. Branco da amostra: 50 µL de sobrenadante + 1.010 µL de PBS (sem DTNB). Branco do reagente: 980 µL de PBS + 30 µL de DTNB (em duplicata).",
    critico: true,
    obs: "Volumes por recipiente conforme a calculadora de consumo acima.",
  },
  {
    id: "sulf-incuba",
    texto:
      "Vortexar e incubar à temperatura ambiente, no escuro, por 30 minutos. Zerar a 412 nm com água e ler (cubeta de plástico).",
  },
  {
    id: "sulf-prep-ass",
    texto: "Para a fração não-proteica (NP-SH): preparar o ácido sulfossalicílico (ASS) 5%.",
    reagenteDia: "Ácido sulfossalicílico (ASS) 5%",
    obs: "Manter em gelo. NÃO usar o ASS na determinação de tióis totais — só na NP-SH.",
  },
  {
    id: "sulf-npsh",
    texto:
      "Tióis não-proteicos (NP-SH): misturar 200 µL de sobrenadante + 200 µL de ASS 5%. Vortexar. Gelo por 5 minutos. Centrifugar a 1.000 × g por 10 minutos e usar o sobrenadante do ASS nas mesmas proporções da tabela.",
    critico: true,
    obs: "O sobrenadante do ASS está diluído 1:2 — multiplicar o NP-SH por 2 (ou dobrar o volume pipetado). P-SH = T-SH − NP-SH.",
  },
  {
    id: "sulf-descarte",
    texto: "Descarte: bombona SULFIDRILAS-DTNB (FURB 40255).",
  },
];

// ── Tióis e dissulfetos ──────────────────────────────────────────────────────
const TIOIS: PassoProcedimento[] = [
  {
    id: "tiois-prep-dtt",
    texto: "Preparar o DTT 3 mM (em tampão TRIS 50 mM pH 9,0) imediatamente antes do uso.",
    reagenteDia: "DTT 3 mM",
    critico: true,
    obs: "Oxida rápido no ar — preparar na hora e manter em gelo, frasco fechado.",
  },
  {
    id: "tiois-prep-dtnb",
    texto: "Preparar o DTNB 3 mM em tampão acetato pH 5,0.",
    reagenteDia: "DTNB 3 mM em tampão acetato pH 5,0",
    obs: "Frasco com papel alumínio. Usado nas DUAS determinações (total + tióis livres) — preparar o dobro (2,2 mL para 10 amostras).",
  },
  {
    id: "tiois-qc",
    texto:
      "Controle positivo com cisteína 1 mM (recuperação esperada 80–110%). Se < 70%: o DTT está oxidado — preparar nova solução.",
    critico: true,
  },
  {
    id: "tiois-amostra",
    texto:
      "Usar a fração citosólica do homogeneizado (pós-centrifugação a 3.000 × g por 15 minutos).",
  },
  {
    id: "tiois-total",
    texto:
      "Determinação total (tióis + dissulfetos), por amostra: 100 µL de TRIS 50 mM pH 9,0 + 100 µL de DTT 3 mM + 200 µL de amostra. Incubar 20 minutos à temperatura ambiente. Adicionar 200 µL de TRIS 1,0 M pH 8,1 + 1.500 µL de arsenito de sódio; aguardar 2 minutos. Adicionar 100 µL de DTNB 3 mM em acetato pH 5,0. Misturar e ler a 412 nm por 3 minutos.",
    critico: true,
    obs: "Arsenito de sódio é cancerígeno Classe 1A — manipular exclusivamente em capela, com EPI completo.",
  },
  {
    id: "tiois-livres",
    texto:
      "Determinação de tióis livres: repetir omitindo o DTT e o arsenito (substituir pelos volumes correspondentes de tampão). Dissulfetos = (Abs total − Abs tióis) ÷ (2 × ε₄₁₂); tióis livres = Abs tióis ÷ ε₄₁₂.",
    critico: true,
  },
  {
    id: "tiois-descarte",
    texto:
      "Descarte: bombona TIOIS-DISULFETOS (FURB 40255). Identificar o arsenito como cancerígeno Classe 1A na etiqueta.",
  },
];

// ── Ácido ascórbico (vitamina C) ─────────────────────────────────────────────
const ACIDO_ASCORBICO: PassoProcedimento[] = [
  {
    id: "asc-prep-tampao",
    texto: "Preparar o tampão citrato/acetato pH 4,15 com pHMB.",
    reagenteDia: "Tampão citrato/acetato 50 mM pH 4,15 com pHMB",
    critico: true,
    obs: "pHMB é TÓXICO (mercúrio-orgânico) — capela, EPI completo. Geladeira, protegido da luz.",
  },
  {
    id: "asc-prep-dcip",
    texto: "Preparar/verificar a solução de DCIP (~0,1 mM no tampão citrato/acetato pH 4,15).",
    reagenteDia: "Solução de DCIP",
    obs: "Frasco âmbar, geladeira. Validade 7 dias.",
  },
  {
    id: "asc-qc",
    texto:
      "Controle de qualidade — DCIP: A₅₂₀ do DCIP puro deve ser 0,50–0,80. Se < 0,30: foi reduzido (contaminado/vencido) — descartar. Incluir padrão de ácido ascórbico (recuperação 90–110%).",
    critico: true,
  },
  {
    id: "asc-zera",
    texto: "Zerar o espectrofotômetro com tampão citrato/acetato pH 4,15 (sem DCIP) antes das leituras.",
  },
  {
    id: "asc-pipeta",
    texto:
      "Por amostra: 600 µL do homogeneizado + 300 µL de tampão citrato/acetato com pHMB (vortexar) + 300 µL da solução de DCIP (vortexar).",
    critico: true,
    obs: "Volumes por recipiente conforme a calculadora de consumo acima.",
  },
  {
    id: "asc-leitura",
    texto:
      "Aguardar exatamente 30 segundos e ler a absorbância a 520 nm (cubeta de plástico). O tempo de 30 s deve ser rigorosamente respeitado.",
    critico: true,
  },
  {
    id: "asc-curva",
    texto:
      "Curva-padrão: tubos com 0; 0,05; 0,10; 0,25; 0,50; 1,0 µg/µL de ácido ascórbico, nos mesmos volumes da amostra.",
  },
  {
    id: "asc-descarte",
    texto:
      "Descarte: bombona ASCORBATO-DCIP (FURB 40255). pHMB contém mercúrio orgânico — identificar na etiqueta.",
  },
];

// ── Peróxido de hidrogênio tecidual (H₂O₂) ───────────────────────────────────
const H2O2: PassoProcedimento[] = [
  {
    id: "h2o2-prep-dextrose",
    texto: "Preparar o tampão dextrose 5,5 mM pH 7,0 (ajustar o pH para 7,0).",
    reagenteDia: "Tampão dextrose 5,5 mM pH 7,0",
    obs: "Manter a 4 °C. Usado na incubação das fatias.",
  },
  {
    id: "h2o2-fatias",
    texto:
      "Preparo das fatias: remover o córtex até 15 min após o sacrifício; pesar ~400 mg; cortar no picador McIlwain em duas direções perpendiculares (prismas ~400 µm); transferir para frasco com tampão dextrose; incubar à temperatura ambiente por 1 hora.",
    critico: true,
    obs: "Este ensaio usa fatias de tecido viáveis, não homogeneizado — manusear em gelo antes da incubação.",
  },
  {
    id: "h2o2-prep-meio",
    texto:
      "Preparar o meio de reação (tampão fosfato de sódio 50 mM pH 7,4 + HRP 8,5 U/mL + vermelho de fenol 1 mg/mL): 235 + 5 + 5 µL por amostra.",
    reagenteDia: "Meio de reação",
    obs: "Proteger da luz; manter a HRP no gelo (instável à temperatura ambiente).",
  },
  {
    id: "h2o2-qc",
    texto:
      "Controle de qualidade: (1) controle positivo com H₂O₂ conhecido (recuperação 85–115%); (2) branco sem H₂O₂ (A₆₁₀ ≤ 0,050 após o NaOH); (3) ler dentro de 2 minutos após o NaOH — a cor é instável.",
    critico: true,
  },
  {
    id: "h2o2-pipeta",
    texto:
      "Por amostra (Infinite 200 Pro, 250 µL): 50 µL do sobrenadante da incubação + 195 µL do meio de reação. No espectrofotômetro: 60 µL de sobrenadante + 235 µL de meio. Proteger da luz.",
    critico: true,
    obs: "Volumes por recipiente conforme a calculadora de consumo acima.",
  },
  {
    id: "h2o2-incuba",
    texto: "Aguardar 10 minutos à temperatura ambiente, protegido da luz.",
  },
  {
    id: "h2o2-naoh-leitura",
    texto:
      "Adicionar 5 µL de NaOH 1 N, misturar bem, e ler a absorbância a 610 nm imediatamente (dentro de 2 minutos).",
    critico: true,
  },
  {
    id: "h2o2-curva",
    texto:
      "Curva-padrão: diluições de H₂O₂ 0; 0,5; 1,0; 2,0; 5,0; 10,0 nmol/mL em tampão dextrose, nos mesmos volumes da amostra.",
  },
  {
    id: "h2o2-descarte",
    texto: "Descarte: bombona H₂O₂-HRP (FURB 40255).",
  },
];

// ── Dosagem de proteínas (Lowry) ─────────────────────────────────────────────
const LOWRY: PassoProcedimento[] = [
  {
    id: "lowry-prep-reativoc",
    texto: "Preparar o Reativo C (Reativo A + B1 + B2).",
    reagenteDia: "Reativo C",
    obs: "Dimensionado para 10 amostras + curva + 10%. Preparar imediatamente antes do uso.",
  },
  {
    id: "lowry-qc-curva",
    texto:
      "Controle de qualidade — curva-padrão de BSA: R² deve ser ≥ 0,99. Se < 0,98, conferir a BSA (descongelar alíquota fresca), o Folin (não degradado) e o tempo exato de 30 min de incubação.",
    critico: true,
  },
  {
    id: "lowry-curva",
    texto:
      "Montar a curva-padrão de BSA: Branco (0), 10, 20, 40, 60 e 80 µL de BSA 1 mg/mL, completar com água para 200 µL, + 1,0 mL de Reativo C em cada tubo. Agitar e aguardar 10 minutos.",
    critico: true,
  },
  {
    id: "lowry-amostras",
    texto:
      "Amostras: 190 µL de água + 1 mL de Reativo C + 10 µL da amostra. Agitar e aguardar 10 minutos.",
    critico: true,
  },
  {
    id: "lowry-folin",
    texto: "Adicionar 100 µL de Reagente de Folin em todos os tubos (curva e amostras). Agitar.",
  },
  {
    id: "lowry-incuba-leitura",
    texto:
      "Incubar no escuro por exatamente 30 minutos. Zerar com o branco a 650 nm e ler.",
    critico: true,
  },
  {
    id: "lowry-descarte",
    texto: "Descarte: bombona LOWRY (FURB 40255).",
  },
];

// Ordem importa: prefixos mais específicos primeiro (o plasma do carboniladas tem
// pipetagem própria; os demais tecidos usam a geral). Os outros ensaios têm o
// mesmo procedimento entre tecidos — o que muda por tecido é o volume/amostra,
// que vem da calculadora de consumo, não o roteiro de passos.
const PROCEDIMENTOS: { prefixos: string[]; passos: PassoProcedimento[] }[] = [
  { prefixos: ["carboniladas-plasma"], passos: carboniladas(PIPETAGEM_PLASMA) },
  { prefixos: ["carboniladas"], passos: carboniladas(PIPETAGEM_GERAL) },
  { prefixos: ["cat"], passos: CAT },
  { prefixos: ["sod"], passos: SOD },
  { prefixos: ["tbars"], passos: TBARS },
  { prefixos: ["sulfidrilas"], passos: SULFIDRILAS },
  { prefixos: ["tiois-dissulfetos"], passos: TIOIS },
  { prefixos: ["acido-ascorbico"], passos: ACIDO_ASCORBICO },
  { prefixos: ["h2o2"], passos: H2O2 },
  { prefixos: ["lowry"], passos: LOWRY },
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
